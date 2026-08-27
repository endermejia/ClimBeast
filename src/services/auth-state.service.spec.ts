import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockLocalStorage } from '../testing/mock-local-storage';
import { MockSupabaseService } from '../testing/mock-supabase.service';
import { AuthStateService } from './auth-state.service';
import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

describe('AuthStateService', () => {
  let service: AuthStateService;
  let mockSupabase: MockSupabaseService;
  let mockStorage: MockLocalStorage;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();
    mockStorage = new MockLocalStorage();

    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: LocalStorage, useValue: mockStorage },
      ],
    });
    service = TestBed.inject(AuthStateService);
  });

  describe('editingMode', () => {
    it('defaults to false', () => {
      expect(service.editingMode()).toBe(false);
    });

    it('can be set and read', () => {
      service.editingMode.set(true);
      expect(service.editingMode()).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('returns false when no profile', () => {
      expect(service.isAdmin()).toBe(false);
    });

    it('returns true when profile is admin', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        name: 'Admin',
        is_admin: true,
      } as never);
      expect(service.isAdmin()).toBe(true);
    });

    it('returns false when profile is not admin', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        name: 'User',
        is_admin: false,
      } as never);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('canEditAsAdmin', () => {
    it('returns false when not editing mode', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);
      expect(service.canEditAsAdmin()).toBe(false);
    });

    it('returns false when not admin', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.canEditAsAdmin()).toBe(false);
    });

    it('returns true when both editing mode and admin', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);
      expect(service.canEditAsAdmin()).toBe(true);
    });
  });

  describe('isAreaAdmin', () => {
    it('returns false when no admin areas', () => {
      expect(service.isAreaAdmin()).toBe(false);
    });
  });

  describe('merchandisingFeature', () => {
    it('mirrors isAdmin', () => {
      expect(service.merchandisingFeature()).toBe(service.isAdmin());
    });
  });

  describe('hydrateEditingMode', () => {
    it('reads from localStorage and sets editing mode', () => {
      mockStorage.setItem(service.editingModeStorageKey, 'true');
      service.hydrateEditingMode();
      expect(service.editingMode()).toBe(true);
    });

    it('does not change editing mode when key is missing', () => {
      service.hydrateEditingMode();
      expect(service.editingMode()).toBe(false);
    });
  });

  describe('persistEditingMode', () => {
    it('saves current editing mode to localStorage', () => {
      service.editingMode.set(true);
      service.persistEditingMode();
      expect(mockStorage.getItem(service.editingModeStorageKey)).toBe('true');
    });

    it('saves false when editing mode is off', () => {
      service.persistEditingMode();
      expect(mockStorage.getItem(service.editingModeStorageKey)).toBe('false');
    });
  });

  describe('syncFromProfile', () => {
    it('sets editing mode from profile', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        editing_mode: true,
      } as never);
      service.syncFromProfile();
      expect(service.editingMode()).toBe(true);
    });

    it('does nothing when profile is null', () => {
      service.syncFromProfile();
      expect(service.editingMode()).toBe(false);
    });

    it('handles null editing_mode in profile', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        editing_mode: null,
      } as never);
      service.syncFromProfile();
      expect(service.editingMode()).toBe(false);
    });
  });

  describe('checkAreaEditPermission', () => {
    it('returns true when canEditAsAdmin', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);

      const area = {
        id: 1,
        user_creator_id: 'other-user',
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(service.checkAreaEditPermission(area)).toBe(true);
    });

    it('returns false when not editing mode', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      const area = {
        id: 1,
        user_creator_id: 'u1',
        created_at: new Date().toISOString(),
      };
      expect(service.checkAreaEditPermission(area)).toBe(false);
    });

    it('returns false when area is null', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkAreaEditPermission(null)).toBe(false);
    });

    it('returns true when creator within one week', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);

      const recentDate = new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const area = {
        id: 1,
        user_creator_id: 'u1',
        created_at: recentDate,
      };
      expect(service.checkAreaEditPermission(area)).toBe(true);
    });

    it('returns false when creator but older than one week', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);

      const oldDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const area = {
        id: 1,
        user_creator_id: 'u1',
        created_at: oldDate,
      };
      expect(service.checkAreaEditPermission(area)).toBe(false);
    });

    it('returns true when area has no created_at (isWithinOneWeek defaults true)', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);

      const area = {
        id: 1,
        user_creator_id: 'u1',
        created_at: null,
      };
      expect(service.checkAreaEditPermission(area)).toBe(true);
    });
  });

  describe('checkCragEditPermission', () => {
    it('returns true when canEditAsAdmin', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);

      const crag = {
        id: 1,
        area_id: 10,
        user_creator_id: 'other',
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(service.checkCragEditPermission(crag as never)).toBe(true);
    });

    it('returns false when crag is null', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkCragEditPermission(null)).toBe(false);
    });
  });

  describe('checkRouteEditPermission', () => {
    it('returns true when canEditAsAdmin', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);

      const route = {
        id: 1,
        area_id: 10,
        user_creator_id: 'other',
        created_at: '2024-01-01T00:00:00Z',
      };
      expect(service.checkRouteEditPermission(route as never)).toBe(true);
    });

    it('returns false when route is null', () => {
      service.editingMode.set(true);
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkRouteEditPermission(null)).toBe(false);
    });
  });
});
