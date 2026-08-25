import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-8a-section',
  imports: [TranslatePipe, TuiBadge, TuiButton, TuiIcon],
  template: `
    <div
      class="flex flex-col gap-4 p-5 rounded-2xl bg-(--tui-base-02) border border-(--tui-border-normal)"
    >
      <h3
        class="text-base font-semibold flex items-center gap-2 m-0 text-(--tui-text-secondary)"
      >
        <tui-icon icon="@tui.settings" size="s" />
        {{ 'toolsAndManagement' | translate }}
      </h3>

      <div class="flex flex-col gap-3">
        @if (isPrivate()) {
          <button
            tuiButton
            iconStart="@tui.users"
            appearance="primary"
            type="button"
            size="m"
            class="w-full justify-start group relative"
            (click)="openFollowRequests.emit()"
          >
            {{ 'followRequests' | translate }}
            @if (pendingRequestsCount() > 0) {
              <span tuiBadge class="absolute -top-2 -right-2">{{
                pendingRequestsCount()
              }}</span>
            }
          </button>
        }

        <button
          tuiButton
          iconStart="@tui.receipt"
          appearance="outline"
          type="button"
          size="m"
          class="w-full justify-start group"
          (click)="openPurchaseHistory.emit()"
        >
          {{ 'purchaseHistory.view' | translate }}
        </button>

        <button
          tuiButton
          iconStart="@tui.download"
          appearance="outline"
          type="button"
          size="m"
          class="w-full justify-start group"
          (click)="openImport8a.emit()"
        >
          {{ 'import8a.button' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile8aSectionComponent {
  readonly isPrivate = input<boolean>(false);
  readonly pendingRequestsCount = input<number>(0);

  readonly openFollowRequests = output<void>();
  readonly openPurchaseHistory = output<void>();
  readonly openImport8a = output<void>();
}
