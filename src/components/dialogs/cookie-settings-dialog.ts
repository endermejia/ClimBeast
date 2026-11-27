import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiButton, TuiDialogContext } from '@taiga-ui/core';
import { TuiBadge, TuiSwitch } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { ConsentService } from '../../services/consent.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-cookie-settings-dialog',
  imports: [FormsModule, TranslatePipe, TuiBadge, TuiButton, TuiSwitch],
  template: `
    <div class="lw-form-sheet">
      <div class="lw-form-sheet-body flex flex-col gap-4">
        <p class="m-0 text-sm text-(--tui-text-secondary) leading-relaxed">
          {{ 'cookies.settings.subtitle' | translate }}
        </p>

        <div class="flex flex-col divide-y divide-(--tui-border-normal)/70">
          <!-- Necessary (always active) -->
          <div class="flex items-start justify-between gap-4 py-3.5 first:pt-1">
            <div class="flex flex-col gap-1 min-w-0">
              <span class="text-sm font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.necessary.title' | translate }}
              </span>
              <p
                class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed"
              >
                {{ 'cookies.categories.necessary.description' | translate }}
              </p>
            </div>
            <span
              tuiBadge
              appearance="positive"
              size="s"
              class="shrink-0 whitespace-nowrap mt-0.5"
            >
              {{ 'cookies.categories.necessary.alwaysActive' | translate }}
            </span>
          </div>

          <!-- Analytics / Performance (Vercel Speed Insights) -->
          <div class="flex items-start justify-between gap-4 py-3.5">
            <label
              for="dialogAnalyticsSwitch"
              class="flex flex-col gap-1 min-w-0 cursor-pointer"
            >
              <span class="text-sm font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.analytics.title' | translate }}
              </span>
              <p
                class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed"
              >
                {{ 'cookies.categories.analytics.description' | translate }}
              </p>
            </label>
            <input
              id="dialogAnalyticsSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="consent.analyticsAllowed()"
              (ngModelChange)="onAnalyticsChange($event)"
              class="shrink-0 mt-0.5"
              autocomplete="off"
            />
          </div>

          <!-- External Media (YouTube embeds) -->
          <div class="flex items-start justify-between gap-4 py-3.5 last:pb-1">
            <label
              for="dialogExternalMediaSwitch"
              class="flex flex-col gap-1 min-w-0 cursor-pointer"
            >
              <span class="text-sm font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.externalMedia.title' | translate }}
              </span>
              <p
                class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed"
              >
                {{ 'cookies.categories.externalMedia.description' | translate }}
              </p>
            </label>
            <input
              id="dialogExternalMediaSwitch"
              tuiSwitch
              type="checkbox"
              [ngModel]="consent.externalMediaAllowed()"
              (ngModelChange)="onExternalMediaChange($event)"
              class="shrink-0 mt-0.5"
              autocomplete="off"
            />
          </div>
        </div>
      </div>

      <div class="lw-form-sheet-footer flex-col items-stretch gap-2">
        <div class="grid grid-cols-2 gap-2 w-full">
          <button
            tuiButton
            type="button"
            size="m"
            appearance="secondary"
            (click)="rejectAll()"
          >
            {{ 'cookies.banner.reject' | translate }}
          </button>
          <button
            tuiButton
            type="button"
            size="m"
            appearance="secondary"
            (click)="acceptAll()"
          >
            {{ 'cookies.banner.acceptAll' | translate }}
          </button>
        </div>
        <button
          tuiButton
          type="button"
          size="m"
          appearance="flat"
          class="w-full"
          (click)="close()"
        >
          {{ 'close' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class CookieSettingsDialogComponent {
  protected readonly consent = inject(ConsentService);
  private readonly toast = inject(ToastService);
  private readonly context =
    inject<TuiDialogContext<void>>(POLYMORPHEUS_CONTEXT);

  protected onAnalyticsChange(enabled: boolean): void {
    this.consent.updatePreferences({ analytics: enabled });
    this.toast.success('cookies.settings.saved');
  }

  protected onExternalMediaChange(enabled: boolean): void {
    this.consent.updatePreferences({ externalMedia: enabled });
    this.toast.success('cookies.settings.saved');
  }

  protected rejectAll(): void {
    this.consent.rejectAll();
    this.toast.success('cookies.settings.saved');
    this.close();
  }

  protected acceptAll(): void {
    this.consent.acceptAll();
    this.toast.success('cookies.settings.saved');
    this.close();
  }

  protected close(): void {
    this.context.completeWith();
  }
}
