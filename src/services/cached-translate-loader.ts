import { HttpClient } from '@angular/common/http';

import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';

import { CACHE_KEYS } from '../constants/cache-keys';

export class CachedTranslateLoader implements TranslateLoader {
  constructor(
    private http: HttpClient,
    private prefix = '/i18n/',
    private suffix = '.json',
  ) {}

  public getTranslation(lang: string): Observable<Record<string, unknown>> {
    const cacheKey = CACHE_KEYS.translation(lang);
    const cached = this.readCached(cacheKey);
    const isOffline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    if (isOffline && cached) {
      return of(cached);
    }

    // If we already have a cached copy, don't wait 2 full seconds on flaky coverage
    const timeoutMs = cached ? 800 : 2000;

    // Try to fetch from network first
    return this.http
      .get<Record<string, unknown>>(`${this.prefix}${lang}${this.suffix}`)
      .pipe(
        timeout(timeoutMs),
        tap((translation) => {
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              window.localStorage.setItem(
                cacheKey,
                JSON.stringify(translation),
              );
            } catch (e) {
              console.warn('[CachedTranslateLoader] Error saving to cache', e);
            }
          }
        }),
        catchError((error) => {
          console.warn(
            `[CachedTranslateLoader] Network error fetching ${lang}, checking cache`,
            error,
          );
          const fallback = cached ?? this.readCached(cacheKey);
          if (fallback) {
            return of(fallback);
          }
          // Fallback to empty translation to avoid blocking app boot
          return of({} as Record<string, unknown>);
        }),
      );
  }

  private readCached(cacheKey: string): Record<string, unknown> | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      console.error('[CachedTranslateLoader] Error parsing cache', e);
      return null;
    }
  }
}
