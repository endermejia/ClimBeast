import { Injectable, signal } from '@angular/core';

import { Language, Languages } from '../models';

@Injectable()
export class MockLanguageService {
  readonly selectedLanguage = signal<Language>(Languages.ES);
  readonly currentLang = signal<Language>(Languages.ES);
  readonly i18nTick = signal(0);
}
