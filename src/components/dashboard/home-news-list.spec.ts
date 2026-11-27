import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FollowsService } from '../../services/follows.service';

import { NewsItem } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';
import { HomeNewsListComponent } from './home-news-list';

@Component({
  standalone: true,
  imports: [HomeNewsListComponent],
  template: `
    <app-home-news-list
      [variant]="variant()"
      [newsLoading]="newsLoading()"
      [newsItems]="newsItems()"
      [newsHasMore]="newsHasMore()"
      [newsLoadingMore]="newsLoadingMore()"
      (loadMoreNews)="onLoadMore()"
    />
  `,
})
class TestHostComponent {
  variant = signal<'grid' | 'sidebar'>('grid');
  newsLoading = signal(false);
  newsItems = signal<NewsItem[]>([]);
  newsHasMore = signal(true);
  newsLoadingMore = signal(false);

  onLoadMore = vi.fn();
}

describe('HomeNewsListComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let observerCallback: IntersectionObserverCallback | null = null;
  let originalIntersectionObserver: typeof IntersectionObserver;

  const mockNews: NewsItem[] = [
    {
      kind: 'news',
      id: 1,
      title: 'First Climb News',
      link: 'https://example.com/1',
      date: '2026-10-01T10:00:00Z',
      excerpt: 'Summary one',
    },
    {
      kind: 'news',
      id: 2,
      title: 'Second Climb News',
      link: 'https://example.com/2',
      date: '2026-10-02T10:00:00Z',
      excerpt: 'Summary two',
    },
  ];

  beforeEach(async () => {
    observerCallback = null;
    originalIntersectionObserver = globalThis.IntersectionObserver;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly scrollMargin = '';
      readonly thresholds: readonly number[] = [];

      constructor(cb: IntersectionObserverCallback) {
        observerCallback = cb;
      }

      disconnect = vi.fn();
      observe = vi.fn();
      takeRecords = vi.fn(() => []);
      unobserve = vi.fn();
    }

    globalThis.IntersectionObserver = MockIntersectionObserver;

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()],
      providers: [
        { provide: IS_BROWSER, useValue: true },
        {
          provide: FollowsService,
          useValue: {
            followNews: signal(false),
            toggleFollowNews: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('renders 8 loading skeletons in grid and sidebar variants', () => {
    host.variant.set('grid');
    host.newsLoading.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-news-card-skeleton')).toHaveLength(8);
    expect(el.querySelector('div.grid')).not.toBeNull();

    host.variant.set('sidebar');
    fixture.detectChanges();
    expect(el.querySelectorAll('app-news-card-skeleton')).toHaveLength(8);
    expect(el.querySelector('div.flex.flex-col')).not.toBeNull();
  });

  it('renders news items and emits loadMoreNews when trigger intersects', () => {
    host.variant.set('grid');
    host.newsLoading.set(false);
    host.newsItems.set(mockNews);
    host.newsHasMore.set(true);
    host.newsLoadingMore.set(false);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-news-card')).toHaveLength(2);
    expect(el.querySelector('app-infinite-scroll-trigger')).not.toBeNull();

    observerCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(host.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('renders load-more skeletons according to variant when newsLoadingMore is true', () => {
    host.variant.set('grid');
    host.newsLoading.set(false);
    host.newsItems.set(mockNews);
    host.newsHasMore.set(true);
    host.newsLoadingMore.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('app-news-card-skeleton')).toHaveLength(4);
    expect(el.querySelector('app-infinite-scroll-trigger')).toBeNull();

    host.variant.set('sidebar');
    fixture.detectChanges();
    expect(el.querySelectorAll('app-news-card-skeleton')).toHaveLength(1);
    expect(el.querySelector('app-infinite-scroll-trigger')).toBeNull();
  });

  it('renders empty state for grid and sidebar variants when no items exist', () => {
    host.variant.set('grid');
    host.newsLoading.set(false);
    host.newsItems.set([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const gridEmpty = el.querySelector('app-home-news-list > div');
    expect(gridEmpty?.textContent?.trim()).toBe('noNewsAvailable');
    expect(gridEmpty?.classList.contains('text-sm')).toBe(true);

    host.variant.set('sidebar');
    fixture.detectChanges();

    const sidebarEmpty = el.querySelector('app-home-news-list > div');
    expect(sidebarEmpty?.textContent?.trim()).toBe('noNewsAvailable');
    expect(sidebarEmpty?.classList.contains('text-xs')).toBe(true);
  });
});
