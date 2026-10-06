import { inject, Injectable, signal } from '@angular/core';

import { Json } from '../models/supabase-generated';

import { IS_BROWSER } from '../app/is-browser';
import { ENV_VAPID_PUBLIC_KEY } from '../environments/environment';
import { SupabaseService } from './supabase.service';

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );
}

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as unknown as { standalone?: boolean }).standalone === true)
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly isSubscribed = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);
  /** Estado del permiso del navegador/SO. Se actualiza tras cada petición. */
  readonly permission = signal<NotificationPermission>('default');

  constructor() {
    if (this.isBrowser) {
      const hasNotificationApi = typeof Notification !== 'undefined';
      const hasPushManager = 'PushManager' in window;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const iosAllowed = !isIosDevice() || isStandalonePwa();

      const supported =
        hasNotificationApi && hasPushManager && hasServiceWorker && iosAllowed;
      this.isSupported.set(supported);
      this.permission.set(
        hasNotificationApi ? Notification.permission : 'default',
      );
      if (supported) {
        void this.checkSubscription();
      }
    }
  }

  /**
   * Obtiene la instancia de PushManager del ServiceWorkerRegistration de forma segura.
   * Devuelve null si no está disponible (ej. Safari tab, WebViews, etc.).
   */
  private async getPushManager(): Promise<PushManager | null> {
    if (
      !this.isBrowser ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return null;
    }
    if (isIosDevice() && !isStandalonePwa()) {
      return null;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      return registration.pushManager ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Pide permiso de notificaciones al sistema (prompt nativo) y, si el usuario
   * lo concede, crea la suscripción push y la guarda en el backend.
   *
   * @returns `true` si la suscripción está creada y guardada.
   */
  async enablePushNotifications(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('[PushService] Notifications are not enabled or supported');
      return false;
    }

    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('[PushService] Notification permission not granted');
        return false;
      }

      const subscription = await this.getOrCreateSubscription();
      if (!subscription) {
        return false;
      }
      await this.saveSubscription(subscription);
      this.isSubscribed.set(true);
      return true;
    } catch (err: unknown) {
      console.error('[PushService] Could not enable notifications', err);
      return false;
    }
  }

  /**
   * Crea la suscripción si falta y la vuelve a guardar en el backend, **sin**
   * volver a pedir permiso (si no está concedido, no hace nada).
   */
  async syncSubscription(): Promise<void> {
    if (!this.isSupported()) return;

    if (Notification.permission !== 'granted') {
      this.permission.set(Notification.permission);
      return;
    }

    try {
      const subscription = await this.getOrCreateSubscription();
      if (subscription) {
        await this.saveSubscription(subscription);
        this.isSubscribed.set(true);
      }
    } catch (err: unknown) {
      console.error('[PushService] Could not sync subscription', err);
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const pm = await this.getPushManager();
      if (pm) {
        const subscription = await pm.getSubscription();
        if (subscription) {
          await this.deleteSubscription(subscription);
          await subscription.unsubscribe();
        }
      }
      this.isSubscribed.set(false);
    } catch (err: unknown) {
      console.error('[PushService] Error unsubscribing', err);
      throw err;
    }
  }

  async getCurrentSubscription(): Promise<PushSubscription | null> {
    const pm = await this.getPushManager();
    if (!pm) return null;
    try {
      return await pm.getSubscription();
    } catch {
      return null;
    }
  }

  private async requestPermission(): Promise<NotificationPermission> {
    const current = Notification.permission;
    if (current !== 'default') {
      this.permission.set(current);
      return current;
    }

    const result = await Notification.requestPermission();
    this.permission.set(result);
    return result;
  }

  private async getOrCreateSubscription(): Promise<PushSubscription | null> {
    const pm = await this.getPushManager();
    if (!pm) return null;

    try {
      const existing = await pm.getSubscription();
      if (existing) return existing;

      return await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(ENV_VAPID_PUBLIC_KEY),
      });
    } catch (err: unknown) {
      console.error('[PushService] Error in getOrCreateSubscription', err);
      return null;
    }
  }

  private async checkSubscription(): Promise<void> {
    try {
      const pm = await this.getPushManager();
      if (!pm) {
        this.isSupported.set(false);
        return;
      }
      const subscription = await pm.getSubscription();
      this.isSubscribed.set(!!subscription);
      if (subscription) {
        // Re-sincroniza la suscripción con el backend en cada arranque
        void this.saveSubscription(subscription);
      }
    } catch (err: unknown) {
      console.warn('[PushService] Could not check subscription', err);
    }
  }

  async saveSubscription(subscription: PushSubscription): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) {
      console.warn(
        '[PushService] Skipping saveSubscription: No user ID available',
      );
      return;
    }

    const { error } = await this.supabase.client
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          subscription: subscription.toJSON() as NonNullable<Json>,
        },
        { onConflict: 'user_id, subscription' },
      );

    if (error) {
      console.error(
        '[PushService] Error saving subscription to Supabase',
        error,
      );
    }
  }

  private async deleteSubscription(
    subscription: PushSubscription,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    const { error } = await this.supabase.client
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('subscription', subscription.toJSON() as NonNullable<Json>);

    if (error) {
      console.error(
        '[PushService] Error deleting subscription from Supabase',
        error,
      );
    }
  }
}
