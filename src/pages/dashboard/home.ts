import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  PLATFORM_ID,
  resource,
  computed,
  signal,
  viewChild,
  input,
  effect,
  untracked,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadgeNotification,
  TuiBadgedContent,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { Subject, firstValueFrom } from 'rxjs';

import { DesnivelService } from '../../services/desnivel.service';
import { FollowsService } from '../../services/follows.service';
import { GlobalData } from '../../services/global-data';
import { LocalStorage } from '../../services/local-storage';
import { ScrollService } from '../../services/scroll.service';
import { SupabaseService } from '../../services/supabase.service';
import { VisitedCragsService } from '../../services/visited-crags.service';
import { CartService } from '../../services/cart.service';
import { CACHE_KEYS } from '../../constants/cache-keys';

import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';
import { DropdownButtonComponent } from '../../components/ui/dropdown-button';
import { NotificationsDialogComponent } from '../../components/dialogs/notifications-dialog';
import {
  ChatDialogComponent,
  ChatDialogData,
} from '../../components/dialogs/chat-dialog';
import {
  FilterDialog,
  FilterDialogComponent,
} from '../../components/dialogs/filter-dialog';

import {
  FeedItem,
  ORDERED_GRADE_VALUES,
  RouteAscentFeedItem,
  RouteAscentRaw,
  RouteAscentWithExtras,
  UserProfileBasicDto,
} from '../../models';

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

import { IndoorAscentRaw } from '../../models/indoor.model';
import {
  ActiveCrag,
  AscentWithRouteJoin,
  IndoorAscentWithRouteJoin,
} from '../../models/supabase-query.types';
import {
  applyCategoryFilter,
  applyGradeFilter,
  applyIndoorUserFilter,
  applyUserFilter,
  FeedFilterOptions,
} from '../../utils/feed-filters';

export type HomeFeedFilter =
  | 'following'
  | 'all'
  | 'favorite_areas'
  | 'favorite_crags'
  | 'favorite_routes';

