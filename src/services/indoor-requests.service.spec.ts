import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { AuthStateService } from './auth-state.service';
import { CacheService } from './cache.service';
import { IndoorRequestsService } from './indoor-requests.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    showWithUndo: vi.fn(),
  };
}

describe('IndoorRequestsService', () => {
  let service: IndoorRequestsService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;
  let mockCache: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  function configure(
    options: { isBrowser?: boolean; userId?: string | null } = {},
  ) {
    const isBrowser = options.isBrowser ?? true;
    const userId = options.userId === undefined ? 'u-1' : options.userId;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        IndoorRequestsService,
        { provide: PLATFORM_ID, useValue: isBrowser ? 'browser' : 'server' },
        { provide: IS_BROWSER, useValue: isBrowser },
        { provide: SupabaseService, useValue: mockSupabase },
        {
          provide: AuthStateService,
          useValue: {
            userProfile: () => (userId ? { id: userId, name: 'User 1' } : null),
          },
        },
        { provide: CacheService, useValue: mockCache },
        { provide: ToastService, useValue: mockToast },
      ],
    });
    return TestBed.inject(IndoorRequestsService);
  }

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockSupabase.setSession({
      access_token: 'tok',
      refresh_token: 'ref',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
      user: { id: 'u-1', email: 'u1@test.com' } as never,
    });
    mockToast = createMockToast();
    mockCache = { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
    service = configure();
  });

  describe('admin requests', () => {
    it('returns false on server or when unauthenticated', async () => {
      const ssrService = configure({ isBrowser: false });
      expect(await ssrService.requestIndoorCenterAdmin('c-1')).toBe(false);

      const anonService = configure({ userId: null });
      expect(await anonService.requestIndoorCenterAdmin('c-1')).toBe(false);
    });

    it('submits an admin request and resets loading state', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const fromSpy = vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: insertSpy,
      } as never);

      const result = await service.requestIndoorCenterAdmin('c-1');
      expect(result).toBe(true);
      expect(service.loading()).toBe(false);
      expect(fromSpy).toHaveBeenCalledWith('indoor_center_admin_requests');
      expect(insertSpy).toHaveBeenCalledWith({
        center_id: 'c-1',
        user_id: 'u-1',
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestSent',
      );
    });

    it('treats duplicate admin request (23505) as info and returns true', async () => {
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      } as never);

      expect(await service.requestIndoorCenterAdmin('c-1')).toBe(true);
      expect(mockToast.info).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.alreadyRequested',
      );
    });

    it('handles unexpected error on submit and shows error toast', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi
          .fn()
          .mockResolvedValue({ error: { code: '500', message: 'boom' } }),
      } as never);

      expect(await service.requestIndoorCenterAdmin('c-1')).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
      expect(service.loading()).toBe(false);
      errorSpy.mockRestore();
    });

    it('fetches admin requests and returns [] on error or server', async () => {
      const ssrService = configure({ isBrowser: false });
      expect(await ssrService.getIndoorCenterAdminRequests()).toEqual([]);

      const rows = [
        {
          id: 'req-1',
          created_at: '2026-10-01T00:00:00Z',
          center: { id: 'c-1', name: 'Gym', slug: 'gym' },
          user: { id: 'u-2', name: 'Bob', avatar: null },
        },
      ];
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      } as never);

      expect(await service.getIndoorCenterAdminRequests()).toEqual(rows);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'fail' } }),
        }),
      } as never);
      expect(await service.getIndoorCenterAdminRequests()).toEqual([]);
      errorSpy.mockRestore();
    });

    it('approves admin request, tolerates duplicate membership, and refreshes own admin cache', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: { code: '23505' } });
      const eqSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(mockSupabase.client, 'from').mockImplementation(
        (table: string) => {
          if (table === 'indoor_center_admins') {
            return { insert: insertSpy } as never;
          }
          return {
            delete: vi.fn().mockReturnValue({ eq: eqSpy }),
          } as never;
        },
      );

      const ok = await service.approveIndoorCenterAdminRequest(
        'req-1',
        'c-1',
        'u-1',
      );
      expect(ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith({
        center_id: 'c-1',
        user_id: 'u-1',
        role: 'admin',
      });
      expect(eqSpy).toHaveBeenCalledWith('id', 'req-1');
      expect(mockCache.remove).toHaveBeenCalledWith(
        CACHE_KEYS.adminIndoorCenters('u-1'),
      );
      expect(mockSupabase.adminIndoorCentersResource.reload).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestApproved',
      );
    });

    it('does not invalidate own admin cache when approving another user', async () => {
      vi.spyOn(mockSupabase.client, 'from').mockImplementation(
        (table: string) => {
          if (table === 'indoor_center_admins') {
            return {
              insert: vi.fn().mockResolvedValue({ error: null }),
            } as never;
          }
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as never;
        },
      );

      expect(
        await service.approveIndoorCenterAdminRequest(
          'req-2',
          'c-1',
          'u-other',
        ),
      ).toBe(true);
      expect(mockCache.remove).not.toHaveBeenCalled();
      expect(
        mockSupabase.adminIndoorCentersResource.reload,
      ).not.toHaveBeenCalled();
    });

    it('rejects admin request and handles deletion errors', async () => {
      const eqSpy = vi.fn().mockResolvedValue({ error: null });
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        delete: vi.fn().mockReturnValue({ eq: eqSpy }),
      } as never);

      expect(await service.rejectIndoorCenterAdminRequest('req-1')).toBe(true);
      expect(eqSpy).toHaveBeenCalledWith('id', 'req-1');
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestRejected',
      );

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* noop */
      });
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'denied' } }),
        }),
      } as never);
      expect(await service.rejectIndoorCenterAdminRequest('req-1')).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('errors.unexpected');
      errorSpy.mockRestore();
    });
  });

  describe('routesetter requests', () => {
    it('submits routesetter request and handles duplicates', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const fromSpy = vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: insertSpy,
      } as never);

      expect(await service.requestIndoorCenterRoutesetter('c-2')).toBe(true);
      expect(fromSpy).toHaveBeenCalledWith(
        'indoor_center_routesetter_requests',
      );
      expect(insertSpy).toHaveBeenCalledWith({
        center_id: 'c-2',
        user_id: 'u-1',
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestSent',
      );

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      } as never);
      expect(await service.requestIndoorCenterRoutesetter('c-2')).toBe(true);
      expect(mockToast.info).toHaveBeenCalledWith(
        'admin.routesetterRequests.alreadyRequested',
      );
    });

    it('fetches routesetter requests with optional centerId filter', async () => {
      const mockRows = [
        {
          id: 'rs-1',
          created_at: '2026-10-02T00:00:00Z',
          center: { id: 'c-2', name: 'Boulder', slug: 'boulder' },
          user: { id: 'u-3', name: 'Ana', avatar: null },
        },
      ];
      const eqSpy = vi.fn().mockResolvedValue({ data: mockRows, error: null });
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ eq: eqSpy }),
        }),
      } as never);

      expect(await service.getIndoorCenterRoutesetterRequests('c-2')).toEqual(
        mockRows,
      );
      expect(eqSpy).toHaveBeenCalledWith('center_id', 'c-2');
    });

    it('approves routesetter request and reloads routesetter resource for current user', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const eqSpy = vi.fn().mockResolvedValue({ error: null });

      vi.spyOn(mockSupabase.client, 'from').mockImplementation(
        (table: string) => {
          if (table === 'indoor_center_routesetters') {
            return { insert: insertSpy } as never;
          }
          return {
            delete: vi.fn().mockReturnValue({ eq: eqSpy }),
          } as never;
        },
      );

      const ok = await service.approveIndoorCenterRoutesetterRequest(
        'rs-1',
        'c-2',
        'u-1',
      );
      expect(ok).toBe(true);
      expect(insertSpy).toHaveBeenCalledWith({
        center_id: 'c-2',
        user_id: 'u-1',
      });
      expect(eqSpy).toHaveBeenCalledWith('id', 'rs-1');
      expect(
        mockSupabase.routesetterIndoorCentersResource.reload,
      ).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestApproved',
      );
    });

    it('rejects routesetter request and returns false on server', async () => {
      const ssrService = configure({ isBrowser: false });
      expect(
        await ssrService.rejectIndoorCenterRoutesetterRequest('rs-1'),
      ).toBe(false);

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as never);

      expect(await service.rejectIndoorCenterRoutesetterRequest('rs-1')).toBe(
        true,
      );
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestRejected',
      );
    });
  });
});
