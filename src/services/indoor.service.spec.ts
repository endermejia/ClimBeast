import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService, TranslateStore } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { AscentsService } from './ascents.service';
import { AuthStateService } from './auth-state.service';
import { CacheService } from './cache.service';
import { EquipperService } from './equipper.service';
import { FavoritesDataService } from './favorites-data.service';
import { IndoorCentersDataService } from './indoor-centers-data.service';
import { IndoorDataService } from './indoor-data.service';
import { IndoorService } from './indoor.service';
import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

const MOCK_TRANSLATE = {
  instant: (k: string) => k,
  get: (k: string) => k,
  onTranslationChange: {
    subscribe: () => ({
      unsubscribe: () => {
        /* noop */
      },
    }),
  },
};

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    showWithUndo: vi.fn(),
    showLoader: vi.fn(() => ({ next: vi.fn(), complete: vi.fn() })),
  };
}

describe('IndoorService - Admin Requests', () => {
  let service: IndoorService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockToast = createMockToast();

    TestBed.configureTestingModule({
      providers: [
        IndoorService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        {
          provide: AuthStateService,
          useValue: {
            userProfile: () => ({ id: 'u-1', name: 'User 1' }),
            isAdmin: () => true,
            canCreateIndoorInCenter: () => true,
            indoorAdminPermissions: () => ({}),
          },
        },
        {
          provide: CacheService,
          useValue: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
        },
        { provide: ToastService, useValue: mockToast },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: MOCK_TRANSLATE },
        { provide: TranslateStore, useValue: {} },
        {
          provide: AscentsService,
          useValue: {
            refreshResources: vi.fn(),
            notifyAscentDeleted: vi.fn(),
            notifyAscentCreated: vi.fn(),
            uploadPhoto: vi.fn().mockResolvedValue(undefined),
            deletePhoto: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EquipperService,
          useValue: { equipperIndoorRoutesResource: { reload: vi.fn() } },
        },
        {
          provide: IndoorCentersDataService,
          useValue: {
            indoorRoutesReloadTick: { update: vi.fn() },
            indoorCentersResource: { update: vi.fn(), reload: vi.fn() },
          },
        },
        {
          provide: FavoritesDataService,
          useValue: {
            likedIndoorCentersResource: { reload: vi.fn(), update: vi.fn() },
          },
        },
        {
          provide: IndoorDataService,
          useValue: {
            indoorRouteDetailResource: { reload: vi.fn() },
            topoDetailResource: { reload: vi.fn() },
          },
        },
      ],
    });

    service = TestBed.inject(IndoorService);
  });

  describe('requestIndoorCenterAdmin', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IndoorService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: AuthStateService, useValue: { userProfile: () => null } },
          { provide: CacheService, useValue: { remove: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
          { provide: AscentsService, useValue: {} },
          { provide: EquipperService, useValue: {} },
          { provide: IndoorCentersDataService, useValue: {} },
          { provide: IndoorDataService, useValue: {} },
        ],
      });
      const svc = TestBed.inject(IndoorService);
      expect(await svc.requestIndoorCenterAdmin('center-1')).toBe(false);
    });

    it('inserts a request when user is logged in and returns true', async () => {
      const spy = vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result = await service.requestIndoorCenterAdmin('center-1');
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('indoor_center_admin_requests');
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestSent',
      );
    });

    it('handles unique violation error gracefully and returns true', async () => {
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi
          .fn()
          .mockReturnValue(Promise.resolve({ error: { code: '23505' } })),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result = await service.requestIndoorCenterAdmin('center-1');
      expect(result).toBe(true);
      expect(mockToast.info).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.alreadyRequested',
      );
    });
  });

  describe('getIndoorCenterAdminRequests', () => {
    it('returns empty array on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IndoorService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: AuthStateService, useValue: {} },
          { provide: CacheService, useValue: {} },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: {} },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
          { provide: AscentsService, useValue: {} },
          { provide: EquipperService, useValue: {} },
          { provide: IndoorCentersDataService, useValue: {} },
          { provide: IndoorDataService, useValue: {} },
        ],
      });
      const svc = TestBed.inject(IndoorService);
      expect(await svc.getIndoorCenterAdminRequests()).toEqual([]);
    });

    it('fetches requests ordered by created_at DESC', async () => {
      const mockData = [
        {
          id: 'req-1',
          created_at: '2026-09-16T12:00:00Z',
          center: { id: 'c-1', name: 'Climb Gym', slug: 'climb-gym' },
          user: { id: 'u-1', name: 'User 1', avatar: null },
        },
      ];

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi
            .fn()
            .mockReturnValue(Promise.resolve({ data: mockData, error: null })),
        }),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const res = await service.getIndoorCenterAdminRequests();
      expect(res).toEqual(mockData);
    });
  });

  describe('approveIndoorCenterAdminRequest', () => {
    it('inserts into indoor_center_admins and deletes the request', async () => {
      let insertCalled = false;
      let deleteCalled = false;

      vi.spyOn(mockSupabase.client, 'from').mockImplementation(
        (table: string) => {
          if (table === 'indoor_center_admins') {
            return {
              insert: vi.fn().mockImplementation(() => {
                insertCalled = true;
                return Promise.resolve({ error: null });
              }),
            } as unknown as ReturnType<typeof mockSupabase.client.from>;
          }
          if (table === 'indoor_center_admin_requests') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  deleteCalled = true;
                  return Promise.resolve({ error: null });
                }),
              }),
            } as unknown as ReturnType<typeof mockSupabase.client.from>;
          }
          return {} as unknown as ReturnType<typeof mockSupabase.client.from>;
        },
      );

      const result = await service.approveIndoorCenterAdminRequest(
        'req-1',
        'center-1',
        'u-1',
      );
      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
      expect(deleteCalled).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestApproved',
      );
    });
  });

  describe('rejectIndoorCenterAdminRequest', () => {
    it('deletes the request and notifies success', async () => {
      let deleteCalled = false;

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => {
            deleteCalled = true;
            return Promise.resolve({ error: null });
          }),
        }),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result = await service.rejectIndoorCenterAdminRequest('req-1');
      expect(result).toBe(true);
      expect(deleteCalled).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.indoorAdminRequests.requestRejected',
      );
    });
  });

  describe('requestIndoorCenterRoutesetter', () => {
    it('returns false if user is not logged in', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IndoorService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: IS_BROWSER, useValue: true },
          { provide: SupabaseService, useValue: mockSupabase },
          {
            provide: AuthStateService,
            useValue: { userProfile: () => null },
          },
          { provide: CacheService, useValue: {} },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: {} },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
          { provide: AscentsService, useValue: {} },
          { provide: EquipperService, useValue: {} },
          { provide: IndoorCentersDataService, useValue: {} },
          { provide: IndoorDataService, useValue: {} },
        ],
      });
      const svc = TestBed.inject(IndoorService);
      expect(await svc.requestIndoorCenterRoutesetter('center-1')).toBe(false);
    });

    it('inserts a request when user is logged in and returns true', async () => {
      const spy = vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result = await service.requestIndoorCenterRoutesetter('center-1');
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith('indoor_center_routesetter_requests');
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestSent',
      );
    });

    it('handles unique violation error gracefully and returns true', async () => {
      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        insert: vi
          .fn()
          .mockReturnValue(Promise.resolve({ error: { code: '23505' } })),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result = await service.requestIndoorCenterRoutesetter('center-1');
      expect(result).toBe(true);
      expect(mockToast.info).toHaveBeenCalledWith(
        'admin.routesetterRequests.alreadyRequested',
      );
    });
  });

  describe('getIndoorCenterRoutesetterRequests', () => {
    it('returns empty array on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IndoorService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: AuthStateService, useValue: {} },
          { provide: CacheService, useValue: {} },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: {} },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
          { provide: AscentsService, useValue: {} },
          { provide: EquipperService, useValue: {} },
          { provide: IndoorCentersDataService, useValue: {} },
          { provide: IndoorDataService, useValue: {} },
        ],
      });
      const svc = TestBed.inject(IndoorService);
      expect(await svc.getIndoorCenterRoutesetterRequests()).toEqual([]);
    });

    it('fetches requests ordered by created_at DESC', async () => {
      const mockData = [
        {
          id: 'req-1',
          created_at: '2026-09-16T12:00:00Z',
          center: { id: 'c-1', name: 'Climb Gym', slug: 'climb-gym' },
          user: { id: 'u-1', name: 'User 1', avatar: null },
        },
      ];

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi
            .fn()
            .mockReturnValue(Promise.resolve({ data: mockData, error: null })),
        }),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const res = await service.getIndoorCenterRoutesetterRequests();
      expect(res).toEqual(mockData);
    });

    it('filters by centerId when provided', async () => {
      const mockData = [
        {
          id: 'req-1',
          created_at: '2026-09-16T12:00:00Z',
          center: { id: 'c-1', name: 'Climb Gym', slug: 'climb-gym' },
          user: { id: 'u-1', name: 'User 1', avatar: null },
        },
      ];

      const eqSpy = vi
        .fn()
        .mockReturnValue(Promise.resolve({ data: mockData, error: null }));

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: eqSpy,
          }),
        }),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const res = await service.getIndoorCenterRoutesetterRequests('c-1');
      expect(res).toEqual(mockData);
      expect(eqSpy).toHaveBeenCalledWith('center_id', 'c-1');
    });
  });

  describe('approveIndoorCenterRoutesetterRequest', () => {
    it('inserts into indoor_center_routesetters and deletes the request', async () => {
      let insertCalled = false;
      let deleteCalled = false;

      vi.spyOn(mockSupabase.client, 'from').mockImplementation(
        (table: string) => {
          if (table === 'indoor_center_routesetters') {
            return {
              insert: vi.fn().mockImplementation(() => {
                insertCalled = true;
                return Promise.resolve({ error: null });
              }),
            } as unknown as ReturnType<typeof mockSupabase.client.from>;
          }
          if (table === 'indoor_center_routesetter_requests') {
            return {
              delete: vi.fn().mockReturnValue({
                eq: vi.fn().mockImplementation(() => {
                  deleteCalled = true;
                  return Promise.resolve({ error: null });
                }),
              }),
            } as unknown as ReturnType<typeof mockSupabase.client.from>;
          }
          return {} as unknown as ReturnType<typeof mockSupabase.client.from>;
        },
      );

      const result = await service.approveIndoorCenterRoutesetterRequest(
        'req-1',
        'center-1',
        'u-1',
      );
      expect(result).toBe(true);
      expect(insertCalled).toBe(true);
      expect(deleteCalled).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestApproved',
      );
    });
  });

  describe('rejectIndoorCenterRoutesetterRequest', () => {
    it('deletes the request and notifies success', async () => {
      let deleteCalled = false;

      vi.spyOn(mockSupabase.client, 'from').mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => {
            deleteCalled = true;
            return Promise.resolve({ error: null });
          }),
        }),
      } as unknown as ReturnType<typeof mockSupabase.client.from>);

      const result =
        await service.rejectIndoorCenterRoutesetterRequest('req-1');
      expect(result).toBe(true);
      expect(deleteCalled).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.routesetterRequests.requestRejected',
      );
    });
  });

  describe('toggleIndoorCenterLike', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          IndoorService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          {
            provide: AuthStateService,
            useValue: { userProfile: vi.fn(() => ({ id: 'u-1' })) },
          },
          { provide: CacheService, useValue: { remove: vi.fn() } },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(IndoorService);
      expect(await svc.toggleIndoorCenterLike('center-1')).toBeNull();
    });

    it('toggles like successfully via RPC on browser', async () => {
      vi.spyOn(mockSupabase.client, 'rpc').mockResolvedValue({
        data: true,
        error: null,
      } as never);

      const result = await service.toggleIndoorCenterLike('center-1');
      expect(result).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'messages.toasts.favoriteAdded',
      );
    });

    it('unlikes successfully and shows undo toast on browser', async () => {
      vi.spyOn(mockSupabase.client, 'rpc').mockResolvedValue({
        data: false,
        error: null,
      } as never);

      const result = await service.toggleIndoorCenterLike('center-1');
      expect(result).toBe(false);
      expect(mockToast.showWithUndo).toHaveBeenCalledWith(
        'messages.toasts.favoriteRemoved',
        expect.any(Function),
      );
    });
  });

  describe('uploadPhoto and deletePhoto', () => {
    it('calls ascentsService.uploadPhoto with isIndoor=true and reloads resources', async () => {
      const ascentsService = TestBed.inject(AscentsService);
      const equipperService = TestBed.inject(EquipperService);
      const indoorCentersData = TestBed.inject(IndoorCentersDataService);
      const dummyFile = new File(['dummy'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      await service.uploadPhoto('ascent-uuid-1', dummyFile);

      expect(ascentsService.uploadPhoto).toHaveBeenCalledWith(
        'ascent-uuid-1',
        dummyFile,
        true,
      );
      expect(
        equipperService.equipperIndoorRoutesResource.reload,
      ).toHaveBeenCalled();
      expect(
        indoorCentersData.indoorRoutesReloadTick.update,
      ).toHaveBeenCalled();
    });

    it('calls ascentsService.deletePhoto with isIndoor=true and reloads resources', async () => {
      const ascentsService = TestBed.inject(AscentsService);
      const equipperService = TestBed.inject(EquipperService);
      const indoorCentersData = TestBed.inject(IndoorCentersDataService);

      await service.deletePhoto('ascent-uuid-1');

      expect(ascentsService.deletePhoto).toHaveBeenCalledWith(
        'ascent-uuid-1',
        true,
      );
      expect(
        equipperService.equipperIndoorRoutesResource.reload,
      ).toHaveBeenCalled();
      expect(
        indoorCentersData.indoorRoutesReloadTick.update,
      ).toHaveBeenCalled();
    });
  });
});
