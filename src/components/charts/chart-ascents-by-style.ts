import { CommonModule, LowerCasePipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { TuiHint } from '@taiga-ui/core';
import { TuiProgress } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteAscentWithExtras, UserAscentStatRecord } from '../../models';

export type AscentStyleRecord =
  | RouteAscentWithExtras
  | UserAscentStatRecord
  | { type?: string | null; ascent_type?: string | null };

@Component({
  selector: 'app-chart-ascents-by-style',
  standalone: true,
  imports: [
    CommonModule,
    LowerCasePipe,
    PercentPipe,
    TranslatePipe,
    TuiHint,
    TuiProgress,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full min-w-0' },
  template: `
    @if (effectiveTotal() > 0) {
      <div
        class="w-full max-w-sm mx-auto select-none flex flex-col gap-2 min-w-0"
      >
        <!-- Stacked Taiga UI Progress Bar with interactive hover zones -->
        <div class="relative w-full overflow-hidden rounded-full">
          <label tuiProgressLabel class="w-full block">
            <progress
              [max]="effectiveTotal()"
              size="s"
              tuiProgressBar
              [style.color]="'var(--tui-status-positive)'"
              [value]="effectiveTotal()"
            ></progress>
            <progress
              [max]="effectiveTotal()"
              size="s"
              tuiProgressBar
              [style.color]="'var(--tui-status-warning)'"
              [value]="effectiveRp() + effectiveFlash()"
            ></progress>
            <progress
              [max]="effectiveTotal()"
              size="s"
              tuiProgressBar
              [style.color]="'var(--tui-status-negative)'"
              [value]="effectiveRp()"
            ></progress>
          </label>

          <!-- Hover Overlay across bar segments -->
          <div class="absolute inset-0 flex">
            @if (effectiveRp() > 0) {
              <div
                class="h-full cursor-pointer transition-opacity hover:opacity-80"
                [style.width.%]="(effectiveRp() / effectiveTotal()) * 100"
                [tuiHint]="
                  ('ascentTypes.rp' | translate) +
                  ': ' +
                  effectiveRp() +
                  ' ' +
                  ((effectiveRp() === 1 ? 'ascent' : 'ascents')
                    | translate
                    | lowercase) +
                  ' (' +
                  (effectiveRp() / effectiveTotal() | percent: '1.0-0') +
                  ')'
                "
              ></div>
            }
            @if (effectiveFlash() > 0) {
              <div
                class="h-full cursor-pointer transition-opacity hover:opacity-80"
                [style.width.%]="(effectiveFlash() / effectiveTotal()) * 100"
                [tuiHint]="
                  ('ascentTypes.f' | translate) +
                  ': ' +
                  effectiveFlash() +
                  ' ' +
                  ((effectiveFlash() === 1 ? 'ascent' : 'ascents')
                    | translate
                    | lowercase) +
                  ' (' +
                  (effectiveFlash() / effectiveTotal() | percent: '1.0-0') +
                  ')'
                "
              ></div>
            }
            @if (effectiveOs() > 0) {
              <div
                class="h-full cursor-pointer transition-opacity hover:opacity-80"
                [style.width.%]="(effectiveOs() / effectiveTotal()) * 100"
                [tuiHint]="
                  ('ascentTypes.os' | translate) +
                  ': ' +
                  effectiveOs() +
                  ' ' +
                  ((effectiveOs() === 1 ? 'ascent' : 'ascents')
                    | translate
                    | lowercase) +
                  ' (' +
                  (effectiveOs() / effectiveTotal() | percent: '1.0-0') +
                  ')'
                "
              ></div>
            }
          </div>
        </div>

        <!-- Clean Legend: Colored dots + percentages (no label text, hover shows detail) -->
        <div class="flex items-center justify-between text-xs px-1">
          <!-- Redpoint -->
          <div
            class="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
            [class.opacity-40]="effectiveRp() === 0"
            [tuiHint]="
              ('ascentTypes.rp' | translate) +
              ': ' +
              effectiveRp() +
              ' ' +
              ((effectiveRp() === 1 ? 'ascent' : 'ascents')
                | translate
                | lowercase)
            "
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 bg-(--tui-status-negative)"
            ></span>
            <span class="font-bold text-(--tui-text-primary)">
              {{ effectiveRp() / effectiveTotal() | percent: '1.0-0' }}
            </span>
          </div>

          <!-- Flash -->
          <div
            class="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
            [class.opacity-40]="effectiveFlash() === 0"
            [tuiHint]="
              ('ascentTypes.f' | translate) +
              ': ' +
              effectiveFlash() +
              ' ' +
              ((effectiveFlash() === 1 ? 'ascent' : 'ascents')
                | translate
                | lowercase)
            "
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 bg-(--tui-status-warning)"
            ></span>
            <span class="font-bold text-(--tui-text-primary)">
              {{ effectiveFlash() / effectiveTotal() | percent: '1.0-0' }}
            </span>
          </div>

          <!-- Onsight -->
          <div
            class="flex items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80"
            [class.opacity-40]="effectiveOs() === 0"
            [tuiHint]="
              ('ascentTypes.os' | translate) +
              ': ' +
              effectiveOs() +
              ' ' +
              ((effectiveOs() === 1 ? 'ascent' : 'ascents')
                | translate
                | lowercase)
            "
          >
            <span
              class="w-2 h-2 rounded-full shrink-0 bg-(--tui-status-positive)"
            ></span>
            <span class="font-bold text-(--tui-text-primary)">
              {{ effectiveOs() / effectiveTotal() | percent: '1.0-0' }}
            </span>
          </div>
        </div>
      </div>
    }
  `,
})
export class ChartAscentsByStyleComponent {
  ascents = input<readonly AscentStyleRecord[] | null | undefined>();
  total = input<number>();
  rpCount = input<number>();
  flashCount = input<number>();
  osCount = input<number>();

  protected readonly parsedFromAscents = computed(() => {
    const list = this.ascents();
    if (!list) return null;

    let os = 0;
    let f = 0;
    let rp = 0;

    for (const ascent of list) {
      const type =
        'type' in ascent && ascent.type
          ? ascent.type
          : 'ascent_type' in ascent
            ? ascent.ascent_type
            : null;
      if (type === 'os' || type === 'onsight') os++;
      else if (type === 'f' || type === 'flash') f++;
      else if (type === 'rp' || type === 'redpoint') rp++;
    }

    return { total: os + f + rp, os, f, rp };
  });

  protected readonly effectiveTotal = computed(() => {
    const parsed = this.parsedFromAscents();
    if (parsed) return parsed.total;
    return (
      this.total() ??
      this.effectiveRp() + this.effectiveFlash() + this.effectiveOs()
    );
  });

  protected readonly effectiveRp = computed(() => {
    const parsed = this.parsedFromAscents();
    if (parsed) return parsed.rp;
    return this.rpCount() ?? 0;
  });

  protected readonly effectiveFlash = computed(() => {
    const parsed = this.parsedFromAscents();
    if (parsed) return parsed.f;
    return this.flashCount() ?? 0;
  });

  protected readonly effectiveOs = computed(() => {
    const parsed = this.parsedFromAscents();
    if (parsed) return parsed.os;
    return this.osCount() ?? 0;
  });
}
