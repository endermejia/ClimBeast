import { Component, input, output } from '@angular/core';

import { NewsItem } from '../../models';

import { HomeNewsListComponent } from './home-news-list';

@Component({
  selector: 'app-home-news-grid',
  imports: [HomeNewsListComponent],
  template: `
    <app-home-news-list
      variant="grid"
      [newsLoading]="newsLoading()"
      [newsItems]="newsItems()"
      [newsHasMore]="newsHasMore()"
      [newsLoadingMore]="newsLoadingMore()"
      (loadMoreNews)="loadMoreNews.emit()"
    />
  `,
})
export class HomeNewsGridComponent {
  newsLoading = input<boolean>(false);
  newsItems = input<NewsItem[]>([]);
  newsHasMore = input<boolean>(true);
  newsLoadingMore = input<boolean>(false);

  loadMoreNews = output<void>();
}
