import { inject, Injectable } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly localStorage = inject(LocalStorage);

  /**
   * Read-through cache lookup. Returns the cached value for `key` if present and not expired,
   * otherwise returns `defaultValue`. SSR-safe (always returns defaultValue on server).
   */
  get<T>(key: string, defaultValue: T, ttlMs?: number): T {
    if (!this.isBrowser) return defaultValue;

    if (ttlMs !== undefined && ttlMs > 0) {
      const lastUpdated = this.getLastUpdated(key);
      if (lastUpdated !== null && Date.now() - lastUpdated > ttlMs) {
        this.remove(key);
        return defaultValue;
      }
    }

    const raw = this.localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        // corrupted entry — ignore
      }
    }
    return defaultValue;
  }

  /**
   * Get the timestamp (epoch ms) when a cache entry was last written.
   * Returns null if no timestamp is found or on server.
   */
  getLastUpdated(key: string): number | null {
    if (!this.isBrowser) return null;
    const raw =
      this.localStorage.getItem(`${key}_ts`) ??
      this.localStorage.getItem(`${key}:_ts`);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  }

  /**
   * Attempt `fetcher()`. On success the result is written to cache and returned.
   * On failure the previously cached value (if any and not expired) is returned; otherwise
   * `fallbackValue` is returned. Log output is tagged with `logTag`.
   */
  async fetchOrCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { fallbackValue?: T; logTag?: string; ttlMs?: number },
  ): Promise<T> {
    const tag = options?.logTag ?? 'CacheService';
    const fallback = options?.fallbackValue ?? (undefined as T);

    try {
      const result = await fetcher();
      this.set(key, result);
      return result;
    } catch (e) {
      console.warn(`[${tag}] fetchOrCache error for key: ${key}`, e);
      const cached = this.get<T | undefined>(key, undefined, options?.ttlMs);
      if (cached !== undefined) return cached;
      return fallback;
    }
  }

  /**
   * Write a value to the cache. The value is JSON-serialised automatically.
   * Also stores a timestamp for "last updated" tracking.
   */
  set(key: string, value: unknown): void {
    try {
      this.localStorage.setItem(key, JSON.stringify(value));
      this.localStorage.setItem(`${key}_ts`, String(Date.now()));
    } catch {
      // storage full or unavailable — silently ignore
    }
  }

  /**
   * Remove a single entry from the cache.
   */
  remove(key: string): void {
    this.localStorage.removeItem(key);
    this.localStorage.removeItem(`${key}_ts`);
  }

  /**
   * Clear the entire cache (localStorage).
   */
  clear(): void {
    this.localStorage.clear();
  }
}
