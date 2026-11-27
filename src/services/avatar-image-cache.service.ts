import { Injectable } from '@angular/core';

import { BlobImageCacheBase } from './blob-image-cache.base';

const AVATAR_IMAGE_CACHE = 'avatar-images-v1';
const MAX_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class AvatarImageCacheService extends BlobImageCacheBase {
  private readonly pending = new Set<string>();

  constructor() {
    super(AVATAR_IMAGE_CACHE);
  }

  async resolve(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    if (!this.isBrowser) return url;

    try {
      const cache = await this.cacheReady;
      if (!cache) return url;

      const cachedUrl = await this.resolveCachedBlobUrl(url, cache);
      if (cachedUrl) return cachedUrl;

      this.cacheInBackground(url, cache);
      return url;
    } catch {
      return url;
    }
  }

  private cacheInBackground(url: string, cache: Cache): void {
    if (this.pending.has(url)) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.pending.add(url);
    void (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;

        await cache.put(url, response.clone());
        await this.trim(cache, MAX_ENTRIES);
      } catch {
        // Best-effort cache; the original image URL remains usable.
      } finally {
        this.pending.delete(url);
      }
    })();
  }
}
