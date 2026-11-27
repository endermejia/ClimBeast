import { Component, computed, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiCheckbox,
  type TuiDialogContext,
  type TuiKeySteps,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiRange } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import { ORDERED_GRADE_VALUES } from '../../models';

import { clamp } from '../../utils';

export interface IndoorTopoFilterDialogData {
  gradeRange: [number, number];
  movesRange: [number, number];
  maxPossibleMoves: number;
  showClimbed: boolean;
}

export interface IndoorTopoFilterDialogResult {
  gradeRange: [number, number];
  movesRange?: [number, number];
  showClimbed: boolean;
  cleared?: boolean;
}

@Component({
  selector: 'app-indoor-topo-filter-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    TuiButton,
    TuiCheckbox,
    TuiLink,
    TuiRange,
    TuiScrollbar,
  ],
  template: `
    <form class="lw-form-sheet" [formGroup]="form">
      <tui-scrollbar class="lw-form-sheet-body">
        <div class="flex flex-col gap-4">
          <!-- Grade Range -->
          <section class="flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold text-sm">{{
                'grade' | translate
              }}</span>
              <span
                class="text-xs font-semibold px-2 py-0.5 rounded-full bg-(--tui-background-neutral-1) tabular-nums"
              >
                {{ selectedMinGradeLabel() }} - {{ selectedMaxGradeLabel() }}
              </span>
            </div>
            <tui-range
              id="indoor-grade-range"
              [style.--tui-thumb-size.rem]="0.75"
              [min]="minGradeIndex"
              [max]="maxGradeIndex"
              [step]="1"
              [segments]="gradeSegments"
              [keySteps]="gradeKeySteps"
              [attr.aria-label]="'grade' | translate"
              formControlName="gradeRange"
            />
            <div
              class="hidden sm:flex justify-between text-xs opacity-60 px-0.5 mt-0.5"
            >
              @for (label of gradeTickLabels; track label; let i = $index) {
                <a
                  tuiLink
                  appearance="action-grayscale"
                  role="button"
                  tabindex="0"
                  (click.zoneless)="onGradeTickClick(gradeKeySteps[i][1])"
                  (keydown.enter)="onGradeTickClick(gradeKeySteps[i][1])"
                  >{{ label }}</a
                >
              }
            </div>
          </section>

          <!-- Moves Range -->
          @if (hasMovesData) {
            <section
              class="flex flex-col gap-2 pt-4 border-t border-(--tui-border-normal)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-sm">{{
                  'moves' | translate
                }}</span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full bg-(--tui-background-neutral-1) tabular-nums"
                >
                  {{ selectedMinMoves() }} - {{ selectedMaxMoves() }}
                </span>
              </div>
              <tui-range
                id="indoor-moves-range"
                [style.--tui-thumb-size.rem]="0.75"
                [min]="0"
                [max]="maxPossibleMoves"
                [step]="1"
                [segments]="movesSegments"
                [attr.aria-label]="'moves' | translate"
                formControlName="movesRange"
              />
              <div
                class="flex justify-between text-xs opacity-50 px-0.5 tabular-nums"
              >
                <span>0</span>
                <span>{{ maxPossibleMoves }}</span>
              </div>
            </section>
          }

          <!-- Show Climbed -->
          <section class="pt-4 border-t border-(--tui-border-normal)">
            <label
              class="flex items-center justify-between gap-3 cursor-pointer select-none"
            >
              <span class="text-sm font-medium">
                {{ 'filters.showClimbed' | translate }}
              </span>
              <input
                tuiCheckbox
                type="checkbox"
                formControlName="showClimbed"
              />
            </label>
          </section>
        </div>
      </tui-scrollbar>

      <!-- Footer Buttons -->
      <div class="lw-form-sheet-footer justify-between">
        <button
          appearance="secondary"
          size="m"
          tuiButton
          type="button"
          (click.zoneless)="clear()"
        >
          {{ 'clear' | translate }}
        </button>
        <button size="m" tuiButton type="submit">
          {{ 'apply' | translate }}
        </button>
      </div>
    </form>
  `,
  host: { '(submit.prevent)': 'apply()' },
})
export class IndoorTopoFilterDialogComponent {
  protected readonly context =
    injectContext<
      TuiDialogContext<IndoorTopoFilterDialogResult, IndoorTopoFilterDialogData>
    >();

  protected readonly minGradeIndex = 0;
  protected readonly maxGradeIndex = ORDERED_GRADE_VALUES.length - 2;
  protected readonly gradeSegments = 8;

  protected readonly hasMovesData =
    (this.context.data?.maxPossibleMoves ?? 0) > 0;
  protected readonly maxPossibleMoves = Math.max(
    this.context.data?.maxPossibleMoves ?? 0,
    1,
  );

