import { DOCUMENT } from '@angular/common';
import {
  ApplicationRef,
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { Theme, Themes } from '../models';

import { STORAGE_KEYS } from '../constants';
import { ThemeTransitionEvent, triggerThemeTransition } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

/**
 * Manages theme state and transitions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly appRef = inject(ApplicationRef);
  private readonly supabase = inject(SupabaseService);
  private readonly localStorage = inject(LocalStorage);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly destroyRef = inject(DestroyRef);

  private isTransitioning = false;

  readonly themeStorageKey = STORAGE_KEYS.theme;

  private readonly systemPrefersDark = signal(
    this.isBrowser &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  readonly theme: WritableSignal<Theme> = signal<Theme>(
    (() => {
      if (this.isBrowser) {
        try {
          const raw = this.localStorage.getItem(this.themeStorageKey);
          if (raw === Themes.DARK || raw === Themes.LIGHT || raw === 'system') {
            return raw as Theme;
          }
        } catch {
          // Silent fail
        }
      }
      return Themes.LIGHT;
    })(),
  );
  readonly selectedTheme = this.theme.asReadonly();

  readonly isDark = computed(() => {
    const t = this.theme();
    if (t === Themes.DARK) return true;
    if (t === Themes.LIGHT) return false;
    return this.systemPrefersDark();
  });

  constructor() {
    if (
      this.isBrowser &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        this.systemPrefersDark.set(e.matches);
      };
      media.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => {
        media.removeEventListener('change', listener);
      });
    }
  }

  // Persist theme changes to localStorage
  protected readonly _persistThemeEffect = effect(() => {
    const current = this.theme();
    if (this.isBrowser) {
      this.localStorage.setItem(this.themeStorageKey, current);
    }
  });

  // Sync theme from userProfile when profile loads/updates
  protected readonly _syncProfileThemeEffect = effect(() => {
    const profile = this.supabase.userProfile();
    if (profile?.theme) {
      this.theme.set(profile.theme as Theme);
    }
  });

  // Apply theme attributes, meta tags, and color-scheme to the DOM
  protected readonly _applyThemeEffect = effect(() => {
    const dark = this.isDark();
    if (!this.isBrowser) return;

    this.applyThemeToDom(dark, !this.isTransitioning);
  });

  private applyThemeToDom(dark: boolean, reinsertMetaNodes: boolean): void {
    const color = dark ? '#222' : '#ffffff';
    const statusBarStyle = dark ? 'black' : 'default';
    const colorScheme = dark ? 'dark' : 'light';
    const tuiTheme = dark ? 'dark' : 'light';

    // 1. Root, body, and tui-root styling and attributes
    const docEl = this.doc.documentElement;
    docEl.setAttribute('tuiTheme', tuiTheme);
    docEl.style.setProperty('--tui-theme-color', color);
    docEl.style.setProperty('color-scheme', colorScheme);
    docEl.style.backgroundColor = color;
    if (this.doc.body) {
      this.doc.body.style.backgroundColor = color;
      if (dark) {
        this.doc.body.setAttribute('tuiTheme', 'dark');
      } else {
        this.doc.body.removeAttribute('tuiTheme');
      }
    }
    docEl.classList.toggle('dark', dark);
    docEl.classList.toggle('light', !dark);

    const tuiRoots = this.doc.querySelectorAll('tui-root');
    tuiRoots.forEach((rootEl) => {
      rootEl.setAttribute('tuiTheme', tuiTheme);
    });

    // 2. Mobile OS status bar & theme meta tags
    this.updateThemeColor(color, reinsertMetaNodes);
    this.updateMetaTag(
      'apple-mobile-web-app-status-bar-style',
      statusBarStyle,
      reinsertMetaNodes,
    );
    this.updateMetaTag('color-scheme', colorScheme, reinsertMetaNodes);
  }

  private updateThemeColor(color: string, reinsert = true): void {
    const metas = Array.from(
      this.doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
    );
    let meta = metas[0];
    for (let i = 1; i < metas.length; i++) {
      metas[i].remove();
    }
    if (!meta) {
      meta = this.doc.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      this.doc.head.appendChild(meta);
    }
    meta.removeAttribute('media');
    meta.setAttribute('content', color);

    if (reinsert) {
      this.reinsertMetaElement(meta);
    }
  }

  private updateMetaTag(name: string, content: string, reinsert = true): void {
    let meta = this.doc.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) {
      meta = this.doc.createElement('meta');
      meta.setAttribute('name', name);
      this.doc.head.appendChild(meta);
    }
    meta.setAttribute('content', content);

    if (reinsert) {
      this.reinsertMetaElement(meta);
    }
  }

  private reinsertMetaElement(meta: HTMLMetaElement): void {
    // Re-inserting the element forces WebKit and Chromium browsers (e.g. Chrome on Android,
    // Safari on iOS, PWA standalone windows) to observe the change and repaint the status bar.
    const parent = meta.parentNode;
    if (parent) {
      parent.removeChild(meta);
      parent.appendChild(meta);
    }
  }

  private refreshMobileStatusBarMeta(): void {
    const names = [
      'theme-color',
      'apple-mobile-web-app-status-bar-style',
      'color-scheme',
    ];
    for (const name of names) {
      const meta = this.doc.querySelector<HTMLMetaElement>(
        `meta[name="${name}"]`,
      );
      if (meta) {
        this.reinsertMetaElement(meta);
      }
    }
  }

  setTheme(newTheme: Theme, event?: ThemeTransitionEvent): Promise<void> {
    if (this.theme() === newTheme) return Promise.resolve();
    this.isTransitioning = true;
    return triggerThemeTransition(event, () => {
      this.theme.set(newTheme);
      if (this.isBrowser) {
        this.applyThemeToDom(this.isDark(), false);
        try {
          this.appRef.tick();
        } catch {
          // Ignore if already inside a change detection pass
        }
      }
    }).finally(() => {
      this.isTransitioning = false;
      if (this.isBrowser) {
        this.refreshMobileStatusBarMeta();
      }
    });
  }

  syncFromProfile(): void {
    const profile = this.supabase.userProfile();
    if (!profile) return;

    if (profile.theme) {
      this.theme.set(profile.theme as Theme);
    }
  }
}
