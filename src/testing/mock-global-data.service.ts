import { Injectable, signal, WritableSignal } from '@angular/core';

import { Theme, Themes } from '../models';

@Injectable()
export class MockGlobalData {
  readonly selectedTheme: WritableSignal<Theme> = signal(Themes.LIGHT);
  readonly showCart: WritableSignal<boolean> = signal(false);
  readonly selectedLanguage: WritableSignal<string> = signal('es');
  readonly userProfile = signal(null);
  readonly tuiLanguage = signal(null);
  readonly theme: WritableSignal<Theme> = signal(Themes.LIGHT);

  setError(_msg: string): void {}
}
