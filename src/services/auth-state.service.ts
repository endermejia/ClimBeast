import { computed, inject, Injectable, resource } from '@angular/core';

import {
  AreaListItem,
  CragDetail,
  CragListItem,
  IndoorCenterDto,
  parseIndoorCenterPermissions,
  RouteWithExtras,
} from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';

/**
 * Manages auth state, roles, and edit permissions.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly outdoorData = inject(OutdoorDataService);

  // ---- Profile ----
  readonly userProfile = computed(() => this.supabase.userProfile());
  readonly userProfileResource = this.supabase.userProfileResource;
  readonly userAvatar = computed(() =>
    this.supabase.buildAvatarUrl(this.userProfile()?.avatar),
  );

  // ---- Roles ----
  readonly isAdmin = computed(() => !!this.userProfile()?.is_admin);
  readonly merchandisingFeature = computed(() => this.isAdmin());
  readonly canEditAsAdmin = computed(() => this.isAdmin());
  readonly isAreaAdmin = computed(() => this.adminAreas().length > 0);
  readonly isIndoorAdmin = computed(() => this.adminIndoorCenters().length > 0);

  readonly adminAreas = computed(() => this.supabase.adminAreas());
  readonly adminAreasResource = this.supabase.adminAreasResource;
  readonly adminIndoorCenters = computed(() =>
    this.supabase.adminIndoorCenters(),
  );
  readonly adminIndoorCentersResource =
    this.supabase.adminIndoorCentersResource;
  readonly routesetterIndoorCenters = computed(() =>
    this.supabase.routesetterIndoorCenters(),
  );
  readonly routesetterIndoorCentersResource =
    this.supabase.routesetterIndoorCentersResource;
  readonly isIndoorRoutesetter = computed(
    () => this.routesetterIndoorCenters().length > 0,
  );

  // ---- Pending Admin Requests ----
  readonly pendingAdminRequestsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return [] as number[];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('area_admin_requests')
        .select('area_id')
        .eq('user_id', userId);
      if (error) {
        return [] as number[];
      }
      return (data ?? []).map((r) => r.area_id);
    },
  });

  readonly pendingAdminRequestAreaIds = computed(
    () => new Set(this.pendingAdminRequestsResource.value() ?? []),
  );

  readonly pendingIndoorAdminRequestsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return [] as string[];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('indoor_center_admin_requests')
        .select('center_id')
        .eq('user_id', userId);
      if (error) {
        return [] as string[];
      }
      return (data ?? []).map((r) => r.center_id);
    },
  });

  readonly pendingIndoorAdminRequestCenterIds = computed(
    () => new Set(this.pendingIndoorAdminRequestsResource.value() ?? []),
  );

  readonly pendingIndoorRoutesetterRequestsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return [] as string[];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('indoor_center_routesetter_requests')
        .select('center_id')
        .eq('user_id', userId);
      if (error) {
        return [] as string[];
      }
      return (data ?? []).map((r) => r.center_id);
    },
  });

  readonly pendingIndoorRoutesetterRequestCenterIds = computed(
    () => new Set(this.pendingIndoorRoutesetterRequestsResource.value() ?? []),
  );

  // ---- Edit Permissions ----
  readonly canEditAsAreaAdmin = computed(() => this.isAreaAdmin());

  readonly areaAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const areas = this.adminAreas();

    const res: Record<number, boolean> = {};
    areas.forEach((id) => (res[id] = true));

    return isAdmin ? new Proxy(res, { get: () => true }) : res;
  });

  readonly indoorAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const centers = this.adminIndoorCenters();

    const res: Record<string, boolean> = {};
    centers.forEach((id) => (res[id] = true));

    return isAdmin ? new Proxy(res, { get: () => true }) : res;
  });

  readonly canCreateIndoorInCenter = (
    centerId: string | number | null | undefined,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!centerId) return false;
    const id = String(centerId);
    return (
      this.adminIndoorCenters().includes(id) ||
      this.routesetterIndoorCenters().includes(id)
    );
  };

  readonly canEditIndoorInCenter = (
    centerId: string | number | null | undefined,
  ): boolean => {
    if (!centerId) return false;
    const id = String(centerId);
    return (
      !!this.indoorAdminPermissions()[id] ||
      this.routesetterIndoorCenters().includes(id)
    );
  };

  private isIndoorCenterStaff(centerId: string): boolean {
    return (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    );
  }

  private checkIndoorCreatePermission(
    center: IndoorCenterDto | null | undefined,
    permKey: 'can_create_routes' | 'can_create_topos' | 'can_create_lines',
  ): boolean {
    if (this.isAdmin()) return true;
    if (!center) return false;
    if (this.isIndoorCenterStaff(String(center.id))) return true;
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms[permKey] === 'all' && !!this.supabase.authUserId();
  }

  private checkIndoorModifyPermission(
    center: IndoorCenterDto | null | undefined,
    permKey:
      | 'can_edit_routes'
      | 'can_archive_routes'
      | 'can_edit_topos'
      | 'can_archive_topos'
      | 'can_edit_lines',
    creatorId: string | null | undefined,
  ): boolean {
    if (this.isAdmin()) return true;
    if (!center) return false;
    if (this.isIndoorCenterStaff(String(center.id))) return true;
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (creatorId && creatorId === currentUserId) return true;
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms[permKey] === 'all';
  }

  readonly canCreateIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => this.checkIndoorCreatePermission(center, 'can_create_routes');

  readonly canEditIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
    route?: { user_creator_id?: string | null } | null,
  ): boolean =>
    this.checkIndoorModifyPermission(
      center,
      'can_edit_routes',
      route?.user_creator_id,
    );

  readonly canArchiveIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
    route?: { user_creator_id?: string | null } | null,
  ): boolean =>
    this.checkIndoorModifyPermission(
      center,
      'can_archive_routes',
      route?.user_creator_id,
    );

  readonly canCreateIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => this.checkIndoorCreatePermission(center, 'can_create_topos');

  readonly canEditIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
    topo?: { user_creator_id?: string | null } | null,
  ): boolean =>
    this.checkIndoorModifyPermission(
      center,
      'can_edit_topos',
      topo?.user_creator_id,
    );

  readonly canArchiveIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
    topo?: { user_creator_id?: string | null } | null,
  ): boolean =>
    this.checkIndoorModifyPermission(
      center,
      'can_archive_topos',
      topo?.user_creator_id,
    );

  readonly canCreateIndoorLine = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => this.checkIndoorCreatePermission(center, 'can_create_lines');

  readonly canEditIndoorLine = (
    center: IndoorCenterDto | null | undefined,
    line?: {
      user_creator_id?: string | null;
      route?: { user_creator_id?: string | null };
    } | null,
  ): boolean =>
    this.checkIndoorModifyPermission(
      center,
      'can_edit_lines',
      line?.user_creator_id || line?.route?.user_creator_id,
    );

  private checkOutdoorEditPermission(
    entity:
      | { user_creator_id?: string | null; created_at?: string | null }
      | null
      | undefined,
    areaId: number,
    direct: boolean,
  ): boolean {
    if (direct) {
      if (!entity) return false;
      if (this.isAdmin() || this.adminAreas().includes(areaId)) return true;
    } else if (this.canEditAsAdmin() || this.areaAdminPermissions()[areaId]) {
      return true;
    }
    const userId = this.userProfile()?.id;
    if (!entity || !userId) return false;
    return (
      entity.user_creator_id === userId &&
      this.isWithinOneWeek(entity.created_at)
    );
  }

  readonly checkAreaEditPermission = (
    area:
      | AreaListItem
      | {
          id: number;
          user_creator_id?: string | null;
          created_at?: string | null;
        }
      | null
      | undefined,
  ): boolean => this.checkOutdoorEditPermission(area, area?.id ?? -1, false);

  readonly isAreaAdminOf = (areaId: number | null | undefined): boolean => {
    if (this.isAdmin()) return true;
    if (areaId === null || areaId === undefined) return false;
    return this.adminAreas().includes(areaId);
  };

  readonly isIndoorAdminOf = (
    centerId: string | number | null | undefined,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!centerId) return false;
    return this.adminIndoorCenters().includes(String(centerId));
  };

  readonly checkAreaEditPermissionDirect = (
    area:
      | AreaListItem
      | {
          id: number;
          user_creator_id?: string | null;
          created_at?: string | null;
        }
      | null
      | undefined,
  ): boolean => this.checkOutdoorEditPermission(area, area?.id ?? -1, true);

  readonly checkCragEditPermission = (
    crag: CragListItem | CragDetail | null | undefined,
  ): boolean =>
    this.checkOutdoorEditPermission(crag, crag?.area_id ?? -1, false);

  readonly checkCragEditPermissionDirect = (
    crag:
      | CragListItem
      | CragDetail
      | {
          id: number;
          area_id?: number | null;
          user_creator_id?: string | null;
          created_at?: string | null;
        }
      | null
      | undefined,
  ): boolean =>
    this.checkOutdoorEditPermission(crag, crag?.area_id ?? -1, true);

  readonly canEditArea = computed(() =>
    this.checkAreaEditPermission(this.outdoorData.selectedArea()),
  );
  readonly canEditCrag = computed(() =>
    this.checkCragEditPermission(this.outdoorData.cragDetail()),
  );
  readonly canEditRoute = computed(() =>
    this.checkRouteEditPermission(this.outdoorData.routeDetail()),
  );

  readonly checkRouteEditPermission = (
    route: RouteWithExtras | null | undefined,
  ): boolean =>
    this.checkOutdoorEditPermission(route, route?.area_id ?? -1, false);

  readonly checkRouteEditPermissionDirect = (
    route: RouteWithExtras | null | undefined,
  ): boolean =>
    this.checkOutdoorEditPermission(route, route?.area_id ?? -1, true);

  readonly isWithinOneWeek = (
    createdAt: string | null | undefined,
  ): boolean => {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - date.getTime() < oneWeekInMs;
  };
}
