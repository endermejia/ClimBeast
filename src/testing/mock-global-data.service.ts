import { Injectable, signal, WritableSignal } from '@angular/core';

import { TuiLanguage } from '@taiga-ui/i18n';

import { Theme, Themes, Language, Languages, UserProfileDto } from '../models';

@Injectable()
export class MockGlobalData {
  readonly selectedTheme: WritableSignal<Theme> = signal(Themes.LIGHT);
  readonly showCart: WritableSignal<boolean> = signal(false);
  readonly selectedLanguage: WritableSignal<Language> = signal<Language>(
    Languages.ES,
  );
  readonly userProfile: WritableSignal<UserProfileDto | null> =
    signal<UserProfileDto | null>(null);
  readonly tuiLanguage: WritableSignal<TuiLanguage | null> =
    signal<TuiLanguage | null>(null);
  readonly theme: WritableSignal<Theme> = signal(Themes.LIGHT);

  setError(_msg: string): void {
    // Intentionally empty for mock
  }
}