  protected readonly movesSegments = Math.min(
    Math.max(this.maxPossibleMoves, 1),
    10,
  );

  protected readonly gradeKeySteps: TuiKeySteps = [
    [0, 0],
    ...Array.from({ length: this.gradeSegments - 1 }, (_, i) => {
      const percent = (100 / this.gradeSegments) * (i + 1);
      const idx = Math.round(this.maxGradeIndex * (percent / 100));
      return [percent, idx] satisfies [number, number];
    }),
    [100, this.maxGradeIndex],
  ];

  protected readonly gradeTickLabels: string[] = this.gradeKeySteps.map(
    ([, idx]: [number, number]) => ORDERED_GRADE_VALUES[idx] ?? '',
  );

  protected readonly form = new FormGroup({
    gradeRange: new FormControl<[number, number]>(
      this.sanitizeGradeRange(
        this.context.data?.gradeRange ?? [
          this.minGradeIndex,
          this.maxGradeIndex,
        ],
      ),
      { nonNullable: true },
    ),
    movesRange: new FormControl<[number, number]>(
      this.sanitizeMovesRange(
        this.context.data?.movesRange ?? [0, this.maxPossibleMoves],
      ),
      { nonNullable: true },
    ),
    showClimbed: new FormControl<boolean>(
      this.context.data?.showClimbed ?? true,
      { nonNullable: true },
    ),
  });

  protected readonly gradeRangeSignal: Signal<[number, number]> = toSignal(
    this.form.controls.gradeRange.valueChanges.pipe(
      startWith(this.form.controls.gradeRange.value),
      map((v) =>
        this.sanitizeGradeRange(v ?? [this.minGradeIndex, this.maxGradeIndex]),
      ),
    ),
    { initialValue: this.form.controls.gradeRange.value },
  );

  protected readonly movesRangeSignal: Signal<[number, number]> = toSignal(
    this.form.controls.movesRange.valueChanges.pipe(
      startWith(this.form.controls.movesRange.value),
      map((v) => this.sanitizeMovesRange(v ?? [0, this.maxPossibleMoves])),
    ),
    { initialValue: this.form.controls.movesRange.value },
  );

  protected readonly selectedMinGradeLabel: Signal<string> = computed(() => {
    const [lo] = this.gradeRangeSignal();
    return ORDERED_GRADE_VALUES[lo] ?? '';
  });

  protected readonly selectedMaxGradeLabel: Signal<string> = computed(() => {
    const [, hi] = this.gradeRangeSignal();
    return ORDERED_GRADE_VALUES[hi] ?? '';
  });

  protected readonly selectedMinMoves: Signal<number> = computed(
    () => this.movesRangeSignal()[0],
  );

  protected readonly selectedMaxMoves: Signal<number> = computed(
    () => this.movesRangeSignal()[1],
  );

  protected onGradeTickClick(targetIdx: number): void {
    const current = (this.form.controls.gradeRange.value ?? [
      this.minGradeIndex,
      this.maxGradeIndex,
    ]) as [number, number];
    const [lo, hi] = current;
    const t = clamp(targetIdx, this.minGradeIndex, this.maxGradeIndex);
    const moveMin = Math.abs(t - lo) <= Math.abs(t - hi);
    const next: [number, number] = moveMin ? [t, hi] : [lo, t];
    this.form.controls.gradeRange.setValue(this.sanitizeGradeRange(next));
  }

  protected clear(): void {
    this.form.reset({
      gradeRange: [this.minGradeIndex, this.maxGradeIndex],
      movesRange: [0, this.maxPossibleMoves],
      showClimbed: true,
    });
    this.context.completeWith({
      gradeRange: [this.minGradeIndex, this.maxGradeIndex],
      movesRange: [0, 100],
      showClimbed: true,
      cleared: true,
    });
  }

  protected apply(): void {
    this.context.completeWith({
      gradeRange: this.sanitizeGradeRange(this.form.controls.gradeRange.value),
      movesRange: this.hasMovesData
        ? this.sanitizeMovesRange(this.form.controls.movesRange.value)
        : undefined,
      showClimbed: this.form.controls.showClimbed.value,
    });
  }

  private sanitizeGradeRange([a, b]: [number, number]): [number, number] {
    const lo = clamp(Math.round(a), this.minGradeIndex, this.maxGradeIndex);
    const hi = clamp(Math.round(b), this.minGradeIndex, this.maxGradeIndex);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }

  private sanitizeMovesRange([a, b]: [number, number]): [number, number] {
    const lo = clamp(Math.round(a), 0, this.maxPossibleMoves);
    const hi = clamp(Math.round(b), 0, this.maxPossibleMoves);
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }
}
