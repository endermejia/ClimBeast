import { Component, input, output } from '@angular/core';

import { TuiScrollbar } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { NewsItem } from '../../models';

import { HomeNewsListComponent } from './home-news-list';

@Component({
  selector: 'app-home-news-sidebar',
  standalone: true,
  imports: [HomeNewsListComponent, TranslatePipe, TuiScrollbar],
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
        <app-home-news-list
          variant="sidebar"
          [newsLoading]="newsLoading()"
          [newsItems]="newsItems()"
          [newsHasMore]="newsHasMore()"
          [newsLoadingMore]="newsLoadingMore()"
          (loadMoreNews)="loadMoreNews.emit()"
        />
      </tui-scrollbar>
    </aside>
  `,
})
export class HomeNewsSidebarComponent {
  newsLoading = input<boolean>(false);
  newsItems = input<NewsItem[]>([]);
  newsHasMore = input<boolean>(true);
  newsLoadingMore = input<boolean>(false);

  loadMoreNews = output<void>();
}
