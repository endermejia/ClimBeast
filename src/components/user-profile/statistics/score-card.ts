import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';

import { TuiHint } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteScore } from '../../../models';

import { AscentCountDirective } from '../../../directives/ascent-count.directive';
import { CountUpDirective } from '../../../directives/count-up.directive';
import { ChartAscentsByStyleComponent } from '../../charts/chart-ascents-by-style';
import { StatsRouteHintComponent } from './stats-route-hint';

@Component({
  selector: 'app-user-profile-stats-score',
  imports: [
    AscentCountDirective,
    ChartAscentsByStyleComponent,
    CountUpDirective,
    DecimalPipe,
    StatsRouteHintComponent,
    TranslatePipe,
    TuiHint,
  ],
  template: `
    @if (!compact()) {
      <div class="flex flex-col gap-3 sm:gap-4 min-w-0 w-full">
        <!-- Score Card -->
        <div
          class="bg-(--tui-background-base) shadow-md rounded-2xl p-4 sm:p-5 text-center border border-(--tui-border-normal) min-w-0 w-full overflow-hidden"
          [tuiHint]="topRoutes().length > 0 ? scoreHintTemplate : null"
        >
          <div
            class="text-(--tui-text-tertiary) uppercase text-xs font-bold tracking-wider mb-1.5 truncate"
          >
            {{ 'statistics.totalScore' | translate }}
          </div>
          <div
            class="text-3xl sm:text-4xl 2xl:text-5xl font-black tabular-nums tracking-tight truncate w-full min-w-0 px-1"
            [appCountUp]="totalScore()"
            #totalScoreAnim="appCountUp"
          >
            {{ totalScoreAnim.currentValue() | number: '1.0-0' }}
          </div>
          <div class="text-(--tui-text-tertiary) mt-1.5 text-xs truncate">
            {{ 'statistics.top10Ascents' | translate }}
          </div>
        </div>

        <!-- Proportional Style Distribution Bar -->
        @if (totalAscents() > 0) {
          <div
            class="bg-(--tui-background-base) shadow-sm p-3 rounded-xl border border-(--tui-border-normal) min-w-0 w-full"
          >
            <app-chart-ascents-by-style
              [total]="totalAscents()"
              [rpCount]="rpCount()"
              [flashCount]="flashCount()"
              [osCount]="osCount()"
              class="w-full"
            />
          </div>
        }

        <!-- Key Stats Grid -->
        <div
          class="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2 sm:gap-3 min-w-0 w-full"
        >
          <!-- Total Ascents -->
          <div
            class="bg-(--tui-background-base) shadow-sm p-2.5 sm:p-3 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden"
          >
            <div
              class="text-base sm:text-lg lg:text-xl font-bold truncate max-w-full text-center"
              [appCountUp]="totalAscents()"
              #totalAscentsAnim="appCountUp"
              [appAscentCount]="totalAscentsAnim.currentValue()"
            ></div>
            <div
              class="text-[10px] sm:text-xs uppercase opacity-70 font-semibold truncate max-w-full text-center"
            >
              {{ 'ascents' | translate }}
            </div>
          </div>

          <!-- Max Redpoint -->
          <div
            class="bg-(--tui-background-base) shadow-sm p-2.5 sm:p-3 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden"
            [tuiHint]="
              maxRedpointRoutes().length > 0 ? gradeHintTemplate : null
            "
            [tuiHintContext]="{
              title: ('ascentTypes.rp' | translate),
              grade: maxRedpoint(),
              routes: maxRedpointRoutes(),
            }"
          >
            <div
              class="text-base sm:text-lg lg:text-xl font-bold text-(--tui-status-negative) truncate max-w-full text-center"
            >
              {{ maxRedpoint() || '-' }}
            </div>
            <div
              class="text-[10px] sm:text-xs uppercase opacity-70 font-semibold truncate max-w-full text-center"
            >
              {{ 'ascentTypes.rp' | translate }}
            </div>
          </div>

          <!-- Max Flash -->
          <div
            class="bg-(--tui-background-base) shadow-sm p-2.5 sm:p-3 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden"
            [tuiHint]="maxFlashRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.f' | translate),
              grade: maxFlash(),
              routes: maxFlashRoutes(),
            }"
          >
            <div
              class="text-base sm:text-lg lg:text-xl font-bold text-(--tui-status-warning) truncate max-w-full text-center"
            >
              {{ maxFlash() || '-' }}
            </div>
            <div
              class="text-[10px] sm:text-xs uppercase opacity-70 font-semibold truncate max-w-full text-center"
            >
              {{ 'ascentTypes.f' | translate }}
            </div>
          </div>

          <!-- Max Onsight -->
          <div
            class="bg-(--tui-background-base) shadow-sm p-2.5 sm:p-3 rounded-xl border border-(--tui-border-normal) flex flex-col items-center justify-center gap-1 min-w-0 overflow-hidden"
            [tuiHint]="maxOnsightRoutes().length > 0 ? gradeHintTemplate : null"
            [tuiHintContext]="{
              title: ('ascentTypes.os' | translate),
              grade: maxOnsight(),
              routes: maxOnsightRoutes(),
            }"
          >
            <div
              class="text-base sm:text-lg lg:text-xl font-bold text-(--tui-status-positive) truncate max-w-full text-center"
            >
              {{ maxOnsight() || '-' }}
            </div>
            <div
              class="text-[10px] sm:text-xs uppercase opacity-70 font-semibold truncate max-w-full text-center"
            >
              {{ 'ascentTypes.os' | translate }}
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
              [appAscentCount]="totalAscentsAnim.currentValue()"
            ></span>
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
        </div>
      </div>
    }

    <!-- Hint content for Top 10 Routes -->
    <ng-template #scoreHintTemplate>
      <app-stats-route-hint
        [title]="'statistics.top10Ascents' | translate"
        [value]="((totalScore() | number) || 0) + ' ' + ('points' | translate)"
        [routes]="topRoutes()"
      />
    </ng-template>

    <!-- Hint content for Max Grade Routes -->
    <ng-template
      #gradeHintTemplate
      let-title="title"
      let-grade="grade"
      let-routes="routes"
    >
      <app-stats-route-hint [title]="title" [value]="grade" [routes]="routes" />
    </ng-template>
  `,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileStatsScoreComponent {
  totalScore = input.required<number>();
  topRoutes = input<RouteScore[]>([]);
  totalAscents = input.required<number>();
  rpCount = input<number>(0);
  flashCount = input<number>(0);
  osCount = input<number>(0);
  maxRedpoint = input.required<string | null>();
  maxRedpointRoutes = input<RouteScore[]>([]);
  maxOnsight = input.required<string | null>();
  maxOnsightRoutes = input<RouteScore[]>([]);
  maxFlash = input.required<string | null>();
  maxFlashRoutes = input<RouteScore[]>([]);
  compact = input<boolean>(false);
}
