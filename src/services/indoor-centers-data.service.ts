import { inject, Injectable, signal } from '@angular/core';

import {
  AmountByEveryGrade,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { CACHE_KEYS } from '../constants';

import { createCachedResource } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';

/**
 * Manages indoor centers list data with signals.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class IndoorCentersDataService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);

  readonly indoorRoutesReloadTick = signal(0);

  /**
   * Lista cacheada (stale-while-revalidate): las visitas calientes pintan la
   * lista al instante desde localStorage y la red la refresca en segundo
   * plano. `reloadTick` entra en params (fuerza recarga tras crear/editar)
   * pero no en la key de caché.
   */
  private readonly cachedIndoorCenters = createCachedResource<
    { isBrowser: boolean; reloadTick: number; userId: string | null },
    MapIndoorCenterItem[]
  >({
    params: () => ({
      isBrowser: this.isBrowser,
      reloadTick: this.indoorRoutesReloadTick(),
      userId: this.supabase.authUserId(),
    }),
    isBrowser: this.isBrowser,
    cacheKey: () => CACHE_KEYS.indoorCenters,
    fetcher: async ({ isBrowser, userId }) => {
      if (!isBrowser) {
        return [] as MapIndoorCenterItem[];
      }
      await this.supabase.whenReady();
      let query = this.supabase.client
        .from('indoor_centers')
        .select(
          '*, topos:indoor_topos(id, name), routes:indoor_routes(grade), liked:indoor_center_likes(id)',
        )
        .order('name');

      if (userId) {
        query = query.eq('liked.user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || [])
        .map((c: MapIndoorCenterRaw & { liked?: { id: string }[] }) => {
          const grades: AmountByEveryGrade = {};
          (c.routes || []).forEach((r: MapIndoorRouteRaw) => {
            const g = r.grade;
            if (g != null && g >= 0) {
              grades[g as VERTICAL_LIFE_GRADES] =
                (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
            }
          });
          const liked = (c.liked?.length ?? 0) > 0;
          return {
            ...c,
            routes_count: c.routes?.length || 0,
            grades,
            liked,
          } as MapIndoorCenterItem;
        })
        .sort((a, b) => {
          if (a.liked && !b.liked) return -1;
          if (!a.liked && b.liked) return 1;
          return a.name.localeCompare(b.name);
        });
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'IndoorCentersDataService',
  });

  readonly indoorCentersResource = this.cachedIndoorCenters.resource;
  readonly indoorCentersList = this.cachedIndoorCenters.signal;

  /**
   * Solo `true` en la primera carga real (cargando y sin valor en recurso ni
   * en caché): las visitas calientes no muestran esqueletos.
   */
  readonly indoorCentersLoading = this.cachedIndoorCenters.showSkeleton;
}
