import { inject, Injectable, Signal } from '@angular/core';

import { RouteWithExtras } from '../models';

import { CACHE_KEYS } from '../constants';
import { createCachedResource, mapRouteToExtras, RawRouteData } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { AuthStateService } from './auth-state.service';

import { CacheService } from './cache.service';
import { OutdoorDataService } from './outdoor-data.service';

import { SupabaseService } from './supabase.service';

/**
 * Manages crag routes data with caching and signals.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class CragRoutesDataService {
  private readonly cache = inject(CacheService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly authState = inject(AuthStateService);

  private readonly cachedCragRoutes = createCachedResource<
    { cragId?: number; cragSlug?: string; filterTopos: boolean },
    RouteWithExtras[]
  >({
    params: () => {
      const crag = this.outdoorData.cragDetail();
      const hasAccess = crag
        ? crag.is_public ||
          crag.purchased ||
          this.authState.canEditAsAdmin() ||
          this.authState.areaAdminPermissions()[crag.area_id]
        : false;
      return {
        cragId: crag?.id,
        cragSlug: crag?.slug,
        filterTopos: crag
          ? !crag.is_public &&
            (crag.price === null || crag.price === 0) &&
            !hasAccess
          : false,
      };
    },
    isBrowser: this.isBrowser,
    cacheKey: ({ cragSlug }) =>
      cragSlug ? CACHE_KEYS.cragRoutes(cragSlug) : null,
    fetcher: async ({ cragId, filterTopos }) => {
      if (!cragId) return [];
      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;
      let query = this.supabase.client
        .from('routes')
        .select(
          `
          *,
          liked:route_likes(id),
          project:route_projects(id),
          ascents:route_ascents(rate, type),
          own_ascent:route_ascents(*),
          topo_routes(topo:topos(id, name, slug)),
          route_equippers(equipper:equippers(*)),
          crag:crags(
            slug,
            name,
            area_id,
            area:areas(slug, name)
          )
        `,
        )
        .eq('crag_id', cragId);

      if (userId) {
        query = query
          .eq('own_ascent.user_id', userId)
          .eq('project.user_id', userId)
          .eq('liked.user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (
        data.map((r) =>
          mapRouteToExtras(r as RawRouteData, {
            areaIdSource: 'crag.area_id',
            ratingFallback: filterTopos ? null : 0,
            includeEquippers: true,
            includeTopos: true,
            filterTopos,
          }),
        ) ?? []
      );
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'CragRoutesDataService',
  });

  readonly cragRoutesResource = this.cachedCragRoutes.resource;
  readonly cragRoutes: Signal<RouteWithExtras[]> = this.cachedCragRoutes.signal;
}
