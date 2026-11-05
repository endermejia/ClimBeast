import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { describe, it, expect, beforeEach } from 'vitest';

import { IS_BROWSER } from '../app/is-browser';

import { MockSupabaseService } from '../testing/mock-supabase.service';
import { AuthStateService } from './auth-state.service';
import { SupabaseService } from './supabase.service';

describe('AuthStateService', () => {
  let service: AuthStateService;
  let mockSupabase: MockSupabaseService;

  beforeEach(() => {
    mockSupabase = new MockSupabaseService();

    TestBed.configureTestingModule({
      providers: [
        AuthStateService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: IS_BROWSER, useValue: true },
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    });
    service = TestBed.inject(AuthStateService);
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
    it('returns false when not admin', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.canEditAsAdmin()).toBe(false);
    });

    it('returns true when admin', () => {
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

  describe('checkAreaEditPermission', () => {
    it('returns true when canEditAsAdmin', () => {
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

    it('returns false when not creator and not admin', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      const area = {
        id: 1,
        user_creator_id: 'other-user',
        created_at: new Date().toISOString(),
      };
      expect(service.checkAreaEditPermission(area)).toBe(false);
    });

    it('returns false when area is null', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkAreaEditPermission(null)).toBe(false);
    });

    it('returns true when creator within one week', () => {
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
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkCragEditPermission(null)).toBe(false);
    });
  });

  describe('checkRouteEditPermission', () => {
    it('returns true when canEditAsAdmin', () => {
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
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: false,
      } as never);
      expect(service.checkRouteEditPermission(null)).toBe(false);
    });
  });

  describe('canEditIndoorInCenter', () => {
    it('returns false when centerId is null or empty', () => {
      expect(service.canEditIndoorInCenter(null)).toBe(false);
      expect(service.canEditIndoorInCenter('')).toBe(false);
    });

    it('returns true when user is routesetter of the center', () => {
      mockSupabase.setRoutesetterIndoorCenters(['center-123']);
      expect(service.canEditIndoorInCenter('center-123')).toBe(true);
      expect(service.canEditIndoorInCenter('center-456')).toBe(false);
    });

    it('returns true when user is center admin', () => {
      mockSupabase.setAdminIndoorCenters(['center-123']);
      expect(service.canEditIndoorInCenter('center-123')).toBe(true);
    });

    it('returns true when user is global admin', () => {
      mockSupabase.setUserProfile({
        id: 'u1',
        is_admin: true,
      } as never);
      expect(service.canEditIndoorInCenter('any-center')).toBe(true);
    });
  });

  describe('canCreateIndoorRoute', () => {
    const centerAll = {
      id: 'center-1',
      name: 'Gym All',
      permissions: { can_create_routes: 'all' },
    };
    const centerRoutesetters = {
      id: 'center-2',
      name: 'Gym Setters',
      permissions: { can_create_routes: 'routesetters' },
    };

    it('returns true for global admin regardless of center permissions', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: true } as never);
      expect(service.canCreateIndoorRoute(centerRoutesetters as never)).toBe(
        true,
      );
    });

    it('returns true for routesetter or center admin', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setRoutesetterIndoorCenters(['center-2']);
      expect(service.canCreateIndoorRoute(centerRoutesetters as never)).toBe(
        true,
      );
    });

    it('returns true for regular authenticated user when can_create_routes is all', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setSession({ user: { id: 'u1' } } as never);
      expect(service.canCreateIndoorRoute(centerAll as never)).toBe(true);
    });

    it('returns false for regular user when can_create_routes is routesetters', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setSession({ user: { id: 'u1' } } as never);
      expect(service.canCreateIndoorRoute(centerRoutesetters as never)).toBe(
        false,
      );
    });

    it('returns false when unauthenticated even if can_create_routes is all', () => {
      mockSupabase.setUserProfile(null);
      mockSupabase.setSession(null);
      expect(service.canCreateIndoorRoute(centerAll as never)).toBe(false);
    });
  });

  describe('canCreateIndoorLine', () => {
    const centerAll = {
      id: 'center-1',
      name: 'Gym All',
      permissions: { can_create_lines: 'all' },
    };
    const centerRoutesetters = {
      id: 'center-2',
      name: 'Gym Setters',
      permissions: { can_create_lines: 'routesetters' },
    };

    it('returns true for authenticated user when can_create_lines is all', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setSession({ user: { id: 'u1' } } as never);
      expect(service.canCreateIndoorLine(centerAll as never)).toBe(true);
    });

    it('returns false for regular user when can_create_lines is routesetters', () => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setSession({ user: { id: 'u1' } } as never);
      expect(service.canCreateIndoorLine(centerRoutesetters as never)).toBe(
        false,
      );
    });
  });

  describe('canEditIndoorLine', () => {
    const centerDefault = {
      id: 'center-1',
      name: 'Gym Default',
      permissions: {
        can_create_routes: 'all',
        can_create_lines: 'all',
        can_edit_lines: 'routesetters_and_creator',
      },
    };

    beforeEach(() => {
      mockSupabase.setUserProfile({ id: 'u1', is_admin: false } as never);
      mockSupabase.setSession({ user: { id: 'u1' } } as never);
    });

    it('returns true when user created the line (line.user_creator_id === currentUserId)', () => {
      const line = { user_creator_id: 'u1' };
      expect(service.canEditIndoorLine(centerDefault as never, line)).toBe(
        true,
      );
    });

    it('returns true when user created the route (line.route.user_creator_id === currentUserId)', () => {
      const line = { user_creator_id: null, route: { user_creator_id: 'u1' } };
      expect(service.canEditIndoorLine(centerDefault as never, line)).toBe(
        true,
      );
    });

    it('returns true when can_edit_lines is all', () => {
      const centerAll = {
        id: 'center-1',
        name: 'Gym All',
        permissions: { can_edit_lines: 'all' },
      };
      const line = {
        user_creator_id: 'other',
        route: { user_creator_id: 'other' },
      };
      expect(service.canEditIndoorLine(centerAll as never, line)).toBe(true);
    });

    it('returns false for other users when can_edit_lines is routesetters_and_creator', () => {
      const line = {
        user_creator_id: 'other',
        route: { user_creator_id: 'other' },
      };
      expect(service.canEditIndoorLine(centerDefault as never, line)).toBe(
        false,
      );
    });
  });
});
