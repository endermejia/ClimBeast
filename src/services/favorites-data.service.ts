import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  computed,
} from '@angular/core';

import { AreaListItem, CragListItem, RouteWithExtras } from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';

import { CacheService } from './cache.service';

import { FavoritesService } from './favorites.service';
import { SupabaseService } from './supabase.service';

/**
 * Manages favorites/liked data with caching and signals.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class FavoritesDataService {
  private readonly cache = inject(CacheService);
  private readonly favorites = inject(FavoritesService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  // ---- Liked Areas ----
  readonly likedAreasResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = CACHE_KEYS.likedAreas(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedAreas(userId);
        },
        { fallbackValue: [], logTag: 'FavoritesDataService' },
      );
    },
  });

  readonly likedAreas = computed(() => {
    const val = this.likedAreasResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<AreaListItem[]>(CACHE_KEYS.likedAreas(userId), []);
  });

  readonly likedAreaIds = computed(() => this.likedAreas().map((a) => a.id));

  // ---- Liked Crags ----
  readonly likedCragsResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = CACHE_KEYS.likedCrags(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedCrags(userId);
        },
        { fallbackValue: [], logTag: 'FavoritesDataService' },
      );
    },
  });

  readonly likedCrags = computed(() => {
    const val = this.likedCragsResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<CragListItem[]>(CACHE_KEYS.likedCrags(userId), []);
  });

  readonly likedCragIds = computed(() => this.likedCrags().map((c) => c.id));

  // ---- Liked Routes ----
  readonly likedRoutesResource = resource({
    params: () => this.supabase.authUserId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      const cacheKey = CACHE_KEYS.likedRoutes(userId);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
          await this.supabase.whenReady();
          return this.favorites.getLikedRoutes(userId);
        },
        { fallbackValue: [], logTag: 'FavoritesDataService' },
      );
    },
  });

  readonly likedRoutes = computed(() => {
    const val = this.likedRoutesResource.value();
    if (val !== undefined) return val;
    const userId = this.supabase.authUserId();
    if (!userId) return [];
    return this.cache.get<RouteWithExtras[]>(
      CACHE_KEYS.likedRoutes(userId),
      [],
    );
  });

  readonly likedRouteIds = computed(() => this.likedRoutes().map((r) => r.id));
}
