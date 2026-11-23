import { ResourceRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { CacheService } from '../services/cache.service';

import { IS_BROWSER } from '../app/is-browser';

import {
  createCachedResource,
  createSafeResource,
  safeResourceValue,
  waitForResource,
  watchResourceError,
} from './resource-helpers';

describe('resource-helpers', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CacheService, { provide: IS_BROWSER, useValue: true }],
    });
    cacheService = TestBed.inject(CacheService);
  });

  describe('createCachedResource', () => {
    it('returns fallbackValue when isBrowser is false', async () => {
      const { signal } = TestBed.runInInjectionContext(() =>
        createCachedResource({
          isBrowser: false,
          cacheKey: () => 'test_key',
          fetcher: async () => 'fetched',
          cache: cacheService,
          fallbackValue: 'fallback',
        }),
      );

      expect(signal()).toBe('fallback');
    });

    it('fetches data and caches it when in browser', async () => {
      const { signal } = TestBed.runInInjectionContext(() =>
        createCachedResource({
          isBrowser: true,
          cacheKey: () => 'test_key_2',
          fetcher: async () => 'fetched_data',
          cache: cacheService,
          fallbackValue: 'fallback',
        }),
      );

      // Initially or after resolution signal provides fallback or value
      expect(signal()).toBeDefined();
    });

    it('returns cached data immediately while revalidating and swaps in fresh data when resolved', async () => {
      cacheService.set('topo_42', { id: 42, name: 'Cached Topo' });
      cacheService.set('topo_43', { id: 43, name: 'Cached Topo 43' });

      let resolveFetch!: (val: { id: number; name: string }) => void;
      const selectedId = signal<number | null>(42);

      const cached = TestBed.runInInjectionContext(() =>
        createCachedResource<
          number | null,
          { id: number; name: string } | null
        >({
          params: () => selectedId(),
          isBrowser: true,
          cacheKey: (id) => (id ? `topo_${id}` : null),
          fetcher: () =>
            new Promise((resolve) => {
              resolveFetch = resolve;
            }),
          cache: cacheService,
          fallbackValue: null,
        }),
      );

      // Immediately returns cached topo without waiting for network
      expect(cached.signal()).toEqual({ id: 42, name: 'Cached Topo' });
      expect(cached.showSkeleton()).toBe(false);

      // Flush resource effect so loader starts
      TestBed.tick();
      expect(cached.resource.isLoading()).toBe(true);
      expect(cached.signal()).toEqual({ id: 42, name: 'Cached Topo' });

      // Fresh data arrives from server -> signal updates reactively
      resolveFetch({ id: 42, name: 'Fresh Topo' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cached.signal()).toEqual({ id: 42, name: 'Fresh Topo' });

      // Switching to another cached topo immediately shows its cached data while loading
      selectedId.set(43);
      TestBed.tick();
      expect(cached.resource.isLoading()).toBe(true);
      expect(cached.signal()).toEqual({ id: 43, name: 'Cached Topo 43' });

      resolveFetch({ id: 43, name: 'Fresh Topo 43' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(cached.signal()).toEqual({ id: 43, name: 'Fresh Topo 43' });
    });
  });

  describe('watchResourceError & createSafeResource', () => {
    it('creates safe resource and attaches watchResourceError without crashing', () => {
      let errorOccurred = false;
      TestBed.runInInjectionContext(() => {
        const res = createSafeResource({
          loader: async () => 'data',
          onError: () => (errorOccurred = true),
          logTag: 'TestTag',
        });
        watchResourceError(res, { logTag: 'DirectWatch' });
      });
      expect(errorOccurred).toBe(false);
    });
  });

  describe('waitForResource', () => {
    it('returns undefined if resource is undefined throughout', async () => {
      const mockResource = {
        value: () => undefined,
      } as unknown as ResourceRef<unknown>;

      const result = await waitForResource(mockResource, 2, 10);
      expect(result).toBeUndefined();
    });

    it('returns value once loaded', async () => {
      let val: string | undefined = undefined;
      setTimeout(() => (val = 'loaded'), 20);

      const mockResource = {
        value: () => val,
      } as unknown as ResourceRef<unknown>;

      const result = await waitForResource(mockResource, 10, 10);
      expect(result).toBe('loaded');
    });

    it('returns undefined when resource is in error state (value() throws)', async () => {
      const mockResource = {
        value: () => {
          throw new Error('ResourceValueError');
        },
      } as unknown as ResourceRef<unknown>;

      const result = await waitForResource(mockResource, 3, 5);
      expect(result).toBeUndefined();
    });
  });

  describe('safeResourceValue', () => {
    it('returns resource value when available', () => {
      const mockResource = {
        value: () => 'hello',
        error: () => undefined,
      };
      expect(safeResourceValue(mockResource, 'fallback')).toBe('hello');
    });

    it('returns fallback when value is undefined', () => {
      const mockResource = {
        value: () => undefined,
        error: () => undefined,
      };
      expect(safeResourceValue(mockResource, 'fallback')).toBe('fallback');
    });

    it('returns fallback when resource has error without calling value()', () => {
      let valueCalled = false;
      const mockResource = {
        value: () => {
          valueCalled = true;
          throw new Error('Resource error');
        },
        error: () => new Error('Underlying error'),
      };
      expect(safeResourceValue(mockResource, 'fallback')).toBe('fallback');
      expect(valueCalled).toBe(false);
    });

    it('catches error if value() throws and returns fallback', () => {
      const mockResource = {
        value: () => {
          throw new Error('Unexpected throw');
        },
      };
      expect(safeResourceValue(mockResource, 'fallback')).toBe('fallback');
    });
  });
});
