import {
  inject,
  Injectable,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

import {
  ClimbingKind,
  IndoorAscentDto,
  IndoorRouteWithExtras,
  RouteAscentDto,
  TopoDetail,
  TopoListItem,
  TopoPath,
  TopoRouteWithRoute,
} from '../models';

import { CACHE_KEYS } from '../constants';

import { createCachedResource } from '../utils';

import { IS_BROWSER } from '../app/is-browser';
import { CacheService } from './cache.service';

import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class IndoorDataService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);

  selectedTopoId: WritableSignal<string | null> = signal(null);
  selectedCenterSlug: WritableSignal<string | null> = signal(null);
  selectedRouteSlug: WritableSignal<string | null> = signal(null);

  readonly centerToposResource = resource({
    params: () => this.selectedCenterSlug(),
    loader: async ({
      params: centerSlug,
    }): Promise<(TopoListItem & { crag_slug: string })[]> => {
      if (!this.isBrowser) return [];
      if (!centerSlug) return [];

      try {
        await this.supabase.whenReady();
        const { data: center } = await this.supabase.client
          .from('indoor_centers')
          .select('id')
          .eq('slug', centerSlug)
          .single();
        if (!center) return [];

        const { data, error } = await this.supabase.client
          .from('indoor_topos')
          .select('*, indoor_topo_routes ( route:indoor_routes ( grade ) )')
          .eq('center_id', center.id);

        if (error) throw error;

        return (data || []).map((t) => {
          const grades: Record<number, number> = {};
          const topoRoutes = t.indoor_topo_routes || [];
          for (const tr of topoRoutes) {
            const grade = tr.route?.grade;
            if (grade !== undefined && grade !== null) {
              grades[grade] = (grades[grade] || 0) + 1;
            }
          }
          return {
            id: t.id as string | number,
            name: t.name,
            slug: t.id,
            crag_slug: '',
            photo: t.image_url,
            grades,
            shade_afternoon: false,
            shade_change_hour: null,
            shade_morning: false,
          };
        }) as (TopoListItem & { crag_slug: string })[];
      } catch {
        return [];
      }
    },
  });

  private readonly cachedTopoDetail = createCachedResource<
    string | null,
    TopoDetail | null
  >({
    params: () => this.selectedTopoId(),
    isBrowser: this.isBrowser,
    cacheKey: (id) =>
      id && isNaN(Number(id)) ? CACHE_KEYS.topoDetail(id) : null,
    fetcher: async (id) => {
      if (!id || !isNaN(Number(id))) return null;
      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;
      return this.fetchIndoorTopo(id, userId);
    },
    cache: this.cache,
    fallbackValue: null,
    logTag: 'IndoorDataService',
  });

  readonly topoDetailResource = this.cachedTopoDetail.resource;
  readonly topoDetail: Signal<TopoDetail | null> = this.cachedTopoDetail.signal;

  readonly indoorRouteDetailResource = resource({
    params: () => ({
      centerSlug: this.selectedCenterSlug(),
      routeSlug: this.selectedRouteSlug(),
      userId: this.supabase.authUserId(),
    }),
    loader: async ({
      params: { centerSlug, routeSlug, userId },
    }): Promise<IndoorRouteWithExtras | null> => {
      if (!centerSlug || !routeSlug) return null;
      if (!this.isBrowser) return null;

      await this.supabase.whenReady();
      let query = this.supabase.client
        .from('indoor_routes')
        .select(
          `
          *,
          center:indoor_centers!inner(
            id, name, slug
          ),
          ascents:indoor_ascents(rate, type),
          own_ascent:indoor_ascents(*),
          topo_routes:indoor_topo_routes(topo:indoor_topos(id, name, legacy))
        `,
        )
        .eq('slug', routeSlug)
        .eq('center.slug', centerSlug);

      if (userId) {
        query = query.eq('own_ascent.user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('Error fetching indoor route detail', error);
        throw error;
      }

      if (!data) return null;

      const mappedData: IndoorRouteWithExtras = {
        ...data,
        center_name: data.center.name,
        center_slug: data.center.slug,
        own_ascent: (data.own_ascent as IndoorAscentDto[])?.[0] || null,
        topos: (
          data.topo_routes as {
            topo: { id: string; name: string; legacy: boolean };
          }[]
        )
          .map((tr) => tr.topo)
          .filter(Boolean),
        ascent_count:
          (data.ascents as { rate: number | null; type: string }[])?.length ||
          0,
        rating: 0,
      } as IndoorRouteWithExtras;

      return mappedData;
    },
  });

  private async fetchIndoorTopo(
    id: string,
    userId: string | undefined,
  ): Promise<TopoDetail> {
    const { data: topo, error: topoErr } = await this.supabase.client
      .from('indoor_topos')
      .select(
        `
        *,
        center: indoor_centers!inner (
          id, name, slug
        )
      `,
      )
      .eq('id', id)
      .single();
    if (topoErr) throw topoErr;

    const { data: trs, error: trsErr } = await this.supabase.client
      .from('indoor_topo_routes')
      .select(
        `
        *,
        route: indoor_routes!inner (
          id, name, slug, grade, climbing_kind, color,
          own_ascent: indoor_ascents!left (*)
        )
      `,
      )
      .eq('topo_id', id)
      .eq('route.own_ascent.user_id', userId ?? '')
      .order('number', { ascending: true });

    if (trsErr) throw trsErr;

    const topo_routes: TopoRouteWithRoute[] = [];
    const seenRouteIds = new Set<string>();

    if (trs) {
      for (const tr of trs) {
        if (!seenRouteIds.has(tr.route_id)) {
          seenRouteIds.add(tr.route_id);

          const ascents = (tr.route.own_ascent ||
            []) as unknown as RouteAscentDto[];
          ascents.sort((a, b) => {
            const isAttemptA = a.type === 'attempt';
            const isAttemptB = b.type === 'attempt';
            if (isAttemptA && !isAttemptB) return 1;
            if (!isAttemptA && isAttemptB) return -1;
            return (
              new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
          });
          const bestAscent = ascents[0] || null;

          topo_routes.push({
            topo_id: tr.topo_id,
            route_id: tr.route_id,
            number: tr.number ?? 0,
            path: tr.path as TopoPath | null,
            route: {
              id: tr.route.id,
              name: tr.route.name,
              slug: tr.route.slug,
              grade: tr.route.grade ?? 0,
              climbing_kind: (tr.route.climbing_kind ??
                'sport') as ClimbingKind,
              color: tr.route.color ?? null,
              own_ascent: bestAscent,
              project: false,
            },
          });
        }
      }
    }

    return {
      id: topo.id,
      name: topo.name,
      photo: topo.image_url,
      crag_id: 0,
      created_at: '',
      slug: '',
      shade_afternoon: false,
      shade_change_hour: null,
      shade_morning: false,
      legacy: topo.legacy,
      center_id: topo.center_id,
      topo_routes,
      crag: topo.center
        ? {
            id: 0,
            name: topo.center.name,
            slug: topo.center.slug,
            area_id: 0,
            user_creator_id: null,
            area: {
              id: 0,
              name: '',
              slug: '',
              is_public: true,
              price: 0,
              purchased: true,
            },
          }
        : undefined,
    };
  }
}
