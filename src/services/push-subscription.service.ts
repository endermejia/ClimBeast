import { computed, effect, inject, Injectable } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

import { STORAGE_KEYS } from '../constants';

import { AuthStateService } from './auth-state.service';
import { LocalStorage } from './local-storage';
import { PushService } from './push.service';

/**
 * Orquesta el ciclo de vida de las notificaciones push:
 *
 * - En la primera apertura de la app pide permiso al sistema (prompt nativo).
 * - Mantiene la suscripción sincronizada con el backend mientras el permiso
 *   esté concedido y el usuario no la haya desactivado.
 * - Expone el estado y las acciones que usa el interruptor de Ajustes.
 */
@Injectable({ providedIn: 'root' })
export class PushSubscriptionService {
  private readonly authState = inject(AuthStateService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly push = inject(PushService);
  private readonly storage = inject(LocalStorage);

  /** `true` cuando el SO concedió el permiso y existe suscripción válida. */
  readonly pushEnabled = computed(
    () => this.push.permission() === 'granted' && this.push.isSubscribed(),
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
      if (!profile || !this.push.isSupported()) return;

      // El usuario desactivó las notificaciones desde Ajustes
      if (this.storage.getItem(STORAGE_KEYS.pushDisabled) === 'true') return;

      const permission = this.push.permission();

      if (permission === 'default') {
        // Primera apertura: prompt nativo directo, una sola vez
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

  /** Activa las notificaciones (pide permiso si hace falta). */
  async enable(): Promise<boolean> {
    this.storage.removeItem(STORAGE_KEYS.pushDisabled);
    return this.push.enablePushNotifications();
  }

  /** Desactiva las notificaciones y borra la suscripción del backend. */
  async disable(): Promise<void> {
    this.storage.setItem(STORAGE_KEYS.pushDisabled, 'true');
    try {
      await this.push.unsubscribe();
    } catch (err: unknown) {
      console.error('[PushSubscriptionService] Error disabling push', err);
    }
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
