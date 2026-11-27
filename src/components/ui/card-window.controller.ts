import {
  computed,
  effect,
  ElementRef,
  inject,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import { ScrollService } from '../../services/scroll.service';

import { reactToObservable } from '../../utils';

/**
 * Default number of cards rendered per batch. Initial render builds only one
 * window (a few screens) and subsequent batches load as the user scrolls,
 * keeping route transitions responsive even for large lists.
 */
export const DEFAULT_CARD_WINDOW = 24;

export interface CardWindowControllerOptions<T> {
  items: Signal<readonly T[]>;
  visibleCount: WritableSignal<number>;
  filterKey: Signal<string>;
  scrollbar: Signal<ElementRef<HTMLElement> | undefined>;
  windowSize?: number;
  scrollService?: ScrollService;
  router?: Router;
}

export interface CardWindowController<T> {
  readonly visibleItems: Signal<T[]>;
  readonly hasMore: Signal<boolean>;
  showMore: () => void;
  scrollToTop: () => void;
  onTabClick: (event: MouseEvent, path: string) => void;
}

/**
 * Creates a windowed card list & tab-scroll controller.
 * Must be called inside an Angular injection context (e.g. component field
 * initializer or constructor).
 */
export function createCardWindowController<T>(
  options: CardWindowControllerOptions<T>,
): CardWindowController<T> {
  const windowSize = options.windowSize ?? DEFAULT_CARD_WINDOW;
  const scrollService = options.scrollService ?? inject(ScrollService);
  const router = options.router ?? inject(Router);

  const visibleItems = computed(() =>
    options.items().slice(0, options.visibleCount()),
  );

  const hasMore = computed(
    () => options.items().length > options.visibleCount(),
  );

  const showMore = (): void => {
    options.visibleCount.update((count) => count + windowSize);
  };

  const scrollToTop = (): void => {
    options.visibleCount.set(windowSize);
    const el = options.scrollbar()?.nativeElement;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onTabClick = (event: MouseEvent, path: string): void => {
    const current = router.url.split('?')[0].split('#')[0];
    if (current === path) {
      event.preventDefault();
      scrollToTop();
    }
  };

  reactToObservable(scrollService.scrollToTop$, () => {
    scrollToTop();
  });

  // Skip the initial run so a persisted `visibleCount` survives back navigation;
  // only reset when search/filter criteria actually change afterwards.
  let initialRun = true;
  effect(() => {
    options.filterKey();
    if (initialRun) {
      initialRun = false;
      return;
    }
    untracked(() => options.visibleCount.set(windowSize));
  });

  return {
    visibleItems,
    hasMore,
    showMore,
    scrollToTop,
    onTabClick,
  };
}
