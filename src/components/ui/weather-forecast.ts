import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  Signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { TuiHint, TuiIcon, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { catchError, filter, map, of, switchMap } from 'rxjs';

import { LanguageService } from '../../services/language.service';
import { WeatherService } from '../../services/weather.service';

import { WeatherDay } from '../../models';

@Component({
  selector: 'app-weather-forecast',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    TuiHint,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    @if (loadFailed()) {
      <!-- Forecast could not be fetched (offline / network error) -->
      <div
        class="flex flex-col items-center justify-center gap-3 py-8 text-center"
      >
        <tui-icon icon="@tui.wifi-off" class="size-8 opacity-60" />
        <p class="text-sm opacity-70 m-0">
          {{ 'weather.unavailable' | translate }}
        </p>
      </div>
    } @else if (weather(); as days) {
      <div class="flex flex-col gap-4">
        <h3
          class="text-sm font-semibold flex items-center gap-2 opacity-70 uppercase tracking-wider"
        >
          <tui-icon icon="@tui.cloud-sun" class="size-4!" />
          {{ 'weather.title' | translate }}
        </h3>

        <!-- Days Selection -->
        <tui-scrollbar
          class="pb-2"
          (touchstart)="$event.stopPropagation()"
          (touchmove)="$event.stopPropagation()"
          (touchend)="$event.stopPropagation()"
        >
          <div class="flex gap-2 px-2 pb-4">
            @for (day of days; track day.date; let idx = $index) {
              <button
                type="button"
                (click)="selectedDayIdx.set(idx)"
                class="flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all min-w-[70px] hover:bg-(--tui-background-neutral-1-hover) cursor-pointer"
                [class.bg-(--tui-background-neutral-1)]="
                  selectedDayIdx() === idx
                "
                [class.border-(--tui-border-normal-hover)]="
                  selectedDayIdx() === idx
                "
                [class.bg-(--tui-background-base)]="selectedDayIdx() !== idx"
                [class.border-(--tui-border-normal)]="selectedDayIdx() !== idx"
              >
                <span class="text-xs opacity-70 capitalize">
                  {{
                    day.date
                      | date
                        : 'EEE'
                        : undefined
                        : languageService.selectedLanguage()
                  }}
                </span>
                <tui-icon [icon]="day.icon" class="size-8!" />
                <div class="flex flex-col items-center">
                  <span class="font-bold">
                    {{ day.maxTemp | number: '1.0-0' }}°
                  </span>
                  <span class="text-xs opacity-60">
                    {{ day.minTemp | number: '1.0-0' }}°
                  </span>
                </div>
              </button>
            }
          </div>
        </tui-scrollbar>

        <!-- Hourly Forecast for Selected Day -->
        @if (days[selectedDayIdx()]; as selectedDay) {
          <tui-scrollbar
            #hourlyScroll
            class="pb-2"
            (touchstart)="$event.stopPropagation()"
            (touchmove)="$event.stopPropagation()"
            (touchend)="$event.stopPropagation()"
          >
            <div class="flex gap-3 px-2 pb-4">
              @for (
                hour of selectedDay.hourly;
                track hour.time;
                let i = $index
              ) {
                <div
                  #hourItem
                  class="flex flex-col items-center min-w-[50px] min-h-[120px] p-1 rounded-xl transition-colors border hour-item select-none"
                  [class.bg-(--tui-background-neutral-1)]="
                    i === currentHourIndex()
                  "
                  [class.border-(--tui-border-normal-hover)]="
                    i === currentHourIndex()
                  "
                  [class.border-(--tui-border-normal)]="
                    i !== currentHourIndex()
                  "
                >
                  <span class="text-[10px] opacity-60">
                    {{ hour.time | date: 'HH:mm' }}
                  </span>
                  <tui-icon [icon]="hour.icon" class="size-6!" />
                  <span class="text-xs font-medium">
                    {{ hour.temp | number: '1.0-0' }}°
                  </span>
                  <div
                    class="flex items-center gap-0.5"
                    [tuiHint]="'weather.humidity' | translate"
                  >
                    <tui-icon icon="@tui.droplet" class="size-3! opacity-70" />
                    <span class="text-[9px] opacity-70">
                      {{ hour.humidity }}%
                    </span>
                  </div>

                  @if (hour.precipProb > 0) {
                    <div
                      class="flex items-center gap-0.5"
                      [tuiHint]="'weather.precipitation' | translate"
                    >
                      <tui-icon
                        icon="@tui.cloud-rain"
                        class="size-3! text-blue-500"
                      />
                      <span class="text-[9px] text-blue-500 font-bold">
                        {{ hour.precipProb }}%
                      </span>
                    </div>
                  }

                  <div class="flex-1"></div>

                  <div
                    class="flex flex-col items-center gap-0.5"
                    [attr.aria-label]="
                      hour.windSpeed + ' km/h, ' + hour.windDir + '°'
                    "
                  >
                    <div
                      [tuiHint]="'weather.wind' | translate"
                      class="flex flex-col items-center gap-0.5"
                    >
                      <tui-icon
                        [icon]="hour.windDirIcon"
                        class="size-4! opacity-70"
                      />
                      <span class="text-[9px] opacity-70">
                        {{ hour.windSpeed | number: '1.0-0' }} km/h
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </tui-scrollbar>
        }
      </div>
    } @else {
      <!-- Skeleton Loading State -->
      <tui-loader [loading]="true" [overlay]="true">
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <div [tuiSkeleton]="true" class="w-4 h-4 rounded-full"></div>
            <div [tuiSkeleton]="true" class="w-32 h-4 rounded-full"></div>
          </div>

          <!-- Days Skeleton -->
          <div class="flex gap-2 px-2 pb-4 overflow-hidden">
            @for (i of [1, 2, 3, 4, 5, 6, 7]; track i) {
              <div
                class="flex flex-col items-center gap-1 p-3 rounded-2xl border border-(--tui-border-normal) min-w-[70px] bg-(--tui-background-base)"
              >
                <div
                  [tuiSkeleton]="true"
                  class="w-8 h-2 rounded-full opacity-70"
                ></div>
                <div [tuiSkeleton]="true" class="w-8 h-8 rounded-full"></div>
                <div class="flex flex-col items-center gap-1">
                  <div [tuiSkeleton]="true" class="w-6 h-3 rounded-full"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-4 h-2 rounded-full opacity-60"
                  ></div>
                </div>
              </div>
            }
          </div>

          <!-- Hourly Skeleton -->
          <div class="flex gap-3 px-2 pb-4 overflow-hidden mt-2">
            @for (i of hoursSkeleton; track i) {
              <div
                class="flex flex-col items-center min-w-[45px] min-h-[120px] p-1 gap-1"
              >
                <div
                  [tuiSkeleton]="true"
                  class="w-6 h-2 rounded-full opacity-60"
                ></div>
                <div [tuiSkeleton]="true" class="w-6 h-6 rounded-full"></div>
                <div [tuiSkeleton]="true" class="w-4 h-3 rounded-full"></div>
                <div class="flex items-center gap-0.5">
                  <div [tuiSkeleton]="true" class="w-3 h-3 rounded-full"></div>
                  <div [tuiSkeleton]="true" class="w-4 h-2 rounded-full"></div>
                </div>
                <div class="flex items-center gap-0.5">
                  <div [tuiSkeleton]="true" class="w-3 h-3 rounded-full"></div>
                  <div [tuiSkeleton]="true" class="w-4 h-2 rounded-full"></div>
                </div>
                <div class="flex-1"></div>
                <div class="flex flex-col items-center gap-0.5">
                  <div
                    [tuiSkeleton]="true"
                    class="w-4 h-4 rounded-full opacity-70"
                  ></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-8 h-2 rounded-full opacity-70"
                  ></div>
                </div>
              </div>
            }
          </div>
        </div>
      </tui-loader>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherForecastComponent {
  private readonly weatherService = inject(WeatherService);
  protected readonly languageService = inject(LanguageService);
  protected readonly selectedDayIdx = signal(0);
  protected readonly hoursSkeleton = Array.from({ length: 24 }, (_, i) => i);

  protected readonly hourlyScroll: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('hourlyScroll', { read: ElementRef });
  private readonly hourItems =
    viewChildren<ElementRef<HTMLElement>>('hourItem');

  coords = input.required<{ lat: number; lng: number }>();

  private readonly forecastResult = toSignal(
    toObservable(this.coords).pipe(
      filter((c) => !!c.lat && !!c.lng),
      switchMap((c) =>
        this.weatherService.getForecast(c.lat, c.lng).pipe(
          map((days): { days: WeatherDay[]; ok: boolean } => ({
            days,
            ok: true,
          })),
          // Offline / network failure: degrade instead of erroring, so the
          // dialog shows an "unavailable" message rather than an endless
          // skeleton (a toSignal error would also throw on read).
          catchError(() =>
            of({ days: [] as WeatherDay[], ok: false } as const),
          ),
        ),
      ),
    ),
  );

  /** Days of the forecast, or null while nothing has loaded yet. */
  readonly weather = computed(() => this.forecastResult()?.days ?? null);

  /** True when the last forecast request failed (e.g. offline). */
  protected readonly loadFailed = computed(
    () => this.forecastResult()?.ok === false,
  );

  /** Index of the current hour within the selected day's hourly forecast, or -1 if not today. */
  protected readonly currentHourIndex = computed<number>(() => {
    const days = this.weather();
    const dayIdx = this.selectedDayIdx();
    const currentDay = days?.[dayIdx];
    if (!currentDay || !currentDay.hourly) return -1;

    const now = new Date();
    return currentDay.hourly.findIndex(
      (h) =>
        h.time.getHours() === now.getHours() &&
        h.time.getDate() === now.getDate() &&
        h.time.getMonth() === now.getMonth() &&
        h.time.getFullYear() === now.getFullYear(),
    );
  });

  constructor() {
    effect(() => {
      this.weather();
      this.selectedDayIdx();

      untracked(() => {
        setTimeout(() => {
          const el = this.hourlyScroll()?.nativeElement;
          if (!el) return;

          const currentIdx = this.currentHourIndex();

          if (currentIdx !== -1) {
            const target = this.hourItems()[currentIdx]?.nativeElement;
            if (target) {
              const elRect = el.getBoundingClientRect();
              const targetRect = target.getBoundingClientRect();
              const scrollOffset =
                targetRect.left -
                elRect.left -
                elRect.width / 2 +
                targetRect.width / 2;
              el.scrollLeft += scrollOffset;
            }
          } else {
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
          }
        }, 0);
      });
    });
  }
}
