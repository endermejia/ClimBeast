import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TuiDataList, TuiLoader, TuiPoint, TuiInput } from '@taiga-ui/core';
import { TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';

import { TranslateService } from '@ngx-translate/core';

import { AscentsService } from '../../services/ascents.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { UserAscentStatRecord } from '../../models';
import {
  GradeDistribution,
  TrendData,
  TrendDetail,
} from '../../models/user-stats.model';

import {
  calculateGradeDistribution,
  calculatePeriodScore,
  calculateTrendSource,
  filterAscentsByDate,
  getMaxGrade,
  getMaxGradeRoutes,
} from '../../utils';

import { UserProfileStatsPyramidComponent } from './statistics/grade-pyramid';
import { UserProfileStatsScoreComponent } from './statistics/score-card';
import { UserProfileStatsTrendsComponent } from './statistics/yearly-trend';

@Component({
  selector: 'app-user-profile-statistics',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiInput,
    TuiLoader,
    TuiSelect,
    UserProfileStatsPyramidComponent,
    UserProfileStatsScoreComponent,
    UserProfileStatsTrendsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
  template: `
    <div class="flex flex-col gap-6 w-full">
      <tui-loader [loading]="statsResource.isLoading()">
        <div class="flex flex-col gap-6">
          <!-- Top Section: Pyramid (Left) + Filter & Score (Right) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <!-- Left: Grade Pyramid (2/3 on desktop) -->
            <div class="lg:col-span-2 order-2 lg:order-1">
              <app-user-profile-stats-pyramid
                [(showAllGrades)]="showAllGrades"
                [distribution]="gradeDistribution()"
              />
            </div>

            <!-- Right: Date Filter + Score Card (1/3 on desktop) -->
            <div class="lg:col-span-1 flex flex-col gap-4 order-1 lg:order-2">
              <!-- Filter Selector -->
              <div class="flex justify-end w-full">
                <tui-textfield
                  class="w-full"
                  [tuiTextfieldCleaner]="false"
                  [stringify]="dateValueContent"
                  tuiTextfieldSize="l"
                >
                  <input
                    tuiSelect
                    [ngModel]="dateFilterValue()"
                    (ngModelChange)="dateFilterValue.set($event)"
                    autocomplete="off"
                  />
                  <tui-data-list *tuiDropdown>
                    <tui-data-list-wrapper new [items]="dateFilterOptions()" />
                  </tui-data-list>
                </tui-textfield>
              </div>

              <!-- Score Card & Key Stats -->
              <app-user-profile-stats-score
                [totalScore]="totalScore()"
                [topRoutes]="topRoutes()"
                [totalAscents]="gradeDistribution().total"
                [maxRedpoint]="maxRedpoint()"
                [maxRedpointRoutes]="maxRedpointRoutes()"
                [maxOnsight]="maxOnsight()"
                [maxOnsightRoutes]="maxOnsightRoutes()"
                [maxFlash]="maxFlash()"
                [maxFlashRoutes]="maxFlashRoutes()"
              />
            </div>
          </div>

          <!-- Bottom Section: Evolution / Trend (Full Width) -->
          <div class="w-full">
            <app-user-profile-stats-trends
              [trendData]="trendData()"
              [trendDetails]="trendDetails()"
              [trendXLabels]="trendXLabels()"
              [trendYLabels]="trendYLabels()"
              [width]="width"
              [height]="height"
            />
          </div>
        </div>
      </tui-loader>
    </div>
  `,
})
export class UserProfileStatisticsComponent {
  private readonly ascentsService = inject(AscentsService);
  private readonly translate = inject(TranslateService);
  protected readonly layout = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);

  userId = input.required<string | undefined>();

  // --- Date Filter Support ---
  readonly dateFilterValue = signal('last_12_months');
  readonly showAllGrades = signal(false);

  readonly dateFilterOptions = computed(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) years.push((currentYear - i).toString());

    return [
      'all_time',
      'last_12_months',
      'last_6_months',
      'this_year',
      ...years.filter((y) => y !== currentYear.toString()),
    ];
  });

  readonly dateValueContent = (option: string): string => {
    if (option === 'all_time') return this.translate.instant('allTime');
    if (option === 'last_12_months')
      return this.translate.instant('last12Months');
    if (option === 'last_6_months')
      return this.translate.instant('last6Months');
    if (option === 'this_year')
      return this.translate.instant('year') + ' ' + new Date().getFullYear();
    return option;
  };

  // --- Data Loading ---
  statsResource = resource({
    params: () => ({
      userId: this.userId(),
      dateFilter: this.dateFilterValue(),
    }),
    loader: async ({ params }) => {
      if (!params.userId) return [];
      return await this.ascentsService.getUserStats(params.userId);
    },
  });

  // Create a filtered signal based on the control
  private rawStats = computed(() => {
    const data = (this.statsResource.value() as UserAscentStatRecord[]) ?? [];
    return data.filter((a) => a.ascent_type !== 'attempt');
  });

  // Filtered Stats
  stats = computed(() => {
    const all = this.rawStats();
    return filterAscentsByDate(all, this.dateFilterValue());
  });

  // --- New Computed Signals for Dashboard ---

  // 1. Total Score & Top Routes for the selected period
  periodScoreData = computed(() => {
    return calculatePeriodScore(this.stats());
  });

  totalScore = computed(() => this.periodScoreData().score);
  topRoutes = computed(() => this.periodScoreData().topRoutes);

  // 2. Max Grades (RP, OS, Flash)
  maxRedpoint = computed(() => getMaxGrade(this.stats(), ['rp']));
  maxRedpointRoutes = computed(() => getMaxGradeRoutes(this.stats(), ['rp']));

  maxOnsight = computed(() => getMaxGrade(this.stats(), ['os', 'onsight']));
  maxOnsightRoutes = computed(() =>
    getMaxGradeRoutes(this.stats(), ['os', 'onsight']),
  );

  maxFlash = computed(() => getMaxGrade(this.stats(), ['f', 'flash']));
  maxFlashRoutes = computed(() =>
    getMaxGradeRoutes(this.stats(), ['f', 'flash']),
  );

  constructor() {
    // Date filter is now a signal, no need for subscription
  }

  protected toValue(event: Event): string {
    return (event.target as HTMLSelectElement)?.value ?? '';
  }

  protected onDateFilterChange(event: Event): void {
    this.dateFilterValue.set(this.toValue(event));
  }

  // --- Grade Distribution Logic (Pyramid) ---
  gradeDistribution = computed<GradeDistribution>(() => {
    const limit = this.showAllGrades() ? undefined : 8;
    return calculateGradeDistribution(this.stats(), limit);
  });

  // --- Trend Logic ---

  // Chart Dimensions (Pixels)
  readonly width = 1000;
  readonly height = 200;

  // Shared source for chart data to ensure sync between line chart and tooltip details
  private readonly chartSource = computed(() => {
    return calculateTrendSource(
      this.rawStats(),
      this.translate.instant('today'),
    );
  });

  trendData = computed<TrendData>(() => {
    const source = this.chartSource();
    if (source.length === 0) return { years: [], series: [], maxY: 0, minY: 0 };

    const years = source.map((d) => d.label);
    const scores = source.map((d) => d.score);
    const realMin = Math.min(...scores);
    const realMax = Math.max(...scores);

    const range = realMax - realMin;
    const safeRange = range === 0 ? realMin * 0.1 || 100 : range;

    let domMin = Math.floor(realMin - safeRange * 0.2);
    if (domMin < 0) domMin = 0;

    const domMax = Math.ceil(realMax + safeRange * 0.1);
    const domRange = domMax - domMin;

    const series: TuiPoint[] = [];
    const xStep = years.length > 1 ? this.width / (years.length - 1) : 0;

    scores.forEach((score, index) => {
      const x = years.length > 1 ? index * xStep : this.width / 2;
      const y = ((score - domMin) / domRange) * this.height;
      series.push([x, y]);
    });

    return {
      years,
      series,
      maxY: domMax,
      minY: domMin,
    };
  });

  trendDetails = computed<TrendDetail[]>(() => {
    return this.chartSource().map((d) => ({
      totalScore: d.score,
      topRoutes: d.topRoutes,
    }));
  });

  trendYLabels = computed(() => {
    const data = this.trendData();
    if (data.years.length === 0) return [];

    const { minY, maxY } = data;
    const labels: string[] = [];
    const count = 5;
    const step = (maxY - minY) / (count - 1 || 1);

    for (let i = 0; i < count; i++) {
      labels.push(Math.round(minY + i * step).toString());
    }
    return labels;
  });

  trendXLabels = computed(() => {
    const years = this.trendData().years;
    if (years.length === 0) return [];

    const isMobile = this.layout.isMobile();
    const maxLabels = isMobile ? 5 : 10;

    if (years.length <= maxLabels) return years;

    const skip = Math.ceil(years.length / maxLabels);

    return years.map((year, i) => {
      if (i === 0 || i === years.length - 1 || i % skip === 0) {
        return year;
      }
      return '';
    });
  });
}
