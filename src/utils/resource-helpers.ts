import { computed, resource, ResourceRef, Signal } from '@angular/core';

import { CacheService } from '../services/cache.service';

/**
 * Polls an Angular resource until its value is not undefined (i.e., it has finished loading).
 * @param resource The resource to poll.
 * @param maxAttempts Maximum number of polling attempts.
 * @param interval Interval between attempts in milliseconds.
 * @returns The resource value if loaded, or undefined if timeout is reached.
 */
export async function waitForResource<T>(
  resource: ResourceRef<T>,
  maxAttempts = 60,
  interval = 50,
): Promise<T | undefined> {
  for (let i = 0; i < maxAttempts; i++) {
    const val = resource.value();
    if (val !== undefined) {
      return val;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return undefined;
}

export interface CachedResourceConfig<P, T> {
  params?: () => P;
  isBrowser: boolean;
  cacheKey: (params: P) => string | null;
  fetcher: (params: P) => Promise<T>;
  cache: CacheService;
  fallbackValue: T;
  logTag?: string;
  ttlMs?: number;
}

/**
 * Creates an Angular resource combined with CacheService fallback.
 */
export function createCachedResource<P, T>(
  config: CachedResourceConfig<P, T>,
): {
  resource: ResourceRef<T | undefined>;
  signal: Signal<T>;
} {
  const res = resource({
    params: config.params,
    loader: async ({ params }) => {
      if (!config.isBrowser) {
        return config.fallbackValue;
      }
      const key = config.cacheKey(params);
      if (!key) {
        return config.fallbackValue;
      }
      return config.cache.fetchOrCache(key, () => config.fetcher(params), {
        fallbackValue: config.fallbackValue,
        logTag: config.logTag || 'CachedResource',
        ttlMs: config.ttlMs,
      });
    },
  });

  const sig = computed(() => {
    const val = res.value();
    if (val !== undefined) return val;
    const p = config.params ? config.params() : (undefined as P);
    const key = config.cacheKey(p);
    if (!key) return config.fallbackValue;
    return config.cache.get<T>(key, config.fallbackValue, config.ttlMs);
  });

  return { resource: res, signal: sig };
}
