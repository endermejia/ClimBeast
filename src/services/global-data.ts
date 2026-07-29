import {
  computed,
  effect,
  inject,
  Injectable,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

import { TUI_BREAKPOINT } from '@taiga-ui/core';

import { map } from 'rxjs';

import {
  AreaListItem,
  CragListItem,
  IndoorCenterDto,
  IndoorRouteWithExtras,
  Language,
  RouteWithExtras,
} from '../models';

import { AdminParkingsService } from './admin-parkings.service';
import { AppNotificationsService } from './app-notifications.service';
import { AudioPreferencesService } from './audio-preferences.service';
import { AuthStateService } from './auth-state.service';
import { BreadcrumbsService } from './breadcrumbs.service';
import { CragRoutesDataService } from './crag-routes-data.service';

// Extracted services
import { EquipperService } from './equipper.service';
import { FavoritesDataService } from './favorites-data.service';
import { FilterStateService } from './filter-state.service';
import { IndoorCentersDataService } from './indoor-centers-data.service';
import { LanguageService } from './language.service';
import { MapDataService } from './map-data.service';
import { MessagingService } from './messaging.service';
import { OnlineStatusService } from './online-status.service';
import { ProfileDataService } from './profile-data.service';
import { PushSubscriptionService } from './push-subscription.service';
import { RealtimeService } from './realtime.service';
import { SupabaseService } from './supabase.service';
import { ThemeService } from './theme.service';

import { TopoDataService } from './topo-data.service';

/**
 * GlobalData is now a thin facade that delegates to domain services.
 * It maintains full backward compatibility while the domain services
 * are being adopted by consumers.
 *
 * New code should inject the domain services directly:
 * - AuthStateService for auth roles and permissions
 * - ThemeService for theme management
 * - AudioPreferencesService for sound preferences
 * - BreadcrumbsService for breadcrumb generation
 * - EquipperService for equipper data
 * - FilterStateService for filter state
 * - MapDataService for map data
 * - TopoDataService for topo/crag/route data
 * - ProfileDataService for profile and ascents data
 * - LanguageService for language management
 * - OnlineStatusService for online/offline state
 * - RealtimeService for realtime subscriptions
 * - PushSubscriptionService for push notification subscriptions
 */
@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private readonly messagingService = inject(MessagingService);
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly supabase = inject(SupabaseService);
  private breakpointService = toObservable(inject(TUI_BREAKPOINT));

  // Domain services
  readonly filterState = inject(FilterStateService);
  readonly mapData = inject(MapDataService);
  readonly topoData = inject(TopoDataService);
  readonly profileData = inject(ProfileDataService);

  // Extracted services (new)
  readonly authState = inject(AuthStateService);
  readonly audioPrefs = inject(AudioPreferencesService);
  readonly breadcrumbsService = inject(BreadcrumbsService);
  readonly equipperService = inject(EquipperService);
  readonly themeService = inject(ThemeService);
  readonly favoritesData = inject(FavoritesDataService);
  readonly indoorCentersData = inject(IndoorCentersDataService);
  readonly cragRoutesData = inject(CragRoutesDataService);
  readonly adminParkingsData = inject(AdminParkingsService);
  readonly languageService = inject(LanguageService);
  readonly onlineStatus = inject(OnlineStatusService);
  readonly realtime = inject(RealtimeService);
  readonly pushSubscription = inject(PushSubscriptionService);

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  // Loading/Status state
  readonly isNavLoading: WritableSignal<boolean> = signal(false);
  readonly showCart: WritableSignal<boolean> = signal(false);
  readonly isOffline = this.onlineStatus.isOffline;

  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  // ---- Language (delegated to LanguageService) ----
  readonly i18nTick = this.languageService.i18nTick;
  readonly selectedLanguage: Signal<Language> =
    this.languageService.selectedLanguage;
  readonly currentLang = this.languageService.currentLang;
  readonly tuiLanguage = this.languageService.tuiLanguage;

  // ---- Theme (delegated to ThemeService) ----
  readonly theme = this.themeService.theme;
  readonly selectedTheme = this.themeService.selectedTheme;

  setTheme = this.themeService.setTheme.bind(this.themeService);

  // ---- Breadcrumbs (delegated to BreadcrumbsService) ----
  readonly breadcrumbs = this.breadcrumbsService.breadcrumbs;
  readonly slicedBreadcrumbs = this.breadcrumbsService.slicedBreadcrumbs;

  // Notifications and messages
  readonly unreadNotificationsCount = this.notificationsService.unreadCount;
  readonly unreadMessagesCount = this.messagingService.unreadMessagesCount;

  // ---- Auth (delegated to AuthStateService) ----
  readonly userProfile = this.authState.userProfile;
  readonly editingMode = this.authState.editingMode;
  readonly isAdmin = this.authState.isAdmin;
  readonly merchandisingFeature = this.authState.merchandisingFeature;
  readonly indoorFeature = this.authState.indoorFeature;
  readonly canEditAsAdmin = this.authState.canEditAsAdmin;
  readonly isAreaAdmin = this.authState.isAreaAdmin;
  readonly isIndoorAdmin = this.authState.isIndoorAdmin;

  readonly adminAreas = this.authState.adminAreas;
  readonly adminIndoorCenters = this.authState.adminIndoorCenters;

  readonly pendingAdminRequestsResource =
    this.authState.pendingAdminRequestsResource;
  readonly pendingAdminRequestAreaIds =
    this.authState.pendingAdminRequestAreaIds;

  readonly canEditAsAreaAdmin = this.authState.canEditAsAreaAdmin;

  readonly areaAdminPermissions = this.authState.areaAdminPermissions;
  readonly indoorAdminPermissions = this.authState.indoorAdminPermissions;
  readonly canCreateIndoorInCenter = this.authState.canCreateIndoorInCenter;

  readonly checkAreaEditPermission = this.authState.checkAreaEditPermission;
  readonly checkCragEditPermission = this.authState.checkCragEditPermission;
  readonly checkRouteEditPermission = this.authState.checkRouteEditPermission;

  readonly canEditArea = computed(() =>
    this.checkAreaEditPermission(this.selectedArea()),
  );
  readonly canEditCrag = computed(() =>
    this.checkCragEditPermission(this.cragDetail()),
  );
  readonly canEditRoute = computed(() =>
    this.checkRouteEditPermission(this.routeDetail()),
  );

  readonly canEditCragRoutes = computed(() => {
    const res: Record<number, boolean> = {};
    const routes = this.cragRoutes() ?? [];
    routes.forEach((r: RouteWithExtras) => {
      res[r.id] = this.checkRouteEditPermission(r);
    });
    return res;
  });

  readonly userAvatar = computed(() =>
    this.supabase.buildAvatarUrl(this.userProfile()?.avatar),
  );

  // ---- Audio Preferences (delegated to AudioPreferencesService) ----
  readonly messageSoundEnabled = this.audioPrefs.messageSoundEnabled;
  readonly notificationSoundEnabled = this.audioPrefs.notificationSoundEnabled;

  // ---- Delegated to MapDataService ----
  readonly mapActive = this.mapData.mapActive;
  mapBounds = this.mapData.mapBounds;
  readonly mapResource = this.mapData.mapResource;
  mapItemsOnViewport = this.mapData.mapItemsOnViewport;
  selectedMapCragItem = this.mapData.selectedMapCragItem;
  selectedMapParkingItem = this.mapData.selectedMapParkingItem;
  readonly parkingsMapResource = this.mapData.parkingsMapResource;
  readonly areasMapResource = this.mapData.areasMapResource;

  // ---- Delegated to FilterStateService ----
  areaListGradeRange = this.filterState.areaListGradeRange;
  areaListCategories = this.filterState.areaListCategories;
  areaListShade = this.filterState.areaListShade;
  areaListShowIndoor = this.filterState.areaListShowIndoor;
  areaListShowOutdoor = this.filterState.areaListShowOutdoor;

  feedGradeRange = this.filterState.feedGradeRange;
  feedCategories = this.filterState.feedCategories;
  feedShowIndoorAscents = this.filterState.feedShowIndoorAscents;

  // ---- Indoor Centers ----
  selectedIndoorCenter: WritableSignal<IndoorCenterDto | null> =
    this.breadcrumbsService.selectedIndoorCenter;
  selectedIndoorRoute: WritableSignal<IndoorRouteWithExtras | null> =
    this.breadcrumbsService.selectedIndoorRoute;
  indoorRoutesReloadTick: WritableSignal<number> = signal(0);

  // ---- Liked / Favorites (delegated to FavoritesDataService) ----
  readonly likedAreasResource = this.favoritesData.likedAreasResource;
  readonly likedCragsResource = this.favoritesData.likedCragsResource;
  readonly likedRoutesResource = this.favoritesData.likedRoutesResource;
  readonly likedAreas = this.favoritesData.likedAreas;
  readonly likedCrags = this.favoritesData.likedCrags;
  readonly likedRoutes = this.favoritesData.likedRoutes;
  readonly likedAreaIds = this.favoritesData.likedAreaIds;
  readonly likedCragIds = this.favoritesData.likedCragIds;
  readonly likedRouteIds = this.favoritesData.likedRouteIds;

  // ---- Equippers (delegated to EquipperService) ----
  selectedEquipperId = this.equipperService.selectedEquipperId;
  readonly equipperDetailResource = this.equipperService.equipperDetailResource;
  readonly equipperRoutesResource = this.equipperService.equipperRoutesResource;
  readonly equipperIndoorRoutesResource =
    this.equipperService.equipperIndoorRoutesResource;

  // ---- Delegated to TopoDataService ----
  selectedAreaSlug = this.topoData.selectedAreaSlug;
  selectedArea: Signal<AreaListItem | null> = computed(() => {
    const slug = this.selectedAreaSlug();
    return slug ? this.areasList().find((a) => a.slug === slug) || null : null;
  });
  readonly areasListResource = this.topoData.areasListResource;
  readonly areasList = this.topoData.areasList;

  // ---- Indoor Centers (delegated to IndoorCentersDataService) ----
  readonly indoorCentersResource = this.indoorCentersData.indoorCentersResource;
  readonly indoorCentersList = this.indoorCentersData.indoorCentersList;

  selectedCragSlug = this.topoData.selectedCragSlug;
  selectedCrag: Signal<CragListItem | null> = computed(() => {
    const slug = this.selectedCragSlug();
    if (!slug) return null;
    const list = this.cragsList();
    return list.find((c) => c.slug === slug) ?? null;
  });
  readonly cragsListResource = this.topoData.cragsListResource;
  readonly cragsList = this.topoData.cragsList;

  selectedTopoId = this.topoData.selectedTopoId;
  selectedCenterSlug = this.topoData.selectedCenterSlug;

  readonly areaToposResource = this.topoData.areaToposResource;
  readonly areaTopos = this.topoData.areaTopos;

  readonly topoDetailResource = this.topoData.topoDetailResource;
  readonly topoDetail = this.topoData.topoDetail;

  readonly cragDetailResource = this.topoData.cragDetailResource;
  readonly cragDetail = this.topoData.cragDetail;

  // ---- Crag Routes (delegated to CragRoutesDataService) ----
  readonly cragRoutesResource = this.cragRoutesData.cragRoutesResource;
  readonly cragRoutes = this.cragRoutesData.cragRoutes;

  // ---- Delegated to ProfileDataService ----
  selectedRouteSlug = this.topoData.selectedRouteSlug;
  profileUserId = this.profileData.profileUserId;
  profileActiveTab = this.profileData.profileActiveTab;

  readonly userProjectsResource = this.profileData.userProjectsResource;
  readonly userProjects = this.profileData.userProjects;

  readonly firstAscentYearResource = this.profileData.firstAscentYearResource;
  readonly effectiveStartingClimbingYear =
    this.profileData.effectiveStartingClimbingYear;

  readonly ascentsPage = this.profileData.ascentsPage;
  readonly ascentsSize = this.profileData.ascentsSize;
  readonly ascentsDateFilter = this.profileData.ascentsDateFilter;
  readonly ascentsQuery = this.profileData.ascentsQuery;
  readonly ascentsSort = this.profileData.ascentsSort;

  readonly userAscentsResource = this.profileData.userAscentsResource;
  readonly userTotalAscentsCountResource =
    this.profileData.userTotalAscentsCountResource;

  readonly routeDetailResource = this.topoData.routeDetailResource;
  readonly routeDetail = this.topoData.routeDetail;

  readonly routeAscentsResource = this.topoData.routeAscentsResource;

  // ---- Admin Parkings (delegated to AdminParkingsService) ----
  readonly adminParkingsResource = this.adminParkingsData.adminParkingsResource;

  // ---- Error state for interceptor ----
  error: WritableSignal<string | null> = signal(null);
  setError(message: string | null) {
    this.error.set(message);
  }

  constructor() {
    // Hydrate state from services
    this.authState.hydrateEditingMode();
    this.audioPrefs.hydrate();
    this.mapData.hydrateMapBounds();

    // Persist state to localStorage via effects
    effect(() => {
      this.authState.persistEditingMode();
    });

    effect(() => {
      this.mapData.persistMapBounds();
    });

    effect(() => {
      this.audioPrefs.persistMessageSound();
    });

    effect(() => {
      this.audioPrefs.persistNotificationSound();
    });

    // Sync state from user profile
    effect(() => {
      untracked(() => {
        this.themeService.syncFromProfile();
        this.authState.syncFromProfile();
        this.audioPrefs.syncFromProfile();
      });
    });

    // Sync indoor feature flag with MapDataService so indoor centers are fetched
    effect(() => {
      this.mapData.setIndoorFeature(this.indoorFeature());
    });
  }

  resetDataByPage(
    page:
      | 'explore'
      | 'area-list'
      | 'area'
      | 'crag'
      | 'topo'
      | 'route'
      | 'home'
      | 'profile'
      | 'equipper',
  ): void {
    this.profileData.resetPagination();
    switch (page) {
      case 'explore': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        this.selectedMapCragItem.set(null);
        break;
      }
      case 'home':
      case 'profile':
      case 'equipper': {
        this.selectedAreaSlug.set(null);
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        if (page === 'home' || page === 'profile') {
          this.profileActiveTab.set(0);
        }
        break;
      }
      case 'area': {
        this.selectedCragSlug.set(null);
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'crag': {
        this.selectedRouteSlug.set(null);
        this.selectedTopoId.set(null);
        break;
      }
      case 'topo': {
        this.selectedRouteSlug.set(null);
        break;
      }
      case 'route': {
        this.selectedTopoId.set(null);
        break;
      }
    }
  }
}
