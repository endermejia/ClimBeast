import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';

import { CragsService } from './crags.service';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import { ToastService } from './toast.service';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { MockGlobalData } from '../testing/mock-global-data.service';
import { TuiDialogService } from '@taiga-ui/core';
import { TranslateService, TranslateStore } from '@ngx-translate/core';

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
  };
}

describe('CragsService', () => {
  let service: CragsService;
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
        CragsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: GlobalData, useClass: MockGlobalData },
        { provide: ToastService, useValue: mockToast },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: MOCK_TRANSLATE },
        { provide: TranslateStore, useValue: {} },
      ],
    });
    service = TestBed.inject(CragsService);
  });

  describe('loading signal', () => {
    it('defaults to false', () => {
      expect(service.loading()).toBe(false);
    });
  });

  describe('error signal', () => {
    it('defaults to null', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('getAllCragsSimple', () => {
    it('returns empty on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(await svc.getAllCragsSimple()).toEqual([]);
    });
  });

  describe('create', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(
        await svc.create({ name: 'test', area_id: 1, slug: 'test' }),
      ).toBeNull();
    });
  });

  describe('update', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(await svc.update(1, { name: 'updated' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(await svc.delete(1)).toBe(false);
    });
  });

  describe('getById', () => {
    it('returns null data on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      const result = await svc.getById(1);
      expect(result.data).toBeNull();
    });
  });

  describe('unify', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(await svc.unify(1, [2, 3], 'merged')).toBe(false);
    });
  });

  describe('toggleCragLike', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CragsService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: GlobalData, useClass: MockGlobalData },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(CragsService);
      expect(await svc.toggleCragLike(1)).toBe(false);
    });
  });
});
