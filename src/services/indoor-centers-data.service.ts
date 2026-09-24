import { inject, Injectable, resource, computed, signal } from '@angular/core';

import {
  AmountByEveryGrade,
  MapIndoorCenterItem,
  MapIndoorCenterRaw,
  MapIndoorRouteRaw,
  VERTICAL_LIFE_GRADES,
} from '../models';

import { IS_BROWSER } from '../app/is-browser';

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

  readonly indoorRoutesReloadTick = signal(0);

  readonly indoorCentersResource = resource({
    params: () => ({
      isBrowser: this.isBrowser,
      reloadTick: this.indoorRoutesReloadTick(),
      userId: this.supabase.authUserId(),
    }),
    loader: async ({ params: { isBrowser, userId } }) => {
      if (!isBrowser) {
        return [] as MapIndoorCenterItem[];
      }
      try {
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
      } catch {
        return [];
      }
    },
  });

  readonly indoorCentersList = computed(
    () => this.indoorCentersResource.value() ?? [],
  );
}
