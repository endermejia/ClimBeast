import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';

import { Subject } from 'rxjs';

import { IS_BROWSER } from '../app/is-browser';

import { reactToObservable } from '../utils';

export interface ScrollSnapshot {
  mainTop: number;
  mainLeft: number;
  scrollbars: { top: number; left: number }[];
}

const MAX_SAVED_ROUTES = 50;

function normalizePath(url: string): string {
  return url.split('?')[0].split('#')[0];
}

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  private readonly scrollToTopTrigger$ = new Subject<void>();
  readonly scrollToTop$ = this.scrollToTopTrigger$.asObservable();

  private readonly isBrowser = inject(IS_BROWSER);
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly savedPositions = new Map<string, ScrollSnapshot>();
  private currentPath = '';

  private restoreAnimationId: number | null = null;
  private removeListeners: (() => void) | null = null;

  constructor() {
    if (!this.isBrowser) return;

    this.currentPath = normalizePath(this.router.url);

    // Cancel active restoration if the user manually interacts with the page
    const cancelRestoration = () => this.cancelActiveRestoration();
    window.addEventListener('touchstart', cancelRestoration, { passive: true });
    window.addEventListener('wheel', cancelRestoration, { passive: true });
    window.addEventListener('mousedown', cancelRestoration, { passive: true });
    window.addEventListener('keydown', cancelRestoration, { passive: true });

    this.removeListeners = () => {
      window.removeEventListener('touchstart', cancelRestoration);
      window.removeEventListener('wheel', cancelRestoration);
      window.removeEventListener('mousedown', cancelRestoration);
      window.removeEventListener('keydown', cancelRestoration);
    };

    this.destroyRef.onDestroy(() => {
      this.cancelActiveRestoration();
      this.removeListeners?.();
      this.removeListeners = null;
    });

    reactToObservable(this.router.events, (event) => {
      if (event instanceof NavigationStart) {
        this.cancelActiveRestoration();
        const current = this.currentPath || normalizePath(this.router.url);
        if (current) {
          this.captureScroll(current);
        }
      } else if (event instanceof NavigationEnd) {
        const nextPath = normalizePath(event.urlAfterRedirects);
        const prevPath = this.currentPath;
        this.currentPath = nextPath;
        if (prevPath !== nextPath) {
          this.restoreScroll(nextPath);
        }
      } else if (
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.cancelActiveRestoration();
      }
    });
  }

  scrollToTop(): void {
    this.cancelActiveRestoration();
    const current = this.currentPath || normalizePath(this.router.url);
    if (current) {
      this.savedPositions.delete(current);
    }
    if (this.isBrowser) {
      const main = this.doc.querySelector<HTMLElement>('main[data-swipe-host]');
      if (main && main.scrollTop > 0) {
        if (typeof main.scrollTo === 'function') {
          main.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          main.scrollTop = 0;
        }
      }
    }
    this.scrollToTopTrigger$.next();
  }

  clearScroll(path?: string): void {
    if (path) {
      this.savedPositions.delete(normalizePath(path));
    } else {
      this.savedPositions.clear();
    }
  }

  getSavedScroll(path: string): ScrollSnapshot | undefined {
    return this.savedPositions.get(normalizePath(path));
  }

  private captureScroll(path: string): void {
    if (!this.isBrowser) return;

    const main = this.doc.querySelector<HTMLElement>('main[data-swipe-host]');
    if (!main) return;

    const scrollbars = Array.from(
      main.querySelectorAll<HTMLElement>('tui-scrollbar'),
    );

    const snapshot: ScrollSnapshot = {
      mainTop: main.scrollTop,
      mainLeft: main.scrollLeft,
      scrollbars: scrollbars.map((sb) => ({
        top: sb.scrollTop,
        left: sb.scrollLeft,
      })),
    };

    // If cache size exceeds limit, drop the oldest entry
    if (this.savedPositions.size >= MAX_SAVED_ROUTES) {
      const oldestKey = this.savedPositions.keys().next().value;
      if (oldestKey) this.savedPositions.delete(oldestKey);
    }

    if (
      snapshot.mainTop > 0 ||
      snapshot.mainLeft > 0 ||
      snapshot.scrollbars.length > 0
    ) {
      this.savedPositions.set(path, snapshot);
    }
  }

  private restoreScroll(path: string): void {
    this.cancelActiveRestoration();

    const snapshot = this.savedPositions.get(path);
    const main = this.doc.querySelector<HTMLElement>('main[data-swipe-host]');
    if (!main) return;

    if (!snapshot) {
      if (main.scrollTop !== 0) main.scrollTop = 0;
      if (main.scrollLeft !== 0) main.scrollLeft = 0;
      return;
    }

    // Restore persistent main container immediately
    if (main.scrollTop !== snapshot.mainTop) main.scrollTop = snapshot.mainTop;
    if (main.scrollLeft !== snapshot.mainLeft)
      main.scrollLeft = snapshot.mainLeft;

    const hasTargetScroll =
      snapshot.mainTop > 0 ||
      snapshot.scrollbars.some((s) => s.top > 0 || s.left > 0);

    if (!hasTargetScroll) {
      const scrollbars = Array.from(
        main.querySelectorAll<HTMLElement>('tui-scrollbar'),
      );
      for (const sb of scrollbars) {
        if (sb.scrollTop !== 0) sb.scrollTop = 0;
        if (sb.scrollLeft !== 0) sb.scrollLeft = 0;
      }
      return;
    }

    // Resilient restoration loop: content might take a few frames to render/expand
    let attempts = 0;
    const maxAttempts = 30; // ~500ms at 60fps
    const startTime = Date.now();
    const maxDuration = 1000;

    const attempt = () => {
      attempts++;
      const currentMain = this.doc.querySelector<HTMLElement>(
        'main[data-swipe-host]',
      );
      if (!currentMain) {
        this.cancelActiveRestoration();
        return;
      }

      if (currentMain.scrollTop !== snapshot.mainTop) {
        currentMain.scrollTop = snapshot.mainTop;
      }
      if (currentMain.scrollLeft !== snapshot.mainLeft) {
        currentMain.scrollLeft = snapshot.mainLeft;
      }

      const currentScrollbars = Array.from(
        currentMain.querySelectorAll<HTMLElement>('tui-scrollbar'),
      );

      let allReached = true;

      for (let i = 0; i < snapshot.scrollbars.length; i++) {
        const target = snapshot.scrollbars[i];
        const sb = currentScrollbars[i];

        if (!sb) {
          allReached = false;
          continue;
        }

        if (target.top > 0 && Math.abs(sb.scrollTop - target.top) > 2) {
          sb.scrollTop = target.top;
          if (Math.abs(sb.scrollTop - target.top) > 2) {
            allReached = false;
          }
        }

        if (target.left > 0 && Math.abs(sb.scrollLeft - target.left) > 2) {
          sb.scrollLeft = target.left;
          if (Math.abs(sb.scrollLeft - target.left) > 2) {
            allReached = false;
          }
        }
      }

      if (
        allReached ||
        attempts >= maxAttempts ||
        Date.now() - startTime >= maxDuration
      ) {
        this.cancelActiveRestoration();
        return;
      }

      this.restoreAnimationId = requestAnimationFrame(attempt);
    };

    attempt();
  }

  private cancelActiveRestoration(): void {
    if (this.restoreAnimationId !== null) {
      cancelAnimationFrame(this.restoreAnimationId);
      this.restoreAnimationId = null;
    }
  }
}
