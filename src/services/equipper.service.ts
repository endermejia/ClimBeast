import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { resource } from '@angular/core';

import {
  AscentType,
  CragDto,
  EquipperDto,
  IndoorRouteDto,
  IndoorRouteWithExtras,
  IndoorTopoDto,
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
              equippers:indoor_route_equippers(equipper:equippers(*)),
              ascents:indoor_ascents(id, type, user_id, rate),
              topo_routes:indoor_topo_routes(topo:indoor_topos(id, name, legacy))
            )
          `,
          )
          .eq('equipper_id', id);

        if (error) throw error;

        const userId = this.supabase.authUserId();

        return (data || [])
          .map((d) => {
            const r = d.route as
              | (IndoorRouteDto & {
                  equippers?: { equipper: EquipperDto | null }[];
                  center?: { name: string; slug: string } | null;
                  ascents?: {
                    id: string;
                    type: AscentType | null;
                    user_id: string;
                    rate: number | null;
                  }[];
                  topo_routes?: {
                    topo: Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> | null;
                  }[];
                })
              | null;
            if (!r) return null;

            const ascents = r.ascents || [];
            const ratedAscents = ascents.filter(
              (ascent) => ascent.rate !== null && ascent.rate > 0,
            );
            const totalRating = ratedAscents.reduce(
              (sum, ascent) => sum + (ascent.rate || 0),
              0,
            );
            const rating =
              ratedAscents.length > 0 ? totalRating / ratedAscents.length : 0;

            const ownAscent = userId
              ? (ascents.find((a) => a.user_id === userId) ?? null)
              : null;

            return {
              ...r,
              center_name: r.center?.name || '',
              center_slug: r.center?.slug || '',
              equippers: (r.equippers || [])
                .map((e) => e.equipper)
                .filter((e): e is EquipperDto => e !== null),
              topos: (r.topo_routes || [])
                .map((tr) => tr.topo)
                .filter(
                  (
                    topo,
                  ): topo is Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> =>
                    topo !== null,
                ),
              own_ascent: ownAscent
                ? { id: String(ownAscent.id), type: ownAscent.type }
                : null,
              ascent_count: ascents.length,
              rating: rating || null,
            } as IndoorRouteWithExtras;
          })
          .filter((r): r is IndoorRouteWithExtras => r !== null);
      } catch {
        return [];
      }
    },
  });
}
