import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

/**
 * Manages audio notification preferences (message and notification sounds).
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class AudioPreferencesService {
  private readonly localStorage = inject(LocalStorage);
  private readonly supabase = inject(SupabaseService);

  readonly messageSoundEnabled: WritableSignal<boolean> = signal(true);
  readonly notificationSoundEnabled: WritableSignal<boolean> = signal(false);

  private readonly MESSAGE_SOUND_KEY = 'message_sound_enabled_v1';
  private readonly NOTIFICATION_SOUND_KEY = 'notification_sound_enabled_v1';

  hydrate(): void {
    try {
      const msgSound = this.localStorage.getItem(this.MESSAGE_SOUND_KEY);
      if (msgSound !== null) {
        this.messageSoundEnabled.set(msgSound === 'true');
      }

      const notifSound = this.localStorage.getItem(this.NOTIFICATION_SOUND_KEY);
      if (notifSound !== null) {
        this.notificationSoundEnabled.set(notifSound === 'true');
      }
    } catch {
      // Silent fail on hydration
    }
  }

  persistMessageSound(): void {
    this.localStorage.setItem(
      this.MESSAGE_SOUND_KEY,
      String(this.messageSoundEnabled()),
    );
  }

  persistNotificationSound(): void {
    this.localStorage.setItem(
      this.NOTIFICATION_SOUND_KEY,
      String(this.notificationSoundEnabled()),
    );
  }

  syncFromProfile(): void {
    const profile = this.supabase.userProfile();
    if (!profile) return;

    if (profile.message_sound !== null) {
      this.messageSoundEnabled.set(!!profile.message_sound);
    }
    if (profile.notification_sound !== null) {
      this.notificationSoundEnabled.set(!!profile.notification_sound);
    }
  }
}
