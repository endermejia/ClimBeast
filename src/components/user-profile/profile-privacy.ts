import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiButton } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-privacy',
  host: { class: 'contents' },
  imports: [FormsModule, RouterLink, TranslatePipe, TuiButton, TuiSwitch],
  template: `
    <section
      class="flex flex-col gap-3 pt-6 mt-2 border-t border-(--tui-border-normal)"
    >
      <h2 class="text-lg font-bold m-0 text-(--tui-text-primary)">
        {{ 'cookies.settings.title' | translate }}
      </h2>

      <div class="flex flex-col divide-y divide-(--tui-border-normal)/60">
        <!-- Private profile -->
        <div class="flex items-center justify-between gap-4 py-3 first:pt-1">
          <label
            for="privateProfileSwitch"
            class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
          >
            <span class="text-sm font-medium text-(--tui-text-primary)">
              {{ 'privateProfile' | translate }}
            </span>
            <span class="text-xs text-(--tui-text-secondary) leading-snug">
              {{ 'profile.private.hint' | translate }}
            </span>
          </label>
          <input
            id="privateProfileSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="isPrivate()"
            (ngModelChange)="privateProfileChange.emit($event)"
            class="shrink-0"
            autocomplete="off"
          />
        </div>

        <!-- Cookie preferences summary + Configure button (opens modal dialog) -->
        <div class="flex items-center justify-between gap-4 py-3">
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-sm font-medium text-(--tui-text-primary)">
              {{ 'legal.cookies' | translate }}
            </span>
            <span class="text-xs text-(--tui-text-secondary)">
              {{ cookieSummaryKey() | translate }}
            </span>
          </div>
          <button
            tuiButton
            type="button"
            size="s"
            appearance="outline"
            iconStart="@tui.sliders-horizontal"
            class="shrink-0"
            (click)="openCookieSettings.emit()"
          >
            {{ 'cookies.settings.configureButton' | translate }}
          </button>
        </div>
      </div>

      <!-- Permanent access to legal documents (LSSI-CE art. 10 / RGPD art. 12) -->
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--tui-text-tertiary)"
      >
        <a
          routerLink="/terms"
          class="hover:underline text-(--tui-text-tertiary) hover:text-(--tui-text-primary)"
        >
          {{ 'legal.tabTerms' | translate }}
        </a>
        <span aria-hidden="true">&bull;</span>
        <a
          routerLink="/privacy"
          class="hover:underline text-(--tui-text-tertiary) hover:text-(--tui-text-primary)"
        >
          {{ 'legal.tabPrivacy' | translate }}
        </a>
        <span aria-hidden="true">&bull;</span>
        <a
          routerLink="/cookies"
          class="hover:underline text-(--tui-text-tertiary) hover:text-(--tui-text-primary)"
        >
          {{ 'legal.tabCookies' | translate }}
        </a>
      </div>
    </section>
  `,
})
export class ProfilePrivacyComponent {
  readonly isPrivate = input<boolean>(false);
  readonly analytics = input<boolean>(false);
  readonly externalMedia = input<boolean>(false);

  readonly privateProfileChange = output<boolean>();
  readonly openCookieSettings = output<void>();

  protected readonly cookieSummaryKey = computed(() => {
    const a = this.analytics();
    const m = this.externalMedia();
    if (a && m) return 'cookies.settings.summaryAll';
    if (a) return 'cookies.settings.summaryAnalyticsOnly';
    if (m) return 'cookies.settings.summaryYoutubeOnly';
    return 'cookies.settings.summaryEssentialOnly';
  });
}
