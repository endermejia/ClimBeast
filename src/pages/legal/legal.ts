import { Location, NgOptimizedImage } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';

import { TuiButton, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiSwitch, TuiTabs } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';

import { ConsentService } from '../../services/consent.service';
import { ToastService } from '../../services/toast.service';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-legal',
  imports: [
    FormsModule,
    NgOptimizedImage,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiSwitch,
    TuiTabs,
    TuiTitle,
  ],
  template: `
    <div
      class="min-h-screen bg-(--tui-background-base) text-(--tui-text-primary) flex flex-col"
    >
      <!-- Header -->
      <header
        class="border-b border-(--tui-border-normal) bg-(--tui-background-base)/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3"
      >
        <div
          class="max-w-4xl mx-auto w-full flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <button
              tuiButton
              type="button"
              appearance="flat"
              size="s"
              iconStart="@tui.arrow-left"
              (click.zoneless)="goBack()"
            >
              {{ 'legal.back' | translate }}
            </button>
            <div class="h-5 w-px bg-(--tui-border-normal)"></div>
            <a
              routerLink="/"
              class="flex items-center gap-2.5 no-underline text-inherit"
              aria-label="ClimBeast"
            >
              <div class="relative w-7 h-7 shrink-0">
                <img
                  ngSrc="/logo/climbeast-small.svg"
                  alt="ClimBeast"
                  fill
                  class="object-contain"
                  priority
                />
              </div>
              <span
                class="inline-flex items-center font-black tracking-tight text-lg sm:text-xl leading-none select-none hidden sm:inline-flex"
              >
                <span class="text-(--tui-text-primary)">CLIM</span
                ><span class="text-[#ff5e00]">BEAST</span>
              </span>
            </a>
          </div>

          <div class="text-xs text-(--tui-text-tertiary)">
            {{ 'legal.lastUpdated' | translate }}
          </div>
        </div>
      </header>

      <!-- Main Container -->
      <main
        class="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-10 flex flex-col gap-6"
      >
        <div>
          <h1
            tuiTitle="l"
            class="font-black! tracking-tight text-3xl sm:text-4xl text-(--tui-text-primary) mb-2"
          >
            {{ 'legal.title' | translate }}
          </h1>
          <p class="text-sm sm:text-base text-(--tui-text-secondary)">
            {{ 'legal.subtitle' | translate }}
          </p>
        </div>

        <!-- Navigation Tabs -->
        <tui-tabs
          [activeItemIndex]="activeTab()"
          (activeItemIndexChange)="onTabChange($event)"
          class="border-b border-(--tui-border-normal)"
        >
          <button tuiTab type="button">
            <tui-icon icon="@tui.file-text" class="mr-1.5" />
            {{ 'legal.tabTerms' | translate }}
          </button>
          <button tuiTab type="button">
            <tui-icon icon="@tui.shield" class="mr-1.5" />
            {{ 'legal.tabPrivacy' | translate }}
          </button>
          <button tuiTab type="button">
            <tui-icon icon="@tui.cookie" class="mr-1.5" />
            {{ 'legal.tabCookies' | translate }}
          </button>
        </tui-tabs>

        <!-- Content Area -->
        <article
          class="flex flex-col gap-8 text-(--tui-text-secondary) leading-relaxed"
        >
          @if (activeTab() === 0) {
            <!-- TERMS & RULES TAB -->
            <section class="flex flex-col gap-8">
              <p class="text-base text-(--tui-text-primary) font-medium">
                {{ 'legal.terms.intro' | translate }}
              </p>

              <!-- 0. Legal Notice (LSSI-CE Art. 10) -->
              <div
                class="rounded-2xl border border-(--tui-border-normal) bg-(--tui-background-neutral-1) p-5 flex flex-col gap-3"
              >
                <div
                  class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-(--tui-text-tertiary)"
                >
                  <tui-icon icon="@tui.info" class="w-4 h-4 shrink-0" />
                  <span>{{ 'legal.notice.badge' | translate }}</span>
                </div>
                <h2 class="text-xl font-bold text-(--tui-text-primary) m-0">
                  {{ 'legal.notice.title' | translate }}
                </h2>
                <p class="text-sm m-0">
                  {{ 'legal.notice.intro' | translate }}
                </p>
                <dl
                  class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm m-0 pt-2 border-t border-(--tui-border-normal)"
                >
                  <div>
                    <dt class="text-xs text-(--tui-text-tertiary)">
                      {{ 'legal.notice.ownerLabel' | translate }}
                    </dt>
                    <dd class="m-0 font-medium text-(--tui-text-primary)">
                      Gabriel Mejia Melgarejo
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs text-(--tui-text-tertiary)">
                      {{ 'legal.notice.taxIdLabel' | translate }}
                    </dt>
                    <dd class="m-0 font-medium text-(--tui-text-primary)">
                      74387418J
                    </dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-xs text-(--tui-text-tertiary)">
                      {{ 'legal.notice.addressLabel' | translate }}
                    </dt>
                    <dd class="m-0 font-medium text-(--tui-text-primary)">
                      Calle Río Bidasoa 93, 03420 Castalla, Alicante, España
                    </dd>
                  </div>
                  <div class="sm:col-span-2">
                    <dt class="text-xs text-(--tui-text-tertiary)">
                      {{ 'legal.notice.emailLabel' | translate }}
                    </dt>
                    <dd class="m-0 font-medium">
                      <a
                        href="mailto:soporte@climbeast.com"
                        class="text-(--tui-text-primary) underline hover:opacity-80"
                      >
                        soporte&#64;climbeast.com
                      </a>
                    </dd>
                  </div>
                </dl>
                <p class="text-xs text-(--tui-text-tertiary) m-0 pt-1">
                  {{ 'legal.notice.jurisdiction' | translate }}
                </p>
              </div>

              <!-- 1. Service Description -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.serviceTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.serviceBody' | translate }}</p>
              </div>

              <!-- 2. ANTI-SCRAPING SECTION (HIGHLIGHTED - NO BOX) -->
              <div
                class="border-l-4 border-amber-500 pl-5 py-1 flex flex-col gap-3"
              >
                <div
                  class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider"
                >
                  <tui-icon icon="@tui.shield-alert" class="w-4 h-4 shrink-0" />
                  <span>{{
                    'legal.terms.antiScrapingNotice' | translate
                  }}</span>
                </div>
                <h2
                  class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400"
                >
                  {{ 'legal.terms.antiScrapingTitle' | translate }}
                </h2>
                <p
                  class="font-medium text-(--tui-text-primary) leading-relaxed"
                >
                  {{ 'legal.terms.antiScrapingBody1' | translate }}
                </p>
                <p class="text-sm">
                  {{ 'legal.terms.antiScrapingBody2' | translate }}
                </p>
                <p class="text-sm">
                  {{ 'legal.terms.antiScrapingBody3' | translate }}
                </p>
                <div
                  class="flex items-start gap-2 pt-2 text-xs text-amber-700 dark:text-amber-400/90 font-medium border-t border-amber-500/20"
                >
                  <tui-icon
                    icon="@tui.circle-alert"
                    class="w-3.5 h-3.5 shrink-0 mt-0.5"
                  />
                  <span>{{
                    'legal.terms.antiScrapingSanctions' | translate
                  }}</span>
                </div>
              </div>

              <!-- 3. Community Rules -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.communityTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.communityBody' | translate }}</p>
              </div>

              <!-- 4. Safety & Assumption of Risk -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.safetyTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.safetyBody' | translate }}</p>
              </div>

              <!-- 5. Transparency -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.transparencyTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.transparencyBody' | translate }}</p>
              </div>

              <!-- 6. IP & User Content -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.ipTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.ipBody' | translate }}</p>
              </div>

              <!-- 7. Commerce, Purchases & Right of Withdrawal -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.commerceTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.commerceBody' | translate }}</p>
              </div>

              <!-- 8. Termination & Amendments -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.terms.terminationTitle' | translate }}
                </h2>
                <p>{{ 'legal.terms.terminationBody' | translate }}</p>
              </div>
            </section>
          } @else if (activeTab() === 1) {
            <!-- PRIVACY TAB -->
            <section class="flex flex-col gap-8">
              <p class="text-base text-(--tui-text-primary) font-medium">
                {{ 'legal.privacy.intro' | translate }}
              </p>

              <!-- 1. Controller -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.controllerTitle' | translate }}
                </h2>
                <p>{{ 'legal.privacy.controllerBody' | translate }}</p>
              </div>

              <!-- 2. Data Collected -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.dataCollectedTitle' | translate }}
                </h2>
                <p>{{ 'legal.privacy.dataCollectedBody' | translate }}</p>
              </div>

              <!-- 3. Purpose & Legal Basis -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.purposeTitle' | translate }}
                </h2>
                <p>{{ 'legal.privacy.purposeBody' | translate }}</p>
              </div>

              <!-- 4. Third Parties -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.thirdPartyTitle' | translate }}
                </h2>
                <p>{{ 'legal.privacy.thirdPartyBody' | translate }}</p>
              </div>

              <!-- 5. Rights (ARCO-POL) -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.rightsTitle' | translate }}
                </h2>
                <p>{{ 'legal.privacy.rightsBody' | translate }}</p>
              </div>

              <!-- 6. Account Deletion (HIGHLIGHTED - NO BOX) -->
              <div
                class="border-l-4 border-rose-500/70 pl-5 py-1 flex flex-col gap-2"
              >
                <div
                  class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider"
                >
                  <tui-icon icon="@tui.trash" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ 'legal.privacy.deletionBadge' | translate }}</span>
                </div>
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.privacy.deletionTitle' | translate }}
                </h2>
                <p class="text-sm">
                  {{ 'legal.privacy.deletionBody' | translate }}
                </p>
              </div>
            </section>
          } @else {
            <!-- COOKIES TAB -->
            <section class="flex flex-col gap-8">
              <p class="text-base text-(--tui-text-primary) font-medium">
                {{ 'legal.cookies.intro' | translate }}
              </p>

              <!-- 1. Zero Tracking Commitment (HIGHLIGHTED - NO BOX) -->
              <div
                class="border-l-4 border-emerald-500 pl-5 py-1 flex flex-col gap-2"
              >
                <div
                  class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider"
                >
                  <tui-icon icon="@tui.shield" class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ 'legal.cookies.commitmentBadge' | translate }}</span>
                </div>
                <h2
                  class="text-xl font-bold text-emerald-600 dark:text-emerald-400"
                >
                  {{ 'legal.cookies.commitmentTitle' | translate }}
                </h2>
                <p class="text-sm font-medium text-(--tui-text-primary)">
                  {{ 'legal.cookies.commitmentBody' | translate }}
                </p>
              </div>

              <!-- 2. Technologies Used -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.cookies.typesTitle' | translate }}
                </h2>
                <p>{{ 'legal.cookies.typesBody' | translate }}</p>
              </div>

              <!-- 3. Managing Cookies -->
              <div
                class="border-l-2 border-(--tui-border-normal) pl-5 py-1 flex flex-col gap-2 transition-colors hover:border-(--tui-border-hover)"
              >
                <h2 class="text-xl font-bold text-(--tui-text-primary)">
                  {{ 'legal.cookies.manageTitle' | translate }}
                </h2>
                <p>{{ 'legal.cookies.manageBody' | translate }}</p>
              </div>

              <!-- 4. Interactive Cookie Preferences Panel -->
              <div
                class="rounded-2xl border border-(--tui-border-normal) bg-(--tui-background-neutral-1) p-5 flex flex-col gap-4"
              >
                <div class="flex flex-col gap-1">
                  <h2 class="text-lg font-bold text-(--tui-text-primary) m-0">
                    {{ 'cookies.settings.title' | translate }}
                  </h2>
                  <p class="text-xs text-(--tui-text-secondary) m-0">
                    {{ 'cookies.settings.subtitle' | translate }}
                  </p>
                </div>

                <div class="flex flex-col gap-3.5">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span
                        class="text-sm font-semibold text-(--tui-text-primary)"
                      >
                        {{ 'cookies.categories.necessary.title' | translate }}
                      </span>
                      <span class="text-xs text-(--tui-text-secondary)">
                        {{
                          'cookies.categories.necessary.description' | translate
                        }}
                      </span>
                    </div>
                    <input
                      tuiSwitch
                      type="checkbox"
                      [ngModel]="true"
                      disabled
                      class="shrink-0 mt-0.5"
                      [attr.aria-label]="
                        'cookies.categories.necessary.title' | translate
                      "
                    />
                  </div>

                  <div class="flex items-start justify-between gap-4">
                    <label
                      for="legalAnalyticsSwitch"
                      class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
                    >
                      <span
                        class="text-sm font-semibold text-(--tui-text-primary)"
                      >
                        {{ 'cookies.categories.analytics.title' | translate }}
                      </span>
                      <span class="text-xs text-(--tui-text-secondary)">
                        {{
                          'cookies.categories.analytics.description' | translate
                        }}
                      </span>
                    </label>
                    <input
                      id="legalAnalyticsSwitch"
                      tuiSwitch
                      type="checkbox"
                      [ngModel]="consent.analyticsAllowed()"
                      (ngModelChange)="onAnalyticsChange($event)"
                      class="shrink-0 mt-0.5"
                    />
                  </div>

                  <div class="flex items-start justify-between gap-4">
                    <label
                      for="legalExternalMediaSwitch"
                      class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
                    >
                      <span
                        class="text-sm font-semibold text-(--tui-text-primary)"
                      >
                        {{
                          'cookies.categories.externalMedia.title' | translate
                        }}
                      </span>
                      <span class="text-xs text-(--tui-text-secondary)">
                        {{
                          'cookies.categories.externalMedia.description'
                            | translate
                        }}
                      </span>
                    </label>
                    <input
                      id="legalExternalMediaSwitch"
                      tuiSwitch
                      type="checkbox"
                      [ngModel]="consent.externalMediaAllowed()"
                      (ngModelChange)="onExternalMediaChange($event)"
                      class="shrink-0 mt-0.5"
                    />
                  </div>
                </div>

                <div
                  class="grid grid-cols-2 gap-2 pt-3 border-t border-(--tui-border-normal)"
                >
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    appearance="secondary"
                    (click.zoneless)="rejectAllCookies()"
                  >
                    {{ 'cookies.banner.reject' | translate }}
                  </button>
                  <button
                    tuiButton
                    type="button"
                    size="s"
                    appearance="secondary"
                    (click.zoneless)="acceptAllCookies()"
                  >
                    {{ 'cookies.banner.acceptAll' | translate }}
                  </button>
                </div>
              </div>
            </section>
          }
        </article>
      </main>

      <!-- Footer -->
      <footer
        class="border-t border-(--tui-border-normal) bg-(--tui-background-neutral-1) py-6 px-4 text-center text-xs text-(--tui-text-tertiary)"
      >
        <div
          class="max-w-4xl mx-auto flex items-center justify-center gap-4 flex-wrap"
        >
          <a routerLink="/terms" class="hover:underline">{{
            'legal.tabTerms' | translate
          }}</a>
          <span>•</span>
          <a routerLink="/privacy" class="hover:underline">{{
            'legal.tabPrivacy' | translate
          }}</a>
          <span>•</span>
          <a routerLink="/cookies" class="hover:underline">{{
            'legal.tabCookies' | translate
          }}</a>
          <span>•</span>
          <a
            routerLink="/"
            class="hover:underline font-medium text-(--tui-text-primary)"
            >{{ 'legal.backToHome' | translate }}</a
          >
        </div>
      </footer>
    </div>
  `,
})
export class LegalComponent {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly isBrowser = inject(IS_BROWSER);
  protected readonly consent = inject(ConsentService);
  private readonly toast = inject(ToastService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly activeTab = computed(() => {
    const url = this.currentUrl();
    if (url.includes('/privacy')) return 1;
    if (url.includes('/cookies')) return 2;
    return 0;
  });

  onTabChange(index: number): void {
    const target =
      index === 0 ? '/terms' : index === 1 ? '/privacy' : '/cookies';
    void this.router.navigateByUrl(target);
  }

  protected onAnalyticsChange(enabled: boolean): void {
    this.consent.updatePreferences({ analytics: enabled });
    this.toast.success('cookies.settings.saved');
  }

  protected onExternalMediaChange(enabled: boolean): void {
    this.consent.updatePreferences({ externalMedia: enabled });
    this.toast.success('cookies.settings.saved');
  }

  protected acceptAllCookies(): void {
    this.consent.acceptAll();
    this.toast.success('cookies.settings.saved');
  }

  protected rejectAllCookies(): void {
    this.consent.rejectAll();
    this.toast.success('cookies.settings.saved');
  }

  goBack(): void {
    if (
      this.isBrowser &&
      typeof window !== 'undefined' &&
      window.history.length > 1
    ) {
      this.location.back();
    } else {
      void this.router.navigate(['/']);
    }
  }
}
