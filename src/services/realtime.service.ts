import { effect, inject, Injectable } from '@angular/core';

import { AppNotificationsService } from './app-notifications.service';
import { MessagingService } from './messaging.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly messagingService = inject(MessagingService);
  private readonly supabase = inject(SupabaseService);

  constructor() {
    effect((onCleanup) => {
      const userId = this.supabase.authUserId();
      if (userId) {
        void this.notificationsService.refreshUnreadCount();
        void this.messagingService.refreshUnreadCount();

        const nSub = this.notificationsService.watchNotifications(() => {
          void this.notificationsService.refreshUnreadCount();
        });

        const mSub = this.messagingService.watchUnreadCount(() => {
          void this.messagingService.refreshUnreadCount();
        });

        onCleanup(() => {
          nSub?.unsubscribe();
          mSub?.unsubscribe();
        });
      } else {
        this.notificationsService.unreadCount.set(0);
        this.messagingService.unreadMessagesCount.set(0);
      }
    });
  }
}
