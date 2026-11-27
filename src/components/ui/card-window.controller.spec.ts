import { ElementRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollService } from '../../services/scroll.service';

import {
  createCardWindowController,
  DEFAULT_CARD_WINDOW,
} from './card-window.controller';

describe('createCardWindowController', () => {
  let scrollToTop$: Subject<void>;
  let mockScrollService: Pick<ScrollService, 'scrollToTop$'>;
  let mockRouter: { url: string };
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    scrollToTop$ = new Subject<void>();
    mockScrollService = {
      scrollToTop$: scrollToTop$.asObservable(),
    };
    mockRouter = { url: '/area' };
    scrollToSpy = vi.fn();
  });

  function setup(options?: {
    itemCount?: number;
    initialVisibleCount?: number;
    windowSize?: number;
    hasScrollbar?: boolean;
  }) {
    const itemCount = options?.itemCount ?? 60;
    const items = signal(Array.from({ length: itemCount }, (_, i) => i + 1));
    const visibleCount = signal(
      options?.initialVisibleCount ?? DEFAULT_CARD_WINDOW,
    );
    const filterKey = signal('initial');
    const nativeElement = {
      scrollTo: scrollToSpy,
    } as unknown as HTMLElement;
    const scrollbar = signal<ElementRef<HTMLElement> | undefined>(
      options?.hasScrollbar === false
        ? undefined
        : new ElementRef(nativeElement),
    );

    const controller = TestBed.runInInjectionContext(() =>
      createCardWindowController({
        items,
        visibleCount,
        filterKey,
        scrollbar,
        windowSize: options?.windowSize,
        scrollService: mockScrollService as ScrollService,
        router: mockRouter as Router,
      }),
    );

    return { items, visibleCount, filterKey, scrollbar, controller };
  }

  it('slices items to visibleCount and computes hasMore', () => {
    const { controller, visibleCount } = setup({
      itemCount: 30,
      initialVisibleCount: 24,
    });

    expect(controller.visibleItems()).toHaveLength(24);
    expect(controller.visibleItems()[0]).toBe(1);
    expect(controller.visibleItems()[23]).toBe(24);
    expect(controller.hasMore()).toBe(true);

    visibleCount.set(30);
    expect(controller.visibleItems()).toHaveLength(30);
    expect(controller.hasMore()).toBe(false);
  });

  it('increments visibleCount by windowSize on showMore', () => {
    const { controller, visibleCount } = setup({
      itemCount: 40,
      initialVisibleCount: 10,
      windowSize: 10,
    });

    controller.showMore();
    expect(visibleCount()).toBe(20);
    expect(controller.visibleItems()).toHaveLength(20);
    expect(controller.hasMore()).toBe(true);

    controller.showMore();
    controller.showMore();
    expect(visibleCount()).toBe(40);
    expect(controller.hasMore()).toBe(false);
  });

  it('preserves persisted visibleCount on initial effect run and resets on filterKey change', () => {
    const { visibleCount, filterKey } = setup({
      itemCount: 100,
      initialVisibleCount: 72,
      windowSize: 24,
    });

    TestBed.tick();
    expect(visibleCount()).toBe(72);

    filterKey.set('updated-query');
    TestBed.tick();
    expect(visibleCount()).toBe(24);
  });

  it('resets visibleCount and smoothly scrolls scrollbar on scrollToTop', () => {
    const { controller, visibleCount } = setup({
      itemCount: 100,
      initialVisibleCount: 72,
      windowSize: 24,
    });

    controller.scrollToTop();

    expect(visibleCount()).toBe(24);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('resets visibleCount without throwing when scrollbar is absent', () => {
    const { controller, visibleCount } = setup({
      initialVisibleCount: 48,
      hasScrollbar: false,
    });

    expect(() => controller.scrollToTop()).not.toThrow();
    expect(visibleCount()).toBe(DEFAULT_CARD_WINDOW);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls to top when scrollService.scrollToTop$ emits', () => {
    const { visibleCount } = setup({
      initialVisibleCount: 48,
      windowSize: 24,
    });

    scrollToTop$.next();

    expect(visibleCount()).toBe(24);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('prevents navigation, resets window, and scrolls when onTabClick matches current path', () => {
    mockRouter.url = '/area?tab=list#top';
    const { controller, visibleCount } = setup({
      initialVisibleCount: 48,
      windowSize: 24,
    });
    const preventDefault = vi.fn();
    const event = { preventDefault } as unknown as MouseEvent;

    controller.onTabClick(event, '/area');

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(visibleCount()).toBe(24);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('does not prevent navigation or reset window when onTabClick targets a different path', () => {
    mockRouter.url = '/area';
    const { controller, visibleCount } = setup({
      initialVisibleCount: 48,
      windowSize: 24,
    });
    const preventDefault = vi.fn();
    const event = { preventDefault } as unknown as MouseEvent;

    controller.onTabClick(event, '/indoor');

    expect(preventDefault).not.toHaveBeenCalled();
    expect(visibleCount()).toBe(48);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
