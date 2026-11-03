import { TestBed } from '@angular/core/testing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { AvatarImageCacheService } from './avatar-image-cache.service';

describe('AvatarImageCacheService', () => {
  const originalCreate = URL.createObjectURL;
  let store: Map<string, Blob>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = new Map();
    const cache = {
      async match(url: string): Promise<Response | undefined> {
        const blob = store.get(url);
        return blob ? new Response(blob, { status: 200 }) : undefined;
      },
      async put(url: string, response: Response): Promise<void> {
        store.set(url, await response.blob());
      },
      async keys(): Promise<Request[]> {
        return [...store.keys()].map((url) => new Request(url));
      },
      async delete(request: Request): Promise<boolean> {
        return store.delete(request.url);
      },
    };

    vi.stubGlobal('caches', { open: async () => cache });
    fetchMock = vi.fn(async () => new Response(new Blob(['avatar-bytes'])));
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = () => 'blob:cached-avatar';

    TestBed.configureTestingModule({
      providers: [{ provide: IS_BROWSER, useValue: true }],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    URL.createObjectURL = originalCreate;
  });

  it('caches an online avatar and serves it from Cache Storage later', async () => {
    const service = TestBed.inject(AvatarImageCacheService);
    const url = 'https://example.com/avatar.jpg';

    await expect(service.resolve(url)).resolves.toBe(url);
    await vi.waitFor(() => expect(store.has(url)).toBe(true));

    const afterReload = TestBed.runInInjectionContext(
      () => new AvatarImageCacheService(),
    );
    await expect(afterReload.resolve(url)).resolves.toBe('blob:cached-avatar');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
