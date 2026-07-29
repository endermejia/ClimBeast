import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { NewsItem } from '../../models';

import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';

import { NewsCardSkeletonComponent } from '../ui/news-card-skeleton';

@Component({
  selector: 'app-home-news-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
    NewsCardSkeletonComponent,
    TranslatePipe,
    TuiScrollbar,
  ],
  template: `
    <aside
      class="hidden xl:flex xl:w-[420px] flex-col gap-4 py-4 px-4 h-full shrink-0"
    >
      <div
        class="shrink-0 flex items-center justify-between w-full px-1 border-b border-(--tui-border-normal) pb-2 bg-(--tui-background-base) pt-1"
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-black uppercase tracking-wider">
            {{ 'climbingNews' | translate }}
          </span>
        </div>
      </div>

      <tui-scrollbar class="flex-1 min-h-0 w-full">
        <div class="flex flex-col gap-4 w-full pr-2">
          @if (newsLoading()) {
            @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
              <app-news-card-skeleton />
            }
          } @else if (newsItems().length > 0) {
            @for (news of newsItems(); track news.id) {
              <app-news-card [item]="news" />
            }

            @if (newsHasMore()) {
              <div class="flex justify-center py-2">
                @if (newsLoadingMore()) {
                  <app-news-card-skeleton />
                } @else {
                  <app-infinite-scroll-trigger
                    (intersect)="loadMoreNews.emit()"
                  />
                }
              </div>
            }
          } @else {
            <div class="text-xs text-center py-6 opacity-60">
              {{ 'noNewsAvailable' | translate }}
            </div>
          }
        </div>
      </tui-scrollbar>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeNewsSidebarComponent {
  newsLoading = input<boolean>(false);
  newsItems = input<NewsItem[]>([]);
  newsHasMore = input<boolean>(true);
  newsLoadingMore = input<boolean>(false);

  loadMoreNews = output<void>();
}
