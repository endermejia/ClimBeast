import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CountUpDirective } from '../../../directives/count-up.directive';

@Component({
  selector: 'app-user-profile-stats-score',
  standalone: true,
  imports: [CountUpDirective, DecimalPipe, TranslatePipe],
  template: `
    @if (!compact()) {
      <div class="grid gap-6">
        <!-- Score Card -->
        <div
          class="bg-(--tui-background-base) shadow-md rounded-2xl p-6 text-center border border-(--tui-border-normal)"
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block min-w-0 overflow-hidden',
  },
})
export class UserProfileStatsScoreComponent {
  totalScore = input.required<number>();
  totalAscents = input.required<number>();
  maxRedpoint = input.required<string | null>();
  maxOnsight = input.required<string | null>();
  maxFlash = input.required<string | null>();
  compact = input<boolean>(false);
}
