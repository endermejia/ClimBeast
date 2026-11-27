import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';

import { TuiDay, TuiMonth } from '@taiga-ui/cdk';
import { TuiCalendar, TuiDropdown } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CalendarMonthPickerDirective } from '../../directives/calendar-month-picker.directive';

import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';
import { AscentCardComponent } from './ascent-card';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';

import {
  FeedItem,
  GRADE_NUMBER_TO_LABEL,
  RouteAscentWithExtras,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { AscentDatePipe } from '../../pipes';

export interface ProcessedFeedItem {
  item: FeedItem;
  extraAscents?: RouteAscentWithExtras[];
  trackKey: string;
  index: number;
  showRowBreak: boolean;
  showGradeHeader: boolean;
  gradeLabel?: string;
  showDateHeader: boolean;
}

export interface DateGroup {
  date: string;
  dateKey: string;
  items: ProcessedFeedItem[];
}

@Component({
  selector: 'app-ascents-feed',
  imports: [
    AscentCardComponent,
    AscentCardSkeletonComponent,
    AscentDatePipe,
    CalendarMonthPickerDirective,
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
    NgTemplateOutlet,
    TranslatePipe,
    TuiCalendar,
    TuiDropdown,
  ],
  template: `
    @if (groupByDate() && !groupByGrade()) {
      <div class="flex flex-col gap-6 mt-4">
        @for (group of dateGroups(); track group.dateKey) {
          <section class="flex flex-col">
            @if (group.date) {
              <div
                class="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-3 pb-6 -mb-4 pointer-events-none"
                style="background: linear-gradient(to bottom, var(--tui-background-base) 0%, var(--tui-background-base) 55%, transparent 100%);"
              >
                <div class="flex items-center gap-4 pointer-events-auto">
                  @if (enableDateNavigation()) {
                    <button
                      type="button"
                      class="inline-flex items-center text-lg font-bold shrink-0 text-(--tui-text-primary) hover:text-(--tui-text-action) transition-colors cursor-pointer bg-transparent border-0 p-0"
                      [tuiDropdown]="calendarDropdown"
                      [tuiDropdownOpen]="
                        openCalendarDateKey() === group.dateKey
                      "
                      (tuiDropdownOpenChange)="
                        onCalendarOpenChange(group.dateKey, group.date, $event)
                      "
                      (click)="toggleCalendar(group.dateKey, group.date)"
                    >
                      <span class="inline-block first-letter:uppercase">{{
                        group.date | ascentDate
                      }}</span>
                    </button>
                  } @else {
                    <span
                      class="inline-block text-lg font-bold first-letter:uppercase shrink-0 text-(--tui-text-primary)"
                    >
                      {{ group.date | ascentDate }}
                    </span>
                  }
                  <div class="h-px grow bg-(--tui-border-normal)"></div>
                </div>
              </div>
            }

            <div
              class="grid gap-6"
              [class.grid-cols-1]="true"
              [class.md:grid-cols-2]="columns() >= 2"
              [class.lg:grid-cols-3]="columns() >= 3"
            >
              @for (processed of group.items; track processed.trackKey) {
                @if (processed.item.kind === 'news') {
                  <app-news-card
                    [item]="processed.item"
                    [class.md:col-span-2]="columns() >= 2"
                    [class.lg:col-span-3]="columns() >= 3"
                  />
                } @else if (processed.item.kind === 'ascent') {
                  <ng-container
                    *ngTemplateOutlet="
                      ascentEntryTpl;
                      context: {
                        $implicit: processed.item,
                        processed: processed,
                      }
                    "
                  />
                }
              }
            </div>
          </section>
        }

        @if (isLoading()) {
          <div
            class="grid gap-6"
            [class.grid-cols-1]="true"
            [class.md:grid-cols-2]="columns() >= 2"
            [class.lg:grid-cols-3]="columns() >= 3"
          >
            @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
              <app-ascent-card-skeleton
                [showUser]="showUser()"
                [showRoute]="showRoute()"
                [showDate]="showDate() && !groupByDate()"
              />
            }
          </div>
        }

        @if (ascents().length > 0 && !isLoading() && hasMore()) {
          <div class="flex justify-center py-4">
            <app-infinite-scroll-trigger (intersect)="loadMore.emit()" />
          </div>
        }
      </div>
    } @else {
      <div
        class="grid gap-6 mt-4"
        [class.grid-cols-1]="true"
        [class.md:grid-cols-2]="columns() >= 2"
        [class.lg:grid-cols-3]="columns() >= 3"
      >
        @for (processed of processedItems(); track processed.trackKey) {
          @if (processed.showRowBreak) {
            <div
              class="hidden"
              [class.md:block]="columns() >= 2"
              [class.md:col-span-2]="columns() >= 2"
              [class.lg:col-span-3]="columns() >= 3"
            ></div>
          }
          @if (processed.item.kind === 'news') {
            <app-news-card
              [item]="processed.item"
              [class.md:col-span-2]="columns() >= 2"
              [class.lg:col-span-3]="columns() >= 3"
            />
          } @else if (processed.item.kind === 'ascent') {
            @if (groupByGrade() && processed.showGradeHeader) {
              <div
                class="mt-10 mb-4 flex items-center gap-4"
                [class.md:col-span-2]="columns() >= 2"
                [class.lg:col-span-3]="columns() >= 3"
              >
                <span class="text-2xl font-black shrink-0">
                  {{ processed.gradeLabel }}
                </span>
                <div class="h-px grow bg-(--tui-border-normal)"></div>
              </div>
            }
            <ng-container
              *ngTemplateOutlet="
                ascentEntryTpl;
                context: {
                  $implicit: processed.item,
                  processed: processed,
                }
              "
            />
          }
        }

        @if (isLoading()) {
          @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
            <app-ascent-card-skeleton
              [showUser]="showUser()"
              [showRoute]="showRoute()"
              [showDate]="showDate() && !groupByDate()"
            />
          }
        }

        @if (ascents().length > 0 && !isLoading() && hasMore()) {
          <div
            class="flex justify-center py-4"
            [class.md:col-span-2]="columns() >= 2"
            [class.lg:col-span-3]="columns() >= 3"
          >
            <app-infinite-scroll-trigger (intersect)="loadMore.emit()" />
          </div>
        }
      </div>
    }

    <ng-template
      #ascentCardTpl
      let-ascent
      let-extraAscents="extraAscents"
      let-priority="priority"
    >
      <app-ascent-card
        [data]="ascent"
        [extraAscents]="extraAscents ?? []"
        [showUser]="showUser()"
        [showRoute]="showRoute()"
        [showCrag]="showCrag()"
        [showArea]="showArea()"
        [showDate]="showCardDate()"
        [priority]="!!priority"
        [highlightOwn]="highlightOwn()"
      />
    </ng-template>

    <ng-template #ascentEntryTpl let-ascent let-processed="processed">
      @if (processed.index === 0) {
        <ng-container
          *ngTemplateOutlet="
            ascentCardTpl;
            context: {
              $implicit: ascent,
              extraAscents: processed.extraAscents,
              priority: true,
            }
          "
        />
      } @else {
        @defer (on viewport) {
          <ng-container
            *ngTemplateOutlet="
              ascentCardTpl;
              context: {
                $implicit: ascent,
                extraAscents: processed.extraAscents,
                priority: false,
              }
            "
          />
        } @placeholder {
          <app-ascent-card-skeleton
            [showUser]="showUser()"
            [showRoute]="showRoute()"
            [showDate]="showCardDate()"
            [hasPhoto]="!!ascent.photo_path"
            [photoWidth]="ascent.photo_width"
            [photoHeight]="ascent.photo_height"
            [photoLqip]="ascent.photo_lqip"
          />
        } @error {
          <div class="p-4 text-center text-xs opacity-60">
            {{ 'errors.unexpected' | translate }}
          </div>
        }
      }
    </ng-template>

    <ng-template #calendarDropdown>
      <div class="p-2">
        <tui-calendar
          appCalendarMonthPicker
          [value]="calendarSelectedDay()"
          [month]="calendarMonth()"
          [min]="minCalendarDay()"
          [max]="maxCalendarDay"
          (monthChange)="calendarMonth.set($event)"
          (dayClick)="onCalendarDayClick($event)"
        />
      </div>
    </ng-template>
  `,
})
export class AscentsFeedComponent {
  ascents = input.required<FeedItem[]>();
  groupByGrade = input(false);
  groupByDate = input(false);
  groupByUser = input(false);
  isLoading = input(false);
  hasMore = input(false);
  showUser = input(true);
  showRoute = input(true);
  showCrag = input(true);
  showArea = input(true);
  showDate = input(true);
  columns = input<number>(1);
  highlightOwn = input(false);
  enableDateNavigation = input(false);
  minDate = input<string | null>(null);

  loadMore = output<void>();
  dateSelected = output<string>();

  protected readonly showCardDate = computed(
    () => this.showDate() && !this.groupByDate(),
  );
  protected readonly openCalendarDateKey = signal<string | null>(null);
  protected readonly calendarSelectedDay = signal<TuiDay>(
    TuiDay.currentLocal(),
  );
  protected readonly calendarMonth = signal<TuiMonth>(TuiMonth.currentLocal());
  protected readonly maxCalendarDay = TuiDay.currentLocal();
  protected readonly minCalendarDay = computed<TuiDay | null>(() =>
    this.parseIsoToTuiDay(this.minDate()),
  );

  protected toggleCalendar(dateKey: string, dateStr: string): void {
    const isOpen = this.openCalendarDateKey() === dateKey;
    if (isOpen) {
      this.openCalendarDateKey.set(null);
      return;
    }
    const day = this.parseIsoToTuiDay(dateStr) ?? TuiDay.currentLocal();
    this.calendarSelectedDay.set(day);
    this.calendarMonth.set(new TuiMonth(day.year, day.month));
    this.openCalendarDateKey.set(dateKey);
  }

  protected onCalendarOpenChange(
    dateKey: string,
    dateStr: string,
    open: boolean,
  ): void {
    if (open) {
      const day = this.parseIsoToTuiDay(dateStr) ?? TuiDay.currentLocal();
      this.calendarSelectedDay.set(day);
      this.calendarMonth.set(new TuiMonth(day.year, day.month));
      this.openCalendarDateKey.set(dateKey);
    } else if (this.openCalendarDateKey() === dateKey) {
      this.openCalendarDateKey.set(null);
    }
  }

  protected onCalendarDayClick(day: TuiDay): void {
    const month = String(day.month + 1).padStart(2, '0');
    const dayNum = String(day.day).padStart(2, '0');
    this.openCalendarDateKey.set(null);
    this.dateSelected.emit(`${day.year}-${month}-${dayNum}`);
  }

  private parseIsoToTuiDay(dateStr: string | null | undefined): TuiDay | null {
    if (!dateStr) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return new TuiDay(year, month, day);
  }

  protected readonly dateGroups = computed<DateGroup[]>(() => {
    if (!this.groupByDate() || this.groupByGrade()) {
      return [];
    }

    const items = this.processedItems();
    const groups: DateGroup[] = [];
    const dateCounts = new Map<string, number>();

    for (const item of items) {
      const dateStr = item.item.date ? item.item.date.substring(0, 10) : '';
      const lastGroup = groups[groups.length - 1];

      if (
        !lastGroup ||
        (lastGroup.date ? lastGroup.date.substring(0, 10) : '') !== dateStr
      ) {
        const occurrence = (dateCounts.get(dateStr) ?? 0) + 1;
        dateCounts.set(dateStr, occurrence);
        const groupKey =
          occurrence > 1
            ? `${dateStr || 'no-date'}-${occurrence}`
            : dateStr || 'no-date';

        groups.push({
          date: item.item.date || '',
          dateKey: groupKey,
          items: [item],
        });
      } else {
        lastGroup.items.push(item);
      }
    }

    if (this.groupByUser()) {
      for (const group of groups) {
        const mergedItems: ProcessedFeedItem[] = [];
        const userEntryMap = new Map<string, ProcessedFeedItem>();

        for (const entry of group.items) {
          if (entry.item.kind !== 'ascent' || !entry.item.user_id) {
            mergedItems.push(entry);
            continue;
          }

          const existing = userEntryMap.get(entry.item.user_id);
          if (!existing) {
            const groupedEntry: ProcessedFeedItem = {
              ...entry,
              extraAscents: [],
            };
            userEntryMap.set(entry.item.user_id, groupedEntry);
            mergedItems.push(groupedEntry);
          } else {
            existing.extraAscents = [
              ...(existing.extraAscents ?? []),
              entry.item,
            ];
          }
        }

        group.items = mergedItems;
      }
    }

    return groups;
  });

  protected readonly processedItems = computed<ProcessedFeedItem[]>(() => {
    const list = this.ascents();
    const groupByGrade = this.groupByGrade();
    const groupByDate = this.groupByDate();

    return list.map((item, index) => {
      const isIndoorAscent =
        item.kind === 'ascent' &&
        !!(
          item.route &&
          'center_slug' in item.route &&
          (item.route as { center_slug?: string }).center_slug
        );
      const trackKey =
        item.kind === 'news'
          ? `news-${item.id || item.link}`
          : `ascent-${isIndoorAscent ? 'indoor' : 'outdoor'}-${item.id}`;

      let showRowBreak = false;
      let showGradeHeader = false;
      let gradeLabel = '';
      let showDateHeader = false;

      if (item.kind === 'ascent') {
        if (groupByGrade) {
          const grade = item.grade ?? item.route?.grade;
          if (grade !== null && grade !== undefined) {
            if (index === 0) {
              showGradeHeader = true;
            } else {
              const prev = list[index - 1];
              if (prev.kind === 'news') {
                showGradeHeader = true;
              } else {
                const prevGrade = prev.grade ?? prev.route?.grade;
                showGradeHeader = grade !== prevGrade;
              }
            }
            gradeLabel =
              GRADE_NUMBER_TO_LABEL[grade as VERTICAL_LIFE_GRADES] ||
              grade.toString() ||
              '';
          }
        }
      }

      if (groupByDate && !groupByGrade) {
        if (item.date) {
          const currentDateStr = item.date.substring(0, 10);
          if (index === 0) {
            showDateHeader = true;
          } else {
            const prev = list[index - 1];
            const prevDateStr = prev.date ? prev.date.substring(0, 10) : '';
            showDateHeader = currentDateStr !== prevDateStr;
          }
        }
      } else if (!groupByGrade && index > 0) {
        const prev = list[index - 1];
        if (item.date && prev.date) {
          const currentDateStr = item.date.substring(0, 10);
          const prevDateStr = prev.date.substring(0, 10);
          showRowBreak = currentDateStr !== prevDateStr;
        }
      }

      return {
        item,
        trackKey,
        index,
        showRowBreak,
        showGradeHeader,
        gradeLabel,
        showDateHeader,
      };
    });
  });
}
