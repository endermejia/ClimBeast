import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';

import { firstValueFrom } from 'rxjs';

import { Json } from '../models/supabase-generated';

import { reactToObservable } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { ENV_VAPID_PUBLIC_KEY } from '../environments/environment';

import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly isSubscribed = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);
  /** Estado del permiso del navegador/SO. Se actualiza tras cada petición. */
  readonly permission = signal<NotificationPermission>('default');

  constructor() {
    if (this.isBrowser) {
      const hasNotificationApi = typeof Notification !== 'undefined';
      this.isSupported.set(
        this.swPush.isEnabled && hasNotificationApi && 'PushManager' in window,
      );
      this.permission.set(
        hasNotificationApi ? Notification.permission : 'default',
      );
      this.checkSubscription();
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
      await this.saveSubscription(subscription);
      this.isSubscribed.set(true);
    } catch (err: unknown) {
      console.error('[PushService] Could not sync subscription', err);
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const subscription = await firstValueFrom(this.swPush.subscription, {
        defaultValue: null,
      });
      if (subscription) {
        await this.deleteSubscription(subscription);
        await this.swPush.unsubscribe();
      }
      this.isSubscribed.set(false);
    } catch (err: unknown) {
      console.error('[PushService] Error unsubscribing', err);
      throw err;
    }
  }

  async getCurrentSubscription(): Promise<PushSubscription | null> {
    return firstValueFrom(this.swPush.subscription, { defaultValue: null });
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

  private async getOrCreateSubscription(): Promise<PushSubscription> {
    const existing = await firstValueFrom(this.swPush.subscription, {
      defaultValue: null,
    });
    if (existing) return existing;

    return this.swPush.requestSubscription({
      serverPublicKey: ENV_VAPID_PUBLIC_KEY,
    });
  }

  private checkSubscription(): void {
    reactToObservable(this.swPush.subscription, (subscription) => {
      this.isSubscribed.set(!!subscription);
      if (subscription) {
        // Re-sincroniza la suscripción con el backend en cada arranque
        void this.saveSubscription(subscription);
      }
    });
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
