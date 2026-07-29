import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { NewsItem } from '../../models';

import { InfiniteScrollTriggerComponent } from '../ui/infinite-scroll-trigger';
import { NewsCardComponent } from '../ui/news-card';

import { NewsCardSkeletonComponent } from '../ui/news-card-skeleton';

@Component({
  selector: 'app-home-news-grid',
  standalone: true,
  imports: [
    CommonModule,
    InfiniteScrollTriggerComponent,
    NewsCardComponent,
    NewsCardSkeletonComponent,
    TranslatePipe,
  ],
  template: `
    @if (newsLoading()) {
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        @for (_ of [1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
          <app-news-card-skeleton />
        }
      </div>
    } @else if (newsItems().length > 0) {
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        @for (news of newsItems(); track news.id) {
          <app-news-card [item]="news" />
        }
      </div>

      @if (newsHasMore()) {
        @if (newsLoadingMore()) {
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-4"
          >
            @for (_ of [1, 2, 3, 4]; track $index) {
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
      <div class="text-sm text-center py-12 opacity-60">
        {{ 'noNewsAvailable' | translate }}
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeNewsGridComponent {
  newsLoading = input<boolean>(false);
  newsItems = input<NewsItem[]>([]);
  newsHasMore = input<boolean>(true);
  newsLoadingMore = input<boolean>(false);

  loadMoreNews = output<void>();
}
