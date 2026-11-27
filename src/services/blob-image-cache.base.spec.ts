import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { BlobImageCacheBase } from './blob-image-cache.base';

class TestBlobImageCache extends BlobImageCacheBase {
  constructor(cacheName = 'test-blob-cache') {
    super(cacheName);
  }

  getCache(): Promise<Cache | null> {
    return this.cacheReady;
  }

  getObjectUrlMap(): Map<string, string> {
    return this.objectUrls;
  }

  testResolveCachedBlobUrl(url: string, cache: Cache): Promise<string | null> {
    return this.resolveCachedBlobUrl(url, cache);
  }

  testToBlobUrl(key: string, response: Response): Promise<string | null> {
    return this.toBlobUrl(key, response);
  }

  testTrim(cache: Cache, maxEntries: number): Promise<void> {
    return this.trim(cache, maxEntries);
  }

  testRevoke(key: string): void {
    this.revoke(key);
  }
}

function createFakeCache() {
  const store = new Map<string, Blob>();
  const cache = {
    match: vi.fn(async (url: string): Promise<Response | undefined> => {
      const blob = store.get(url);
      return blob ? new Response(blob, { status: 200 }) : undefined;
    }),
    put: vi.fn(async (url: string, response: Response): Promise<void> => {
      store.set(url, await response.blob());
    }),
    keys: vi.fn(async (): Promise<Request[]> => {
      return [...store.keys()].map((url) => new Request(url));
    }),
    delete: vi.fn(async (request: Request): Promise<boolean> => {
      return store.delete(request.url);
    }),
  };
  return { store, cache: cache as unknown as Cache, spies: cache };
}

describe('BlobImageCacheBase', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  let revoked: string[];
  let counter: number;

  beforeEach(() => {
    counter = 0;
    revoked = [];
    URL.createObjectURL = vi.fn(() => `blob:test-${++counter}`);
    URL.revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('resolves cacheReady to null on SSR', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('caches', { open: openSpy });

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: false }],
    });

    const instance = TestBed.runInInjectionContext(
      () => new TestBlobImageCache(),
    );

    await expect(instance.getCache()).resolves.toBeNull();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('falls back to null when Cache Storage is unavailable or rejects', async () => {
    vi.stubGlobal('caches', undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const noCaches = TestBed.runInInjectionContext(
      () => new TestBlobImageCache(),
    );
    await expect(noCaches.getCache()).resolves.toBeNull();

    vi.stubGlobal('caches', {
      open: vi.fn().mockRejectedValue(new Error('SecurityError')),
    });
    const rejectedCaches = TestBed.runInInjectionContext(
      () => new TestBlobImageCache(),
    );
    await expect(rejectedCaches.getCache()).resolves.toBeNull();
  });

  it('materializes and memoizes blob URLs from Cache Storage', async () => {
    const { store, cache, spies } = createFakeCache();
    store.set('https://example.com/img-1.jpg', new Blob(['img-bytes']));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const instance = TestBed.runInInjectionContext(
      () => new TestBlobImageCache('custom-cache'),
    );

    const opened = await instance.getCache();
    expect(opened).toBe(cache);

    // Cache miss returns null
    await expect(
      instance.testResolveCachedBlobUrl(
        'https://example.com/missing.jpg',
        cache,
      ),
    ).resolves.toBeNull();

    // First cache hit materializes blob URL
    const first = await instance.testResolveCachedBlobUrl(
      'https://example.com/img-1.jpg',
      cache,
    );
    expect(first).toBe('blob:test-1');
    expect(spies.match).toHaveBeenCalledWith('https://example.com/img-1.jpg');

    spies.match.mockClear();

    // Subsequent lookup reuses cached blob URL without reading Cache Storage again
    const second = await instance.testResolveCachedBlobUrl(
      'https://example.com/img-1.jpg',
      cache,
    );
    expect(second).toBe('blob:test-1');
    expect(spies.match).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('returns null from toBlobUrl for empty blobs', async () => {
    const { cache } = createFakeCache();
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const instance = TestBed.runInInjectionContext(
      () => new TestBlobImageCache(),
    );

    const emptyResponse = {
      blob: async () => new Blob([]),
    } as unknown as Response;
    await expect(
      instance.testToBlobUrl('https://example.com/empty.jpg', emptyResponse),
    ).resolves.toBeNull();
    expect(instance.getObjectUrlMap().size).toBe(0);
  });

  it('trims oldest entries beyond maxEntries and revokes their blob URLs', async () => {
    const { store, cache } = createFakeCache();
    const url1 = 'https://example.com/1.jpg';
    const url2 = 'https://example.com/2.jpg';
    const url3 = 'https://example.com/3.jpg';

    store.set(url1, new Blob(['one']));
    store.set(url2, new Blob(['two']));
    store.set(url3, new Blob(['three']));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });

    const instance = TestBed.runInInjectionContext(
      () => new TestBlobImageCache(),
    );

    const blob1 = await instance.testResolveCachedBlobUrl(url1, cache);
    const blob2 = await instance.testResolveCachedBlobUrl(url2, cache);
    const blob3 = await instance.testResolveCachedBlobUrl(url3, cache);

    await instance.testTrim(cache, 2);

    expect(store.has(url1)).toBe(false);
    expect(store.has(url2)).toBe(true);
    expect(store.has(url3)).toBe(true);
    expect(revoked).toEqual([blob1]);
    expect(instance.getObjectUrlMap().has(url1)).toBe(false);
    expect(instance.getObjectUrlMap().get(url2)).toBe(blob2);
    expect(instance.getObjectUrlMap().get(url3)).toBe(blob3);

    // Direct revoke cleans up and ignores unknown keys
    instance.testRevoke('https://example.com/unknown.jpg');
    instance.testRevoke(url2);
    expect(revoked).toEqual([blob1, blob2]);
    expect(instance.getObjectUrlMap().has(url2)).toBe(false);
  });
});
