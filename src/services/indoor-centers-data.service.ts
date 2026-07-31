import { inject, Injectable, resource, computed } from '@angular/core';

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

  readonly indoorCentersResource = resource({
    loader: async () => {
      if (!this.isBrowser) {
        return [] as MapIndoorCenterItem[];
      }
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('indoor_centers')
          .select(
            '*, topos:indoor_topos(id, name), routes:indoor_routes(grade)',
          )
          .order('name');

        if (error) throw error;

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
          } as MapIndoorCenterItem;
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
