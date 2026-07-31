import { inject, Injectable, resource } from '@angular/core';

import { ParkingDto } from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

/**
 * Manages admin parkings data.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminParkingsService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  readonly adminParkingsResource = resource({
    loader: async () => {
      if (!this.isBrowser) return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('parkings')
          .select('*')
          .order('name');
        if (error) {
          return [];
        }
        return (data as ParkingDto[]) ?? [];
      } catch {
        return [];
      }
    },
  });
}
