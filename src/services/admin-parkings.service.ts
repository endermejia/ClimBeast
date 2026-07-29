import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, resource } from '@angular/core';

import { ParkingDto } from '../models';

import { SupabaseService } from './supabase.service';

/**
 * Manages admin parkings data.
 * Extracted from GlobalData for better separation of concerns.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminParkingsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly adminParkingsResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
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
