import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';

import {
  TuiAxes,
  TuiLineChart,
  TuiLineChartHint,
} from '@taiga-ui/addon-charts';

import { TranslatePipe } from '@ngx-translate/core';

import { TrendData, TrendDetail } from '../../../models';

import { StatsRouteHintComponent } from './stats-route-hint';

@Component({
  selector: 'app-user-profile-stats-trends',
  standalone: true,
  imports: [
    DecimalPipe,
    StatsRouteHintComponent,
    TranslatePipe,
    TuiAxes,
    TuiLineChart,
    TuiLineChartHint,
  ],
  template: `
    <div
      class="bg-(--tui-background-base) shadow-md p-4 sm:p-6 rounded-2xl border border-(--tui-border-normal) w-full min-w-0 overflow-hidden"
    >
      @if (trendData().years.length > 0) {
        <div class="relative pt-2 pb-2 w-full min-w-0">
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
      @let i = index?.index ?? index?.$implicit ?? index ?? 0;
      @let details = trendDetails()[i];
      <app-stats-route-hint
        [title]="trendData().years[i]"
        [value]="
          ((details?.totalScore | number) || 0) + ' ' + ('points' | translate)
        "
        [routes]="details?.topRoutes"
      />
    </ng-template>
  `,
  styles: `
    .chart-container {
      width: 100%;
      min-width: 0;
      height: 200px;
    }
  `,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileStatsTrendsComponent {
  trendData = input.required<TrendData>();
  trendDetails = input.required<TrendDetail[]>();
  trendXLabels = input.required<string[]>();
  width = input.required<number>();
  height = input.required<number>();
}
