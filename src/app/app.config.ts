import { isPlatformBrowser } from '@angular/common';
import {
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  PLATFORM_ID,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  withViewTransitions,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { TUI_PLATFORM } from '@taiga-ui/cdk';
import {
  provideTaiga,
  TUI_DARK_MODE,
  tuiHintOptionsProvider,
} from '@taiga-ui/core';
import { provideEventPlugins } from '@taiga-ui/event-plugins';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';

import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';

import { AppErrorHandler } from '../services/app-error-handler';

import { CachedTranslateLoader } from '../services/cached-translate-loader';
import { errorInterceptor } from '../services/error.interceptor';
import { LanguageService } from '../services/language.service';
import { provideSupabaseConfig } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

import {
  ENV_SUPABASE_ANON_KEY,
  ENV_SUPABASE_URL,
} from '../environments/environment';
import { routes } from './app.routes';

import { IS_BROWSER } from './is-browser';
import { SelectivePreloadingStrategy } from './selective-preloading.strategy';

const httpLoaderFactory: (http: HttpClient) => CachedTranslateLoader = (
  http: HttpClient,
) => new CachedTranslateLoader(http, '/i18n/', '.json');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    {
      provide: IS_BROWSER,
      useFactory: () => isPlatformBrowser(inject(PLATFORM_ID)),
    },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withPreloading(SelectivePreloadingStrategy),
      withViewTransitions({ skipInitialTransition: true }),
    ),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    provideClientHydration(
      withEventReplay(),
      withIncrementalHydration(),
      withHttpTransferCacheOptions({
        includePostRequests: true,
      }),
    ),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
      defaultLanguage: 'es',
    }),
    tuiHintOptionsProvider({
      appearance: 'floating',
    }),
    provideTaiga(),
    provideEventPlugins(),
    {
      provide: TUI_PLATFORM,
      useValue: 'web',
    },
    {
      provide: TUI_DARK_MODE,
      useFactory: (theme: ThemeService) => theme.isDark,
      deps: [ThemeService],
    },
    {
      provide: TUI_LANGUAGE,
      useFactory: (lang: LanguageService) => lang.tuiLanguage,
      deps: [LanguageService],
    },
    provideSupabaseConfig({
      url: ENV_SUPABASE_URL,
      anonKey: ENV_SUPABASE_ANON_KEY,
    }),
    provideServiceWorker('service-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
  ],
};
