import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import { Theme, Themes } from '../models';
import { SupabaseService } from './supabase.service';
import { triggerThemeTransition } from '../utils';

/**
 * Manages theme state and transitions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly supabase = inject(SupabaseService);

  readonly theme: WritableSignal<Theme> = signal<Theme>(Themes.LIGHT);
  readonly selectedTheme = this.theme.asReadonly();

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
