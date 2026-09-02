import { inject, Injectable, signal } from '@angular/core';

import { AreaBalanceSummary, AreaPublicTimeline } from '../models';

import { handleErrorToast } from '../utils';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AreaRevenueService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);

  async getAreaBalance(areaId: number): Promise<AreaBalanceSummary | null> {
    await this.supabase.whenReady();
    try {
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
    } catch (e) {
      console.error('[AreaRevenueService] getAreaBalance error:', e);
      return null;
    }
  }

  async getAreaPublicTimeline(
    areaId: number,
  ): Promise<AreaPublicTimeline | null> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'get_area_public_timeline',
        { p_area_id: areaId },
      );

      if (error) throw error;
      const result = data as unknown as AreaPublicTimeline;
      return result;
    } catch (e) {
      console.error('[AreaRevenueService] getAreaPublicTimeline error:', e);
      handleErrorToast(e, this.toast);
      return null;
    } finally {
      this.loading.set(false);
    }
  }
}
