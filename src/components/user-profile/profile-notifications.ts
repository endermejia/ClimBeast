import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiButton } from '@taiga-ui/core';
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
  imports: [FormsModule, TranslatePipe, TuiButton, TuiSwitch],
  template: `
    <section
      class="flex flex-col gap-3 pt-6 mt-2 border-t border-(--tui-border-normal)"
    >
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold m-0 text-(--tui-text-primary)">
            <label
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
          <p class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed">
            {{ 'notificationsUnsupportedHint' | translate }}
          </p>
        } @else if (permissionDenied()) {
          <p class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed">
            {{ 'notificationsBlockedHint' | translate }}
          </p>
        }
      </div>

      <!-- Always visible (no layout shift); disabled when notifications are off -->
      <div class="flex flex-wrap gap-2">
        @for (category of categories; track category.key) {
          @let active = preferences()[category.key];
          <button
            tuiButton
            type="button"
            size="s"
            [appearance]="active ? 'secondary' : 'outline'"
            [iconStart]="active ? '@tui.check' : ''"
            [disabled]="!enabled()"
            class="rounded-full!"
            [attr.aria-pressed]="active"
            (click)="
              preferenceChange.emit({ key: category.key, value: !active })
            "
          >
            {{ category.label | translate }}
          </button>
        }
      </div>
    </section>
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
