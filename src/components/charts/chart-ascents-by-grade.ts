import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  InputSignal,
  Signal,
} from '@angular/core';

import { TuiAppearance } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import {
  colorForGrade,
  GRADE_NUMBER_TO_LABEL,
  GradeLabel,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../../models';

export interface GradeAscentRow {
  grade: GradeLabel;
  gradeColor: string;
  soft: number;
  neutral: number;
  hard: number;
  total: number;
  isHighest: boolean;
}

@Component({
  selector: 'app-chart-ascents-by-grade',
  imports: [TranslatePipe, TuiAppearance],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div class="w-full max-w-sm mx-auto text-sm font-sans select-none">
      <!-- Table Header -->
      <div
        class="grid grid-cols-[2.75rem_1fr_1fr_1fr_1.1fr] sm:grid-cols-[3.25rem_1fr_1fr_1fr_1.1fr] gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) text-center items-center"
      >
        <div class="text-left"></div>
        <div class="truncate px-0.5" [title]="'ascent.soft' | translate">
          {{ 'ascent.soft' | translate }}
        </div>
        <div class="truncate px-0.5" [title]="'ascent.neutral' | translate">
          {{ 'ascent.neutral' | translate }}
        </div>
        <div class="truncate px-0.5" [title]="'ascent.hard' | translate">
          {{ 'ascent.hard' | translate }}
        </div>
        <div
          class="text-right font-bold truncate px-0.5"
          [title]="'total' | translate"
        >
          {{ 'total' | translate }}
        </div>
      </div>

      <!-- Table Body -->
      <div class="flex flex-col gap-1">
        @if (tuiSkeleton()) {
          @for (i of [1, 2, 3]; track i) {
            <div
              class="grid grid-cols-[2.75rem_1fr_1fr_1fr_1.1fr] sm:grid-cols-[3.25rem_1fr_1fr_1fr_1.1fr] gap-1 sm:gap-2 px-2 sm:px-3 py-2 items-center animate-pulse"
            >
              <div
                class="h-4 bg-(--tui-background-neutral-1) rounded w-8"
              ></div>
              <div
                class="h-4 bg-(--tui-background-neutral-1) rounded w-6 mx-auto"
              ></div>
              <div
                class="h-4 bg-(--tui-background-neutral-1) rounded w-6 mx-auto"
              ></div>
              <div
                class="h-4 bg-(--tui-background-neutral-1) rounded w-6 mx-auto"
              ></div>
              <div
                class="h-4 bg-(--tui-background-neutral-1) rounded w-6 ms-auto"
              ></div>
            </div>
          }
        } @else {
          @for (row of rows(); track row.grade) {
            <div
              class="grid grid-cols-[2.75rem_1fr_1fr_1fr_1.1fr] sm:grid-cols-[3.25rem_1fr_1fr_1fr_1.1fr] gap-1 sm:gap-2 px-2 sm:px-3 py-2 items-center rounded-xl transition-all duration-200"
              [tuiAppearance]="row.isHighest ? 'neutral' : 'none'"
            >
              <!-- Grade -->
              <div
                class="text-left font-bold text-base text-(--tui-text-primary)"
              >
                {{ row.grade }}
              </div>

              <!-- Soft -->
              <div class="text-center font-medium text-(--tui-text-secondary)">
                {{ row.soft }}
              </div>

              <!-- Neutral -->
              <div class="text-center font-medium text-(--tui-text-secondary)">
                {{ row.neutral }}
              </div>

              <!-- Hard -->
              <div class="text-center font-medium text-(--tui-text-secondary)">
                {{ row.hard }}
              </div>

              <!-- Total -->
              <div
                class="text-right font-bold text-base text-(--tui-text-primary)"
              >
                {{ row.total }}
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ChartAscentsByGradeComponent {
  ascents: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();
  gradeLabel: InputSignal<string> = input.required<string>();
  tuiSkeleton: InputSignal<boolean> = input(false);

  protected readonly rows: Signal<GradeAscentRow[]> = computed<
    GradeAscentRow[]
  >(() => {
    const list = this.ascents();
    const defaultGrade = (this.gradeLabel() || '?') as GradeLabel;

    if (!list || list.length === 0) {
      return [
        {
          grade: defaultGrade,
          gradeColor: colorForGrade(defaultGrade),
          soft: 0,
          neutral: 0,
          hard: 0,
          total: 0,
          isHighest: true,
        },
      ];
    }

    const countsMap = new Map<
      GradeLabel,
      { soft: number; neutral: number; hard: number; total: number }
    >();

    for (const ascent of list) {
      const displayGrade = ascent.grade ?? ascent.route?.grade;
      const gLabel = (
        displayGrade !== null && displayGrade !== undefined
          ? (GRADE_NUMBER_TO_LABEL[displayGrade as VERTICAL_LIFE_GRADES] ??
            defaultGrade)
          : defaultGrade
      ) as GradeLabel;

      if (!countsMap.has(gLabel)) {
        countsMap.set(gLabel, { soft: 0, neutral: 0, hard: 0, total: 0 });
      }

      const entry = countsMap.get(gLabel)!;
      if (ascent.soft) {
        entry.soft++;
      } else if (ascent.hard) {
        entry.hard++;
      } else {
        entry.neutral++;
      }
      entry.total++;
    }

    const result: GradeAscentRow[] = Array.from(countsMap.entries()).map(
      ([grade, data]) => ({
        grade,
        gradeColor: colorForGrade(grade),
        ...data,
        isHighest: false,
      }),
    );

    result.sort((a, b) => {
      const idxA = ORDERED_GRADE_VALUES.indexOf(a.grade);
      const idxB = ORDERED_GRADE_VALUES.indexOf(b.grade);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.grade.localeCompare(b.grade);
    });

    let maxTotal = 0;
    for (const row of result) {
      if (row.total > maxTotal) {
        maxTotal = row.total;
      }
    }

    if (maxTotal > 0) {
      const highestRow = result.find((r) => r.total === maxTotal);
      if (highestRow) {
        highestRow.isHighest = true;
      }
    } else if (result.length > 0) {
      result[0].isHighest = true;
    }

    return result;
  });
}
