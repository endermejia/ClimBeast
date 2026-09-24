import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { IS_BROWSER } from '../../app/is-browser';

import { CacheService } from '../../services/cache.service';
import { FavoritesDataService } from '../../services/favorites-data.service';
import { FavoritesService } from '../../services/favorites.service';
import { SupabaseService } from '../../services/supabase.service';

import { AreaCardSkeletonComponent } from '../area/area-card-skeleton';
import { OutdoorRoutesTableComponent } from '../route/outdoor-routes-table';
import { EmptyStateComponent } from '../ui/empty-state';
import { PlaceCardComponent } from '../ui/place-card';

import {
  AreaListItem,
  CragListItem,
  MapIndoorCenterItem,
  RouteWithExtras,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { createCachedResource } from '../../utils';

@Component({
  selector: 'app-user-profile-likes',
  standalone: true,
  imports: [
    AreaCardSkeletonComponent,
    CommonModule,
    EmptyStateComponent,
    OutdoorRoutesTableComponent,
    PlaceCardComponent,
    TranslatePipe,
    TuiIcon,
    TuiSkeleton,
  ],
  template: `
    <div class="flex flex-col gap-8">
      <!-- Liked Areas -->
      <section class="grid gap-2">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <tui-icon icon="@tui.map-pin" />
          {{ 'likedAreas' | translate }}
        </h3>
        <div class="grid gap-4 grid-cols-1 xl:grid-cols-2">
          @if (isLoading() && !likedAreas().length) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <app-area-card-skeleton />
            }
          } @else {
            @for (area of likedAreas(); track area.id) {
              <app-place-card kind="area" [item]="area" />
            } @empty {
              <div class="col-span-full opacity-50">
                <app-empty-state icon="@tui.heart" />
              </div>
            }
          }
        </div>
      </section>

      <!-- Liked Crags -->
      <section class="grid gap-2">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <tui-icon icon="@tui.layout-grid" />
          {{ 'likedCrags' | translate }}
        </h3>
        <div class="grid gap-4 grid-cols-1 xl:grid-cols-2">
          @if (isLoading() && !likedCrags().length) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <app-area-card-skeleton />
            }
          } @else {
            @for (crag of likedCrags(); track crag.id) {
              <app-place-card kind="crag" [item]="crag" />
            } @empty {
              <div class="col-span-full opacity-50">
                <app-empty-state icon="@tui.heart" />
              </div>
            }
          }
        </div>
      </section>

      <!-- Liked Indoor Centers -->
      <section class="grid gap-2">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <tui-icon icon="@tui.dumbbell" />
          {{ 'likedIndoorCenters' | translate }}
        </h3>
        <div class="grid gap-4 grid-cols-1 xl:grid-cols-2">
          @if (isLoading() && !likedIndoorCenters().length) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <app-area-card-skeleton />
            }
          } @else {
            @for (center of likedIndoorCenters(); track center.id) {
              <app-place-card kind="indoor" [item]="center" />
            } @empty {
              <div class="col-span-full opacity-50">
                <app-empty-state icon="@tui.heart" />
              </div>
            }
          }
        </div>
      </section>

      <!-- Liked Routes -->
      <section class="grid gap-2">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <tui-icon icon="@tui.route" />
          {{ 'likedRoutes' | translate }}
        </h3>
        <div class="min-w-0">
          @if (isLoading() && !likedRoutes().length) {
            <div class="grid gap-4 grid-cols-1 xl:grid-cols-2">
              @for (_ of [1, 2, 3, 4]; track $index) {
                <div
                  class="p-6 rounded-3xl flex flex-col gap-4 border border-(--tui-border-normal)"
                >
                  <div [tuiSkeleton]="true" class="w-1/2 h-6 rounded-3xl"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-1/4 h-4 rounded-3xl opacity-60"
                  ></div>
                </div>
              }
            </div>
          } @else if (likedRoutes().length) {
            <app-outdoor-routes-table
              [data]="likedRoutes()"
              [showAdminActions]="false"
              [showLocation]="true"
              [showRowColors]="false"
            />
          } @else {
            <div class="opacity-50">
              <app-empty-state icon="@tui.heart" />
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileLikesComponent {
  userId = input.required<string>();

  private readonly cache = inject(CacheService);
  private readonly favorites = inject(FavoritesService);
  private readonly isBrowser = inject(IS_BROWSER);
  protected readonly favoritesData = inject(FavoritesDataService);
  protected readonly supabase = inject(SupabaseService);

  protected readonly isOwnProfile = computed(() => {
    const currentId = this.supabase.authUserId();
    return !!currentId && currentId === this.userId();
  });

  protected readonly likedRoutes = computed<RouteWithExtras[]>(() =>
    this.isOwnProfile()
      ? (this.favoritesData.likedRoutes() as RouteWithExtras[])
      : this.cachedLikedRoutes.signal(),
  );

  protected readonly likedCrags = computed<CragListItem[]>(() =>
    this.isOwnProfile()
      ? (this.favoritesData.likedCrags() as CragListItem[])
      : this.cachedLikedCrags.signal(),
  );

  protected readonly likedAreas = computed<AreaListItem[]>(() =>
    this.isOwnProfile()
      ? (this.favoritesData.likedAreas() as AreaListItem[])
      : this.cachedLikedAreas.signal(),
  );

  protected readonly likedIndoorCenters = computed<MapIndoorCenterItem[]>(() =>
    this.isOwnProfile()
      ? (this.favoritesData.likedIndoorCenters() as MapIndoorCenterItem[])
      : this.cachedLikedIndoorCenters.signal(),
  );

  protected readonly isLoading = computed(
    () =>
      this.cachedLikedAreas.showSkeleton() ||
      this.cachedLikedCrags.showSkeleton() ||
      this.cachedLikedIndoorCenters.showSkeleton() ||
      this.cachedLikedRoutes.showSkeleton(),
  );

  private readonly cachedLikedRoutes = createCachedResource<
    string,
    RouteWithExtras[]
  >({
    params: () => this.userId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedRoutes(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      return this.favorites.getLikedRoutes(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'UserProfileLikes',
  });

  private readonly cachedLikedCrags = createCachedResource<
    string,
    CragListItem[]
  >({
    params: () => this.userId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedCrags(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      return this.favorites.getLikedCrags(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'UserProfileLikes',
  });

  private readonly cachedLikedAreas = createCachedResource<
    string,
    AreaListItem[]
  >({
    params: () => this.userId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedAreas(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      return this.favorites.getLikedAreas(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'UserProfileLikes',
  });

  private readonly cachedLikedIndoorCenters = createCachedResource<
    string,
    MapIndoorCenterItem[]
  >({
    params: () => this.userId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) =>
      userId ? CACHE_KEYS.likedIndoorCenters(userId) : null,
    fetcher: async (userId) => {
      if (!userId) return [];
      return this.favorites.getLikedIndoorCenters(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'UserProfileLikes',
  });
}
