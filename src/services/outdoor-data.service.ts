import {
  computed,
  inject,
  Injectable,
  resource,
  signal,
  Signal,
  WritableSignal,
} from '@angular/core';

import {
  AmountByEveryGrade,
  AreaListItem,
  CragDetail,
  CragListItem,
  CragListRpcRow,
  CragWithJoins,
  RouteAscentWithExtras,
  RouteWithExtras,
  TopoDetail,
  TopoListItem,
  TopoPath,
  TopoRouteWithRoute,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { CACHE_KEYS } from '../constants';

import {
  createCachedResource,
  mapCragToDetail,
  mapRouteToExtras,
  RawRouteData,
} from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class OutdoorDataService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);

  selectedAreaSlug: WritableSignal<string | null> = signal(null);
  selectedCragSlug: WritableSignal<string | null> = signal(null);
  selectedTopoId: WritableSignal<string | null> = signal(null);
  selectedRouteSlug: WritableSignal<string | null> = signal(null);

  readonly topoPhotoVersion: WritableSignal<number> = signal(0);

  private readonly cachedAreas = createCachedResource<void, AreaListItem[]>({
    isBrowser: this.isBrowser,
    cacheKey: () => CACHE_KEYS.areasList,
    fetcher: async () => {
      const client = await this.supabase.getClient();
      const { data, error } = await client.rpc('get_areas_list');
      if (error) {
        throw error;
      }
      return ((data as AreaListItem[]) ?? []) as AreaListItem[];
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'OutdoorDataService',
  });

  readonly areasListResource = this.cachedAreas.resource;
  readonly areasList: Signal<AreaListItem[]> = this.cachedAreas.signal;

  readonly selectedArea: Signal<AreaListItem | null> = computed(() => {
    const slug = this.selectedAreaSlug();
    if (!slug) return null;
    return this.areasList().find((a) => a.slug === slug) ?? null;
  });

  /** List of sectors/crags for the selected area. */
  private readonly cachedCrags = createCachedResource<
    string | null,
    CragListItem[]
  >({
    params: () => this.selectedAreaSlug(),
    isBrowser: this.isBrowser,
    cacheKey: (areaSlug) => (areaSlug ? CACHE_KEYS.cragsList(areaSlug) : null),
    fetcher: async (areaSlug) => {
      if (!areaSlug) return [];
      const client = await this.supabase.getClient();
      const { data, error } = await client
        .rpc('get_crags_list')
        .eq('area_slug', areaSlug);

      if (error) {
        throw error;
      }
      return (
        ((data as CragListRpcRow[] | null)?.map((c) => ({
          ...c,
          grades: c.grades as AmountByEveryGrade,
          topos: c.topos as {
            id: number;
            name: string;
            slug: string;
          }[],
        })) as CragListItem[]) ?? []
      );
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'OutdoorDataService',
  });

  readonly cragsListResource = this.cachedCrags.resource;
  readonly cragsList: Signal<CragListItem[]> = this.cachedCrags.signal;

  readonly selectedCrag: Signal<CragListItem | null> = computed(() => {
    const slug = this.selectedCragSlug();
    if (!slug) return null;
    return this.cragsList().find((c) => c.slug === slug) ?? null;
  });

  /** List of topos for the selected area. */
  private readonly cachedAreaTopos = createCachedResource<
    string | null,
    (TopoListItem & { crag_slug: string })[]
  >({
    params: () => this.selectedAreaSlug(),
    isBrowser: this.isBrowser,
    cacheKey: (areaSlug) => (areaSlug ? CACHE_KEYS.areaTopos(areaSlug) : null),
    fetcher: async (areaSlug) => {
      if (!areaSlug) return [];
      const client = await this.supabase.getClient();
      const { data, error } = await client
        .from('topos')
        .select(
          '*, crags!inner(slug, areas!inner(slug)), topo_routes(route_id, route:routes(grade))',
        )
        .eq('crags.areas.slug', areaSlug);

      if (error) {
        throw error;
      }

      return (data || []).map((t) => {
        const grades: AmountByEveryGrade = {};
        (t.topo_routes || []).forEach((tr) => {
          const g = tr.route?.grade;
          if (g != null && g >= 0) {
            grades[g as VERTICAL_LIFE_GRADES] =
              (grades[g as VERTICAL_LIFE_GRADES] ?? 0) + 1;
          }
        });

        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          crag_slug: t.crags?.slug || '',
          grades,
          photo: t.photo,
          shade_morning: t.shade_morning,
          shade_afternoon: t.shade_afternoon,
          shade_change_hour: t.shade_change_hour,
          route_ids: (t.topo_routes || []).map(
            (tr: { route_id: number }) => tr.route_id,
          ),
        };
      });
    },
    cache: this.cache,
    fallbackValue: [],
    logTag: 'OutdoorDataService',
  });

  readonly areaToposResource = this.cachedAreaTopos.resource;
  readonly areaTopos: Signal<(TopoListItem & { crag_slug: string })[]> =
    this.cachedAreaTopos.signal;

  /** Topo detail for selected topo ID. */
  private readonly cachedTopoDetail = createCachedResource<
    string | null,
    TopoDetail | null
  >({
    params: () => this.selectedTopoId(),
    isBrowser: this.isBrowser,
    cacheKey: (id) =>
      id && !isNaN(Number(id)) ? CACHE_KEYS.topoDetail(id) : null,
    fetcher: async (id) => {
      if (!id) return null;
      const topoId = Number(id);
      if (isNaN(topoId)) return null;

      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;
      return this.fetchOutdoorTopo(topoId, userId);
    },
    cache: this.cache,
    fallbackValue: null,
    logTag: 'OutdoorDataService',
  });

  readonly topoDetailResource = this.cachedTopoDetail.resource;
  readonly topoDetail: Signal<TopoDetail | null> = this.cachedTopoDetail.signal;

  /** Crag detail for selected crag + area slug. */
  private readonly cachedCragDetail = createCachedResource<
    { cragSlug: string | null; areaSlug: string | null },
    CragDetail | null
  >({
    params: () => ({
      cragSlug: this.selectedCragSlug(),
      areaSlug: this.selectedAreaSlug(),
    }),
    isBrowser: this.isBrowser,
    cacheKey: ({ cragSlug, areaSlug }) =>
      cragSlug && areaSlug ? CACHE_KEYS.cragDetail(areaSlug, cragSlug) : null,
    fetcher: async ({ cragSlug, areaSlug }) => {
      if (!cragSlug || !areaSlug) return null;
      const client = await this.supabase.getClient();
      const userId = this.supabase.authUser()?.id;
      let query = client
        .from('crags')
        .select(
          `
          *,
          eight_anu_sector_slugs,
          liked:crag_likes(id),
          area: areas!inner (
            id, name, slug, eight_anu_crag_slugs,
            is_public, price, stripe_account_id,
            purchased:area_purchases(id)
          ),
          crag_parkings (
            parking: parkings (*)
          ),
           topos (
             *,
             topo_routes (
               route_id,
               route: routes (
                 grade
               )
             )
           )
        `,
        )
        .eq('slug', cragSlug)
        .eq('area.slug', areaSlug);

      if (userId) {
        query = query.eq('liked.user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) {
        throw error;
      }

      return mapCragToDetail(data as CragWithJoins);
    },
    cache: this.cache,
    fallbackValue: null,
    logTag: 'OutdoorDataService',
  });

  readonly cragDetailResource = this.cachedCragDetail.resource;
  readonly cragDetail: Signal<CragDetail | null> = this.cachedCragDetail.signal;

  /** Route detail for selected route slug. */
  private readonly cachedRouteDetail = createCachedResource<
    {
      cragId: number | undefined;
      routeSlug: string | null;
      userId: string | null;
    },
    RouteWithExtras | null
  >({
    params: () => ({
      cragId: this.cragDetail()?.id,
      routeSlug: this.selectedRouteSlug(),
      userId: this.supabase.authUserId(),
    }),
    isBrowser: this.isBrowser,
    cacheKey: ({ routeSlug, userId }) =>
      routeSlug ? CACHE_KEYS.routeDetail(routeSlug, userId) : null,
    fetcher: async ({ cragId, routeSlug, userId }) => {
      if (!cragId || !routeSlug) return null;
      const client = await this.supabase.getClient();
      let query = client
        .from('routes')
        .select(
          `
          *,
          liked:route_likes(id),
          project:route_projects(id),
          crag:crags(
            id,
            name,
            slug,
            area:areas(id, name, slug)
          ),
          ascents:route_ascents(rate, type),
          own_ascent:route_ascents(*),
          topo_routes(topo:topos(id, name, slug))
        `,
        )
        .eq('crag_id', cragId)
        .eq('slug', routeSlug);

      if (userId) {
        query = query
          .eq('own_ascent.user_id', userId)
          .eq('project.user_id', userId)
          .eq('liked.user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) {
        throw error;
      }

      return {
        ...mapRouteToExtras(data as RawRouteData, {
          areaIdSource: 'crag.area.id',
          includeTopos: true,
        }),
        key: `${cragId}:${routeSlug}`,
      } as RouteWithExtras & { area_id?: number; key: string };
    },
    cache: this.cache,
    fallbackValue: null,
    logTag: 'OutdoorDataService',
  });

  readonly routeDetailResource = this.cachedRouteDetail.resource;
  readonly routeDetail: Signal<RouteWithExtras | null> =
    this.cachedRouteDetail.signal;

  readonly routeAscentsResource = resource({
    params: () => ({
      routeId: this.routeDetail()?.id,
      userId: this.supabase.authUserId(),
      route: this.routeDetail() || undefined,
    }),
    loader: async ({
      params,
    }): Promise<{ items: RouteAscentWithExtras[]; total: number }> => {
      const { routeId, route } = params;
      if (!routeId) return { items: [], total: 0 };
      if (!this.isBrowser) return { items: [], total: 0 };
      try {
        const client = await this.supabase.getClient();

        const { data, error, count } = await client
          .from('route_ascents')
          .select('*', { count: 'exact' })
          .eq('route_id', routeId)
          .order('date', { ascending: false })
          .order('id', { ascending: false });

        if (error) {
          return { items: [], total: 0 };
        }

        const ascents = data ?? [];
        if (ascents.length === 0) {
          return { items: [], total: 0 };
        }

        const userIds = [...new Set(ascents.map((a) => a.user_id))].filter(
          (id): id is string => !!id,
        );

        const { data: profiles } = await client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

        const items = ascents.map((a) => ({
          ...a,
          user: profileMap.get(a.user_id),
          route: route || undefined,
        })) as RouteAscentWithExtras[];

        return {
          items,
          total: count ?? 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },
  });

  private async fetchOutdoorTopo(
    id: number,
    userId: string | undefined,
  ): Promise<TopoDetail> {
    const client = await this.supabase.getClient();
    const { data, error } = await client
      .from('topos')
      .select(
        `
        *,
        crag: crags!inner (
          id, name, slug, area_id, user_creator_id,
          area: areas!inner (
            id, name, slug, is_public, price, purchased:area_purchases(id)
          )
        ),
        topo_routes (
          *,
          route: routes (
            id, name, slug, grade, height, climbing_kind,
            own_ascent: route_ascents!left (*),
            project: route_projects!left (id)
          )
        )
      `,
      )
      .eq('id', id)
      .eq('topo_routes.route.own_ascent.user_id', userId ?? '')
      .eq('topo_routes.route.project.user_id', userId ?? '')
      .order('number', {
        referencedTable: 'topo_routes',
        ascending: true,
      })
      .single();

    if (error) {
      throw error;
    }

    const topo_routes: TopoRouteWithRoute[] = [];
    const seenRouteIds = new Set<number>();

    if (data.topo_routes) {
      for (const tr of data.topo_routes) {
        if (!seenRouteIds.has(tr.route_id)) {
          seenRouteIds.add(tr.route_id);

          const ascents = tr.route.own_ascent || [];
          const bestAscent =
            ascents.sort((a, b) => {
              const isAttemptA = a.type === 'attempt';
              const isAttemptB = b.type === 'attempt';
              if (isAttemptA && !isAttemptB) return 1;
              if (!isAttemptA && isAttemptB) return -1;
              return 0;
            })[0] || null;

          topo_routes.push({
            topo_id: tr.topo_id,
            route_id: tr.route_id,
            number: tr.number,
            path: tr.path as TopoPath,
            route: {
              ...tr.route,
              own_ascent: bestAscent,
              project: !!tr.route.project?.[0],
            },
          });
        }
      }
    }

    return {
      ...data,
      topo_routes,
      crag: data.crag
        ? {
            ...data.crag,
            area: {
              ...data.crag.area,
              purchased: (data.crag.area.purchased?.length ?? 0) > 0,
            },
          }
        : undefined,
    } as TopoDetail;
  }
}
