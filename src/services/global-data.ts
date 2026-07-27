import { isPlatformBrowser } from '@angular/common';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';

import { TUI_BREAKPOINT } from '@taiga-ui/core';
import {
  TUI_ENGLISH_LANGUAGE,
  TUI_FRENCH_LANGUAGE,
  TUI_GERMAN_LANGUAGE,
  TUI_ITALIAN_LANGUAGE,
  TUI_SPANISH_LANGUAGE,
  TuiLanguage,
} from '@taiga-ui/i18n';

import { TranslateService } from '@ngx-translate/core';

import { map, merge, startWith } from 'rxjs';

import { AppNotificationsService } from './app-notifications.service';
import { CacheService } from './cache.service';
import { MessagingService } from './messaging.service';
import { PushService } from './push.service';
import { SupabaseService } from './supabase.service';
import { FilterStateService } from './filter-state.service';
import { MapDataService } from './map-data.service';
import { TopoDataService } from './topo-data.service';
import { ProfileDataService } from './profile-data.service';

// Extracted services
import { AuthStateService } from './auth-state.service';
import { AudioPreferencesService } from './audio-preferences.service';
import { BreadcrumbsService } from './breadcrumbs.service';
import { EquipperService } from './equipper.service';
import { ThemeService } from './theme.service';
import { FavoritesDataService } from './favorites-data.service';
import { IndoorCentersDataService } from './indoor-centers-data.service';
import { CragRoutesDataService } from './crag-routes-data.service';
import { AdminParkingsService } from './admin-parkings.service';

import {
  AreaListItem,
  CragListItem,
  IndoorCenterDto,
  IndoorRouteWithExtras,
  Language,
  Languages,
  RouteWithExtras,
} from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';

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
 */
@Injectable({
  providedIn: 'root',
})
export class GlobalData {
  private readonly cache = inject(CacheService);
  private readonly messagingService = inject(MessagingService);
  private readonly notificationsService = inject(AppNotificationsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly push = inject(PushService);
  private readonly supabase = inject(SupabaseService);
  private breakpointService = toObservable(inject(TUI_BREAKPOINT));
  private translate = inject(TranslateService);

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

  readonly isMobile = toSignal(
    this.breakpointService.pipe(map((b) => b === 'mobile')),
    { initialValue: false },
  );

  // Loading/Status state
  readonly error: WritableSignal<string | null> = signal(null);
  readonly isNavLoading: WritableSignal<boolean> = signal(false);
  readonly showCart: WritableSignal<boolean> = signal(false);
  readonly isOffline = signal(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  // ---- Language ----
  readonly i18nTick = this.breadcrumbsService.i18nTick;
  readonly selectedLanguage: Signal<Language> = computed(
    () => this.userProfile()?.language || Languages.ES,
  );

  readonly currentLang = toSignal(
    this.translate.onLangChange.pipe(map((e) => e.lang as Language)),
    { initialValue: this.translate.currentLang as Language },
  );

  tuiLanguage: Signal<TuiLanguage> = computed(() => {
    const lang = this.selectedLanguage();
    switch (lang) {
      case Languages.ES:
        return TUI_SPANISH_LANGUAGE;
      case Languages.DE:
        return TUI_GERMAN_LANGUAGE;
      case Languages.FR:
        return TUI_FRENCH_LANGUAGE;
      case Languages.IT:
        return TUI_ITALIAN_LANGUAGE;
      default:
        return TUI_ENGLISH_LANGUAGE;
    }
  });

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
  readonly areasListResource = resource({
    params: () => ({ user: this.userProfile() }),
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) {
        return [] as AreaListItem[];
      }
      const cacheKey = CACHE_KEYS.areasList;
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          const { data, error } =
            await this.supabase.client.rpc('get_areas_list');
          if (error) {
            throw error;
          }
          return ((data as AreaListItem[]) ?? []) as AreaListItem[];
        },
        { fallbackValue: [], logTag: 'GlobalData' },
      );
    },
  });
  readonly areasList: Signal<AreaListItem[]> = computed(() => {
    const val = this.areasListResource.value();
    if (val !== undefined) return val;
    return this.cache.get<AreaListItem[]>(CACHE_KEYS.areasList, []);
  });

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
  errorMessage: WritableSignal<string | null> = signal(null);
  setError(message: string | null) {
    this.errorMessage.set(message);
  }

  private readonly langUpdateTrigger = toSignal(
    merge(
      this.translate.onLangChange,
      this.translate.onTranslationChange,
      this.translate.onDefaultLangChange,
    ).pipe(
      map(() => Date.now()),
      startWith(0),
    ),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.translate.addLangs(Object.values(Languages));

    if (isPlatformBrowser(this.platformId)) {
      const onlineHandler = () => this.isOffline.set(false);
      const offlineHandler = () => this.isOffline.set(true);

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      destroyRef.onDestroy(() => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      });
    }

    effect(() => {
      if (this.langUpdateTrigger()) {
        this.i18nTick.update((v) => v + 1);
      }
    });

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

    // Language switching logic
    effect(() => {
      const selectedLanguage = this.selectedLanguage();
      if (selectedLanguage) {
        this.translate.use(selectedLanguage).subscribe({
          error: () => {
            // Silent fail on language change
          },
        });
      }
    });

    // Sync state from user profile
    effect(() => {
      untracked(() => {
        this.themeService.syncFromProfile();
        this.authState.syncFromProfile();
        this.audioPrefs.syncFromProfile();
      });
    });

    // Automatically subscribe to push if supported
    effect(() => {
      const profile = this.userProfile();
      if (
        profile &&
        isPlatformBrowser(this.platformId) &&
        this.push.isSupported()
      ) {
        if (!this.push.isSubscribed()) {
          void this.push.subscribe();
        } else {
          void this.push.getCurrentSubscription().then((sub) => {
            if (sub) void this.push.saveSubscription(sub);
          });
        }
      }
    });

    // Refresh unread counts when user changes and setup Realtime
    effect((onCleanup) => {
      const userId = this.supabase.authUserId();
      if (userId) {
        void this.notificationsService.refreshUnreadCount();
        void this.messagingService.refreshUnreadCount();

        const nSub = this.notificationsService.watchNotifications(() => {
          void this.notificationsService.refreshUnreadCount();
        });

        const mSub = this.messagingService.watchUnreadCount(() => {
          void this.messagingService.refreshUnreadCount();
        });

        onCleanup(() => {
          nSub?.unsubscribe();
          mSub?.unsubscribe();
        });
      }
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
