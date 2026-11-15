import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';
import { AscentCardComponent } from './ascent-card';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';

import {
  FeedItem,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../../models';

import { AscentDatePipe } from '../../pipes';

export interface ProcessedFeedItem {
  item: FeedItem;
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
    CommonModule,
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
    TranslatePipe,
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
                  <span
                    class="inline-block text-lg font-bold first-letter:uppercase shrink-0 text-(--tui-text-primary)"
                  >
                    {{ group.date | ascentDate }}
                  </span>
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
                  @let ascent = processed.item;
                  @if (processed.index === 0) {
                    <app-ascent-card
                      [data]="ascent"
                      [showUser]="showUser()"
                      [showRoute]="showRoute()"
                      [showCrag]="showCrag()"
                      [showArea]="showArea()"
                      [showDate]="showDate() && !groupByDate()"
                      [priority]="true"
                      [highlightOwn]="highlightOwn()"
                    />
                  } @else {
                    @defer (on viewport) {
                      <app-ascent-card
                        [data]="ascent"
                        [showUser]="showUser()"
                        [showRoute]="showRoute()"
                        [showCrag]="showCrag()"
                        [showArea]="showArea()"
                        [showDate]="showDate() && !groupByDate()"
                        [priority]="false"
                        [highlightOwn]="highlightOwn()"
                      />
                    } @placeholder {
                      <app-ascent-card-skeleton
                        [showUser]="showUser()"
                        [showRoute]="showRoute()"
                        [showDate]="showDate() && !groupByDate()"
                        [hasPhoto]="!!ascent.photo_path"
                      />
                    } @error {
                      <div class="p-4 text-center text-xs opacity-60">
                        {{ 'errors.unexpected' | translate }}
                      </div>
                    }
                  }
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
            @let ascent = processed.item;
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
            @if (processed.index === 0) {
              <app-ascent-card
                [data]="ascent"
                [showUser]="showUser()"
                [showRoute]="showRoute()"
                [showCrag]="showCrag()"
                [showArea]="showArea()"
                [showDate]="showDate() && !groupByDate()"
                [priority]="true"
                [highlightOwn]="highlightOwn()"
              />
            } @else {
              @defer (on viewport) {
                <app-ascent-card
                  [data]="ascent"
                  [showUser]="showUser()"
                  [showRoute]="showRoute()"
                  [showCrag]="showCrag()"
                  [showArea]="showArea()"
                  [showDate]="showDate() && !groupByDate()"
                  [priority]="false"
                  [highlightOwn]="highlightOwn()"
                />
              } @placeholder {
                <app-ascent-card-skeleton
                  [showUser]="showUser()"
                  [showRoute]="showRoute()"
                  [showDate]="showDate() && !groupByDate()"
                  [hasPhoto]="!!ascent.photo_path"
                />
              } @error {
                <div class="p-4 text-center text-xs opacity-60">
                  {{ 'errors.unexpected' | translate }}
                </div>
              }
            }
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
  `,
})
export class AscentsFeedComponent {
  ascents = input.required<FeedItem[]>();
  groupByGrade = input(false);
  groupByDate = input(false);
  isLoading = input(false);
  hasMore = input(false);
  showUser = input(true);
  showRoute = input(true);
  showCrag = input(true);
  showArea = input(true);
  showDate = input(true);
  columns = input<number>(1);
  highlightOwn = input(false);

  loadMore = output<void>();

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

    return groups;
  });

  protected readonly processedItems = computed<ProcessedFeedItem[]>(() => {
    const list = this.ascents();
    const groupByGrade = this.groupByGrade();
    const groupByDate = this.groupByDate();

    return list.map((item, index) => {
      const trackKey =
        item.kind === 'news'
          ? `news-${item.id || item.link}`
          : `ascent-${item.id}`;

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
