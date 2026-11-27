import {
  ComponentRef,
  DestroyRef,
  Directive,
  ElementRef,
  Renderer2,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { outputToObservable } from '@angular/core/rxjs-interop';

import { TuiMonth, TuiYear } from '@taiga-ui/cdk';
import { TuiCalendar } from '@taiga-ui/core';
import { TuiCalendarMonth } from '@taiga-ui/kit';

import { firstValueFrom } from 'rxjs';

/**
 * Enhances Taiga UI `<tui-calendar>` so clicking the month name in the header
 * opens `<tui-calendar-month>` to jump directly to any month (and year).
 */
@Directive({
  selector: '[appCalendarMonthPicker]',
  host: {
    '(click)': 'onHostClick($event)',
  },
})
export class CalendarMonthPickerDirective {
  private readonly calendar = inject(TuiCalendar);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);

  private monthPickerRef: ComponentRef<TuiCalendarMonth> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.closeMonthPicker());
  }

  protected onHostClick(event: MouseEvent): void {
    if (this.monthPickerRef) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const spin = target.closest('tui-calendar-spin');
    if (!spin || target.closest('button')) return;

    void this.openMonthPicker();
  }

  private async openMonthPicker(): Promise<void> {
    if (this.monthPickerRef) return;

    const currentMonth = this.calendar.month();
    const minDay = this.calendar.min();
    const maxDay = this.calendar.max();

    this.renderer.addClass(this.el.nativeElement, 'cal-month-picker-open');

    const compRef = this.vcr.createComponent(TuiCalendarMonth);
    this.monthPickerRef = compRef;

    this.renderer.appendChild(
      this.el.nativeElement,
      compRef.location.nativeElement,
    );

    compRef.setInput('value', currentMonth);
    compRef.setInput('year', new TuiYear(currentMonth.year));
    compRef.setInput('min', new TuiMonth(minDay.year, minDay.month));
    compRef.setInput('max', new TuiMonth(maxDay.year, maxDay.month));

    try {
      const selectedMonth = await firstValueFrom(
        outputToObservable(compRef.instance.monthClick),
      );
      this.calendar.onPaginationValueChange(selectedMonth);
    } catch {
      // Closed or destroyed before selecting a month
    } finally {
      this.closeMonthPicker();
    }
  }

  private closeMonthPicker(): void {
    if (!this.monthPickerRef) return;
    this.monthPickerRef.destroy();
    this.monthPickerRef = null;
    this.renderer.removeClass(this.el.nativeElement, 'cal-month-picker-open');
  }
}
