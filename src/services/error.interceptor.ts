import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { IS_BROWSER } from '../app/is-browser';

import { GlobalData } from './global-data';

import { SupabaseService } from './supabase.service';

export const errorInterceptor: HttpInterceptorFn = (
  req,
  next,
): Observable<HttpEvent<unknown>> => {
  const injector = inject(Injector);
  const isBrowser = inject(IS_BROWSER);
  const router = isBrowser
    ? injector.get(Router, null, { optional: true })
    : null;
  const supabase = isBrowser
    ? injector.get(SupabaseService, null, { optional: true })
    : null;

  // Apply timeout only for external API calls (not static assets)
  const url = req.url || '';
  const isExternalApi =
    url.includes('supabase.co') ||
    url.includes('8a.nu') ||
    url.includes('vertical-life.info');

  const request$ = isExternalApi
    ? next(req).pipe(timeout({ each: 5000 })) // 5 second timeout for API calls
    : next(req);

  return request$.pipe(
    catchError((err: unknown) => {
      const httpErr = err as HttpErrorResponse | null;
      const status = httpErr?.status ?? 0;

      // Derive a message for global error state
      let msg =
        (httpErr?.error as { message?: string } | undefined)?.message ||
        httpErr?.message ||
        'errors.unexpected';

      // Handle network errors (0 status = no connection)
      if (status === 0 || err?.constructor?.name === 'TimeoutError') {
        msg = 'errors.network';
      }

      // Update global error state (best-effort)
      try {
        const global = injector.get(GlobalData);
        global?.setError?.(msg);
        if (typeof console !== 'undefined') {
          console.error('HTTP Error:', err);
        }
      } catch {
        // no-op
      }

      // Skip redirect logic on the server and for static/i18n assets
      const isStatic =
        url.startsWith('/i18n/') ||
        url.startsWith('/assets/') ||
        url.endsWith('.svg') ||
        url.endsWith('.png') ||
        url.endsWith('.jpg') ||
        url.endsWith('.css') ||
        url.endsWith('.js');

      const isExternalNonSupabase =
        url.includes('/api/8anu') ||
        url.includes('8a.nu') ||
        url.includes('vertical-life.info');

      if (
        isBrowser &&
        !isStatic &&
        !isExternalNonSupabase &&
        (status === 401 || status === 403)
      ) {
        // Prefer a local logout to clear client session and navigate to /login.
        // This avoids SSR/Edge issues and 403 from Supabase global scope.
        try {
          void supabase?.logout();
        } catch {
          // fallback: try direct navigation if logout fails for any reason
          try {
            void router?.navigateByUrl('/login');
          } catch {
            // no-op
          }
        }
      }

      return throwError(() => err);
    }),
  );
};
