import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { TopoImageCacheService } from './topo-image-cache.service';

/** Cache Storage falso: guarda blobs en memoria con la misma API mínima. */
function createFakeCache() {
  const store = new Map<string, Blob>();
  const cache = {
    async match(url: string): Promise<unknown> {
      const blob = store.get(url);
      if (!blob) return undefined;
      return { ok: true, blob: async () => blob };
    },
    async put(url: string, response: { blob(): Promise<Blob> }): Promise<void> {
      store.set(url, await response.blob());
    },
    async keys(): Promise<{ url: string }[]> {
      return [...store.keys()].map((url) => ({ url }));
    },
    async delete(request: { url: string }): Promise<boolean> {
      return store.delete(request.url);
    },
  };
  return { store, cache };
}

/** Crea una instancia nueva (como si la página se hubiera recargado). */
function recreateService(): TopoImageCacheService {
  return TestBed.runInInjectionContext(() => new TopoImageCacheService());
}

describe('TopoImageCacheService', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalOnLine = navigator.onLine;

  let store: Map<string, Blob>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let revoked: string[];

  beforeEach(() => {
    const fake = createFakeCache();
    store = fake.store;
    vi.stubGlobal('caches', { open: async () => fake.cache });

    fetchMock = vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['image-bytes']),
    }));
    vi.stubGlobal('fetch', fetchMock);

    let counter = 0;
    revoked = [];
    URL.createObjectURL = () => `blob:topo-${++counter}`;
    URL.revokeObjectURL = (url: string) => revoked.push(url);

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
  });

  it('returns null when there is no url', async () => {
    const service = TestBed.inject(TopoImageCacheService);

    await expect(service.resolve('')).resolves.toBeNull();
    await expect(service.resolve(null)).resolves.toBeNull();
  });

  it('returns the network url on first view and caches the bytes', async () => {
    const service = TestBed.inject(TopoImageCacheService);

    const result = await service.resolve('https://example.com/topo-a.jpg');

    expect(result).toBe('https://example.com/topo-a.jpg');
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/topo-a.jpg');
    await vi.waitFor(() => expect(store.size).toBe(1));
  });

  it('serves the image from cache on later views without fetching again', async () => {
    const service = TestBed.inject(TopoImageCacheService);
    await service.resolve('https://example.com/topo-a.jpg');
    await vi.waitFor(() => expect(store.size).toBe(1));
    fetchMock.mockClear();

    const afterReload = recreateService();
    const result = await afterReload.resolve('https://example.com/topo-a.jpg');

    expect(result).toMatch(/^blob:/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reuses the same blob url while the entry stays cached', async () => {
    const service = TestBed.inject(TopoImageCacheService);
    await service.resolve('https://example.com/topo-a.jpg');
    await vi.waitFor(() => expect(store.size).toBe(1));

    const first = await service.resolve('https://example.com/topo-a.jpg');
    const second = await service.resolve('https://example.com/topo-a.jpg');

    expect(first).toBe(second);
    expect(first).toMatch(/^blob:/);
  });

  it('downloads an image only once even if requested twice', async () => {
    const service = TestBed.inject(TopoImageCacheService);

    await Promise.all([
      service.resolve('https://example.com/topo-a.jpg'),
      service.resolve('https://example.com/topo-a.jpg'),
    ]);
    await vi.waitFor(() => expect(store.size).toBe(1));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips the download when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });
    const service = TestBed.inject(TopoImageCacheService);

    const result = await service.resolve('https://example.com/topo-a.jpg');

    expect(result).toBe('https://example.com/topo-a.jpg');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('invalidate removes only the entries matching the path', async () => {
    const service = TestBed.inject(TopoImageCacheService);
    await service.resolve('https://example.com/centers/a/topo.jpg');
    await service.resolve('https://example.com/centers/b/topo.jpg');
    await vi.waitFor(() => expect(store.size).toBe(2));

    await service.invalidate('centers/a/topo.jpg');

    expect(store.size).toBe(1);
    expect(store.has('https://example.com/centers/b/topo.jpg')).toBe(true);
  });

  it('revokes the blob url when its entry is invalidated', async () => {
    const service = TestBed.inject(TopoImageCacheService);
    await service.resolve('https://example.com/centers/a/topo.jpg');
    await vi.waitFor(() => expect(store.size).toBe(1));
    const blobUrl = await service.resolve(
      'https://example.com/centers/a/topo.jpg',
    );
    expect(blobUrl).toMatch(/^blob:/);

    await service.invalidate('centers/a/topo.jpg');

    expect(revoked).toContain(blobUrl);
  });
});
