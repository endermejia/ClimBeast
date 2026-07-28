import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { AscentsService } from './ascents.service';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import { ToastService } from './toast.service';
import { AppNotificationsService } from './app-notifications.service';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { MockGlobalData } from '../testing/mock-global-data.service';
import { TranslateService, TranslateStore } from '@ngx-translate/core';

const MOCK_TRANSLATE = {
  instant: (k: string) => k,
  get: (k: string) => k,
  onTranslationChange: { subscribe: () => ({ unsubscribe: () => {} }) },
};

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    showWithUndo: vi.fn(),
    showLoader: vi.fn(() => ({ next: vi.fn(), complete: vi.fn() })),
  };
}

function createMockNotifications() {
  return {
    createNotification: vi.fn().mockResolvedValue(undefined),
    createNotifications: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDialogs() {
  return {
    open: vi.fn(),
  };
}

describe('AscentsService', () => {
  let service: AscentsService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;
  let mockNotifications: ReturnType<typeof createMockNotifications>;

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
    mockNotifications = createMockNotifications();

    TestBed.configureTestingModule({
      providers: [
        AscentsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SupabaseService, useValue: mockSupabase },
        MockGlobalData,
        { provide: GlobalData, useExisting: MockGlobalData },
        { provide: ToastService, useValue: mockToast },
        { provide: AppNotificationsService, useValue: mockNotifications },
        { provide: 'TuiDialogService', useValue: createMockDialogs() },
        { provide: TranslateService, useValue: MOCK_TRANSLATE },
        { provide: TranslateStore, useValue: {} },
      ],
    });
    service = TestBed.inject(AscentsService);
  });

  describe('ascentInfo', () => {
    it('returns info for all ascent types', () => {
      const info = service.ascentInfo();
      expect(info.os).toBeDefined();
      expect(info.f).toBeDefined();
      expect(info.rp).toBeDefined();
      expect(info.attempt).toBeDefined();
      expect(info.default).toBeDefined();
    });

    it('each type has icon, background, backgroundSubtle', () => {
      const info = service.ascentInfo();
      for (const key of Object.keys(info)) {
        const entry = info[key as keyof typeof info];
        expect(entry.icon).toBeTruthy();
        expect(entry.background).toBeTruthy();
        expect(entry.backgroundSubtle).toBeTruthy();
      }
    });
  });

  describe('getAscentById', () => {
    it('returns null for invalid id', async () => {
      expect(await service.getAscentById(0)).toBeNull();
      expect(await service.getAscentById(-1)).toBeNull();
      expect(await service.getAscentById(NaN)).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('returns empty for empty userId', async () => {
      const result = await service.getUserStats('');
      expect(result).toEqual([]);
    });
  });

  describe('getUserAscentDates', () => {
    it('returns empty for empty userId', async () => {
      const result = await service.getUserAscentDates('');
      expect(result).toEqual([]);
    });
  });

  describe('getUserAscentsByMonth', () => {
    it('returns empty for empty userId', async () => {
      const result = await service.getUserAscentsByMonth('', 2024, 1);
      expect(result).toEqual([]);
    });
  });

  describe('toggleLike', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AscentsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: AppNotificationsService, useValue: mockNotifications },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const serverService = TestBed.inject(AscentsService);
      expect(await serverService.toggleLike(1)).toBeNull();
    });
  });

  describe('getLikesInfo', () => {
    it('returns default on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AscentsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: AppNotificationsService, useValue: mockNotifications },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const serverService = TestBed.inject(AscentsService);
      const result = await serverService.getLikesInfo(1);
      expect(result).toEqual({ likes_count: 0, user_liked: false });
    });
  });

  describe('getCommentsCount', () => {
    it('returns 0 on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AscentsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: AppNotificationsService, useValue: mockNotifications },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const serverService = TestBed.inject(AscentsService);
      expect(await serverService.getCommentsCount(1)).toBe(0);
    });
  });

  describe('refreshComments', () => {
    it('emits ascent id to comments update subject', () => {
      const emitted: number[] = [];
      service.ascentCommentsUpdate.subscribe((id) => emitted.push(id));
      service.refreshComments(42);
      expect(emitted).toEqual([42]);
    });
  });

  describe('refreshResources', () => {
    it('calls reload on global resources', () => {
      const mockGlobal = TestBed.inject(MockGlobalData);
      const reloadFns = {
        userAscentsResource: vi.fn(),
        routeAscentsResource: vi.fn(),
        routeDetailResource: vi.fn(),
        cragRoutesResource: vi.fn(),
        topoDetailResource: vi.fn(),
        userProjectsResource: vi.fn(),
        userTotalAscentsCountResource: vi.fn(),
      };
      Object.assign(mockGlobal, {
        userAscentsResource: {
          reload: reloadFns.userAscentsResource,
          value: () => null,
          update: vi.fn(),
        },
        routeAscentsResource: {
          reload: reloadFns.routeAscentsResource,
          value: () => null,
          update: vi.fn(),
        },
        routeDetailResource: { reload: reloadFns.routeDetailResource },
        cragRoutesResource: { reload: reloadFns.cragRoutesResource },
        topoDetailResource: { reload: reloadFns.topoDetailResource },
        userProjectsResource: { reload: reloadFns.userProjectsResource },
        userTotalAscentsCountResource: {
          reload: reloadFns.userTotalAscentsCountResource,
        },
      });

      service.refreshResources();

      expect(reloadFns.userAscentsResource).toHaveBeenCalled();
      expect(reloadFns.routeAscentsResource).toHaveBeenCalled();
      expect(reloadFns.routeDetailResource).toHaveBeenCalled();
    });
  });
});
