import { isPlatformBrowser } from '@angular/common';
import {
  HttpClient,
  provideHttpClient,
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
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import {
  NavigationError,
  provideRouter,
  RedirectCommand,
  Router,
  withComponentInputBinding,
  withNavigationErrorHandler,
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
import { SwipeNavigationService } from '../services/swipe-navigation.service';
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

// Contador anti-bucle para errores de navegación repetidos.
let lastNavigationErrorAt = 0;
let repeatedNavigationErrors = 0;

/**
 * Manejador global de errores de navegación (chunk no cacheado, guard que
 * rechaza, error de lazy loading...). Sin él, una navegación fallida deja el
 * router-outlet vacío = pantalla en blanco permanente: se redirige a una ruta
 * pública segura, con protección anti-bucle. El handler se ejecuta dentro de
 * `runInInjectionContext`, por lo que `inject()` está disponible.
 */
function handleNavigationError(
  error: NavigationError,
): RedirectCommand | undefined {
  console.error('[Router] Navigation error:', error.error ?? error);
  // El propio fallback no puede fallar en bucle.
  if (error.url?.startsWith('/page-not-found')) {
    return undefined;
  }
  const now = Date.now();
  repeatedNavigationErrors =
    now - lastNavigationErrorAt < 5000 ? repeatedNavigationErrors + 1 : 0;
  lastNavigationErrorAt = now;
  if (repeatedNavigationErrors >= 2) {
    return undefined;
  }
  return new RedirectCommand(inject(Router).createUrlTree(['/page-not-found']));
}

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
      withNavigationErrorHandler(handleNavigationError),
      withPreloading(SelectivePreloadingStrategy),
      withViewTransitions({
        skipInitialTransition: true,
        // El swipe necesita `data-nav-dir` mientras viva la transición (el
        // CSS que anima los snapshots es en vivo); al crearla, el servicio
        // ata la limpieza a `transition.finished`.
        onViewTransitionCreated: ({ transition }) =>
          inject(SwipeNavigationService).onViewTransitionCreated(transition),
      }),
    ),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideClientHydration(
      withEventReplay(),
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
