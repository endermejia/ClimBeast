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

  private isWithinOneWeek(createdAt: string | null | undefined): boolean {
    if (!createdAt) return true;
    const date = new Date(createdAt);
    const now = new Date();
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - date.getTime() < oneWeekInMs;
  }

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
