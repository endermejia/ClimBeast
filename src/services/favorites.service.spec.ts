import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { FavoritesService } from './favorites.service';
import { SupabaseService } from './supabase.service';
import { MockSupabaseService } from '../testing/mock-supabase.service';

function createMockSupabase() {
  const mock = new MockSupabaseService();

  // Override client with chainable query builder
  let lastChain: Record<string, unknown>;

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    const methods = [
      'select',
      'eq',
      'in',
      'ilike',
      'order',
      'range',
      'limit',
      'insert',
      'update',
      'delete',
      'upsert',
    ];

    for (const method of methods) {
      chain[method] = vi.fn((..._args: unknown[]) => {
        if (method === 'insert' || method === 'upsert') {
          return {
            select: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }
        if (method === 'update') {
          return {
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          };
        }
        if (method === 'delete') {
          return {
            eq: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return chain;
      });
    }

    // Make chain thenable
    chain['then'] = (resolve: (v: { data: unknown; error: null }) => void) =>
      resolve({ data: [], error: null });

    lastChain = chain;
    return chain;
  };

  (mock as unknown as { client: Record<string, unknown> }).client = {
    from: vi.fn(() => chainable()),
    rpc: vi.fn(() => ({
      in: () => Promise.resolve({ data: [], error: null }),
      then: (resolve: (v: { data: unknown; error: null }) => void) =>
        resolve({ data: [], error: null }),
    })),
    auth: mock.client.auth,
    storage: mock.client.storage,
  };

  return { mock, lastChain: () => lastChain };
}

describe('FavoritesService', () => {
  let service: FavoritesService;

  const mockUserId = 'user-123';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FavoritesService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SupabaseService, useValue: createMockSupabase().mock },
      ],
    });
    service = TestBed.inject(FavoritesService);
  });

  describe('getLikedAreas', () => {
    it('returns empty array when no area likes', async () => {
      const result = await service.getLikedAreas(mockUserId);
      expect(result).toEqual([]);
    });

    it('returns empty on server error', async () => {
      const mockWithRpcError = new MockSupabaseService();
      let fromCallCount = 0;
      const fromMock = vi.fn(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // area_likes query returning ids
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  data: [{ area_id: 1 }, { area_id: 2 }],
                  error: null,
                }),
              ),
            })),
          };
        }
        // area_purchases query (not reached if rpc fails first)
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      });

      const rpcMock = vi.fn(() => ({
        in: vi.fn(() =>
          Promise.resolve({ data: null, error: { message: 'fail' } }),
        ),
      }));

      (
        mockWithRpcError as unknown as {
          client: typeof mockWithRpcError.client;
        }
      ).client = {
        ...mockWithRpcError.client,
        from: fromMock,
        rpc: rpcMock,
      } as never;

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FavoritesService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: SupabaseService, useValue: mockWithRpcError },
        ],
      });
      const svc = TestBed.inject(FavoritesService);

      const result = await svc.getLikedAreas(mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('getLikedCrags', () => {
    it('returns empty when no crag likes', async () => {
      const result = await service.getLikedCrags(mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe('getLikedRoutes', () => {
    it('returns empty when no route likes', async () => {
      const result = await service.getLikedRoutes(mockUserId);
      expect(result).toEqual([]);
    });
  });
});
