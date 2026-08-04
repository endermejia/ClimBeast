import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService, TranslateStore } from '@ngx-translate/core';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { ToposService } from './topos.service';

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
  };
}

describe('ToposService', () => {
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
        ToposService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
        { provide: TuiDialogService, useValue: { open: vi.fn() } },
        { provide: TranslateService, useValue: MOCK_TRANSLATE },
        { provide: TranslateStore, useValue: {} },
      ],
    });
  });

  describe('create', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      expect(
        await svc.create({ name: 'test', crag_id: 1, slug: 'test' }),
      ).toBeNull();
    });
  });

  describe('update', () => {
    it('returns null on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      expect(await svc.update(1, { name: 'updated' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns false on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      expect(await svc.delete(1)).toBe(false);
    });
  });

  describe('addRoute', () => {
    it('returns on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      // Should not throw
      await expect(
        svc.addRoute({ topo_id: 1, route_id: 1, number: 1 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('removeRoute', () => {
    it('returns on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      await expect(svc.removeRoute(1, 1)).resolves.toBeUndefined();
    });
  });

  describe('deletePhoto', () => {
    it('returns on server platform', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ToposService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: IS_BROWSER, useValue: false },
          { provide: SupabaseService, useValue: mockSupabase },
          { provide: ToastService, useValue: mockToast },
          { provide: TuiDialogService, useValue: { open: vi.fn() } },
          { provide: TranslateService, useValue: MOCK_TRANSLATE },
          { provide: TranslateStore, useValue: {} },
        ],
      });
      const svc = TestBed.inject(ToposService);
      await expect(svc.deletePhoto(1)).resolves.toBeUndefined();
    });
  });
});
