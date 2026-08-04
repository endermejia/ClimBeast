import { Injectable, signal } from '@angular/core';

import { Theme, Themes } from '../models';

@Injectable()
export class MockThemeService {
  readonly theme = signal<Theme>(Themes.LIGHT);
  readonly selectedTheme = this.theme.asReadonly();

  setTheme(newTheme: Theme): void {
    this.theme.set(newTheme);
  }
}