@Component({
  selector: 'app-home',
  imports: [
    AscentsFeedComponent,
    CommonModule,
    DropdownButtonComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="flex flex-col gap-4 max-w-5xl mx-auto w-full pb-32 pt-2">
        <div class="px-4 flex flex-col gap-4 relative">
          <!-- Filter Segmented -->
          <div class="flex justify-between items-center gap-2">
            <!-- Left Side: Select and Filter -->
            <div class="flex items-center gap-2">
              @if (!followsLoaded()) {
                <div
                  [tuiSkeleton]="true"
                  class="w-32 h-10 rounded-full opacity-60"
                ></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-10 h-10 rounded-full opacity-60"
                ></div>
              } @else {
                @if (
                  followedIds().size > 0 ||
                  global.likedAreaIds().length > 0 ||
                  global.likedCragIds().length > 0 ||
                  global.likedRouteIds().length > 0
                ) {
                  <app-dropdown-button
                    appearance="flat-grayscale"
                    size="xl"
                    [content]="feedFilterDropdown"
                    [(open)]="dropdownOpen"
                  >
                    {{ filterLabels[feedFilter()] | translate }}
                  </app-dropdown-button>
                }
                <tui-badged-content [style.--tui-radius.%]="50">
                  @if (hasActiveFilters()) {
                    <tui-badge-notification
                      tuiAppearance="accent"
                      size="s"
                      tuiSlot="top"
                    />
                  }
                  <button
                    tuiIconButton
                    size="m"
                    appearance="action-grayscale"
                    iconStart="@tui.sliders-horizontal"
                    (click.zoneless)="openFilters()"
                    [attr.aria-label]="'filters' | translate"
                    title="Filters"
                  >
                    <span class="tui-sr-only">{{ 'filters' | translate }}</span>
                  </button>
                </tui-badged-content>
              }
            </div>

            @if (!followsLoaded()) {
              <div
                [tuiSkeleton]="true"
                class="w-10 h-10 rounded-full opacity-60 mt-1"
              ></div>
            } @else {
              <div class="flex items-center gap-2">
                @if (global.isAdmin()) {
                  <tui-badged-content [style.--tui-radius.%]="50">
                    @if (cart.totalItems(); as totalItems) {
                      <tui-badge-notification
                        tuiAppearance="accent"
                        size="s"
                        tuiSlot="top"
                      >
                        {{ totalItems }}
                      </tui-badge-notification>
                    }
                    <button
                      tuiIconButton
                      size="m"
                      appearance="action-grayscale"
                      iconStart="@tui.shopping-bag"
                      [routerLink]="['/merchandising']"
                      [attr.aria-label]="'nav.merchandising' | translate"
                      title="Shop"
                    >
                      <span class="tui-sr-only">{{
                        'nav.merchandising' | translate
                      }}</span>
                    </button>
                  </tui-badged-content>
                }
                <tui-badged-content [style.--tui-radius.%]="50">
                  @if (
                    global.unreadNotificationsCount();
                    as unreadNotifications
                  ) {
                    <tui-badge-notification
                      tuiAppearance="accent"
                      size="s"
                      tuiSlot="top"
                    >
                      {{ unreadNotifications }}
                    </tui-badge-notification>
                  }
                  <button
                    tuiIconButton
                    size="m"
                    appearance="action-grayscale"
                    iconStart="@tui.heart"
                    (click.zoneless)="openNotifications()"
                    [attr.aria-label]="'notifications' | translate"
                    title="Notifications"
                  >
                    <span class="tui-sr-only">{{
                      'notifications' | translate
                    }}</span>
                  </button>
                </tui-badged-content>
              </div>
            }
          </div>
          <!-- Crags -->
          @if (!followsLoaded() || activeCragsResource.isLoading()) {
            <div class="flex flex-col gap-2 mt-2">
              <div
                [tuiSkeleton]="true"
                class="w-24 h-4 rounded-full opacity-40 ml-1"
              ></div>
              <div
                class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
              >
                @for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
                  <div
                    [tuiSkeleton]="true"
                    class="flex-none w-28 h-11 rounded-2xl opacity-30"
                  ></div>
                }
              </div>
            </div>
          } @else if (activeCrags(); as crags) {
            @if (crags.length > 0) {
              <div class="flex flex-col gap-2 mt-2">
                <span class="text-xs font-bold opacity-60 uppercase px-1">
                  {{ 'crags' | translate }}
                </span>
                <div
                  class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
                >
                  @for (c of crags; track c.id) {
                    <a
                      [routerLink]="['/area', c.area_slug, c.slug]"
                      tuiAppearance="textfield"
                      class="flex-none p-3 rounded-2xl"
                    >
                      <span class="whitespace-nowrap font-bold text-sm">{{
                        c.name
                      }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          }

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
        </div>
      </div>
    </tui-scrollbar>

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
  protected readonly global = inject(GlobalData);
  protected readonly cart = inject(CartService);
  protected readonly supabase = inject(SupabaseService);
  private readonly desnivelService = inject(DesnivelService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly followsService = inject(FollowsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
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
    favorite_areas: 'likedAreas',
    favorite_crags: 'likedCrags',
    favorite_routes: 'likedRoutes',
  };

  protected readonly filterOptions = computed(() => {
    const options: (keyof typeof this.filterLabels)[] = ['following', 'all'];
    if (this.global.likedAreaIds().length > 0) {
      options.push('favorite_areas');
    }
    if (this.global.likedCragIds().length > 0) {
      options.push('favorite_crags');
    }
    if (this.global.likedRouteIds().length > 0) {
      options.push('favorite_routes');
    }
    return options;
  });

  protected setFilter(filter: HomeFeedFilter) {
    this.feedFilter.set(filter);
    this.dropdownOpen.set(false);
  }

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.global.feedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.global.feedCategories().length > 0;
  });

  constructor() {
    this.loadFollowedIds();
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
      this.global.feedCategories();
      this.global.feedGradeRange();
      this.global.likedAreaIds();
      this.global.likedCragIds();
      this.global.likedRouteIds();
      this.global.feedShowIndoorAscents();

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
    const showIndoor = this.global.feedShowIndoorAscents();
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
    let newItems: FeedItem[] = ascents;

    if (filter === 'all') {
      const beforeDate =
        page > 0
          ? (() => {
              const lastItem = this.ascents().slice(-1)[0];
              return lastItem?.date
                ? new Date(lastItem.date).toISOString()
                : undefined;
            })()
          : undefined;
      const news = await this.desnivelService.getLatestPosts(5, beforeDate);
      newItems = [...ascents, ...news];
    }

    if (this.fetchVersion() !== version) return;

    this.ascents.update((current) => {
      const merged = deduplicateFeedItems([...current, ...newItems]);
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

  // Infinite Scroll & Async Pipe for Ascents
  private readonly loadMore$ = new Subject<void>();
  private readonly fetchVersion = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly hasMore = signal(true);
  protected readonly ascents = signal<FeedItem[]>([]);

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
      categories: this.global.feedCategories(),
      gradeRange: this.global.feedGradeRange(),
      followedIds: Array.from(this.followedIds()),
      likedAreaIds: this.global.likedAreaIds(),
      likedCragIds: this.global.likedCragIds(),
      likedRouteIds: this.global.likedRouteIds(),
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
      categories: this.global.feedCategories(),
      gradeRange: this.global.feedGradeRange(),
      followedIds: Array.from(this.followedIds()),
      likedAreaIds: this.global.likedAreaIds(),
      likedCragIds: this.global.likedCragIds(),
      likedRouteIds: this.global.likedRouteIds(),
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
      categories: this.global.feedCategories(),
      gradeRange: this.global.feedGradeRange(),
      showCategories: true,
      showGradeRange: true,
      showShade: false,
      showIndoorAscents: this.global.feedShowIndoorAscents(),
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
    this.global.feedCategories.set(result.categories ?? []);
    if (result.gradeRange) {
      this.global.feedGradeRange.set(result.gradeRange);
    }
    if (result.showIndoorAscents !== undefined) {
      this.global.feedShowIndoorAscents.set(result.showIndoorAscents);
    }
  }

  protected openNotifications(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  protected async openChat(roomId?: string): Promise<void> {
    const data: ChatDialogData = { roomId };

    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
        data,
      }),
      { defaultValue: undefined },
    );

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
