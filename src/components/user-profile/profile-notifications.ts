import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiSwitch } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { NotificationPreferenceKey } from '../../models';

interface NotificationCategory {
  key: NotificationPreferenceKey;
  label: string;
}

@Component({
  selector: 'app-profile-notifications',
  host: { class: 'contents' },
  imports: [FormsModule, TranslatePipe, TuiSwitch],
  template: `
    <div class="flex flex-col gap-4 mt-6">
      <!-- Master switch -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold m-0">
            <label
              tuiLabel
              for="notificationsSwitch"
              class="cursor-pointer text-inherit font-inherit"
            >
              {{ 'notifications' | translate }}
            </label>
          </h2>
          <input
            id="notificationsSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="enabled()"
            [disabled]="!supported() || permissionDenied()"
            (ngModelChange)="enabledChange.emit($event)"
            autocomplete="off"
          />
        </div>
        @if (!supported()) {
          <p class="m-0 text-sm text-(--tui-text-secondary)">
            {{ 'notificationsUnsupportedHint' | translate }}
          </p>
        } @else if (permissionDenied()) {
          <p class="m-0 text-sm text-(--tui-text-secondary)">
            {{ 'notificationsBlockedHint' | translate }}
          </p>
        }
      </div>

      <!-- Categories -->
      <div
        class="flex flex-col gap-4 pl-4 border-l-2 border-(--tui-border-normal)"
      >
        @for (category of categories; track category.key) {
          <div class="flex items-center justify-between gap-4">
            <label
              tuiLabel
              [for]="category.key"
              [class.opacity-50]="!enabled()"
              >{{ category.label | translate }}</label
            >
            <input
              tuiSwitch
              type="checkbox"
              [id]="category.key"
              [ngModel]="preferences()[category.key]"
              [disabled]="!enabled()"
              (ngModelChange)="
                preferenceChange.emit({ key: category.key, value: $event })
              "
              autocomplete="off"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class ProfileNotificationsComponent {
  /** Maestro activo en cuenta + permiso concedido + dispositivo suscrito. */
  readonly enabled = input<boolean>(false);
  readonly supported = input<boolean>(false);
  readonly permissionDenied = input<boolean>(false);
  readonly preferences =
    input.required<Record<NotificationPreferenceKey, boolean>>();

  readonly enabledChange = output<boolean>();
  readonly preferenceChange = output<{
    key: NotificationPreferenceKey;
    value: boolean;
  }>();

  protected readonly categories: readonly NotificationCategory[] = [
    { key: 'notify_messages', label: 'notifyMessages' },
    { key: 'notify_likes', label: 'notifyLikes' },
    { key: 'notify_comments', label: 'notifyComments' },
    { key: 'notify_follows', label: 'notifyFollows' },
  ];
}
