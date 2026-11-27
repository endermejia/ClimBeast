import { Component, computed, input, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { NewsItem } from '../../models';

import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';
import { NewsCardSkeletonComponent } from '../ui/news-card-skeleton';

@Component({
  selector: 'app-home-news-list',
  standalone: true,
  imports: [
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
    NewsCardSkeletonComponent,
    TranslatePipe,
  ],
  template: `
    @let isSidebar = variant() === 'sidebar';
    @if (newsLoading()) {
      <div [class]="containerClass()">
        @for (_ of initialSkeletons; track $index) {
          <app-news-card-skeleton />
        }
      </div>
    } @else if (newsItems().length > 0) {
      <div [class]="containerClass()">
        @for (news of newsItems(); track news.id) {
          <app-news-card [item]="news" />
        }

        @if (isSidebar && newsHasMore()) {
          <div class="flex justify-center py-2">
            @if (newsLoadingMore()) {
              <app-news-card-skeleton />
            } @else {
              <app-infinite-scroll-trigger (intersect)="loadMoreNews.emit()" />
            }
          </div>
        }
      </div>

      @if (!isSidebar && newsHasMore()) {
        @if (newsLoadingMore()) {
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4"
          >
            @for (_ of loadMoreSkeletons; track $index) {
              <app-news-card-skeleton />
            }
          </div>
        } @else {
          <div class="flex justify-center py-4">
            <app-infinite-scroll-trigger (intersect)="loadMoreNews.emit()" />
          </div>
        }
      }
    } @else {
      <div [class]="emptyClass()">
        {{ 'noNewsAvailable' | translate }}
      </div>
    }
  `,
})
export class HomeNewsListComponent {
  protected readonly initialSkeletons = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly loadMoreSkeletons = [1, 2, 3, 4];

  variant = input<'grid' | 'sidebar'>('grid');
  newsLoading = input<boolean>(false);
  newsItems = input<NewsItem[]>([]);
  newsHasMore = input<boolean>(true);
  newsLoadingMore = input<boolean>(false);

  loadMoreNews = output<void>();

  protected readonly containerClass = computed(() =>
    this.variant() === 'sidebar'
      ? 'flex flex-col gap-4 w-full pr-2'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  );

  protected readonly emptyClass = computed(() =>
    this.variant() === 'sidebar'
      ? 'text-xs text-center py-6 opacity-60'
      : 'text-sm text-center py-12 opacity-60',
  );
}
