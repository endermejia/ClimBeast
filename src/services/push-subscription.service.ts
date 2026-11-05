import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

import { STORAGE_KEYS } from '../constants';

import { AuthStateService } from './auth-state.service';
import { LocalStorage } from './local-storage';
import { PushService } from './push.service';
import { UserProfilesService } from './user-profiles.service';

/**
 * Orquesta el ciclo de vida de las notificaciones push:
 *
 * - Al acceder a la app con sesión iniciada pide permiso al sistema (prompt
 *   nativo) una vez por dispositivo, salvo que el usuario haya desactivado
 *   las notificaciones a nivel de cuenta (`notifications_enabled = false`).
 * - Mantiene la suscripción sincronizada con el backend mientras el permiso
 *   esté concedido y la cuenta tenga las notificaciones activas.
 * - Expone el estado y las acciones que usa el interruptor de Ajustes.
 */
@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly authState = inject(AuthStateService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly push = inject(PushService);
  private readonly storage = inject(LocalStorage);
  private readonly userProfiles = inject(UserProfilesService);

  private readonly accountOverride = signal<boolean | null>(null);

  /** Maestro de cuenta: silencia todos los dispositivos cuando es `false`. */
  readonly accountEnabled = computed(
    () =>
      this.accountOverride() ??
      this.authState.userProfile()?.notifications_enabled ??
      true,
  );
  /**
   * `true` cuando la cuenta tiene las notificaciones activas, el SO concedió el
   * permiso y este dispositivo tiene una suscripción válida.
   */
  readonly pushEnabled = computed(
    () =>
      this.accountEnabled() &&
      this.push.permission() === 'granted' &&
      this.push.isSubscribed(),
  );
  /** `true` si el permiso fue bloqueado a nivel de sistema/navegador. */
  readonly permissionDenied = computed(
    () => this.push.permission() === 'denied',
  );
  readonly isSupported = this.push.isSupported;

  private askingPermission = false;

  constructor() {
    if (!this.isBrowser) return;

    effect(() => {
      const profile = this.authState.userProfile();
      if (!profile) return;

      if (
        this.accountOverride() !== null &&
        profile.notifications_enabled === this.accountOverride()
      ) {
        this.accountOverride.set(null);
      }

      if (!this.push.isSupported()) return;

      // El usuario desactivó las notificaciones de su cuenta desde Ajustes
      if (this.accountEnabled() === false) return;

      const permission = this.push.permission();

      if (permission === 'default') {
        // Prompt nativo directo, una sola vez por dispositivo
        if (this.storage.getItem(STORAGE_KEYS.pushPromptAsked) === 'true') {
          return;
        }
        void this.askPermission();
        return;
      }

      if (permission === 'granted') {
        void this.push.syncSubscription();
      }
    });
  }

  /**
   * Activa las notificaciones: pide permiso si hace falta, suscribe este
   * dispositivo y marca la cuenta con `notifications_enabled = true`.
   */
  async enable(): Promise<boolean> {
    const granted = await this.push.enablePushNotifications();
    if (!granted) return false;

    this.accountOverride.set(true);

    if (this.authState.userProfile()?.notifications_enabled !== true) {
      const result = await this.userProfiles.updateUserProfile({
        notifications_enabled: true,
      });
      if (!result.success) {
        this.accountOverride.set(null);
        return false;
      }
    }
    return true;
  }

  /**
   * Desactiva las notificaciones de la cuenta (silencia todos los
   * dispositivos) y borra la suscripción de este dispositivo.
   */
  async disable(): Promise<boolean> {
    this.accountOverride.set(false);
    const result = await this.userProfiles.updateUserProfile({
      notifications_enabled: false,
    });
    if (!result.success) {
      this.accountOverride.set(null);
    }
    try {
      await this.push.unsubscribe();
    } catch (err: unknown) {
      console.error('[PushSubscriptionService] Error disabling push', err);
    }
    return result.success;
  }

  private async askPermission(): Promise<void> {
    if (this.askingPermission) return;
    this.askingPermission = true;
    this.storage.setItem(STORAGE_KEYS.pushPromptAsked, 'true');

    try {
      await this.push.enablePushNotifications();
    } finally {
      this.askingPermission = false;
      // Si el usuario cerró el diálogo sin decidir, dejamos volver a preguntar
      if (this.push.permission() === 'default') {
        this.storage.removeItem(STORAGE_KEYS.pushPromptAsked);
      }
    }
  }
}
