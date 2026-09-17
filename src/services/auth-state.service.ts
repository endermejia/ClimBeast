import {
  computed,
  effect,
  inject,
  Injectable,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';

import {
  AreaListItem,
  CragDetail,
  CragListItem,
  IndoorCenterDto,
  parseIndoorCenterPermissions,
  RouteWithExtras,
} from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { LocalStorage } from './local-storage';
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
  private readonly localStorage = inject(LocalStorage);
  private readonly outdoorData = inject(OutdoorDataService);

  readonly editingModeStorageKey = 'editing_mode_v2';

  // ---- Profile ----
  readonly userProfile = computed(() => this.supabase.userProfile());
  readonly userProfileResource = this.supabase.userProfileResource;
  readonly userAvatar = computed(() =>
    this.supabase.buildAvatarUrl(this.userProfile()?.avatar),
  );
  readonly editingMode: WritableSignal<boolean> = signal(
    this.isBrowser
      ? this.localStorage.getItem(this.editingModeStorageKey) === 'true'
      : false,
  );

  // Persist editingMode to localStorage whenever it changes
  protected readonly _persistEditingModeEffect = effect(() => {
    this.editingMode();
    if (this.isBrowser) {
      this.persistEditingMode();
    }
  });

  // Sync editingMode from userProfile when profile loads/updates
  protected readonly _syncProfileEditingModeEffect = effect(() => {
    const profile = this.userProfile();
    if (
      profile &&
      profile.editing_mode !== null &&
      profile.editing_mode !== undefined
    ) {
      this.editingMode.set(!!profile.editing_mode);
    }
  });

  // ---- Roles ----
  readonly isAdmin = computed(() => !!this.userProfile()?.is_admin);
  readonly merchandisingFeature = computed(() => this.isAdmin());
  readonly canEditAsAdmin = computed(
    () => this.editingMode() && this.isAdmin(),
  );
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
  readonly canEditAsAreaAdmin = computed(
    () => this.editingMode() && this.isAreaAdmin(),
  );

  readonly areaAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const isEditing = this.editingMode();
    const areas = this.adminAreas();

    const res: Record<number, boolean> = {};
    if (isEditing) {
      areas.forEach((id) => (res[id] = true));
    }

    return isAdmin ? new Proxy(res, { get: () => true }) : res;
  });

  readonly indoorAdminPermissions = computed(() => {
    const isAdmin = this.canEditAsAdmin();
    const isEditing = this.editingMode();
    const centers = this.adminIndoorCenters();

    const res: Record<string, boolean> = {};
    if (isEditing) {
      centers.forEach((id) => (res[id] = true));
    }

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

  readonly canCreateIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_create_routes === 'all' && !!this.supabase.authUserId();
  };

  readonly canEditIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
    route?: { user_creator_id?: string | null } | null,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (route?.user_creator_id && route.user_creator_id === currentUserId) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_edit_routes === 'all';
  };

  readonly canArchiveIndoorRoute = (
    center: IndoorCenterDto | null | undefined,
    route?: { user_creator_id?: string | null } | null,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (route?.user_creator_id && route.user_creator_id === currentUserId) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_archive_routes === 'all';
  };

  readonly canCreateIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_create_topos === 'all' && !!this.supabase.authUserId();
  };

  readonly canEditIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
    topo?: { user_creator_id?: string | null } | null,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (topo?.user_creator_id && topo.user_creator_id === currentUserId) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_edit_topos === 'all';
  };

  readonly canArchiveIndoorTopo = (
    center: IndoorCenterDto | null | undefined,
    topo?: { user_creator_id?: string | null } | null,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (topo?.user_creator_id && topo.user_creator_id === currentUserId) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_archive_topos === 'all';
  };

  readonly canCreateIndoorLine = (
    center: IndoorCenterDto | null | undefined,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_create_lines === 'all' && !!this.supabase.authUserId();
  };

  readonly canEditIndoorLine = (
    center: IndoorCenterDto | null | undefined,
    line?: { user_creator_id?: string | null } | null,
  ): boolean => {
    if (this.isAdmin()) return true;
    if (!center) return false;
    const centerId = String(center.id);
    if (
      this.adminIndoorCenters().includes(centerId) ||
      this.routesetterIndoorCenters().includes(centerId)
    ) {
      return true;
    }
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) return false;
    if (line?.user_creator_id && line.user_creator_id === currentUserId) {
      return true;
    }
    const perms = parseIndoorCenterPermissions(center.permissions);
    return perms.can_edit_lines === 'all';
  };

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
  ): boolean => {
    if (this.canEditAsAdmin() || this.areaAdminPermissions()[area?.id ?? -1])
      return true;
    const userId = this.userProfile()?.id;
    if (!area || !userId || !this.editingMode()) return false;
    const isCreator = area.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(area.created_at);
  };

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
  ): boolean => {
    if (!area) return false;
    if (this.isAdmin() || this.adminAreas().includes(area.id)) return true;
    const userId = this.userProfile()?.id;
    if (!userId) return false;
    const isCreator = area.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(area.created_at);
  };

  readonly checkCragEditPermission = (
    crag: CragListItem | CragDetail | null | undefined,
  ): boolean => {
    if (
      this.canEditAsAdmin() ||
      this.areaAdminPermissions()[crag?.area_id ?? -1]
    )
      return true;
    const userId = this.userProfile()?.id;
    if (!crag || !userId || !this.editingMode()) return false;
    const isCreator = crag.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(crag.created_at);
  };

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
  ): boolean => {
    if (!crag) return false;
    const areaId = crag.area_id ?? -1;
    if (this.isAdmin() || this.adminAreas().includes(areaId)) return true;
    const userId = this.userProfile()?.id;
    if (!userId) return false;
    const isCreator = crag.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(crag.created_at);
  };

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
  ): boolean => {
    if (
      this.canEditAsAdmin() ||
      this.areaAdminPermissions()[route?.area_id ?? -1]
    )
      return true;
    const userId = this.userProfile()?.id;
    if (!route || !userId || !this.editingMode()) return false;
    const isCreator = route.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(route.created_at);
  };

  readonly checkRouteEditPermissionDirect = (
    route: RouteWithExtras | null | undefined,
  ): boolean => {
    if (!route) return false;
    const areaId = route.area_id ?? -1;
    if (this.isAdmin() || this.adminAreas().includes(areaId)) return true;
    const userId = this.userProfile()?.id;
    if (!userId) return false;
    const isCreator = route.user_creator_id === userId;
    return isCreator && this.isWithinOneWeek(route.created_at);
  };

  readonly isWithinOneWeek = (
    createdAt: string | null | undefined,
  ): boolean => {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - date.getTime() < oneWeekInMs;
  };

  // ---- Persistence ----
  hydrateEditingMode(): void {
    try {
      const raw = this.localStorage.getItem(this.editingModeStorageKey);
      if (raw) {
        this.editingMode.set(raw === 'true');
      }
    } catch {
      // Silent fail
    }
  }

  persistEditingMode(): void {
    this.localStorage.setItem(
      this.editingModeStorageKey,
      String(this.editingMode()),
    );
  }

  syncFromProfile(): void {
    const profile = this.userProfile();
    if (!profile) return;

    if (profile.editing_mode !== null) {
      this.editingMode.set(!!profile.editing_mode);
    }
  }
}
