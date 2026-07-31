import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { resource } from '@angular/core';

import {
  AscentType,
  CragDto,
  EquipperDto,
  IndoorRouteWithExtras,
  RouteAscentDto,
  RouteDto,
  RouteWithExtras,
  UserProfileDto,
} from '../models';

import { mapRouteToExtras, RawRouteData } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

/**
 * Manages equipper-related data and queries.
 * Extracted from GlobalData to reduce its responsibilities.
 */
@Injectable({ providedIn: 'root' })
export class EquipperService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  readonly selectedEquipperId: WritableSignal<number | null> = signal(null);

  readonly equipperDetailResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !this.isBrowser) return null;
      await this.supabase.whenReady();

      const { data, error } = await this.supabase.client
        .from('equippers')
        .select('*, user_profile:user_profiles(*)')
        .eq('id', id)
        .single();

      if (error) {
        return null;
      }

      return data as EquipperDto & {
        user_profile: UserProfileDto | null;
      };
    },
  });

  readonly equipperRoutesResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !this.isBrowser) return [];
      await this.supabase.whenReady();
      const userId = this.supabase.authUser()?.id;

      let query = this.supabase.client.from('route_equippers').select(
        `
          route:routes (
            *,
            liked:route_likes(id),
            project:route_projects(id),
            ascents:route_ascents(rate, type),
            own_ascent:route_ascents(*),
            crag:crags (
              *,
              area:areas (*)
            ),
            route_equippers(equipper:equippers(*)),
            topo_routes(topo:topos(id, name, slug))
          )
        `,
      );

      if (userId) {
        query = query
          .eq('route.own_ascent.user_id', userId)
          .eq('route.project.user_id', userId)
          .eq('route.liked.user_id', userId);
      }

      const { data, error } = await query.eq('equipper_id', id);

      if (error) {
        return [];
      }

      return (data || [])
        .map((d) => {
          const r = d.route as
            | (RouteDto & {
                liked: { id: number }[];
                project: { id: number }[];
                ascents: { rate: number | null; type: AscentType }[];
                own_ascent: RouteAscentDto[];
                crag:
                  | (CragDto & {
                      area: { id: number; name: string; slug: string } | null;
                    })
                  | null;
                route_equippers: { equipper: EquipperDto }[];
                topo_routes: {
                  topo: { id: number; name: string; slug: string };
                }[];
              })
            | null;
          if (!r) return null;

          return mapRouteToExtras(r as RawRouteData, {
            areaIdSource: 'crag.area.id',
            includeEquippers: true,
            includeTopos: true,
          }) as RouteWithExtras;
        })
        .filter((r): r is RouteWithExtras => !!r);
    },
  });

  readonly equipperIndoorRoutesResource = resource({
    params: () => this.selectedEquipperId(),
    loader: async ({ params: id }) => {
      if (!id || !this.isBrowser) return [];
      await this.supabase.whenReady();
      try {
        const { data, error } = await this.supabase.client
          .from('indoor_route_equippers')
          .select(
            `
            route:indoor_routes (
              *,
              center:indoor_centers (
                name,
                slug
              ),
              equippers:indoor_route_equippers(equipper:equippers(*))
            )
          `,
          )
          .eq('equipper_id', id);

        if (error) throw error;

        return (data || [])
          .map((d) => {
            const r = d.route as
              | (Record<string, unknown> & {
                  equippers?: { equipper: EquipperDto }[];
                  center?: { name: string; slug: string };
                })
              | null;
            if (!r) return null;
            return {
              ...r,
              center_name: r.center?.name || '',
              center_slug: r.center?.slug || '',
              equippers: (r.equippers || [])
                .map((e) => e.equipper)
                .filter(Boolean),
            } as IndoorRouteWithExtras;
          })
          .filter((r): r is IndoorRouteWithExtras => r !== null);
      } catch {
        return [];
      }
    },
  });
}
