import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  InputSignal,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';
import { Params, RouterLink } from '@angular/router';

import { TuiRingChart } from '@taiga-ui/addon-charts';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  AmountByEveryGrade,
  normalizeRoutesByGrade,
  RoutesByGrade,
} from '../../models';

import { computeGradeChartData } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-chart-routes-by-grade',
  imports: [
    LowerCasePipe,
    RouterLink,
    TranslatePipe,
    TuiRingChart,
    TuiSkeleton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: [
    `
      :host {
        /* Chart categorical palette mapped to difficulty bands: 5, 6, 7, 8, 9 */
        --tui-chart-categorical-00: var(--tui-text-positive); /* < 6a */
        --tui-chart-categorical-01: var(--tui-status-info); /* 6a–6c+ */
        --tui-chart-categorical-02: var(--tui-status-warning); /* 7a–7c+ */
        --tui-chart-categorical-03: var(--tui-status-negative); /* 8a–8c+ */
        --tui-chart-categorical-04: var(
          --tui-background-accent-opposite
        ); /* 9a–9c */
        --tui-chart-categorical-05: #cda4de; /* Project (?) */
      }

      .legend .item {
        margin: 0 0.5rem 0.75rem 0;
      }
    `,
  ],
  template: `
    @let c = chart();
    @if (isBrowser && c.total > 0) {
      <div class="relative inline-flex items-center justify-center">
        <tui-ring-chart
          [tuiSkeleton]="tuiSkeleton()"
          [value]="c.values"
          [activeItemIndex]="activeItemIndex()"
          (activeItemIndexChange)="onActiveItemIndexChange($event)"
        />

        @if (routesLink(); as link) {
          <a
            [routerLink]="link"
            [queryParams]="queryParams()"
            class="absolute inset-6 rounded-full flex flex-col items-center justify-center text-center no-underline cursor-pointer group select-none z-10 text-xs text-(--tui-text-secondary)"
          >
            @if (c.hasActive) {
              <span class="group-hover:underline">
                {{ c.activeBandTotal }}
                {{ 'routes' | translate | lowercase }}
              </span>
              <div [innerHtml]="c.breakdownText"></div>
            } @else {
              <span
                class="text-xl font-semibold text-(--tui-text-primary) group-hover:underline"
              >
                {{ c.total }}
                {{ 'routes' | translate | lowercase }}
              </span>
              @if (c.gradeRange; as gradeRange) {
                <div class="text-sm">{{ gradeRange }}</div>
              }
            }
          </a>
        } @else {
          <div
            class="absolute inset-6 rounded-full flex flex-col items-center justify-center text-center select-none pointer-events-none z-10 text-xs text-(--tui-text-secondary)"
          >
            @if (c.hasActive) {
              <span>
                {{ c.activeBandTotal }}
                {{ 'routes' | translate | lowercase }}
              </span>
              <div [innerHtml]="c.breakdownText"></div>
            } @else {
              <span class="text-xl font-semibold text-(--tui-text-primary)">
                {{ c.total }}
                {{ 'routes' | translate | lowercase }}
              </span>
              @if (c.gradeRange; as gradeRange) {
                <div class="text-sm">{{ gradeRange }}</div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class ChartRoutesByGradeComponent {
  protected readonly isBrowser = inject(IS_BROWSER);

  grades: InputSignal<AmountByEveryGrade> =
    input.required<AmountByEveryGrade>();
  tuiSkeleton: InputSignal<boolean> = input(false);
  routesLink = input<string | (string | number)[] | null>(null);
  queryParams = input<Params | null>(null);
  activeItemIndex: WritableSignal<number> = signal<number>(-1);

  // Normalize input (AmountByEveryVerticalLifeGrade) into a label-based record for charting
  private readonly normalizedCounts: Signal<RoutesByGrade> = computed(() =>
    normalizeRoutesByGrade(this.grades()),
  );

  protected readonly chart = computed(() =>
    computeGradeChartData(this.normalizedCounts(), this.activeItemIndex()),
  );

  protected onActiveItemIndexChange(index: number): void {
    const value = this.chart().values[index] ?? 0;
    this.activeItemIndex.set(value > 0 ? index : -1);
  }
}
