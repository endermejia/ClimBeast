import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

import { AppNotificationsService } from '../../services/app-notifications.service';

@Component({
  selector: 'app-notification-badge',
  imports: [TuiAppearance, TuiBadgedContent, TuiBadgeNotification],
  template: `
    <tui-badged-content>
      @if (notificationsService.unreadCount(); as unreadNotifications) {
        <ng-container tuiSlot="top">
          <tui-badge-notification tuiAppearance="accent" size="s">
            {{ unreadNotifications }}
          </tui-badge-notification>
        </ng-container>
      }
      <ng-content />
    </tui-badged-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBadgeComponent {
  protected readonly notificationsService = inject(AppNotificationsService);
}
