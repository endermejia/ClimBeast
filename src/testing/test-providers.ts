import { Provider, EnvironmentProviders, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import { TranslateService } from '@ngx-translate/core';

import { LocalStorage } from '../services/local-storage';
import { SupabaseService } from '../services/supabase.service';

import { IS_BROWSER } from '../app/is-browser';
import { MockLocalStorage } from './mock-local-storage';
import { MockSupabaseService } from './mock-supabase.service';
import {
  MockTranslateService,
  MockTranslatePipe,
} from './mock-translate.service';

export const COMMON_TEST_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  provideRouter([]),
  { provide: PLATFORM_ID, useValue: 'browser' },
  { provide: IS_BROWSER, useValue: true },
  { provide: TranslateService, useClass: MockTranslateService },
  { provide: SupabaseService, useClass: MockSupabaseService },
  { provide: LocalStorage, useClass: MockLocalStorage },
];

export { MockTranslateService, MockTranslatePipe };
export { MockSupabaseService };
export { MockLocalStorage };
