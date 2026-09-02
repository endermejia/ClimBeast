import { inject, Injectable, signal } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { MaterialCatalogItemDialogComponent } from '../components/dialogs/material-catalog-item-dialog';
import {
  MaterialCatalogFormComponent,
  MaterialCatalogFormData,
} from '../components/forms/material-catalog-form';

import {
  MaterialCatalogItem,
  MaterialCatalogItemInsert,
  MaterialCatalogItemUpdate,
} from '../models';

import { handleErrorToast } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class MaterialCatalogService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly catalog = signal<MaterialCatalogItem[]>([]);

  async loadCatalog(includeInactive = false): Promise<MaterialCatalogItem[]> {
    if (!this.isBrowser) return [];
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
      if (error) {
        console.error('[MaterialCatalogService] loadCatalog error:', error);
        return [];
      }

      const items = (data as MaterialCatalogItem[]) ?? [];
      this.catalog.set(items);
      return items;
    } catch (e) {
      console.error('[MaterialCatalogService] loadCatalog error:', e);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async getById(id: number): Promise<MaterialCatalogItem | null> {
    if (!this.isBrowser) return null;
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

  openMaterialItem(item: MaterialCatalogItem): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(MaterialCatalogItemDialogComponent),
        {
          data: item,
          label:
            item.name || this.translate.instant('admin.materialCatalog.title'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  async openMaterialCatalogItemForm(
    itemData?: MaterialCatalogItem,
  ): Promise<boolean> {
    const isEdit = !!itemData?.id;
    const result = await firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(MaterialCatalogFormComponent),
        {
          label: this.translate.instant(
            isEdit
              ? 'admin.materialCatalog.editItem'
              : 'admin.materialCatalog.newItem',
          ),
          size: 'm',
          data: { itemData } as MaterialCatalogFormData,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    );
    return !!result;
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
      this.toast.success('admin.materialCatalog.createdSuccess');
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
      this.toast.success('admin.materialCatalog.updatedSuccess');
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

  async uploadMaterialImage(file: File): Promise<string | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const sanitizedName = (file.name || 'image.webp')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const fileName = `${Date.now()}_${sanitizedName}`;
    const filePath = `materials/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('merchandise')
      .upload(filePath, file);

    if (error) {
      console.error(
        '[MaterialCatalogService] uploadMaterialImage error:',
        error,
      );
      return null;
    }

    return this.supabase.getPublicUrl('merchandise', data.path);
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
      this.toast.success('admin.materialCatalog.deletedSuccess');
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
