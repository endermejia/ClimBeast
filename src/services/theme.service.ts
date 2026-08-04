import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { Theme, Themes } from '../models';

import { triggerThemeTransition } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';

import { SupabaseService } from './supabase.service';

/**
 * Manages theme state and transitions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly supabase = inject(SupabaseService);
  private readonly localStorage = inject(LocalStorage);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly themeStorageKey = 'app_theme';

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
    // 'system' — check prefers-color-scheme
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

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

  setTheme(newTheme: Theme, event?: MouseEvent): void {
    if (this.theme() === newTheme) return;
    void triggerThemeTransition(event, () => {
      this.theme.set(newTheme);
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
