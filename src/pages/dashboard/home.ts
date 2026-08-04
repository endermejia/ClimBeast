import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  resource,
  computed,
  signal,
  viewChild,
  input,
  effect,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { TuiDataList, TuiDialogService, TuiScrollbar } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { Subject, firstValueFrom } from 'rxjs';

import { AppNotificationsService } from '../../services/app-notifications.service';

import { AuthStateService } from '../../services/auth-state.service';
import { CartService } from '../../services/cart.service';
import { DesnivelService } from '../../services/desnivel.service';
import { FavoritesDataService } from '../../services/favorites-data.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FollowsService } from '../../services/follows.service';
import { LocalStorage } from '../../services/local-storage';
import { MessagingService } from '../../services/messaging.service';
import { ScrollService } from '../../services/scroll.service';
import { SupabaseService } from '../../services/supabase.service';
import { VisitedCragsService } from '../../services/visited-crags.service';

import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';

import { HomeCragsRowComponent } from '../../components/dashboard/home-crags-row';

import { HomeFilterBarComponent } from '../../components/dashboard/home-filter-bar';
import { HomeNewsGridComponent } from '../../components/dashboard/home-news-grid';

import { HomeNewsSidebarComponent } from '../../components/dashboard/home-news-sidebar';

function deduplicateFeedItems(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key =
      item.kind === 'news'
        ? `news-${item.id || item.link}`
        : `ascent-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

import {
  FilterDialog,
  FilterDialogComponent,
} from '../../components/dialogs/filter-dialog';

import {
  FeedItem,
  NewsItem,
  ORDERED_GRADE_VALUES,
  RouteAscentFeedItem,
  RouteAscentRaw,
  RouteAscentWithExtras,
  UserProfileBasicDto,
} from '../../models';

import { IndoorAscentRaw } from '../../models/indoor.model';

import {
  ActiveCrag,
  AscentWithRouteJoin,
  IndoorAscentWithRouteJoin,
} from '../../models/supabase-query.types';

import { CACHE_KEYS } from '../../constants/cache-keys';

import {
  applyCategoryFilter,
  applyGradeFilter,
  applyIndoorUserFilter,
  applyUserFilter,
  FeedFilterOptions,
} from '../../utils/feed-filters';

import { IS_BROWSER } from '../../app/is-browser';

export type HomeFeedFilter =
  | 'following'
  | 'all'
  | 'news'
  | 'favorite_areas'
  | 'favorite_crags'
  | 'favorite_routes';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    AscentsFeedComponent,
    CommonModule,
    HomeCragsRowComponent,
    HomeFilterBarComponent,
    HomeNewsGridComponent,
    HomeNewsSidebarComponent,
    TranslatePipe,
    TuiDataList,
    TuiScrollbar,
  ],
  template: `
    <div class="flex w-full max-w-[1600px] mx-auto h-full overflow-hidden">
      <!-- Main Content Area (Header + Ascents Feed) -->
      <tui-scrollbar class="flex-1 min-w-0 h-full">
        <div class="flex flex-col pb-32 px-4 sm:px-6 lg:px-8">
          <!-- Unified Sticky Header: Filter + Crags -->
          <div
            class="xl:sticky xl:top-0 z-20 bg-(--tui-background-base) flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
          >
            <!-- Filter Bar -->
            <app-home-filter-bar
              [followsLoaded]="followsLoaded()"
              [showFilterDropdown]="
                followedIds().size > 0 ||
                favoritesData.likedAreaIds().length > 0 ||
                favoritesData.likedCragIds().length > 0 ||
                favoritesData.likedRouteIds().length > 0
              "
              [feedFilterDropdown]="feedFilterDropdown"
              [feedFilter]="feedFilter()"
              [filterLabels]="filterLabels"
              [(dropdownOpen)]="dropdownOpen"
              [hasActiveFilters]="hasActiveFilters()"
              [isAdmin]="authState.isAdmin()"
              [cartTotalItems]="cart.totalItems()"
              [unreadNotificationsCount]="notificationsService.unreadCount()"
              (openFilters)="openFilters()"
              (openNotifications)="openNotifications()"
            />

            <!-- Crags Row (when not in news mode) -->
            @if (feedFilter() !== 'news') {
              <app-home-crags-row
                [followsLoaded]="followsLoaded()"
                [isLoading]="activeCragsResource.isLoading()"
                [crags]="activeCrags()"
              />
            }
          </div>

          <!-- Main Content (Feed or News) -->
          <main class="flex flex-col gap-4 min-w-0 mt-4">
            @if (feedFilter() === 'news') {
              <app-home-news-grid
                [newsLoading]="newsLoading()"
                [newsItems]="newsItems()"
                [newsHasMore]="newsHasMore()"
                [newsLoadingMore]="newsLoadingMore()"
                (loadMoreNews)="loadMoreNews()"
              />
            } @else {
              <!-- Ascents Feed -->
              <app-ascents-feed
                [ascents]="ascents()"
                [isLoading]="isLoading()"
                [hasMore]="hasMore()"
                [followedIds]="followedIds()"
                [columns]="2"
                (loadMore)="loadMore()"
                (follow)="onFollow($event)"
                (unfollow)="onUnfollow($event)"
              />
            }
          </main>
        </div>
      </tui-scrollbar>

      <!-- Right Sidebar (News) - Completely OUTSIDE the main scrollbar -->
      @if (feedFilter() !== 'news') {
        <app-home-news-sidebar
          [newsLoading]="newsLoading()"
          [newsItems]="newsItems()"
          [newsHasMore]="newsHasMore()"
          [newsLoadingMore]="newsLoadingMore()"
          (loadMoreNews)="loadMoreNews()"
        />
      }
    </div>

    <ng-template #feedFilterDropdown>
      <tui-data-list size="l">
        @for (option of filterOptions(); track option) {
          <button tuiOption new (click)="setFilter(option)">
            {{ filterLabels[option] | translate }}
          </button>
        }
      </tui-data-list>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 flex-col min-h-0',
  },
})
export class HomeComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly cart = inject(CartService);
  protected readonly favoritesData = inject(FavoritesDataService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly notificationsService = inject(AppNotificationsService);
  protected readonly messagingService = inject(MessagingService);
  protected readonly supabase = inject(SupabaseService);
  private readonly desnivelService = inject(DesnivelService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly followsService = inject(FollowsService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);
  private readonly storage = inject(LocalStorage);
  private readonly translate = inject(TranslateService);
  private readonly visitedCragsService = inject(VisitedCragsService);

  private readonly STORAGE_KEY = 'home_feed_filter';

  protected readonly scrollbar = viewChild(TuiScrollbar, { read: ElementRef });

  readonly roomId = input<string | undefined>();
  protected readonly followedIds = signal<Set<string>>(new Set());
  protected readonly followsLoaded = signal(false);

  protected readonly activeCragsResource = resource({
    loader: () => this.fetchActiveCrags(),
  });

  protected readonly activeCrags = computed(() => {
    const visited = this.visitedCragsService.visitedCrags();
    const active = this.activeCragsResource.value() ?? [];

    const merged = [...visited];
    const visitedIds = new Set(visited.map((c) => c.id));

    for (const c of active) {
      if (!visitedIds.has(c.id)) {
        merged.push(c);
      }
    }

    return merged;
  });

  protected readonly feedFilter = signal<HomeFeedFilter>(
    (this.storage.getItem(this.STORAGE_KEY) as HomeFeedFilter) || 'following',
  );

  protected readonly saveFilterEffect = effect(() => {
    const currentFilter = this.feedFilter();
    const options = this.filterOptions();
    if (!options.includes(currentFilter)) {
      this.feedFilter.set('following');
    } else {
      this.storage.setItem(this.STORAGE_KEY, currentFilter);
    }
  });
  protected dropdownOpen = signal(false);

  protected readonly filterLabels: Record<HomeFeedFilter, string> = {
    following: 'following',
    all: 'all',
    news: 'news',
    favorite_areas: 'likedAreas',
    favorite_crags: 'likedCrags',
    favorite_routes: 'likedRoutes',
  };

  protected readonly filterOptions = computed(() => {
    const options: (keyof typeof this.filterLabels)[] = [
      'following',
      'all',
      'news',
    ];
    if (this.favoritesData.likedAreaIds().length > 0) {
      options.push('favorite_areas');
    }
    if (this.favoritesData.likedCragIds().length > 0) {
      options.push('favorite_crags');
    }
    if (this.favoritesData.likedRouteIds().length > 0) {
      options.push('favorite_routes');
    }
    return options;
  });

  protected setFilter(filter: HomeFeedFilter) {
    this.feedFilter.set(filter);
    this.dropdownOpen.set(false);
  }

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.filterState.feedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.filterState.feedCategories().length > 0;
  });

  constructor() {
    this.loadFollowedIds();
    void this.loadNews();
    inject(DestroyRef).onDestroy(() => this.loadMore$.complete());

    effect(() => {
      const id = this.roomId();
      if (id && this.isBrowser) {
        void this.openChat(id);
      }
    });

    this.scrollService.scrollToTop$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.scrollToTop();
    });

    effect(() => {
      if (!this.followsLoaded()) return;

      // Track filter dependencies
      this.feedFilter();
      this.filterState.feedCategories();
      this.filterState.feedGradeRange();
      this.favoritesData.likedAreaIds();
      this.favoritesData.likedCragIds();
      this.favoritesData.likedRouteIds();
      this.filterState.feedShowIndoorAscents();

      untracked(() => {
        this.fetchVersion.set(0);
        this.resetFeed();
      });
    });

    this.loadMore$.pipe(takeUntilDestroyed()).subscribe(() => {
      void this.fetchNextPage();
    });
  }

  private resetFeed() {
    this.fetchVersion.set(this.fetchVersion() + 1);
    this.ascents.set([]);
    this.hasMore.set(true);
    this.isLoading.set(true);
    this.loadMore$.next();
  }

  private async fetchNextPage() {
    const version = this.fetchVersion();
    const filter = this.feedFilter();
    const showIndoor = this.filterState.feedShowIndoorAscents();
    const ascentCount = this.ascents().filter(
      (i) => i.kind === 'ascent',
    ).length;
    const page = Math.floor(ascentCount / 10);

    const promises: Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]>[] =
      [this.fetchAscents(page, filter)];
    if (showIndoor) {
      promises.push(this.fetchIndoorAscents(page, filter));
    }
    const results = await Promise.all(promises);
    if (this.fetchVersion() !== version) return;

    const ascents = results.flat();

    this.ascents.update((current) => {
      const merged = deduplicateFeedItems([...current, ...ascents]);
      return merged.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
    });
    this.isLoading.set(false);
  }

  private async loadFollowedIds() {
    if (!this.isBrowser) {
      return;
    }
    const cacheKey = CACHE_KEYS.followedIds;
    try {
      await this.supabase.whenReady();
      const ids = await this.followsService.getFollowedIds();
      this.followedIds.set(new Set(ids));
      this.storage.setItem(cacheKey, JSON.stringify(ids));
      if (ids.length === 0) {
        this.feedFilter.set('all');
      }
    } catch (error: unknown) {
      console.error('Error loading followed ids:', error);
      // Offline fallback: try to restore from cache
      try {
        const cached = this.storage.getItem(cacheKey);
        if (cached) {
          const ids = JSON.parse(cached) as string[];
          this.followedIds.set(new Set(ids));
        } else {
          this.feedFilter.set('all');
        }
      } catch {
        this.feedFilter.set('all');
      }
    } finally {
      this.followsLoaded.set(true);
    }
  }

  private async fetchActiveCrags(): Promise<ActiveCrag[]> {
    if (!this.isBrowser) return [];

    const cacheKey = CACHE_KEYS.activeCrags;

    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          route:routes!inner(
            crag:crags(
              id, name, slug, area:areas(slug)
            )
          )
        `,
        )
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      const cragsMap = new Map<number, ActiveCrag>();
      const typedData = data as AscentWithRouteJoin[] | null;

      typedData?.forEach((d) => {
        const route = d.route;
        const rawCrag = route?.crag;
        const c = Array.isArray(rawCrag) ? rawCrag[0] : rawCrag;
        if (c && !cragsMap.has(c.id)) {
          const rawArea = c.area;
          const area = Array.isArray(rawArea) ? rawArea[0] : rawArea;
          cragsMap.set(c.id, {
            id: c.id,
            name: c.name,
            slug: c.slug,
            area_slug: area?.slug ?? '',
          });
        }
      });

      const result = Array.from(cragsMap.values()).slice(0, 8);
      this.storage.setItem(cacheKey, JSON.stringify(result));
      return result;
    } catch (e: unknown) {
      console.warn('[Home] fetchActiveCrags error/offline, trying cache', e);
      const cached = this.storage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as ActiveCrag[];
        } catch {
          console.error('[Home] Cache parse error');
        }
      }
      return [];
    }
  }

  // Desnivel News (completely independent lifecycle & skeleton)
  protected readonly newsItems = signal<NewsItem[]>([]);
  protected readonly newsLoading = signal(true);
  protected readonly newsLoadingMore = signal(false);
  protected readonly newsHasMore = signal(true);

  // Infinite Scroll & Async Pipe for Ascents
  private readonly loadMore$ = new Subject<void>();
  private readonly fetchVersion = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly hasMore = signal(true);
  protected readonly ascents = signal<FeedItem[]>([]);

  private async loadNews(): Promise<void> {
    if (!this.isBrowser) {
      this.newsLoading.set(false);
      return;
    }
    this.newsLoading.set(true);
    try {
      const posts = await this.desnivelService.getLatestPosts(12);
      this.newsItems.set(posts);
      if (posts.length < 12) {
        this.newsHasMore.set(false);
      }
    } catch (e: unknown) {
      console.warn('[Home] loadNews error', e);
      this.newsItems.set([]);
    } finally {
      this.newsLoading.set(false);
    }
  }

  protected async loadMoreNews(): Promise<void> {
    if (this.newsLoadingMore() || !this.newsHasMore() || !this.isBrowser)
      return;
    this.newsLoadingMore.set(true);
    try {
      const lastItem = this.newsItems().slice(-1)[0];
      const beforeDate = lastItem?.date
        ? new Date(lastItem.date).toISOString()
        : undefined;
      const newPosts = await this.desnivelService.getLatestPosts(
        12,
        beforeDate,
      );
      if (newPosts.length === 0) {
        this.newsHasMore.set(false);
      } else {
        if (newPosts.length < 12) {
          this.newsHasMore.set(false);
        }
        this.newsItems.update((current) => {
          const seen = new Set(current.map((n) => n.id));
          const filtered = newPosts.filter((n) => !seen.has(n.id));
          return [...current, ...filtered];
        });
      }
    } catch (e: unknown) {
      console.warn('[Home] loadMoreNews error', e);
    } finally {
      this.newsLoadingMore.set(false);
    }
  }

  private async fetchIndoorAscents(
    page: number,
    filter: HomeFeedFilter = this.feedFilter(),
  ): Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    // Indoor queries don't support favorite_areas/favorite_crags/favorite_routes
    if (
      filter === 'favorite_crags' ||
      filter === 'favorite_routes' ||
      filter === 'favorite_areas'
    ) {
      return [];
    }

    const filterOptions: FeedFilterOptions = {
      filter,
      userId,
      categories: this.filterState.feedCategories(),
      gradeRange: this.filterState.feedGradeRange(),
      followedIds: Array.from(this.followedIds()),
      likedAreaIds: this.favoritesData.likedAreaIds(),
      likedCragIds: this.favoritesData.likedCragIds(),
      likedRouteIds: this.favoritesData.likedRouteIds(),
    };

    let query = this.supabase.client.from('indoor_ascents').select(
      `
          *,
          user:user_profiles(*),
          route:indoor_routes!inner(
            *,
            center:indoor_centers!inner(*)
          )
        `,
    );

    query = applyIndoorUserFilter(query, filterOptions);
    query = applyCategoryFilter(
      query,
      filterOptions.categories,
      'route.climbing_kind',
      false,
    );
    query = applyGradeFilter(query, filterOptions.gradeRange, 'route.grade');

    try {
      const { data: ascents, error } = await query
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(fromIdx, toIdx)
        .overrideTypes<IndoorAscentRaw[]>();

      if (error) throw error;
      if (!ascents || ascents.length === 0) return [];

      return ascents.map((a) => {
        const { route, user, ...ascentRest } = a;
        let mappedRoute: RouteAscentWithExtras['route'] = undefined;
        if (route) {
          const typedRoute = route as IndoorAscentWithRouteJoin['route'];
          const center = typedRoute?.center;
          const { center: _center, ...routeFields } = typedRoute ?? {};
          mappedRoute = {
            ...routeFields,
            crag_slug: center?.slug,
            crag_name: center?.name,
            liked: false,
            project: false,
          } as unknown as RouteAscentWithExtras['route'];
        }
        return {
          ...ascentRest,
          kind: 'ascent' as const,
          user: user
            ? { id: user.id, name: user.name, avatar: user.avatar }
            : undefined,
          route: mappedRoute,
        } as unknown as RouteAscentFeedItem;
      });
    } catch (e: unknown) {
      console.warn('[Home] fetchIndoorAscents error', e);
      return [];
    }
  }

  private async fetchAscents(
    page: number,
    filter: HomeFeedFilter = this.feedFilter(),
  ): Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    const filterOptions: FeedFilterOptions = {
      filter,
      userId,
      categories: this.filterState.feedCategories(),
      gradeRange: this.filterState.feedGradeRange(),
      followedIds: Array.from(this.followedIds()),
      likedAreaIds: this.favoritesData.likedAreaIds(),
      likedCragIds: this.favoritesData.likedCragIds(),
      likedRouteIds: this.favoritesData.likedRouteIds(),
    };

    // Check if we should proceed based on filter type
    if (filter === 'following' && filterOptions.followedIds.length === 0) {
      this.hasMore.set(false);
      return [];
    }
    if (
      filter === 'favorite_areas' &&
      filterOptions.likedAreaIds.length === 0
    ) {
      this.hasMore.set(false);
      return [];
    }
    if (
      filter === 'favorite_crags' &&
      filterOptions.likedCragIds.length === 0
    ) {
      this.hasMore.set(false);
      return [];
    }
    if (
      filter === 'favorite_routes' &&
      filterOptions.likedRouteIds.length === 0
    ) {
      this.hasMore.set(false);
      return [];
    }

    let query = this.supabase.client.from('route_ascents').select(
      `
          *,
          route:routes!inner(
            *,
            crag:crags!inner(
              *,
              area:areas!inner(slug, name)
            )
          )
        `,
    );

    query = applyUserFilter(query, filterOptions);
    query = applyCategoryFilter(
      query,
      filterOptions.categories,
      'route.climbing_kind',
      true,
    );
    query = applyGradeFilter(query, filterOptions.gradeRange, 'grade');

    const cacheKey = CACHE_KEYS.homeFeed(filter, page);

    try {
      const { data: ascents, error } = await query
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(fromIdx, toIdx)
        .overrideTypes<RouteAscentRaw[]>();

      if (error) throw error;

      if (!ascents || ascents.length === 0) {
        this.hasMore.set(false);
        return [];
      }

      if (ascents.length < size) {
        this.hasMore.set(false);
      }

      // Fetch user profiles separately (no FK between route_ascents and user_profiles)
      const userIds = [
        ...new Set(ascents.map((a) => a.user_id).filter(Boolean)),
      ];
      let profileMap = new Map<string, UserProfileBasicDto>();
      if (userIds.length > 0) {
        const { data: profiles } = await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);
        if (profiles) {
          profileMap = new Map(profiles.map((p) => [p.id, p]));
        }
      }

      const result = ascents.map((a) => {
        const { route, user_id, ...ascentRest } = a;
        let mappedRoute: RouteAscentWithExtras['route'] = undefined;
        if (route) {
          const crag = route.crag;
          const area = crag?.area;
          mappedRoute = {
            ...route,
            crag_slug: crag?.slug,
            crag_name: crag?.name,
            area_slug: area?.slug,
            area_name: area?.name,
            liked: false,
            project: false,
          };
        }
        return {
          ...ascentRest,
          user_id,
          kind: 'ascent' as const,
          user: profileMap.get(user_id) ?? undefined,
          route: mappedRoute,
        } as unknown as RouteAscentFeedItem;
      });

      this.storage.setItem(cacheKey, JSON.stringify(result));
      return result;
    } catch (e: unknown) {
      console.warn('[Home] fetchAscents error/offline, trying cache', e);
      const cached = this.storage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed || parsed.length === 0) {
            this.hasMore.set(false);
            return [];
          }
          if (parsed.length < size) {
            this.hasMore.set(false);
          }
          return parsed;
        } catch {
          console.error('[Home] Cache parse error');
        }
      }
      this.hasMore.set(false);
      return [];
    }
  }

  onFollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  onUnfollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  loadMore() {
    if (this.isBrowser && !this.isLoading() && this.hasMore()) {
      this.isLoading.set(true);
      this.loadMore$.next();
    }
  }

  async openFilters() {
    const data: FilterDialog = {
      categories: this.filterState.feedCategories(),
      gradeRange: this.filterState.feedGradeRange(),
      showCategories: true,
      showGradeRange: true,
      showShade: false,
      showIndoorAscents: this.filterState.feedShowIndoorAscents(),
    };

    const result = await firstValueFrom(
      this.dialogs.open<FilterDialog>(
        new PolymorpheusComponent(FilterDialogComponent),
        {
          label: this.translate.instant('filters'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    );

    if (!result) return;
    this.filterState.feedCategories.set(result.categories ?? []);
    if (result.gradeRange) {
      this.filterState.feedGradeRange.set(result.gradeRange);
    }
    if (result.showIndoorAscents !== undefined) {
      this.filterState.feedShowIndoorAscents.set(result.showIndoorAscents);
    }
  }

  protected openNotifications(): void {
    this.notificationsService.openNotifications();
  }

  protected async openChat(roomId?: string): Promise<void> {
    this.messagingService.openChatDialog({ roomId });

    // Clean up URL after closing
    if (this.roomId()) {
      void this.router.navigate(['/home'], { replaceUrl: true });
    }
  }

  private scrollToTop() {
    if (this.scrollbar()?.nativeElement) {
      this.scrollbar()!.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
