import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiButton, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SeoService } from '../../services/seo.service';

import { AscentTypeComponent } from '../../components/ascent/ascent-type';
import { CragCardComponent } from '../../components/crag/crag-card';
import { GradeComponent } from '../../components/ui/avatar-grade';

import { CragListItem, VERTICAL_LIFE_GRADES } from '../../models';

@Component({
  selector: 'app-landing',
  imports: [
    AscentTypeComponent,
    CragCardComponent,
    GradeComponent,
    NgOptimizedImage,
    RouterLink,
    TranslatePipe,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiHeader,
    TuiIcon,
    TuiTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen flex flex-col bg-(--tui-background-base) text-(--tui-text-primary)"
    >
      <!-- Navigation Header -->
      <header
        tuiHeader
        class="sticky top-0 z-50 backdrop-blur-md bg-(--tui-background-base)/90 border-b border-(--tui-border-normal) px-4 sm:px-8 py-3"
      >
        <div
          class="max-w-6xl mx-auto w-full flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3">
            <div class="relative w-8 h-8 shrink-0">
              <img
                ngSrc="/logo/climbeast.svg"
                alt="ClimBeast Logo"
                fill
                class="object-contain"
                priority
              />
            </div>
            <span
              tuiTitle
              class="font-extrabold! tracking-tight text-3xl sm:text-4xl"
            >
              {{ 'appName' | translate }}
            </span>
          </div>

          <div class="hidden sm:flex items-center gap-2">
            <a routerLink="/login" tuiButton size="s" appearance="flat">
              {{ 'landing.exploreApp' | translate }}
            </a>
            <a
              routerLink="/login"
              [queryParams]="{ register: 'true' }"
              tuiButton
              size="s"
              appearance="primary"
              iconEnd="@tui.arrow-right"
            >
              {{ 'landing.getStarted' | translate }}
            </a>
          </div>
        </div>
      </header>

      <main
        class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 flex flex-col gap-12 sm:gap-16"
      >
        <!-- Hero Section -->
        <section class="w-full py-6 sm:py-10 flex flex-col items-center gap-0">
          <img
            ngSrc="/logo/climbeast.svg"
            alt="ClimBeast"
            width="192"
            height="192"
            class="w-40 h-40 sm:w-48 sm:h-48 object-contain mx-auto"
          />
          <div class="flex flex-col items-start gap-5 text-left w-full">
            <h1
              class="text-4xl sm:text-5xl lg:text-6xl font-black! text-(--tui-text-primary) leading-tight tracking-tight w-full"
            >
              {{ 'landing.heroTitle' | translate }}
            </h1>
            <p
              class="text-base sm:text-lg text-(--tui-text-secondary) leading-relaxed font-normal w-full"
            >
              {{ 'landing.heroSubtitle' | translate }}
            </p>

            <div
              class="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto"
            >
              <a
                routerLink="/login"
                [queryParams]="{ register: 'true' }"
                tuiButton
                size="l"
                appearance="primary"
                iconEnd="@tui.arrow-right"
                class="w-full sm:w-auto shadow-sm"
              >
                {{ 'landing.getStarted' | translate }}
              </a>
              <a
                routerLink="/login"
                tuiButton
                size="l"
                appearance="outline"
                class="w-full sm:w-auto"
              >
                {{ 'landing.exploreApp' | translate }}
              </a>
            </div>
          </div>
        </section>

        <!-- Stats -->
        <section class="p-6 border border-(--tui-border-normal) rounded-3xl">
          <div
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center"
          >
            <div class="flex flex-col items-center justify-center p-3">
              <tui-icon
                icon="@tui.users"
                class="text-3xl text-(--tui-text-accent) mb-2"
              />
              <span class="text-lg font-bold text-(--tui-text-primary)">{{
                'landing.stats.communityTitle' | translate
              }}</span>
              <span
                class="text-xs font-medium text-(--tui-text-secondary) mt-1.5 leading-snug"
              >
                {{ 'landing.stats.routes' | translate }}
              </span>
            </div>
            <div class="flex flex-col items-center justify-center p-3">
              <tui-icon
                icon="@tui.heart"
                class="text-3xl text-(--tui-status-negative) mb-2"
              />
              <span class="text-lg font-bold text-(--tui-text-primary)">{{
                'landing.stats.socialTitle' | translate
              }}</span>
              <span
                class="text-xs font-medium text-(--tui-text-secondary) mt-1.5 leading-snug"
              >
                {{ 'landing.stats.logbook' | translate }}
              </span>
            </div>
            <div class="flex flex-col items-center justify-center p-3">
              <tui-icon
                icon="@tui.shield"
                class="text-3xl text-(--tui-status-warning) mb-2"
              />
              <span class="text-lg font-bold text-(--tui-text-primary)">{{
                'landing.stats.equippersTitle' | translate
              }}</span>
              <span
                class="text-xs font-medium text-(--tui-text-secondary) mt-1.5 leading-snug"
              >
                {{ 'landing.stats.weather' | translate }}
              </span>
            </div>
            <div class="flex flex-col items-center justify-center p-3">
              <tui-icon
                icon="@tui.newspaper"
                class="text-3xl text-(--tui-status-info) mb-2"
              />
              <span class="text-lg font-bold text-(--tui-text-primary)">{{
                'landing.stats.newsTitle' | translate
              }}</span>
              <span
                class="text-xs font-medium text-(--tui-text-secondary) mt-1.5 leading-snug"
              >
                {{ 'landing.stats.offline' | translate }}
              </span>
            </div>
          </div>
        </section>

        <!-- Demo: Ascent Card -->
        <section
          class="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12"
        >
          <div class="flex flex-col gap-5">
            <div>
              <h2
                class="text-4xl sm:text-5xl lg:text-6xl font-black! text-(--tui-text-primary) leading-tight tracking-tight"
              >
                {{ 'landing.demo.ascentsTitle' | translate }}
              </h2>
              <p
                class="text-base sm:text-lg text-(--tui-text-secondary) leading-relaxed"
              >
                {{ 'landing.demo.ascentsDesc' | translate }}
              </p>
            </div>
            <div
              class="flex flex-wrap items-center gap-4 text-sm font-medium text-(--tui-text-tertiary)"
            >
              <span class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.heart"
                  class="text-(--tui-status-negative)"
                />
                {{ 'landing.demo.ascentsFeature1' | translate }}
              </span>
              <span class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.message-circle"
                  class="text-(--tui-status-info)"
                />
                {{ 'landing.demo.ascentsFeature2' | translate }}
              </span>
              <span class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.users"
                  class="text-(--tui-text-positive)"
                />
                {{ 'landing.demo.ascentsFeature3' | translate }}
              </span>
            </div>
          </div>
          <div class="w-full lg:w-96 shrink-0">
            <div
              tuiAppearance="outline-grayscale"
              class="flex flex-col gap-1 p-4 rounded-3xl text-left border border-(--tui-border-normal) shadow-lg"
            >
              <header
                tuiHeader
                class="flex flex-wrap justify-between items-center gap-x-2 gap-y-0"
              >
                <div class="flex items-center gap-3 no-underline text-inherit">
                  <span tuiAvatar size="s">
                    <tui-icon icon="@tui.user" />
                  </span>
                  <div class="flex flex-col">
                    <span class="font-bold text-sm">Ana García</span>
                    <span class="text-xs"> hace 2 horas</span>
                  </div>
                </div>
                <span tuiBadge appearance="neutral" size="s">Siguiendo</span>
              </header>

              <div class="flex flex-col gap-1">
                <div class="text-lg leading-tight">
                  <span class="font-bold">Hay bruneta</span>
                  <span class="mx-1.5 opacity-70 text-sm">&bull;</span>
                  <span class="text-sm opacity-70">Aéreo (Agujas Rojas)</span>
                </div>
                <div
                  class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
                >
                  <app-grade [grade]="28" size="s" />
                  <app-ascent-type [type]="'rp'" size="s" />
                </div>
              </div>

              <p
                class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start"
              >
                "Vía preciosa, la roca espectacular."
              </p>

              <footer class="flex flex-col gap-1 mt-2">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div class="flex items-center gap-1">
                    <tui-icon
                      icon="@tui.heart-filled"
                      [style.width.rem]="1.5"
                      [style.height.rem]="1.5"
                      style="color: var(--tui-status-negative)"
                      class="cursor-pointer"
                    />
                    <button
                      tuiButton
                      type="button"
                      appearance="action-grayscale"
                      class="pr-1! pl-1! h-auto!"
                    >
                      14
                    </button>
                  </div>
                  <div class="flex items-center gap-1">
                    <tui-icon
                      icon="@tui.message-circle"
                      [style.width.rem]="1.5"
                      [style.height.rem]="1.5"
                      class="cursor-pointer"
                    />
                    <button
                      tuiButton
                      type="button"
                      appearance="action-grayscale"
                      class="pr-1! pl-1! h-auto!"
                    >
                      3
                    </button>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </section>

        <!-- Demo: Area Card -->
        <section class="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div class="flex flex-col gap-5">
            <div>
              <h2
                class="text-4xl sm:text-5xl lg:text-6xl font-black! text-(--tui-text-primary) leading-tight tracking-tight"
              >
                {{ 'landing.demo.areasTitle' | translate }}
              </h2>
              <p
                class="text-base sm:text-lg text-(--tui-text-secondary) leading-relaxed"
              >
                {{ 'landing.demo.areasDesc' | translate }}
              </p>
            </div>
            <div
              class="flex flex-wrap items-center gap-4 text-sm font-medium text-(--tui-text-tertiary)"
            >
              <span class="flex items-center gap-2">
                <tui-icon
                  icon="@tui.map-pin"
                  class="text-(--tui-text-accent)"
                />
                {{ 'landing.demo.areasFeature1' | translate }}
              </span>
              <span class="flex items-center gap-2">
                <tui-icon icon="@tui.route" class="text-(--tui-text-accent)" />
                {{ 'landing.demo.areasFeature2' | translate }}
              </span>
              <span class="flex items-center gap-2">
                <tui-icon icon="@tui.sun" class="text-(--tui-text-accent)" />
                {{ 'landing.demo.areasFeature3' | translate }}
              </span>
            </div>
          </div>
          <div class="w-full lg:w-96 shrink-0 shadow-lg rounded-3xl">
            <app-crag-card [crag]="mockCrag" />
          </div>
        </section>
      </main>

      <!-- Footer -->
      <footer
        class="border-t border-(--tui-border-normal) py-6 px-4 sm:px-8 bg-(--tui-background-neutral-1)"
      >
        <div
          class="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-(--tui-text-tertiary)"
        >
          <div class="flex items-center gap-2 whitespace-nowrap">
            <div class="relative w-5 h-5">
              <img
                ngSrc="/logo/climbeast.svg"
                alt="ClimBeast Logo"
                fill
                class="object-contain"
              />
            </div>
            <span class="font-bold text-sm text-(--tui-text-primary)">{{
              'appName' | translate
            }}</span>
            <span class="font-normal text-xs text-(--tui-text-secondary)"
              >| {{ 'climbeast.subtitle' | translate }}</span
            >
            <span class="text-xs">© {{ currentYear }}</span>
          </div>

          <div class="flex items-center gap-4 font-medium">
            <a
              routerLink="/login"
              class="hover:underline text-(--tui-text-secondary)"
            >
              {{ 'landing.exploreApp' | translate }}
            </a>
            <span>•</span>
            <a
              routerLink="/login"
              [queryParams]="{ register: 'true' }"
              class="hover:underline text-(--tui-text-secondary)"
            >
              {{ 'landing.getStarted' | translate }}
            </a>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class LandingComponent {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);

  protected readonly currentYear = new Date().getFullYear();

  protected readonly mockCrag: CragListItem = {
    id: 1,
    name: 'El Aéreo',
    slug: 'el-aereo',
    area_id: 1,
    area_name: 'Agujas Rojas',
    area_slug: 'agujas-rojas',
    routes_count: 12,
    topos_count: 2,
    liked: true,
    created_at: '2026-01-01T00:00:00Z',
    climbing_kind: ['sport'],
    shade_morning: false,
    shade_afternoon: false,
    shade_all_day: false,
    sun_all_day: false,
    user_creator_id: 'mock-user-creator',
    topos: [
      { id: 1, name: 'Vías clásicas', slug: 'clasicas' },
      { id: 2, name: 'Placa y desplome', slug: 'placa-desplome' },
    ],
    grades: {
      [VERTICAL_LIFE_GRADES.G6a]: 2,
      [VERTICAL_LIFE_GRADES.G6b]: 3,
      [VERTICAL_LIFE_GRADES.G6c]: 2,
      [VERTICAL_LIFE_GRADES.G7a]: 3,
      [VERTICAL_LIFE_GRADES.G7b]: 1,
      [VERTICAL_LIFE_GRADES.G7c]: 1,
    },
  };

  constructor() {
    this.seo.setPage({
      title: this.translate.instant('seo.title'),
      description:
        this.translate.instant('landing.description') ||
        this.translate.instant('seo.description'),
      canonicalUrl: 'https://climbeast.com/info',
    });
  }
}
