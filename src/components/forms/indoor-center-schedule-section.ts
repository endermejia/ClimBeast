import { Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiCheckbox, TuiInput, TuiTextfield } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { IndoorSchedule, scheduleFromJson } from '../../models';

export const INDOOR_WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type IndoorWeekDay = (typeof INDOOR_WEEK_DAYS)[number];

export interface IndoorDayScheduleForm {
  closed: boolean;
  open: string;
  close: string;
  hasSplit: boolean;
  open2: string;
  close2: string;
}

export type IndoorScheduleFormState = Record<string, IndoorDayScheduleForm>;

const DEFAULT_DAY_SCHEDULE: IndoorDayScheduleForm = {
  closed: true,
  open: '09:00',
  close: '21:00',
  hasSplit: false,
  open2: '16:00',
  close2: '21:00',
};

export function buildInitialIndoorSchedule(
  dataSchedule?: unknown,
): IndoorScheduleFormState {
  const schedule = scheduleFromJson(dataSchedule) || { normal: {} };
  return INDOOR_WEEK_DAYS.reduce((acc, day) => {
    const s = schedule.normal?.[day] || {
      closed: true,
      open: '09:00',
      close: '21:00',
    };
    acc[day] = {
      closed: !!s.closed,
      open: s.open || '09:00',
      close: s.close || '21:00',
      hasSplit: !!(s.open2 && s.close2),
      open2: s.open2 || '16:00',
      close2: s.close2 || '21:00',
    };
    return acc;
  }, {} as IndoorScheduleFormState);
}

export function buildIndoorSchedulePayload(
  scheduleState: IndoorScheduleFormState,
): IndoorSchedule {
  const normalSchedule: IndoorSchedule['normal'] = {};
  for (const day of INDOOR_WEEK_DAYS) {
    const d = scheduleState[day] || DEFAULT_DAY_SCHEDULE;
    normalSchedule[day] = {
      closed: d.closed,
      open: d.closed ? null : d.open,
      close: d.closed ? null : d.close,
      open2: !d.closed && d.hasSplit ? d.open2 : null,
      close2: !d.closed && d.hasSplit ? d.close2 : null,
    };
  }
  return { normal: normalSchedule } as IndoorSchedule;
}

@Component({
  selector: 'app-indoor-center-schedule-section',
  imports: [FormsModule, TranslatePipe, TuiCheckbox, TuiInput, TuiTextfield],
  template: `
    <div class="flex flex-col gap-3">
      @for (d of scheduleDays(); track d.day) {
        <div
          class="flex flex-col gap-3 p-3.5 sm:p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
          [attr.data-schedule-day]="d.day"
        >
          <div class="flex items-center justify-between gap-4">
            <span class="font-bold text-base capitalize">{{
              d.day | translate
            }}</span>

            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                tuiCheckbox
                type="checkbox"
                [ngModel]="d.closed"
                (ngModelChange)="onClosedChange(d.day, $event)"
                [ngModelOptions]="{ standalone: true }"
              />
              <span class="text-sm">{{ 'indoor.closed' | translate }}</span>
            </label>
          </div>

          @if (!d.closed) {
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 pt-2 border-t border-(--tui-border-normal)/40"
            >
              <div class="flex items-center gap-2 w-full sm:w-auto">
                <tui-textfield tuiTextfieldSize="s" class="flex-1 sm:w-32 h-8">
                  <input
                    tuiInput
                    type="time"
                    [ngModel]="d.open"
                    (ngModelChange)="onTimeChange(d.day, 'open', $event)"
                    [ngModelOptions]="{ standalone: true }"
                  />
                </tui-textfield>
                <span class="text-xs opacity-60 shrink-0">-</span>
                <tui-textfield tuiTextfieldSize="s" class="flex-1 sm:w-32 h-8">
                  <input
                    tuiInput
                    type="time"
                    [ngModel]="d.close"
                    (ngModelChange)="onTimeChange(d.day, 'close', $event)"
                    [ngModelOptions]="{ standalone: true }"
                  />
                </tui-textfield>
              </div>

              <label
                class="flex items-center gap-2 cursor-pointer select-none sm:ml-2"
              >
                <input
                  tuiCheckbox
                  type="checkbox"
                  [ngModel]="d.hasSplit"
                  (ngModelChange)="onSplitChange(d.day, $event)"
                  [ngModelOptions]="{ standalone: true }"
                />
                <span class="text-sm">Jornada partida</span>
              </label>

              @if (d.hasSplit) {
                <div class="flex items-center gap-2 w-full sm:w-auto">
                  <tui-textfield
                    tuiTextfieldSize="s"
                    class="flex-1 sm:w-32 h-8"
                  >
                    <input
                      tuiInput
                      type="time"
                      [ngModel]="d.open2"
                      (ngModelChange)="onTimeChange(d.day, 'open2', $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  </tui-textfield>
                  <span class="text-xs opacity-60 shrink-0">-</span>
                  <tui-textfield
                    tuiTextfieldSize="s"
                    class="flex-1 sm:w-32 h-8"
                  >
                    <input
                      tuiInput
                      type="time"
                      [ngModel]="d.close2"
                      (ngModelChange)="onTimeChange(d.day, 'close2', $event)"
                      [ngModelOptions]="{ standalone: true }"
                    />
                  </tui-textfield>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  host: { class: 'block w-full' },
})
export class IndoorCenterScheduleSectionComponent {
  readonly schedule = model.required<IndoorScheduleFormState>();

  protected readonly scheduleDays = computed(() => {
    const formVal = this.schedule();
    return INDOOR_WEEK_DAYS.map((day) => ({
      day,
      ...(formVal[day] ?? DEFAULT_DAY_SCHEDULE),
    }));
  });

  protected onClosedChange(day: string, closed: boolean): void {
    this.schedule.update((sf) => ({
      ...sf,
      [day]: {
        ...(sf[day] ?? DEFAULT_DAY_SCHEDULE),
        closed,
      },
    }));
  }

  protected onSplitChange(day: string, hasSplit: boolean): void {
    this.schedule.update((sf) => ({
      ...sf,
      [day]: {
        ...(sf[day] ?? DEFAULT_DAY_SCHEDULE),
        hasSplit,
      },
    }));
  }

  protected onTimeChange(
    day: string,
    field: 'open' | 'close' | 'open2' | 'close2',
    value: string,
  ): void {
    this.schedule.update((sf) => ({
      ...sf,
      [day]: {
        ...(sf[day] ?? DEFAULT_DAY_SCHEDULE),
        [field]: value,
      },
    }));
  }
}
