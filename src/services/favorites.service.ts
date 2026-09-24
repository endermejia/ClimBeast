import { inject, Injectable } from '@angular/core';

import {
  AmountByEveryGrade,
  AreaListItem,
  AreaListRpcRow,
  CragListItem,
  CragListRpcRow,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  RouteWithExtras,
  RouteWithJoins,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { mapRouteToExtras, RawRouteData } from '../utils/route-mapper';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly supabase = inject(SupabaseService);
  private readonly isBrowser = inject(IS_BROWSER);

  async getLikedAreas(userId: string): Promise<AreaListItem[]> {
    if (!this.isBrowser) return [];

    const { data: areaLikes } = await this.supabase.client
      .from('area_likes')
      .select('area_id')
      .eq('user_id', userId);

    const areaIds = areaLikes?.map((a) => a.area_id) || [];
    if (!areaIds.length) return [];

    const { data: likedAreas, error } = await this.supabase.client
      .rpc('get_areas_list')
      .in('id', areaIds);

    if (error) {
      console.error('[FavoritesService] getLikedAreas error', error);
      return [];
    }

    const { data: purchases } = await this.supabase.client
      .from('area_purchases')
      .select('area_id')
      .eq('user_id', userId);

    const purchasedIds = new Set(purchases?.map((p) => p.area_id) || []);

    return (likedAreas || [])
      .filter((a) => !purchasedIds.has(a.id))
      .map((a) => ({
        ...(a as unknown as AreaListRpcRow),
        grades: (a as unknown as AreaListRpcRow).grades as AmountByEveryGrade,
        liked: true,
      })) as unknown as AreaListItem[];
  }

  async getLikedCrags(userId: string): Promise<CragListItem[]> {
    if (!this.isBrowser) return [];

    const { data: cragLikes } = await this.supabase.client
      .from('crag_likes')
      .select('crag_id')
      .eq('user_id', userId);

    const cragIds = cragLikes?.map((c) => c.crag_id) || [];
    if (!cragIds.length) return [];

    const { data: likedCrags, error } = await this.supabase.client
      .rpc('get_crags_list')
      .in('id', cragIds);

    if (error) {
      console.error('[FavoritesService] getLikedCrags error', error);
      return [];
    }

    return (likedCrags || []).map((c) => ({
      ...(c as CragListRpcRow),
      grades: (c as CragListRpcRow).grades as AmountByEveryGrade,
      topos: (c as CragListRpcRow).topos as {
        id: number;
        name: string;
        slug: string;
      }[],
      liked: true,
    })) as CragListItem[];
  }

  async getLikedRoutes(userId: string): Promise<RouteWithExtras[]> {
    if (!this.isBrowser) return [];

    const { data: routeLikes } = await this.supabase.client
      .from('route_likes')
      .select('route_id')
      .eq('user_id', userId);

    const routeIds = routeLikes?.map((r) => r.route_id) || [];
    if (!routeIds.length) return [];

    const currentUserId = this.supabase.authUserId();
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
          area:areas(slug, name)
        )
      `,
      )
      .in('id', routeIds);

    if (currentUserId) {
      query = query
        .eq('own_ascent.user_id', currentUserId)
        .eq('project.user_id', currentUserId)
        .eq('liked.user_id', currentUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[FavoritesService] getLikedRoutes error', error);
      return [];
    }

    const routes = data as RouteWithJoins[];

    return routes.map((r) =>
      mapRouteToExtras(r as RawRouteData, {
        areaIdSource: 'crag.area.id',
        includeEquippers: true,
        includeTopos: true,
      }),
    );
  }

  async getLikedIndoorCenters(userId: string): Promise<MapIndoorCenterItem[]> {
    if (!this.isBrowser) return [];

    const { data: centerLikes } = await this.supabase.client
      .from('indoor_center_likes')
      .select('center_id')
      .eq('user_id', userId);

    const centerIds = centerLikes?.map((c) => c.center_id) || [];
    if (!centerIds.length) return [];

    const { data, error } = await this.supabase.client
      .from('indoor_centers')
      .select('*, topos:indoor_topos(id, name), routes:indoor_routes(grade)')
      .in('id', centerIds)
      .order('name');

    if (error) {
      console.error('[FavoritesService] getLikedIndoorCenters error', error);
      return [];
    }

    return (data || []).map((c: MapIndoorCenterRaw) => {
      const grades: AmountByEveryGrade = {};
      (c.routes || []).forEach((r: MapIndoorRouteRaw) => {
        const g = r.grade;
        if (g != null && g >= 0) {
          grades[g as VERTICAL_LIFE_GRADES] =
            (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
        }
      });
      return {
        ...c,
        routes_count: c.routes?.length || 0,
        grades,
        liked: true,
      } as MapIndoorCenterItem;
    });
  }
}
