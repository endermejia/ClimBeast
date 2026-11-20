import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiIcon } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-privacy',
  host: { class: 'contents' },
  imports: [FormsModule, RouterLink, TranslatePipe, TuiIcon, TuiSwitch],
  template: `
    <div class="flex flex-col gap-4 mt-6">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-bold m-0">
          {{ 'cookies.settings.title' | translate }}
        </h2>
        <p class="m-0 text-sm text-(--tui-text-secondary)">
          {{ 'cookies.settings.subtitle' | translate }}
        </p>
      </div>

      <div
        class="flex flex-col gap-4 pl-4 border-l-2 border-(--tui-border-normal)"
      >
        <!-- Necessary (always enabled) -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5 min-w-0">
            <label
              tuiLabel
              for="privacyNecessarySwitch"
              class="font-medium text-(--tui-text-primary)"
            >
              {{ 'cookies.categories.necessary.title' | translate }}
            </label>
            <p class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed">
              {{ 'cookies.categories.necessary.description' | translate }}
            </p>
          </div>
          <input
            id="privacyNecessarySwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="true"
            disabled
            class="shrink-0 mt-0.5"
            autocomplete="off"
          />
        </div>

        <!-- Analytics / Performance (Vercel Speed Insights) -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5 min-w-0">
            <label
              tuiLabel
              for="privacyAnalyticsSwitch"
              class="font-medium text-(--tui-text-primary) cursor-pointer"
            >
              {{ 'cookies.categories.analytics.title' | translate }}
            </label>
            <p class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed">
              {{ 'cookies.categories.analytics.description' | translate }}
            </p>
          </div>
          <input
            id="privacyAnalyticsSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="analytics()"
            (ngModelChange)="analyticsChange.emit($event)"
            class="shrink-0 mt-0.5"
            autocomplete="off"
          />
        </div>

        <!-- External Media (YouTube embeds) -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5 min-w-0">
            <label
              tuiLabel
              for="privacyExternalMediaSwitch"
              class="font-medium text-(--tui-text-primary) cursor-pointer"
            >
              {{ 'cookies.categories.externalMedia.title' | translate }}
            </label>
            <p class="m-0 text-xs text-(--tui-text-secondary) leading-relaxed">
              {{ 'cookies.categories.externalMedia.description' | translate }}
            </p>
          </div>
          <input
            id="privacyExternalMediaSwitch"
            tuiSwitch
            type="checkbox"
            [ngModel]="externalMedia()"
            (ngModelChange)="externalMediaChange.emit($event)"
            class="shrink-0 mt-0.5"
            autocomplete="off"
          />
        </div>
      </div>

      <!-- Permanent access to legal documents (LSSI-CE art. 10 / RGPD art. 12) -->
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-(--tui-text-secondary)"
      >
        <a
          routerLink="/terms"
          class="inline-flex items-center gap-1.5 hover:underline text-(--tui-text-secondary) hover:text-(--tui-text-primary)"
        >
          <tui-icon icon="@tui.file-text" class="text-xs" />
          {{ 'legal.tabTerms' | translate }}
        </a>
        <a
          routerLink="/privacy"
          class="inline-flex items-center gap-1.5 hover:underline text-(--tui-text-secondary) hover:text-(--tui-text-primary)"
        >
          <tui-icon icon="@tui.shield" class="text-xs" />
          {{ 'legal.tabPrivacy' | translate }}
        </a>
        <a
          routerLink="/cookies"
          class="inline-flex items-center gap-1.5 hover:underline text-(--tui-text-secondary) hover:text-(--tui-text-primary)"
        >
          <tui-icon icon="@tui.cookie" class="text-xs" />
          {{ 'legal.tabCookies' | translate }}
        </a>
      </div>
    </div>
  `,
})
export class ProfilePrivacyComponent {
  readonly analytics = input<boolean>(false);
  readonly externalMedia = input<boolean>(false);

  readonly analyticsChange = output<boolean>();
  readonly externalMediaChange = output<boolean>();
}
