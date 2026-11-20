import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { ConsentService } from '../../services/consent.service';

@Component({
  selector: 'app-gdpr-notification',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiSwitch,
  ],
  template: `
    <div class="flex flex-col gap-3 max-w-full overflow-hidden">
      <p
        class="text-xs sm:text-sm leading-relaxed text-(--tui-text-primary) m-0 break-words"
      >
        {{ 'cookies.banner.message' | translate }}
      </p>

      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--tui-text-secondary)"
      >
        <a
          routerLink="/cookies"
          class="underline hover:text-(--tui-text-primary)"
          (click)="goToLegal()"
        >
          {{ 'legal.tabCookies' | translate }}
        </a>
        <span aria-hidden="true">&bull;</span>
        <a
          routerLink="/privacy"
          class="underline hover:text-(--tui-text-primary)"
          (click)="goToLegal()"
        >
          {{ 'legal.tabPrivacy' | translate }}
        </a>
      </div>

      @if (showSettings()) {
        <div
          class="flex flex-col gap-2.5 pt-2.5 border-t border-(--tui-border-normal)/60"
        >
          <!-- Necessary (always enabled, exempt under art. 22.2 LSSI-CE) -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="text-xs font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.necessary.title' | translate }}
              </span>
              <span
                class="text-[11px] leading-snug text-(--tui-text-secondary)"
              >
                {{ 'cookies.categories.necessary.short' | translate }}
              </span>
            </div>
            <input
              tuiSwitch
              type="checkbox"
              size="s"
              [ngModel]="true"
              disabled
              class="shrink-0 mt-0.5"
              [attr.aria-label]="
                'cookies.categories.necessary.title' | translate
              "
            />
          </div>

          <!-- Analytics / Performance (Vercel Speed Insights) -->
          <div class="flex items-start justify-between gap-3">
            <label
              for="bannerAnalyticsSwitch"
              class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
            >
              <span class="text-xs font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.analytics.title' | translate }}
              </span>
              <span
                class="text-[11px] leading-snug text-(--tui-text-secondary)"
              >
                {{ 'cookies.categories.analytics.short' | translate }}
              </span>
            </label>
            <input
              id="bannerAnalyticsSwitch"
              tuiSwitch
              type="checkbox"
              size="s"
              [ngModel]="analytics()"
              (ngModelChange)="analytics.set($event)"
              class="shrink-0 mt-0.5"
            />
          </div>

          <!-- External Media (YouTube iframes) -->
          <div class="flex items-start justify-between gap-3">
            <label
              for="bannerExternalMediaSwitch"
              class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
            >
              <span class="text-xs font-semibold text-(--tui-text-primary)">
                {{ 'cookies.categories.externalMedia.title' | translate }}
              </span>
              <span
                class="text-[11px] leading-snug text-(--tui-text-secondary)"
              >
                {{ 'cookies.categories.externalMedia.short' | translate }}
              </span>
            </label>
            <input
              id="bannerExternalMediaSwitch"
              tuiSwitch
              type="checkbox"
              size="s"
              [ngModel]="externalMedia()"
              (ngModelChange)="externalMedia.set($event)"
              class="shrink-0 mt-0.5"
            />
          </div>
        </div>
      }

      <!-- Equal-prominence Accept & Reject buttons (AEPD first-layer compliance) -->
      <div
        class="flex flex-col gap-2 pt-2 border-t border-(--tui-border-normal)/60"
      >
        <div class="grid grid-cols-2 gap-2">
          <button
            tuiButton
            type="button"
            size="s"
            appearance="secondary"
            class="text-xs! font-semibold! w-full"
            (click)="reject()"
          >
            {{ 'cookies.banner.reject' | translate }}
          </button>
          <button
            tuiButton
            type="button"
            size="s"
            appearance="secondary"
            class="text-xs! font-semibold! w-full"
            (click)="acceptAll()"
          >
            {{ 'cookies.banner.acceptAll' | translate }}
          </button>
        </div>

        @if (showSettings()) {
          <button
            tuiButton
            type="button"
            size="s"
            appearance="primary"
            class="text-xs! font-semibold! w-full"
            (click)="saveSelection()"
          >
            {{ 'cookies.banner.saveSelection' | translate }}
          </button>
        } @else {
          <button
            tuiButton
            type="button"
            size="xs"
            appearance="flat"
            class="text-xs! font-medium! w-full"
            (click)="toggleSettings()"
          >
            <tui-icon icon="@tui.sliders-horizontal" class="text-xs mr-1" />
            {{ 'cookies.banner.configure' | translate }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 100%;
        box-sizing: border-box;
      }
    `,
  ],
})
export class GdprNotificationComponent {
  private readonly context =
    inject<TuiDialogContext<boolean>>(POLYMORPHEUS_CONTEXT);
  private readonly consent = inject(ConsentService);

  private closed = false;

  protected readonly showSettings = signal(false);
  protected readonly analytics = signal(false);
  protected readonly externalMedia = signal(false);

  constructor() {
    effect(() => {
      if (this.consent.hasDecided()) {
        this.close(true);
      }
    });
  }

  protected toggleSettings(): void {
    this.showSettings.update((v) => !v);
  }

  protected goToLegal(): void {
    this.close(false);
  }

  protected reject(): void {
    this.consent.rejectAll();
    this.close(true);
  }

  protected acceptAll(): void {
    this.consent.acceptAll();
    this.close(true);
  }

  protected saveSelection(): void {
    this.consent.updatePreferences({
      analytics: this.analytics(),
      externalMedia: this.externalMedia(),
    });
    this.close(true);
  }

  private close(result: boolean): void {
    if (this.closed) return;
    this.closed = true;
    this.context.completeWith(result);
  }
}
