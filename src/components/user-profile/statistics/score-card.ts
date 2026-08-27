import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiHint, TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentTypes, RouteScore } from '../../../models';

import { CountUpDirective } from '../../../directives/count-up.directive';

@Component({
  selector: 'app-user-profile-stats-score',
  standalone: true,
  imports: [
    CommonModule,
    CountUpDirective,
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    TuiHint,
    TuiScrollbar,
  ],
  template: `
    @if (!compact()) {
      <div class="grid gap-6">
        <!-- Score Card -->
        <div
          class="bg-(--tui-background-base) shadow-md rounded-2xl p-6 text-center border border-(--tui-border-normal)"
          [tuiHint]="topRoutes().length > 0 ? scoreHintTemplate : null"
        >
          <div
            class="text-(--tui-text-tertiary) uppercase text-sm font-bold tracking-wider mb-2"
          >
            {{ 'statistics.totalScore' | translate }}
          </div>
          <div
            class="text-6xl font-black tabular-nums tracking-tight"
            [appCountUp]="totalScore()"
            #totalScoreAnim="appCountUp"
          >
            {{ totalScoreAnim.currentValue() | number: '1.0-0' }}
          </div>
          <div class="text-(--tui-text-tertiary) mt-2 text-sm">
            {{ 'statistics.top10Ascents' | translate }}
          </div>
        </div>

        <!-- Key Stats Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            class="bg-(--tui-background-base) shadow-sm p-4 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1"
          >
            <div
              class="text-3xl font-bold"
              [appCountUp]="totalAscents()"
              #totalAscentsAnim="appCountUp"
            >
              {{ totalAscentsAnim.currentValue() | number: '1.0-0' }}
            </div>
            <div class="text-xs uppercase opacity-70 font-semibold">
              {{ 'ascents' | translate }}
            </div>
          </div>
          <div
            class="bg-(--tui-background-base) shadow-sm p-4 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1"
            [tuiHint]="
              maxRedpointRoutes().length > 0 ? gradeHintTemplate : null
            "
            [tuiHintContext]="{
              title: ('ascentTypes.rp' | translate),
              grade: maxRedpoint(),
              routes: maxRedpointRoutes(),
            }"
          >
            <div class="text-3xl font-bold text-(--tui-status-negative)">
              {{ maxRedpoint() || '-' }}
            </div>
            <div class="text-xs uppercase opacity-70 font-semibold">
              {{ 'ascentTypes.rp' | translate }}
            </div>
          </div>
          <div
            class="bg-(--tui-background-base) shadow-sm p-4 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1"
            [tuiHint]="maxOnsightRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.os' | translate),
              grade: maxOnsight(),
              routes: maxOnsightRoutes(),
            }"
          >
            <div class="text-3xl font-bold text-(--tui-status-positive)">
              {{ maxOnsight() || '-' }}
            </div>
            <div class="text-xs uppercase opacity-70 font-semibold">
              {{ 'ascentTypes.os' | translate }}
            </div>
          </div>
          <div
            class="bg-(--tui-background-base) shadow-sm p-4 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1"
            [tuiHint]="maxFlashRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.f' | translate),
              grade: maxFlash(),
              routes: maxFlashRoutes(),
            }"
          >
            <div class="text-3xl font-bold text-(--tui-status-warning)">
              {{ maxFlash() || '-' }}
            </div>
            <div class="text-xs uppercase opacity-70 font-semibold">
              {{ 'ascentTypes.f' | translate }}
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="flex flex-col gap-1.5 text-center my-2">
        <div
          class="bg-(--tui-background-neutral-1) p-2 rounded-xl flex flex-col items-center justify-center"
          [tuiHint]="topRoutes().length > 0 ? scoreHintTemplate : null"
        >
          <span
            class="text-lg font-bold tabular-nums truncate w-full"
            [appCountUp]="totalScore()"
            #totalScoreAnim="appCountUp"
          >
            {{ totalScoreAnim.currentValue() | number: '1.0-0' }}
          </span>
          <span
            class="text-[10px] uppercase opacity-70 font-semibold truncate w-full"
          >
            {{ 'statistics.totalScore' | translate }}
          </span>
        </div>
        <div class="grid grid-cols-4 gap-1.5">
          <div
            class="bg-(--tui-background-neutral-1) p-2 rounded-xl flex flex-col items-center justify-center min-w-0"
          >
            <span
              class="text-sm font-bold tabular-nums truncate w-full"
              [appCountUp]="totalAscents()"
              #totalAscentsAnim="appCountUp"
            >
              {{ totalAscentsAnim.currentValue() | number: '1.0-0' }}
            </span>
            <span
              class="text-[10px] uppercase opacity-70 font-semibold truncate w-full"
            >
              {{ 'ascents' | translate }}
            </span>
          </div>
          <div
            class="bg-(--tui-background-neutral-1) p-2 rounded-xl flex flex-col items-center justify-center min-w-0"
            [tuiHint]="
              maxRedpointRoutes().length > 0 ? gradeHintTemplate : null
            "
            [tuiHintContext]="{
              title: ('ascentTypes.rp' | translate),
              grade: maxRedpoint(),
              routes: maxRedpointRoutes(),
            }"
          >
            <span
              class="text-sm font-bold text-(--tui-status-negative) truncate w-full"
            >
              {{ maxRedpoint() || '-' }}
            </span>
            <span
              class="text-[10px] uppercase opacity-70 font-semibold truncate w-full"
            >
              {{ 'ascentTypes.rp' | translate }}
            </span>
          </div>
          <div
            class="bg-(--tui-background-neutral-1) p-2 rounded-xl flex flex-col items-center justify-center min-w-0"
            [tuiHint]="maxOnsightRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.os' | translate),
              grade: maxOnsight(),
              routes: maxOnsightRoutes(),
            }"
          >
            <span
              class="text-sm font-bold text-(--tui-status-positive) truncate w-full"
            >
              {{ maxOnsight() || '-' }}
            </span>
            <span
              class="text-[10px] uppercase opacity-70 font-semibold truncate w-full"
            >
              {{ 'ascentTypes.os' | translate }}
            </span>
          </div>
          <div
            class="bg-(--tui-background-neutral-1) p-2 rounded-xl flex flex-col items-center justify-center min-w-0"
            [tuiHint]="maxFlashRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.f' | translate),
              grade: maxFlash(),
              routes: maxFlashRoutes(),
            }"
          >
            <span
              class="text-sm font-bold text-(--tui-status-warning) truncate w-full"
            >
              {{ maxFlash() || '-' }}
            </span>
            <span
              class="text-[10px] uppercase opacity-70 font-semibold truncate w-full"
            >
              {{ 'ascentTypes.f' | translate }}
            </span>
          </div>
        </div>
      </div>
    }

    <!-- Hint content for Top 10 Routes -->
    <ng-template #scoreHintTemplate>
      <div class="trend-hint">
        <div class="trend-hint-header">
          <span class="trend-hint-title">
            {{ 'statistics.top10Ascents' | translate }}
          </span>
          <span class="trend-hint-score">
            {{ (totalScore() | number) || 0 }} {{ 'points' | translate }}
          </span>
        </div>

        @if (topRoutes().length > 0) {
          <tui-scrollbar class="trend-scroll">
            <div class="trend-routes">
              @for (route of topRoutes(); track $index) {
                <div class="trend-route-row">
                  <a
                    class="route-name"
                    [routerLink]="[
                      '/area',
                      route.areaSlug,
                      route.cragSlug,
                      route.routeSlug,
                    ]"
                    [class.onsight]="route.type === AscentTypes.OS"
                    [class.flash]="route.type === AscentTypes.F"
                    [class.redpoint]="
                      route.type === AscentTypes.RP || !route.type
                    "
                  >
                    {{ route.name || ('anonymous' | translate) }}
                  </a>
                  <span class="route-score">
                    <span class="route-score-grade">
                      {{ route.gradeLabel }}
                    </span>
                    <span class="route-score-val">{{ route.score }}</span>
                  </span>
                </div>
              }
            </div>
          </tui-scrollbar>
        }
      </div>
    </ng-template>

    <!-- Hint content for Max Grade Routes -->
    <ng-template
      #gradeHintTemplate
      let-title="title"
      let-grade="grade"
      let-routes="routes"
    >
      <div class="trend-hint">
        <div class="trend-hint-header">
          <span class="trend-hint-title">
            {{ title }}
          </span>
          <span class="trend-hint-score">
            {{ grade }}
          </span>
        </div>

        @if (routes?.length > 0) {
          <tui-scrollbar class="trend-scroll">
            <div class="trend-routes">
              @for (route of routes; track $index) {
                <div class="trend-route-row">
                  <a
                    class="route-name"
                    [routerLink]="[
                      '/area',
                      route.areaSlug,
                      route.cragSlug,
                      route.routeSlug,
                    ]"
                    [class.onsight]="route.type === AscentTypes.OS"
                    [class.flash]="route.type === AscentTypes.F"
                    [class.redpoint]="
                      route.type === AscentTypes.RP || !route.type
                    "
                  >
                    {{ route.name || ('anonymous' | translate) }}
                  </a>
                  <span class="route-score">
                    <span class="route-score-grade">
                      {{ route.gradeLabel }}
                    </span>
                    <span class="route-score-val">{{ route.score }}</span>
                  </span>
                </div>
              }
            </div>
          </tui-scrollbar>
        }
      </div>
    </ng-template>
  `,
  styles: `
    .trend-hint {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 210px;
      padding: 0.5rem 0;
    }
    .trend-hint-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      border-bottom: 1px solid var(--tui-border-normal);
      padding-bottom: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .trend-hint-title {
      font: var(--tui-typography-body-s);
      opacity: 0.5;
      font-weight: bold;
    }
    .trend-hint-score {
      font: var(--tui-typography-heading-h4);
      font-weight: 900;
    }
    .trend-routes {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding-right: 1.25rem;
    }
    .trend-route-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .route-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 120px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .route-name:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
    .route-name.onsight {
      color: var(--tui-status-positive);
    }
    .route-name.flash {
      color: var(--tui-status-warning);
    }
    .route-name.redpoint {
      color: var(--tui-status-negative);
    }
    .route-score {
      font-family: monospace;
      text-align: right;
    }
    .route-score-grade {
      font: var(--tui-typography-body-m);
      opacity: 0.8;
      margin-right: 0.5rem;
    }
    .route-score-val {
      opacity: 0.6;
    }
    .trend-scroll {
      max-height: 250px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0 overflow-hidden',
  },
})
export class UserProfileStatsScoreComponent {
  protected readonly AscentTypes = AscentTypes;

  totalScore = input.required<number>();
  topRoutes = input<RouteScore[]>([]);
  totalAscents = input.required<number>();
  maxRedpoint = input.required<string | null>();
  maxRedpointRoutes = input<RouteScore[]>([]);
  maxOnsight = input.required<string | null>();
  maxOnsightRoutes = input<RouteScore[]>([]);
  maxFlash = input.required<string | null>();
  maxFlashRoutes = input<RouteScore[]>([]);
  compact = input<boolean>(false);
}
