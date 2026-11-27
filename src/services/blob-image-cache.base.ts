import { inject } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

/**
 * Shared base class encapsulating Cache Storage + `blob:` URL lifecycle
 * management for persistent client-side image caches (avatars, topos).
 *
 * All operations are best-effort: when Cache Storage, `createObjectURL`, or
 * browser APIs are unavailable (SSR, private mode, jsdom), helpers fall back
 * gracefully to `null`.
 */
export abstract class BlobImageCacheBase {
  protected readonly isBrowser = inject(IS_BROWSER);

  /** `null` when Cache Storage is unavailable in this environment. */
  protected readonly cacheReady: Promise<Cache | null>;

  /** Materialized `blob:` URL per cache key so it is not recreated on every render. */
  protected readonly objectUrls = new Map<string, string>();

  constructor(cacheName: string) {
    this.cacheReady = this.openCache(cacheName);
  }

  protected openCache(cacheName: string): Promise<Cache | null> {
    if (!this.isBrowser || typeof caches === 'undefined') {
      return Promise.resolve(null);
    }

    try {
      return caches.open(cacheName).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }

  /**
   * Returns an existing or newly materialized `blob:` URL for `url` if its
   * bytes are already present in `cache`, or `null` on a cache miss.
   */
  protected async resolveCachedBlobUrl(
    url: string,
    cache: Cache,
  ): Promise<string | null> {
    const existing = this.objectUrls.get(url);
    if (existing) return existing;

    const cached = await cache.match(url);
    if (!cached) return null;

    return this.toBlobUrl(url, cached);
  }

  /** Materializes a cached `Response` into a reusable `blob:` URL. */
  protected async toBlobUrl(
    key: string,
    response: Response,
  ): Promise<string | null> {
    if (typeof URL?.createObjectURL !== 'function') return null;

    try {
      const blob = await response.blob();
      if (!blob.size) return null;

      const blobUrl = URL.createObjectURL(blob);
      this.objectUrls.set(key, blobUrl);
      return blobUrl;
    } catch {
      return null;
    }
  }

  /** Discards the oldest entries when the cache exceeds `maxEntries`. */
  protected async trim(cache: Cache, maxEntries: number): Promise<void> {
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;

    const excess = keys.slice(0, keys.length - maxEntries);
    await Promise.all(
      excess.map(async (request) => {
        this.revoke(request.url);
        await cache.delete(request);
      }),
    );
  }

  /** Revokes and forgets the `blob:` URL associated with `key`, if any. */
  protected revoke(key: string): void {
    const blobUrl = this.objectUrls.get(key);
    if (!blobUrl) return;

    if (typeof URL?.revokeObjectURL === 'function') {
      URL.revokeObjectURL(blobUrl);
    }
    this.objectUrls.delete(key);
  }
}
