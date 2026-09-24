import { computed, inject, Injectable, Signal } from '@angular/core';

import {
  AreaListItem,
  CragListItem,
  MapIndoorCenterItem,
  RouteWithExtras,
} from '../models';

import { CACHE_KEYS } from '../constants';
import { createCachedResource } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

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
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  // ---- Liked Areas ----
  private readonly cachedLikedAreas = createCachedResource<
    string | null,
    AreaListItem[]
  >({
    params: () => this.supabase.authUserId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedAreas(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      await this.supabase.whenReady();
      return this.favorites.getLikedAreas(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'FavoritesDataService',
  });

  readonly likedAreasResource = this.cachedLikedAreas.resource;
  readonly likedAreas: Signal<AreaListItem[]> = this.cachedLikedAreas.signal;
  readonly likedAreaIds = computed(() => this.likedAreas().map((a) => a.id));

  // ---- Liked Crags ----
  private readonly cachedLikedCrags = createCachedResource<
    string | null,
    CragListItem[]
  >({
    params: () => this.supabase.authUserId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedCrags(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      await this.supabase.whenReady();
      return this.favorites.getLikedCrags(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'FavoritesDataService',
  });

  readonly likedCragsResource = this.cachedLikedCrags.resource;
  readonly likedCrags: Signal<CragListItem[]> = this.cachedLikedCrags.signal;
  readonly likedCragIds = computed(() => this.likedCrags().map((c) => c.id));

  // ---- Liked Indoor Centers ----
  private readonly cachedLikedIndoorCenters = createCachedResource<
    string | null,
    MapIndoorCenterItem[]
  >({
    params: () => this.supabase.authUserId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) =>
      userId ? CACHE_KEYS.likedIndoorCenters(userId) : null,
    fetcher: async (userId) => {
      if (!userId) return [];
      await this.supabase.whenReady();
      return this.favorites.getLikedIndoorCenters(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'FavoritesDataService',
  });

  readonly likedIndoorCentersResource = this.cachedLikedIndoorCenters.resource;
  readonly likedIndoorCenters: Signal<MapIndoorCenterItem[]> =
    this.cachedLikedIndoorCenters.signal;
  readonly likedIndoorCenterIds = computed(() =>
    this.likedIndoorCenters().map((c) => c.id),
  );

  // ---- Liked Routes ----
  private readonly cachedLikedRoutes = createCachedResource<
    string | null,
    RouteWithExtras[]
  >({
    params: () => this.supabase.authUserId(),
    isBrowser: this.isBrowser,
    cacheKey: (userId) => (userId ? CACHE_KEYS.likedRoutes(userId) : null),
    fetcher: async (userId) => {
      if (!userId) return [];
      await this.supabase.whenReady();
      return this.favorites.getLikedRoutes(userId);
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'FavoritesDataService',
  });

  readonly likedRoutesResource = this.cachedLikedRoutes.resource;
  readonly likedRoutes: Signal<RouteWithExtras[]> =
    this.cachedLikedRoutes.signal;
  readonly likedRouteIds = computed(() => this.likedRoutes().map((r) => r.id));
}
