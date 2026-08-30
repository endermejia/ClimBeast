import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiAxes,
  TuiLineChart,
  TuiLineChartHint,
} from '@taiga-ui/addon-charts';
import { TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { AscentTypes, TrendData, TrendDetail } from '../../../models';

import { ContextIndexPipe } from '../../../pipes';

@Component({
  selector: 'app-user-profile-stats-trends',
  standalone: true,
  imports: [
    CommonModule,
    ContextIndexPipe,
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    TuiAxes,
    TuiLineChart,
    TuiLineChartHint,
    TuiScrollbar,
  ],
  template: `
    <div
      class="bg-(--tui-background-base) shadow-md p-4 sm:p-6 rounded-2xl border border-(--tui-border-normal) w-full min-w-0"
    >
      @if (trendData().years.length > 0) {
        <div class="relative pt-2 pb-2 w-full min-w-0 overflow-hidden">
          <tui-axes
            class="chart-container"
            [axisXLabels]="trendXLabels()"
            [axisYLabels]="[]"
            [verticalLines]="trendXLabels().length + 1"
            [horizontalLines]="6"
            [tuiLineChartHint]="trendHintContent"
          >
            <!-- Total Score Trend -->
            <tui-line-chart
              [value]="trendData().series"
              [x]="0"
              [y]="0"
              [width]="width()"
              [height]="height()"
              [xStringify]="null"
              [yStringify]="null"
              [dots]="true"
              [filled]="true"
              style="color: var(--tui-status-info)"
            ></tui-line-chart>
          </tui-axes>
        </div>
      } @else {
        <div class="no-data opacity-50 text-center py-10">
          {{ 'statistics.noData' | translate }}
        </div>
      }
    </div>

    <!-- Hint content for Line Chart -->
    <ng-template #trendHintContent let-points let-index="index">
      <div class="trend-hint">
        @let i = index | contextIndex;
        @let details = trendDetails()[i];

        <div class="trend-hint-header">
          <span class="trend-hint-year">{{ trendData().years[i] }}</span>
          <span class="trend-hint-score">
            {{ (details?.totalScore | number) || 0 }} {{ 'points' | translate }}
          </span>
        </div>

        @if (details) {
          <tui-scrollbar class="trend-scroll">
            <div class="trend-routes">
              @for (route of details.topRoutes; track $index) {
                <div class="trend-route-row">
                  <a
                    class="route-name"
                    [routerLink]="
                      route.isIndoor
                        ? [
                            '/indoor',
                            route.centerSlug,
                            'route',
                            route.routeSlug,
                          ]
                        : [
                            '/area',
                            route.areaSlug,
                            route.cragSlug,
                            route.routeSlug,
                          ]
                    "
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
    .chart-container {
      height: 200px;
      width: 100%;
      max-width: 100%;
    }
    .trend-hint {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 240px;
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
    .trend-hint-year {
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
      gap: 0.35rem;
      padding-right: 1.25rem;
    }
    .trend-route-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      font-size: var(--tui-typography-body-s);
    }
    .route-name {
      font-weight: 500;
      color: var(--tui-text-primary);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 130px;
    }
    .route-name:hover {
      text-decoration: underline;
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
    class: 'block w-full min-w-0',
  },
})
export class UserProfileStatsTrendsComponent {
  protected readonly AscentTypes = AscentTypes;

  trendData = input.required<TrendData>();
  trendDetails = input.required<TrendDetail[]>();
  trendXLabels = input.required<string[]>();
  width = input.required<number>();
  height = input.required<number>();
}
