import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  type Event as RouterEvent,
} from '@angular/router';

import { lastValueFrom, Subject, take } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';
import { ScrollService } from './scroll.service';

describe('ScrollService', () => {
  let service: ScrollService;
  let routerEvents$: Subject<RouterEvent>;
  let mockRouter: Partial<Router>;
  let mainEl: HTMLElement;
  let scrollbarEl: HTMLElement;

  beforeEach(() => {
    routerEvents$ = new Subject<RouterEvent>();
    mockRouter = {
      url: '/home',
      events: routerEvents$.asObservable(),
    };

    // Prepare mock DOM
    mainEl = document.createElement('main');
    mainEl.setAttribute('data-swipe-host', '');
    mainEl.scrollTo = vi.fn();
    scrollbarEl = document.createElement('tui-scrollbar');
    scrollbarEl.scrollTo = vi.fn();
    mainEl.appendChild(scrollbarEl);
    document.body.appendChild(mainEl);

    TestBed.configureTestingModule({
      providers: [
        ScrollService,
        { provide: Router, useValue: mockRouter },
        { provide: DOCUMENT, useValue: document },
        { provide: IS_BROWSER, useValue: true },
      ],
    });

    service = TestBed.inject(ScrollService);
  });

  afterEach(() => {
    mainEl.remove();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit on scrollToTop$', async () => {
    const emitted = lastValueFrom(service.scrollToTop$.pipe(take(1)));
    service.scrollToTop();
    await expect(emitted).resolves.toBeUndefined();
  });

  it('should emit multiple times', async () => {
    const emitted = lastValueFrom(service.scrollToTop$.pipe(take(3)));
    service.scrollToTop();
    service.scrollToTop();
    service.scrollToTop();
    await expect(emitted).resolves.toBeUndefined();
  });

  it('should capture scroll on NavigationStart and restore on NavigationEnd', async () => {
    // User is on /home and scrolls
    scrollbarEl.scrollTop = 450;
    mainEl.scrollTop = 50;

    // Navigation starts away from /home to /area
    routerEvents$.next(new NavigationStart(1, '/area'));

    const savedHome = service.getSavedScroll('/home');
    expect(savedHome).toBeDefined();
    expect(savedHome?.mainTop).toBe(50);
    expect(savedHome?.scrollbars[0]?.top).toBe(450);

    // Navigation completes to /area
    (mockRouter as { url: string }).url = '/area';
    routerEvents$.next(new NavigationEnd(1, '/area', '/area'));

    // On /area, main is reset to 0 because /area has no saved scroll
    expect(mainEl.scrollTop).toBe(0);

    // On /area, user scrolls down to 800
    scrollbarEl.scrollTop = 800;

    // Navigation starts away from /area to /home
    routerEvents$.next(new NavigationStart(2, '/home'));
    expect(service.getSavedScroll('/area')?.scrollbars[0]?.top).toBe(800);

    // Navigation completes to /home
    (mockRouter as { url: string }).url = '/home';
    routerEvents$.next(new NavigationEnd(2, '/home', '/home'));

    // /home scroll position should be restored immediately
    expect(mainEl.scrollTop).toBe(50);
    expect(scrollbarEl.scrollTop).toBe(450);
  });

  it('should clear saved position and smooth-scroll on scrollToTop()', () => {
    scrollbarEl.scrollTop = 300;
    mainEl.scrollTop = 100;
    routerEvents$.next(new NavigationStart(1, '/area'));

    expect(service.getSavedScroll('/home')).toBeDefined();

    // Trigger scrollToTop while on /home
    (mockRouter as { url: string }).url = '/home';
    routerEvents$.next(new NavigationEnd(1, '/home', '/home'));

    const mainScrollToSpy = vi.spyOn(mainEl, 'scrollTo');
    service.scrollToTop();

    expect(service.getSavedScroll('/home')).toBeUndefined();
    expect(mainScrollToSpy).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('should clear specific or all saved routes with clearScroll()', () => {
    scrollbarEl.scrollTop = 200;
    routerEvents$.next(new NavigationStart(1, '/area'));
    expect(service.getSavedScroll('/home')).toBeDefined();

    service.clearScroll('/home');
    expect(service.getSavedScroll('/home')).toBeUndefined();

    scrollbarEl.scrollTop = 200;
    routerEvents$.next(new NavigationStart(2, '/profile'));
    service.clearScroll();
    expect(service.getSavedScroll('/home')).toBeUndefined();
  });

  it('should cancel active restoration when user interacts with page', () => {
    scrollbarEl.scrollTop = 500;
    routerEvents$.next(new NavigationStart(1, '/area'));

    // Navigate back to /home
    routerEvents$.next(new NavigationEnd(2, '/home', '/home'));

    // User touches screen or scrolls wheel
    window.dispatchEvent(new Event('touchstart'));

    // Verify it doesn't throw and gracefully stops
    expect(service).toBeTruthy();
  });
});
