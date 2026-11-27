import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { CacheService } from '../services/cache.service';
import { CragRoutesDataService } from '../services/crag-routes-data.service';
import { EquipperService } from '../services/equipper.service';
import { FavoritesDataService } from '../services/favorites-data.service';
import { OutdoorDataService } from '../services/outdoor-data.service';
import { ProfileDataService } from '../services/profile-data.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';

import { RouteFormComponent } from '../components/forms/route-form';

import { RouteUnifyComponent } from '../components/forms/route-unify';

import type {
  EquipperDto,
  EquipperWithAvatar,
  Json,
  RouteDto,
  RouteInsertDto,
  RouteSearchResult,
  RouteSimpleRow,
  RouteUpdateDto,
  RouteWithExtras,
} from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';

import {
  hasTopoPath,
  mapRouteToExtras,
  normalizeNameStrict,
  RawRouteData,
  slugify,
} from '../utils';

import { IS_BROWSER } from '../app/is-browser';

export interface RouteSimple {
  id: number;
  name: string;
  slug?: string;
  crag_id: number;
  crag: {
    name: string;
    slug?: string;
    area_id: number;
    area_slug?: string;
    area_name?: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly favoritesData = inject(FavoritesDataService);
  private readonly profileData = inject(ProfileDataService);
  private readonly cragRoutesData = inject(CragRoutesDataService);
  private readonly equipperService = inject(EquipperService);
  private readonly cache = inject(CacheService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  openRouteForm(data: {
    cragId?: number;
    areaId?: number;
    routeData?: {
      id?: number;
      crag_id?: number;
      name: string;
      slug?: string;
      grade?: number;
      climbing_kind?: string;
      height?: number | null;
      eight_anu_route_slugs?: string[] | null;
    };
  }): Promise<string | boolean | null> {
    const isEdit = !!data.routeData?.id;
    const oldSlug = data.routeData?.slug;
    return firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(RouteFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'routes.editTitle' : 'routes.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.cragRoutesData.cragRoutesResource.reload();
        this.outdoorData.routeDetailResource.reload();
        this.equipperService.equipperRoutesResource.reload();

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          const areaSlug = this.outdoorData.selectedAreaSlug();
          const cragSlug = this.outdoorData.selectedCragSlug();
          if (
            areaSlug &&
            cragSlug &&
            this.outdoorData.selectedRouteSlug() === oldSlug
          ) {
            void this.router.navigate(['/area', areaSlug, cragSlug, result]);
          }
        }
      }
      return result;
    });
  }

  openUnifyRoutes(routes?: Pick<RouteDto, 'id' | 'name'>[]): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(RouteUnifyComponent),
        {
          label: this.translate.instant('routes.unifyTitle'),
          size: 'm',
          data: { candidates: routes },
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.cragRoutesData.cragRoutesResource.reload();
        this.equipperService.equipperRoutesResource.reload();
      }
      return result;
    });
  }

  async getRoutesByAreaSimple(areaId: number): Promise<RouteSimple[]> {
    if (!this.isBrowser) return [];

    const cacheKey = CACHE_KEYS.routesSimpleArea(areaId);
    return this.cache.fetchOrCache(
      cacheKey,
      async () => {
        await this.supabase.whenReady();

        let allRoutes: RouteSimple[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await this.supabase.client
            .from('routes')
            .select('id, name, crag_id, crag:crags!inner(name, area_id)')
            .eq('crag.area_id', areaId)
            .range(from, from + step - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allRoutes = [
              ...allRoutes,
              ...(data as RouteSimpleRow[]).map((r) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                crag_id: r.crag_id,
                crag: r.crag
                  ? {
                      name: r.crag.name,
                      slug: r.crag.slug,
                      area_id: r.crag.area_id,
                    }
                  : null,
              })),
            ];
            if (data.length < step) {
              hasMore = false;
            } else {
              from += step;
            }
          } else {
            hasMore = false;
          }
        }

        return allRoutes;
      },
      { fallbackValue: [], logTag: 'RoutesService' },
    );
  }

  async getRoutesByAreaWithDetails(
    areaId: number,
    options?: { filterTopos?: boolean },
  ): Promise<RouteWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const userId = this.supabase.authUserId();
    const filterTopos = options?.filterTopos ?? false;

    let allRoutes: RouteWithExtras[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          `
          *,
          liked:route_likes(id, user_id),
          project:route_projects(id, user_id),
          ascents:route_ascents(rate, type),
          own_ascent:route_ascents(*),
          topo_routes(path, topo:topos(id, name, slug)),
          route_equippers(equipper:equippers(*)),
          crag:crags!inner(id, name, slug, area_id, area:areas(id, name, slug))
        `,
        )
        .eq('crag.area_id', areaId)
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getRoutesByAreaWithDetails error',
          error,
        );
        break;
      }

      if (data && data.length > 0) {
        const mapped = data.map((r) => {
          const userOwnAscents = userId
            ? (r.own_ascent ?? []).filter((a) => a.user_id === userId)
            : [];
          const userLiked = userId
            ? (r.liked ?? []).filter((l) => l.user_id === userId)
            : [];
          const userProject = userId
            ? (r.project ?? []).filter((pr) => pr.user_id === userId)
            : [];

          return mapRouteToExtras(
            {
              ...r,
              own_ascent: userOwnAscents,
              liked: userLiked,
              project: userProject,
            } as RawRouteData,
            {
              areaIdSource: 'crag.area_id',
              ratingFallback: filterTopos ? null : 0,
              includeEquippers: true,
              includeTopos: true,
              filterTopos,
            },
          );
        });
        allRoutes = [...allRoutes, ...mapped];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    return allRoutes;
  }

  async getAreasWithDuplicateRoutes(): Promise<
    { id: number; name: string; slug: string }[]
  > {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const areasWithDupes = new Map<
      number,
      { id: number; name: string; slug: string }
    >();
    const groups = new Map<string, number>(); // key: areaId-normalizedName, value: count

    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select('name, crag:crags!inner(area:areas!inner(id, name, slug))')
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getAreasWithDuplicateRoutes error',
          error,
        );
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      for (const item of data) {
        const area = item.crag.area;
        const name = item.name || '';
        if (name.toUpperCase().trim() === 'N.N.') continue;

        const key = `${area.id}-${normalizeNameStrict(name)}`;
        const count = (groups.get(key) ?? 0) + 1;
        groups.set(key, count);

        if (count === 2) {
          areasWithDupes.set(area.id, area);
        }
      }

      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    }

    return Array.from(areasWithDupes.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  async getAllDuplicateRoutesGroupedByArea(): Promise<
    {
      id: number;
      name: string;
      slug: string;
      duplicateGroups: RouteSimple[][];
    }[]
  > {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const areaMap = new Map<
      number,
      {
        id: number;
        name: string;
        slug: string;
        allRoutes: RouteSimple[];
      }
    >();

    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          'id, name, slug, crag_id, crag:crags!inner(name, slug, area_id, area:areas!inner(id, name, slug))',
        )
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getAllDuplicateRoutesGroupedByArea error',
          error,
        );
        break;
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const area = item.crag.area;
        if (!areaMap.has(area.id)) {
          areaMap.set(area.id, { ...area, allRoutes: [] });
        }
        areaMap.get(area.id)!.allRoutes.push({
          id: item.id,
          name: item.name,
          slug: item.slug,
          crag_id: item.crag_id,
          crag: {
            name: item.crag.name,
            slug: item.crag.slug,
            area_id: area.id,
            area_slug: area.slug,
            area_name: area.name,
          },
        });
      }

      if (data.length < step) hasMore = false;
      else from += step;
    }

    const result: {
      id: number;
      name: string;
      slug: string;
      duplicateGroups: RouteSimple[][];
    }[] = [];

    for (const areaData of areaMap.values()) {
      const groups = new Map<string, RouteSimple[]>();
      for (const route of areaData.allRoutes) {
        if ((route.name || '').toUpperCase().trim() === 'N.N.') continue;
        const key = normalizeNameStrict(route.name);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(route);
      }

      const duplicateGroups = Array.from(groups.values()).filter(
        (g) => g.length > 1,
      );
      if (duplicateGroups.length > 0) {
        result.push({
          id: areaData.id,
          name: areaData.name,
          slug: areaData.slug,
          duplicateGroups,
        });
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAllRoutesWithDuplicateEightAnuSlugs(): Promise<
    { eightAnuSlug: string; routes: RouteSimple[] }[]
  > {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const slugToRoutes = new Map<string, RouteSimple[]>();
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          'id, name, slug, crag_id, eight_anu_route_slugs, crag:crags!inner(name, slug, area_id, area:areas!inner(id, name, slug))',
        )
        .not('eight_anu_route_slugs', 'is', null)
        .range(from, from + step - 1);

      if (error) {
        console.error(
          '[RoutesService] getAllRoutesWithDuplicateEightAnuSlugs error',
          error,
        );
        break;
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        const area = item.crag.area;
        const route: RouteSimple = {
          id: item.id,
          name: item.name,
          slug: item.slug,
          crag_id: item.crag_id,
          crag: {
            name: item.crag.name,
            slug: item.crag.slug,
            area_id: area.id,
            area_slug: area.slug,
            area_name: area.name,
          },
        };
        for (const eightAnuSlug of item.eight_anu_route_slugs as string[]) {
          if (!slugToRoutes.has(eightAnuSlug))
            slugToRoutes.set(eightAnuSlug, []);
          slugToRoutes.get(eightAnuSlug)!.push(route);
        }
      }

      if (data.length < step) hasMore = false;
      else from += step;
    }

    // Deduplicate and filter: skip groups from different areas or already seen
    const seen = new Set<string>();
    const result: { eightAnuSlug: string; routes: RouteSimple[] }[] = [];
    for (const [eightAnuSlug, routes] of slugToRoutes.entries()) {
      if (routes.length < 2) continue;
      const areaIds = new Set(routes.map((r) => r.crag?.area_id));
      if (areaIds.size > 1) continue;
      const key = routes
        .map((r) => r.id)
        .sort((a, b) => a - b)
        .join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ eightAnuSlug, routes });
    }
    return result;
  }

  async searchRoutes(
    query: string,
    grade?: number,
  ): Promise<RouteSearchResult[]> {
    if (!this.isBrowser || query.trim().length < 2) return [];
    await this.supabase.whenReady();

    const cleanQuery = query.trim();
    const words = cleanQuery
      .split(/\s+/)
      .map((w) => slugify(w))
      .filter(Boolean);

    const slugPattern =
      words.length > 0 ? `%${words.join('%')}%` : `%${slugify(cleanQuery)}%`;

    const orConditions = [
      `name.ilike.%${cleanQuery}%`,
      `slug.ilike.${slugPattern}`,
    ];

    if (words.length > 1) {
      orConditions.push(`slug.ilike.%${[...words].reverse().join('%')}%`);
    }

    let q = this.supabase.client
      .from('routes')
      .select(
        `
        id, name, slug, grade, climbing_kind, height, eight_anu_route_slugs,
        crag:crags!inner(id, name, slug, area:areas(id, name, slug))
      `,
      )
      .or(orConditions.join(','));

    if (grade !== undefined && grade !== null) {
      q = q.eq('grade', grade);
    }

    const { data, error } = await q.limit(20);

    if (error) {
      console.error('[RoutesService] searchRoutes error', error);
      return [];
    }

    return (data || []).map(
      (r) =>
        ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          grade: r.grade,
          climbing_kind: r.climbing_kind,
          height: r.height,
          eight_anu_route_slugs: r.eight_anu_route_slugs,
          crag_id: r.crag.id,
          crag_name: r.crag.name,
          crag_slug: r.crag.slug,
          area_id: r.crag.area.id,
          area_name: r.crag.area.name,
          area_slug: r.crag.area.slug,
        }) as RouteSearchResult,
    );
  }

  async getToposForRoutes(routeIds: number[]): Promise<
    {
      id: number;
      topo_id: number;
      route_id: number;
      topo_name: string;
      has_path: boolean;
    }[]
  > {
    if (!this.isBrowser || routeIds.length === 0) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('topo_routes')
      .select('id, topo_id, route_id, path, topo:topos(id, name)')
      .in('route_id', routeIds);

    if (error || !data) return [];

    return (
      data as {
        id: number;
        topo_id: number;
        route_id: number;
        path: Json | null;
        topo: { id: number; name: string } | null;
      }[]
    )
      .filter((row) => !!row.topo)
      .map((row) => ({
        id: row.id,
        topo_id: row.topo_id,
        route_id: row.route_id,
        topo_name: row.topo!.name,
        has_path: hasTopoPath(row.path),
      }));
  }

  private async preserveTopoLinesBeforeUnify(
    targetRouteId: number,
    sourceRouteIds: number[],
  ): Promise<void> {
    const cleanSources = sourceRouteIds.filter((id) => id !== targetRouteId);
    if (cleanSources.length === 0) return;

    const allRouteIds = [targetRouteId, ...cleanSources];
    const { data, error } = await this.supabase.client
      .from('topo_routes')
      .select('id, topo_id, route_id, number, path')
      .in('route_id', allRouteIds);

    if (error) throw error;
    if (!data || data.length === 0) return;

    interface TopoRouteUnifyRow {
      id: number;
      topo_id: number;
      route_id: number;
      number: number;
      path: Json | null;
    }

    const byTopo = new Map<number, TopoRouteUnifyRow[]>();
    for (const row of data as TopoRouteUnifyRow[]) {
      const list = byTopo.get(row.topo_id);
      if (list) {
        list.push(row);
      } else {
        byTopo.set(row.topo_id, [row]);
      }
    }

    const idsToDelete: number[] = [];

    for (const rows of byTopo.values()) {
      if (rows.length <= 1) continue;

      const targetRows = rows.filter((r) => r.route_id === targetRouteId);
      const sourceRows = rows.filter((r) => r.route_id !== targetRouteId);

      if (targetRows.length > 0) {
        const drawnTarget = targetRows.find((r) => hasTopoPath(r.path));
        const keptTarget =
          drawnTarget ?? [...targetRows].sort((a, b) => a.id - b.id)[0];

        for (const tr of targetRows) {
          if (tr.id !== keptTarget.id) {
            idsToDelete.push(tr.id);
          }
        }

        if (!drawnTarget) {
          const drawnSource = [...sourceRows]
            .filter((r) => hasTopoPath(r.path))
            .sort((a, b) => a.id - b.id)[0];
          if (drawnSource) {
            const { error: updateError } = await this.supabase.client
              .from('topo_routes')
              .update({
                path: drawnSource.path,
                number: drawnSource.number,
              })
              .eq('id', keptTarget.id);
            if (updateError) throw updateError;
          }
        }
      } else {
        const sortedSources = [...sourceRows].sort((a, b) => {
          const aDrawn = hasTopoPath(a.path) ? 0 : 1;
          const bDrawn = hasTopoPath(b.path) ? 0 : 1;
          if (aDrawn !== bDrawn) return aDrawn - bDrawn;
          return a.id - b.id;
        });
        for (const loser of sortedSources.slice(1)) {
          idsToDelete.push(loser.id);
        }
      }
    }

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await this.supabase.client
        .from('topo_routes')
        .delete()
        .in('id', idsToDelete);
      if (deleteError) throw deleteError;
    }
  }

  async unify(
    targetRouteId: number,
    sourceRouteIds: number[],
    newName: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      await this.preserveTopoLinesBeforeUnify(targetRouteId, sourceRouteIds);

      const { error } = await this.supabase.client.rpc('unify_routes', {
        p_target_route_id: targetRouteId,
        p_source_route_ids: sourceRouteIds,
        p_new_name: newName,
      });

      if (error) throw error;

      this.cragRoutesData.cragRoutesResource.reload();
      this.outdoorData.cragDetailResource.reload();
      this.outdoorData.areaToposResource.reload();
      this.outdoorData.topoDetailResource.reload();
      this.outdoorData.routeDetailResource.reload();
      this.equipperService.equipperRoutesResource.reload();
      this.toast.success('messages.toasts.routesUnified');
      return true;
    } catch (e) {
      console.error('[RoutesService] unify error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getRouteEquippers(routeId: number): Promise<EquipperWithAvatar[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_equippers')
      .select('equipper:equippers(*, user_profile:user_profiles(avatar))')
      .eq('route_id', routeId);
    if (error) {
      console.error('[RoutesService] getRouteEquippers error', error);
      return [];
    }
    return (data || [])
      .map((d) => {
        const item = d as {
          equipper:
            | (EquipperDto & {
                user_profile?: { avatar: string | null } | null;
              })
            | null;
        };
        if (!item.equipper) return null;
        const { user_profile, ...equipper } = item.equipper;
        return {
          ...equipper,
          avatar: user_profile?.avatar ?? null,
        } as EquipperWithAvatar;
      })
      .filter((e): e is EquipperWithAvatar => e !== null);
  }

  async setRouteEquippers(
    routeId: number,
    equippers: readonly (EquipperDto | string)[],
  ): Promise<EquipperDto[]> {
    if (!this.isBrowser) return [];

    try {
      const resolvedEquippers = await this.equipperService.syncRouteEquippers(
        'route_equippers',
        routeId,
        equippers,
      );

      this.cragRoutesData.cragRoutesResource.reload();
      this.outdoorData.routeDetailResource.reload();
      this.equipperService.equipperRoutesResource.reload();

      return resolvedEquippers;
    } catch (e) {
      console.error('[RoutesService] setRouteEquippers error', e);
      throw e;
    }
  }

  async create(
    payload: Omit<RouteInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] create error', error);
      throw error;
    }
    // Refresh routes list for the current crag and current route
    this.cragRoutesData.cragRoutesResource.reload();
    this.outdoorData.routeDetailResource.reload();
    this.equipperService.equipperRoutesResource.reload();
    this.toast.success('messages.toasts.routeCreated');
    return data as RouteDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteUpdateDto, 'id' | 'created_at'>>,
    silent = false,
  ): Promise<RouteDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] update error', error);
      throw error;
    }
    this.cragRoutesData.cragRoutesResource.reload();
    this.outdoorData.routeDetailResource.reload();
    this.outdoorData.topoDetailResource.reload();
    this.equipperService.equipperRoutesResource.reload();
    this.syncResources(id, payload);
    if (!silent) this.toast.success('messages.toasts.routeUpdated');
    return data as RouteDto;
  }

  async getById(
    id: number,
  ): Promise<{ data: RouteDto | null; error: unknown }> {
    if (!this.isBrowser) return { data: null, error: null };
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as RouteDto, error };
  }

  async delete(id: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('routes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[RoutesService] delete error', error);
      throw error;
    }
    this.cragRoutesData.cragRoutesResource.reload();
    this.outdoorData.routeDetailResource.reload();
    this.outdoorData.topoDetailResource.reload();
    this.equipperService.equipperRoutesResource.reload();
    this.toast.success('messages.toasts.routeDeleted');
    return true;
  }

  async toggleRouteLike(
    routeId: number,
    currentRoute?: RouteWithExtras,
  ): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_like',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;

      const isLiked = data as boolean;

      if (!isLiked) {
        this.toast.showWithUndo('messages.toasts.favoriteRemoved', () => {
          void this.toggleRouteLike(routeId, currentRoute);
        });
      } else {
        this.toast.success('messages.toasts.favoriteAdded');
      }

      this.syncResources(routeId, { liked: isLiked }, currentRoute);
      this.favoritesData.likedRoutesResource.reload();

      return isLiked;
    } catch (e) {
      console.error('[RoutesService] toggleRouteLike error', e);
      throw e;
    }
  }

  async removeRouteProject(routeId: number): Promise<void> {
    if (!this.isBrowser) return;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client
        .from('route_projects')
        .delete()
        .match({
          user_id: this.supabase.authUserId(),
          route_id: routeId,
        })
        .select('route_id');

      if (error) throw error;

      if (data && data.length > 0) {
        this.toast.success('messages.toasts.projectRemoved');
        this.syncResources(routeId, { project: false });
      }
    } catch (e) {
      console.error('[RoutesService] removeRouteProject error', e);
    }
  }

  async toggleRouteProject(
    routeId: number,
    currentRoute?: Partial<RouteWithExtras>,
  ): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_project',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;

      const isProject = data as boolean;

      if (!isProject) {
        this.toast.showWithUndo('messages.toasts.projectRemoved', () => {
          void this.toggleRouteProject(routeId, currentRoute);
        });
      } else {
        this.toast.success('messages.toasts.projectAdded');
      }

      this.syncResources(routeId, { project: isProject }, currentRoute);

      return isProject;
    } catch (e) {
      console.error('[RoutesService] toggleRouteProject error', e);
      throw e;
    }
  }

  private syncResources(
    routeId: number,
    changes: Partial<RouteWithExtras>,
    currentRoute?: Partial<RouteWithExtras>,
  ): void {
    const updateFn = (routes: RouteWithExtras[] | undefined) =>
      (routes ?? []).map((route) =>
        route.id === routeId ? { ...route, ...changes } : route,
      );

    // 1. Update cragRoutesResource
    this.cragRoutesData.cragRoutesResource.update(updateFn);

    // 2. Update equipperRoutesResource
    this.equipperService.equipperRoutesResource.update(updateFn);

    // 3. Update userProjectsResource
    if (changes.project !== undefined) {
      const isProject = changes.project;
      this.profileData.userProjectsResource.update((current) => {
        if (isProject) {
          const exists = (current ?? []).find((route) => route.id === routeId);
          if (exists) return updateFn(current);
          if (currentRoute && 'liked' in currentRoute) {
            return [
              ...(current ?? []),
              {
                ...(currentRoute as RouteWithExtras),
                project: true,
              },
            ];
          }
          // If we don't have currentRoute, we might need to reload or just update if it existed.
          // For now, if it doesn't exist and we don't have the object, we can't add it optimistically with all data.
          // But in most cases where we toggle, we are in a context where we have the route data.
          return current;
        } else {
          return (current ?? []).filter((route) => route.id !== routeId);
        }
      });
    } else {
      this.profileData.userProjectsResource.update(updateFn);
    }

    // 4. Update routeDetailResource
    this.outdoorData.routeDetailResource.update((r) =>
      r?.id === routeId ? { ...r, ...changes } : r,
    );

    // 5. Update topoDetailResource
    this.outdoorData.topoDetailResource.update((current) => {
      if (!current) return current;
      return {
        ...current,
        topo_routes: current.topo_routes.map((tr) =>
          tr.route_id === routeId
            ? { ...tr, route: { ...tr.route, ...changes } }
            : tr,
        ),
      };
    });
  }
}
