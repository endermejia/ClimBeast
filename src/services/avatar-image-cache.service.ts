import { inject, Injectable } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';

const AVATAR_IMAGE_CACHE = 'avatar-images-v1';
const MAX_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class AvatarImageCacheService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly cacheReady = this.openCache();
  private readonly objectUrls = new Map<string, string>();
  private readonly pending = new Set<string>();

  async resolve(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    if (!this.isBrowser) return url;

    try {
      const cache = await this.cacheReady;
      if (!cache) return url;

      const objectUrl = this.objectUrls.get(url);
      if (objectUrl) return objectUrl;

      const cached = await cache.match(url);
      if (cached) {
        const cachedUrl = await this.toObjectUrl(url, cached);
        if (cachedUrl) return cachedUrl;
      }

      this.cacheInBackground(url, cache);
      return url;
    } catch {
      return url;
    }
  }

  private openCache(): Promise<Cache | null> {
    if (!this.isBrowser || typeof caches === 'undefined') {
      return Promise.resolve(null);
    }

    try {
      return caches.open(AVATAR_IMAGE_CACHE).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  }

  private async toObjectUrl(
    key: string,
    response: Response,
  ): Promise<string | null> {
    if (typeof URL?.createObjectURL !== 'function') return null;

    try {
      const blob = await response.blob();
      if (!blob.size) return null;

      const objectUrl = URL.createObjectURL(blob);
      this.objectUrls.set(key, objectUrl);
      return objectUrl;
    } catch {
      return null;
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
        const requests = await cache.keys();
        const excess = requests.slice(
          0,
          Math.max(0, requests.length - MAX_ENTRIES),
        );
        await Promise.all(
          excess.map(async (request) => {
            const objectUrl = this.objectUrls.get(request.url);
            if (objectUrl && typeof URL?.revokeObjectURL === 'function') {
              URL.revokeObjectURL(objectUrl);
            }
            this.objectUrls.delete(request.url);
            await cache.delete(request);
          }),
        );
      } catch {
        // Best-effort cache; the original image URL remains usable.
      } finally {
        this.pending.delete(url);
      }
    })();
  }
}
