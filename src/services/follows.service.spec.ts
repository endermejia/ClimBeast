import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockSupabaseService } from '../testing/mock-supabase.service';
import { FollowsService } from './follows.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    showWithUndo: vi.fn(),
  };
}

describe('FollowsService', () => {
  let service: FollowsService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockSupabase.setSession({
      access_token: 'tok',
      refresh_token: 'ref',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: { id: 'user-1', email: 'test@test.com' } as never,
    });

    mockToast = createMockToast();

    TestBed.configureTestingModule({
      providers: [
        FollowsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
      ],
    });
    service = TestBed.inject(FollowsService);
  });

  describe('follow', () => {
    it('inserts follow and returns true on success', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })) as never;

      const result = await service.follow('user-2');
      expect(result).toBe(true);
      expect(mockToast.success).toHaveBeenCalled();
      expect(service.followChange()).toBe(1);
    });

    it('returns false and shows error toast on failure', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        insert: vi.fn(() =>
          Promise.resolve({ error: { message: 'duplicate' } }),
        ),
      })) as never;

      const result = await service.follow('user-2');
      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('returns false when no user is logged in', async () => {
      mockSupabase.setSession(null);
      const result = await service.follow('user-2');
      expect(result).toBe(false);
    });
  });

  describe('unfollow', () => {
    it('deletes follow and returns true', async () => {
      const deleteFn = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }));
      mockSupabase.client.from = vi.fn(() => ({
        delete: deleteFn,
      })) as never;

      const result = await service.unfollow('user-2');
      expect(result).toBe(true);
      expect(mockToast.showWithUndo).toHaveBeenCalled();
    });

    it('returns false on error', async () => {
      const deleteFn = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: { message: 'fail' } })),
        })),
      }));
      mockSupabase.client.from = vi.fn(() => ({
        delete: deleteFn,
      })) as never;

      const result = await service.unfollow('user-2');
      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  describe('getFollowersCount', () => {
    it('returns count on success', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
        })),
      })) as never;

      const count = await service.getFollowersCount('user-2');
      expect(count).toBe(5);
    });

    it('returns 0 on error', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ count: null, error: { message: 'fail' } }),
          ),
        })),
      })) as never;

      const count = await service.getFollowersCount('user-2');
      expect(count).toBe(0);
    });
  });

  describe('getFollowingCount', () => {
    it('returns count on success', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 3, error: null })),
        })),
      })) as never;

      const count = await service.getFollowingCount('user-2');
      expect(count).toBe(3);
    });
  });

  describe('getFollowedIds', () => {
    it('returns empty when no user logged in', async () => {
      mockSupabase.setSession(null);
      const ids = await service.getFollowedIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getFollowersPaginated', () => {
    it('returns empty items when no followers', async () => {
      // Mock the getAllIds chain (empty)
      mockSupabase.client.from = vi.fn(() => {
        const chain: Record<string, unknown> = {};
        for (const method of [
          'select',
          'eq',
          'in',
          'ilike',
          'order',
          'range',
          'limit',
        ]) {
          chain[method] = vi.fn(() => chain);
        }
        chain['then'] = (
          resolve: (v: { data: unknown[]; error: null; count: number }) => void,
        ) => resolve({ data: [], error: null, count: 0 });
        return chain;
      }) as never;

      const result = await service.getFollowersPaginated('user-2', 0, 10);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getFollowingPaginated', () => {
    it('returns empty items when not following anyone', async () => {
      mockSupabase.client.from = vi.fn(() => {
        const chain: Record<string, unknown> = {};
        for (const method of [
          'select',
          'eq',
          'in',
          'ilike',
          'order',
          'range',
          'limit',
        ]) {
          chain[method] = vi.fn(() => chain);
        }
        chain['then'] = (
          resolve: (v: { data: unknown[]; error: null; count: number }) => void,
        ) => resolve({ data: [], error: null, count: 0 });
        return chain;
      }) as never;

      const result = await service.getFollowingPaginated('user-2', 0, 10);
      expect(result.items).toEqual([]);
    });
  });
});
