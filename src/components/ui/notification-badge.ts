import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

import { AppNotificationsService } from '../../services/app-notifications.service';

@Component({
  selector: 'app-notification-badge',
  imports: [TuiBadgedContent, TuiBadgeNotification],
  template: `
    <tui-badged-content>
      @if (notificationsService.unreadCount(); as unreadNotifications) {
        <tui-badge-notification tuiAppearance="accent" size="s" tuiSlot="top">
          {{ unreadNotifications }}
        </tui-badge-notification>
      }
      <ng-content />
    </tui-badged-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBadgeComponent {
  protected readonly notificationsService = inject(AppNotificationsService);
}
