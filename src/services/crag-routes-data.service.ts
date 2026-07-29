import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  resource,
  computed,
} from '@angular/core';

import { RouteWithExtras } from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';
import { mapRouteToExtras, RawRouteData } from '../utils/route-mapper';

import { AuthStateService } from './auth-state.service';

import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';
import { TopoDataService } from './topo-data.service';

/**
 * Manages crag routes data with caching and signals.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class CragRoutesDataService {
  private readonly cache = inject(CacheService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly topoData = inject(TopoDataService);
  private readonly authState = inject(AuthStateService);

  readonly cragRoutesResource = resource({
    params: () => {
      const crag = this.topoData.cragDetail();
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
    loader: async ({
      params: { cragId, cragSlug, filterTopos },
    }): Promise<RouteWithExtras[]> => {
      if (!cragId || !cragSlug) return [];
      if (!isPlatformBrowser(this.platformId)) return [];
      const cacheKey = CACHE_KEYS.cragRoutes(cragSlug);
      return this.cache.fetchOrCache(
        cacheKey,
        async () => {
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
        { fallbackValue: [], logTag: 'CragRoutesDataService' },
      );
    },
  });

  readonly cragRoutes = computed(() => {
    const val = this.cragRoutesResource.value();
    if (val !== undefined) return val as RouteWithExtras[];
    return this.cache.get<RouteWithExtras[]>(
      CACHE_KEYS.cragRoutes(this.topoData.selectedCragSlug() ?? ''),
      [],
    );
  });
}
