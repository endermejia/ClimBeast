import { inject, Injectable, signal } from '@angular/core';

import {
  MaterialCatalogItem,
  MaterialCatalogItemInsert,
  MaterialCatalogItemUpdate,
} from '../models';

import { handleErrorToast } from '../utils';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly catalog = signal<MaterialCatalogItem[]>([]);

  async loadCatalog(includeInactive = false): Promise<MaterialCatalogItem[]> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      let query = this.supabase.client
        .from('material_catalog')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data as MaterialCatalogItem[]) ?? [];
      this.catalog.set(items);
      return items;
    } catch (e) {
      console.error('[MaterialCatalogService] loadCatalog error:', e);
      handleErrorToast(e, this.toast);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id: number): Promise<MaterialCatalogItem | null> {
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client
        .from('material_catalog')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as MaterialCatalogItem;
    } catch (e) {
      console.error('[MaterialCatalogService] getById error:', e);
      return null;
    }
  }

  async createMaterialItem(
    item: MaterialCatalogItemInsert,
  ): Promise<MaterialCatalogItem | null> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client
        .from('material_catalog')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      this.toast.success('materialCatalog.createdSuccess');
      await this.loadCatalog(true);
      return data as MaterialCatalogItem;
    } catch (e) {
      console.error('[MaterialCatalogService] createMaterialItem error:', e);
      handleErrorToast(e, this.toast);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateMaterialItem(
    id: number,
    patch: MaterialCatalogItemUpdate,
  ): Promise<boolean> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('material_catalog')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      this.toast.success('materialCatalog.updatedSuccess');
      await this.loadCatalog(true);
      return true;
    } catch (e) {
      console.error('[MaterialCatalogService] updateMaterialItem error:', e);
      handleErrorToast(e, this.toast);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async toggleActive(id: number, active: boolean): Promise<boolean> {
    return this.updateMaterialItem(id, { active });
  }

  async deleteMaterialItem(id: number): Promise<boolean> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('material_catalog')
        .delete()
        .eq('id', id);

      if (error) throw error;
      this.toast.success('materialCatalog.deletedSuccess');
      await this.loadCatalog(true);
      return true;
    } catch (e) {
      console.error('[MaterialCatalogService] deleteMaterialItem error:', e);
      handleErrorToast(e, this.toast);
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
