import { LowerCasePipe, PercentPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  InputSignal,
  Signal,
} from '@angular/core';

import { TuiHint } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { RouteAscentWithExtras } from '../../models';

export interface StyleSegment {
  type: 'os' | 'f' | 'rp';
  labelKey: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-chart-ascents-by-style',
  imports: [LowerCasePipe, PercentPipe, TranslatePipe, TuiHint],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div class="w-full max-w-sm mx-auto text-sm font-sans select-none">
      @if (total() > 0) {
        <div class="flex flex-col gap-2">
          <!-- Title / Header -->
          <div
            class="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-(--tui-text-tertiary) px-1"
          >
            <span>{{ 'statistics.styleDistribution' | translate }}</span>
            <span class="font-normal text-(--tui-text-secondary)">
              {{ total() }}
              {{
                (total() === 1 ? 'ascent' : 'ascents') | translate | lowercase
              }}
            </span>
          </div>

          <!-- Single Stacked Bar -->
          <div
            class="h-3.5 sm:h-4 w-full rounded-full overflow-hidden bg-(--tui-background-neutral-1) flex p-0.5 gap-0.5 border border-(--tui-border-normal)"
          >
            @for (seg of segments(); track seg.type) {
              @if (seg.percentage > 0) {
                <div
                  class="h-full rounded-xs transition-all duration-500 ease-out cursor-pointer hover:brightness-110"
                  [style.width.%]="seg.percentage"
                  [style.background]="seg.color"
                  [tuiHint]="
                    (seg.labelKey | translate) +
                    ': ' +
                    seg.count +
                    ' (' +
                    (seg.percentage / 100 | percent: '1.0-1') +
                    ')'
                  "
                ></div>
              }
            }
          </div>

          <!-- Legend Pills Below Bar -->
          <div
            class="flex items-center justify-between gap-1 text-xs pt-1 px-0.5"
          >
            @for (seg of segments(); track seg.type) {
              <div
                class="flex items-center gap-1 min-w-0"
                [class.opacity-40]="seg.count === 0"
              >
                <span
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  [style.background]="seg.color"
                ></span>
                <span
                  class="truncate font-medium text-(--tui-text-secondary) text-[11px] sm:text-xs"
                >
                  {{ seg.labelKey | translate }}
                </span>
                <span
                  class="font-bold text-(--tui-text-primary) text-[11px] sm:text-xs"
                >
                  {{ seg.count }}
                </span>
                <span class="text-[10px] text-(--tui-text-tertiary)">
                  ({{ seg.percentage / 100 | percent: '1.0-0' }})
                </span>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ChartAscentsByStyleComponent {
  ascents: InputSignal<RouteAscentWithExtras[]> =
    input.required<RouteAscentWithExtras[]>();

  protected readonly total: Signal<number> = computed(() => {
    const list = this.ascents() || [];
    return list.filter((a) => a.type && a.type !== 'attempt').length;
  });

  protected readonly segments: Signal<StyleSegment[]> = computed(() => {
    const list = this.ascents() || [];
    let os = 0;
    let f = 0;
    let rp = 0;

    for (const ascent of list) {
      if (ascent.type === 'os') os++;
      else if (ascent.type === 'f') f++;
      else if (ascent.type === 'rp') rp++;
    }

    const validTotal = os + f + rp;

    return [
      {
        type: 'os',
        labelKey: 'ascentTypes.os',
        count: os,
        percentage: validTotal > 0 ? (os / validTotal) * 100 : 0,
        color: 'var(--tui-status-positive)',
      },
      {
        type: 'f',
        labelKey: 'ascentTypes.f',
        count: f,
        percentage: validTotal > 0 ? (f / validTotal) * 100 : 0,
        color: 'var(--tui-status-warning)',
      },
      {
        type: 'rp',
        labelKey: 'ascentTypes.rp',
        count: rp,
        percentage: validTotal > 0 ? (rp / validTotal) * 100 : 0,
        color: 'var(--tui-status-negative)',
      },
    ];
  });
}
