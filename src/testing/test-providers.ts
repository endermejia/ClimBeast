import { Provider, EnvironmentProviders, PLATFORM_ID } from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  MockTranslateService,
  MockTranslatePipe,
} from './mock-translate.service';
import { MockSupabaseService } from './mock-supabase.service';
import { MockGlobalData } from './mock-global-data.service';
import { MockLocalStorage } from './mock-local-storage';

import { TranslateService } from '@ngx-translate/core';
import { SupabaseService } from '../services/supabase.service';
import { GlobalData } from '../services/global-data';
import { LocalStorage } from '../services/local-storage';

export const COMMON_TEST_PROVIDERS: (Provider | EnvironmentProviders)[] = [
  provideRouter([]),
  { provide: PLATFORM_ID, useValue: 'browser' },
  { provide: TranslateService, useClass: MockTranslateService },
  { provide: SupabaseService, useClass: MockSupabaseService },
  { provide: GlobalData, useClass: MockGlobalData },
  { provide: LocalStorage, useClass: MockLocalStorage },
];

export { MockTranslateService, MockTranslatePipe };
export { MockSupabaseService };
export { MockGlobalData };
export { MockLocalStorage };
