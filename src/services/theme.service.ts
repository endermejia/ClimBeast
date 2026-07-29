import {
  computed,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { Theme, Themes } from '../models';

import { triggerThemeTransition } from '../utils';

import { SupabaseService } from './supabase.service';

/**
 * Manages theme state and transitions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly supabase = inject(SupabaseService);

  readonly theme: WritableSignal<Theme> = signal<Theme>(Themes.LIGHT);
  readonly selectedTheme = this.theme.asReadonly();

  readonly isDark = computed(() => {
    const t = this.theme();
    if (t === Themes.DARK) return true;
    if (t === Themes.LIGHT) return false;
    // 'system' — check prefers-color-scheme
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
