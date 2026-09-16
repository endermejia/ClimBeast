import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockSupabaseService } from '../testing/mock-supabase.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { UserReportsService } from './user-reports.service';

function createMockToast() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };
}

function createMockDialogs() {
  return {
    open: vi.fn(() => of(true)),
  };
}

function createMockTranslate() {
  return {
    instant: vi.fn((key: string) => key),
  };
}

describe('UserReportsService', () => {
  let service: UserReportsService;
  let mockSupabase: MockSupabaseService;
  let mockToast: ReturnType<typeof createMockToast>;
  let mockDialogs: ReturnType<typeof createMockDialogs>;
  let mockTranslate: ReturnType<typeof createMockTranslate>;

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
    mockDialogs = createMockDialogs();
    mockTranslate = createMockTranslate();

    TestBed.configureTestingModule({
      providers: [
        UserReportsService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ToastService, useValue: mockToast },
        { provide: TuiDialogService, useValue: mockDialogs },
        { provide: TranslateService, useValue: mockTranslate },
      ],
    });
    service = TestBed.inject(UserReportsService);
  });

  describe('openReportDialog', () => {
    it('returns false and shows toast when no user is logged in', async () => {
      mockSupabase.setSession(null);
      const result = await service.openReportDialog({ userId: 'user-2' });

      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('returns false and shows warning when trying to report self', async () => {
      const result = await service.openReportDialog({ userId: 'user-1' });

      expect(result).toBe(false);
      expect(mockToast.warning).toHaveBeenCalledWith('cannotReportSelf');
    });

    it('opens dialog and returns result on success', async () => {
      const result = await service.openReportDialog({
        userId: 'user-2',
        userName: 'User Two',
      });

      expect(result).toBe(true);
      expect(mockDialogs.open).toHaveBeenCalled();
    });
  });

  describe('reportUser', () => {
    it('returns false when not authenticated', async () => {
      mockSupabase.setSession(null);
      const result = await service.reportUser({
        reported_id: 'user-2',
        reason: 'spam',
      });

      expect(result.success).toBe(false);
      expect(mockToast.error).toHaveBeenCalled();
    });

    it('returns false when reporting self', async () => {
      const result = await service.reportUser({
        reported_id: 'user-1',
        reason: 'spam',
      });

      expect(result.success).toBe(false);
      expect(mockToast.warning).toHaveBeenCalledWith('cannotReportSelf');
    });

    it('inserts report and returns true on success', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null })),
      })) as never;

      const result = await service.reportUser({
        reported_id: 'user-2',
        reason: 'spam',
        details: 'Some spam link',
      });

      expect(result.success).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith('reportSuccess');
    });

    it('handles duplicate pending report (error 23505) gracefully', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        insert: vi.fn(() =>
          Promise.resolve({
            error: { code: '23505', message: 'duplicate key' },
          }),
        ),
      })) as never;

      const result = await service.reportUser({
        reported_id: 'user-2',
        reason: 'harassment',
      });

      expect(result.success).toBe(false);
      expect(result.alreadyReported).toBe(true);
      expect(mockToast.warning).toHaveBeenCalledWith('reportAlreadyPending');
    });

    it('handles general error and shows error toast', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        insert: vi.fn(() =>
          Promise.resolve({
            error: { code: 'PGRST500', message: 'server error' },
          }),
        ),
      })) as never;

      const result = await service.reportUser({
        reported_id: 'user-2',
        reason: 'other',
      });

      expect(result.success).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('reportError');
    });
  });

  describe('getUserReports', () => {
    it('returns reports from supabase', async () => {
      const mockReports = [
        { id: 1, reason: 'spam', status: 'pending' },
        { id: 2, reason: 'harassment', status: 'resolved' },
      ];

      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: mockReports, error: null }),
          ),
        })),
      })) as never;

      const result = await service.getUserReports();
      expect(result).toEqual(mockReports);
    });

    it('filters by status when provided', async () => {
      const mockEq = vi.fn(() => Promise.resolve({ data: [], error: null }));
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: mockEq,
          })),
        })),
      })) as never;

      await service.getUserReports('pending');
      expect(mockEq).toHaveBeenCalledWith('status', 'pending');
    });

    it('returns empty array on error', async () => {
      mockSupabase.client.from = vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'error' } }),
          ),
        })),
      })) as never;

      const result = await service.getUserReports();
      expect(result).toEqual([]);
    });
  });

  describe('updateReportStatus', () => {
    it('updates report status and shows success toast', async () => {
      const mockEq = vi.fn(() => Promise.resolve({ error: null }));
      mockSupabase.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: mockEq,
        })),
      })) as never;

      const result = await service.updateReportStatus(1, 'resolved');
      expect(result).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.userReports.updatedSuccess',
      );
    });

    it('handles update error and shows error toast', async () => {
      const mockEq = vi.fn(() =>
        Promise.resolve({ error: { message: 'fail' } }),
      );
      mockSupabase.client.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: mockEq,
        })),
      })) as never;

      const result = await service.updateReportStatus(1, 'resolved');
      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'admin.userReports.updateError',
      );
    });
  });

  describe('deleteReport', () => {
    it('deletes report and shows success toast', async () => {
      const mockEq = vi.fn(() => Promise.resolve({ error: null }));
      mockSupabase.client.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: mockEq,
        })),
      })) as never;

      const result = await service.deleteReport(1);
      expect(result).toBe(true);
      expect(mockToast.success).toHaveBeenCalledWith(
        'admin.userReports.deletedSuccess',
      );
    });

    it('handles delete error and shows error toast', async () => {
      const mockEq = vi.fn(() =>
        Promise.resolve({ error: { message: 'fail' } }),
      );
      mockSupabase.client.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: mockEq,
        })),
      })) as never;

      const result = await service.deleteReport(1);
      expect(result).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith(
        'admin.userReports.deleteError',
      );
    });
  });
});
