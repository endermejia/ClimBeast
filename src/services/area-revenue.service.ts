import { inject, Injectable, signal } from '@angular/core';

import { AreaBalanceSummary, AreaPublicTimeline } from '../models';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';

import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AreaRevenueService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly cache = inject(CacheService);

  readonly loading = signal(false);

  async getAreaBalance(areaId: number): Promise<AreaBalanceSummary | null> {
    if (!this.isBrowser) return null;
    return this.cache.fetchOrCache(
      CACHE_KEYS.areaBalance(areaId),
      async () => {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client.rpc(
          'get_area_balance',
          { p_area_id: areaId },
        );

        if (error) throw error;
        const raw = data as unknown as Record<string, number>;
        return {
          totalPurchasesNet: Number(raw?.['totalPurchasesNet'] || 0),
          totalDonationsNet: Number(raw?.['totalDonationsNet'] || 0),
          totalWithdrawn: Number(raw?.['totalWithdrawn'] || 0),
          totalReserved: Number(raw?.['totalReserved'] || 0),
          availableBalance: Number(raw?.['availableBalance'] || 0),
        };
      },
      { fallbackValue: null, logTag: 'AreaRevenueService' },
    );
  }

  async getAreaPublicTimeline(
    areaId: number,
  ): Promise<AreaPublicTimeline | null> {
    if (!this.isBrowser) return null;
    this.loading.set(true);
    try {
      return await this.cache.fetchOrCache(
        CACHE_KEYS.areaTimeline(areaId),
        async () => {
          await this.supabase.whenReady();
          const { data, error } = await this.supabase.client.rpc(
            'get_area_public_timeline',
            { p_area_id: areaId },
          );

          if (error) throw error;
          return data as unknown as AreaPublicTimeline;
        },
        { fallbackValue: null, logTag: 'AreaRevenueService' },
      );
    } finally {
      this.loading.set(false);
    }
  }
}
