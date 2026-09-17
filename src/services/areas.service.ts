import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AreaAccessManagerDialogComponent } from '../components/dialogs/area-access-manager-dialog';

import { AreaFormComponent } from '../components/forms/area-form';
import { AreaUnifyComponent } from '../components/forms/area-unify';

import type {
  AreaAdminRequestWithArea,
  AreaDetail,
  AreaDto,
  AreaInsertDto,
  AreaListItem,
  AreaUpdateDto,
  AreaWithPurchase,
} from '../models';

import { CACHE_KEYS } from '../constants/cache-keys';

import { IS_BROWSER } from '../app/is-browser';

import { AuthStateService } from './auth-state.service';
import { CacheService } from './cache.service';
import { FavoritesDataService } from './favorites-data.service';
import { OutdoorDataService } from './outdoor-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly favoritesData = inject(FavoritesDataService);
  private readonly authState = inject(AuthStateService);
  private readonly cache = inject(CacheService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  openAreaForm(data?: {
    areaData?: {
      id?: number;
      name: string;
      slug?: string;
      eight_anu_crag_slugs?: string[];
    };
  }): void {
    const isEdit = !!data?.areaData?.id;
    const oldSlug = data?.areaData?.slug;
    void firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(AreaFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'areas.editTitle' : 'areas.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.outdoorData.areasListResource.reload();
        // Also reload global area detail if we are on that page?
        // Since we might navigate, we rely on router/resource reload.
        // But if we are on area list, reloads list.

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          if (this.outdoorData.selectedAreaSlug() === oldSlug) {
            void this.router.navigate(['/area', result]);
          }
        }
      }
    });
  }

  openAreaAccessManager(areaId: number, areaName: string): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(AreaAccessManagerDialogComponent),
        {
          label: this.translate.instant('areas.accessManagerTitle', {
            name: areaName,
          }),
          size: 'm',
          data: { areaId, areaName },
          dismissible: true,
        },
      ),
      { defaultValue: false },
    );
  }

  openUnifyAreas(areas?: AreaDto[] | AreaListItem[]): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(AreaUnifyComponent),
        {
          label: this.translate.instant('areas.unifyTitle'),
          size: 'm',
          data: areas,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.outdoorData.areasListResource.reload();
      }
      return result;
    });
  }

  async create(
    payload: Omit<AreaInsertDto, 'created_at' | 'id'>,
  ): Promise<AreaDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] create error', error);
      throw error;
    }
    this.outdoorData.areasListResource.reload();
    this.toast.success('messages.toasts.areaCreated');
    return data as AreaDto;
  }

  async update(
    id: number,
    payload: Omit<AreaUpdateDto, 'id' | 'created_at'>,
  ): Promise<AreaDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] update error', error);
      throw error;
    }
    this.outdoorData.areasListResource.reload();
    this.toast.success('messages.toasts.areaUpdated');
    return data as AreaDto;
  }

  async getById(id: number): Promise<{ data: AreaDto | null; error: unknown }> {
    if (!this.isBrowser) return { data: null, error: null };
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .select('*, purchased:area_purchases(id)')
      .eq('id', id)
      .single();

    if (data) {
      const result = data as AreaWithPurchase;
      result.purchased =
        Array.isArray(result.purchased) && result.purchased.length > 0;
    }

    return { data: data as AreaDetail | null, error };
  }

  async getAllAreasSimple(): Promise<
    { id: number; name: string; slug: string }[]
  > {
    if (!this.isBrowser) return [];

    const cacheKey = CACHE_KEYS.areasSimple;
    return this.cache.fetchOrCache(
      cacheKey,
      async () => {
        await this.supabase.whenReady();

        let allAreas: { id: number; name: string; slug: string }[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await this.supabase.client
            .from('areas')
            .select('id, name, slug')
            .range(from, from + step - 1);

          if (error) throw error;

          if (data && data.length > 0) {
            allAreas = [...allAreas, ...data];
            if (data.length < step) {
              hasMore = false;
            } else {
              from += step;
            }
          } else {
            hasMore = false;
          }
        }

        return allAreas;
      },
      { fallbackValue: [], logTag: 'AreasService' },
    );
  }

  async unify(
    targetAreaId: number,
    sourceAreaIds: number[],
    newName: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.rpc('unify_areas', {
        p_target_area_id: targetAreaId,
        p_source_area_ids: sourceAreaIds,
        p_new_name: newName,
      });

      if (error) throw error;

      this.outdoorData.areasListResource.reload();
      this.toast.success('messages.toasts.areasUnified');
      return true;
    } catch (e) {
      console.error('[AreasService] unify error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /** Delete an area by id (client-only). Returns true if deleted. */
  async delete(id: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('areas')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[AreasService] delete error', error);
      throw error;
    }
    // Update global area list
    this.outdoorData.areasListResource.update((value) => {
      if (!value) return value;
      return value.filter((item) => item.id !== id);
    });
    this.toast.success('messages.toasts.areaDeleted');
    return true;
  }

  /** Toggle like for an area using Supabase RPC toggle_area_like */
  async toggleAreaLike(areaId: number): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    try {
      if (!areaId) {
        throw new Error(
          `[AreasService] toggleAreaLike invalid areaId: ${String(areaId)}`,
        );
      }
      const params = { p_area_id: areaId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_area_like',
        params,
      );
      if (error) throw error;
      const liked = data;
      // Update global area list
      this.outdoorData.areasListResource.update((value) => {
        if (!value) return value;
        return value
          .map((item) => (item.id === areaId ? { ...item, liked } : item))
          .sort((a, b) => {
            // First sort by liked status (liked items first)
            if (a.liked && !b.liked) return -1;
            if (!a.liked && b.liked) return 1;
            // Then sort by name
            return a.name.localeCompare(b.name);
          });
      });
      if (!liked) {
        this.toast.showWithUndo('messages.toasts.favoriteRemoved', () => {
          void this.toggleAreaLike(areaId);
        });
      } else {
        this.toast.success('messages.toasts.favoriteAdded');
      }
      this.favoritesData.likedAreasResource.reload();
      return liked;
    } catch (e) {
      console.error('[AreasService] toggleAreaLike error', e);
      throw e;
    }
  }

  // --- Area Admin Requests ---
  async requestAreaAdmin(areaId: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const userId = this.authState.userProfile()?.id;
    if (!userId) return false;

    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('area_admin_requests')
        .insert({ area_id: areaId, user_id: userId });

      if (error) {
        if (error.code === '23505') {
          // unique violation
          this.toast.info('adminRequests.alreadyRequested');
          return true; // Already requested
        }
        throw error;
      }

      this.toast.success('adminRequests.requestSent');
      return true;
    } catch (e) {
      console.error('[AreasService] requestAreaAdmin error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getAreaAdminRequests(): Promise<AreaAdminRequestWithArea[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('area_admin_requests')
      .select(
        'id, created_at, area:areas(id, name, slug), user:user_profiles(id, name, avatar)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AreasService] getAreaAdminRequests error', error);
      return [];
    }
    return (data || []) as AreaAdminRequestWithArea[];
  }

  async approveAreaAdminRequest(
    requestId: number,
    areaId: number,
    userId: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error: insertError } = await this.supabase.client
        .from('area_admins')
        .insert({ area_id: areaId, user_id: userId });

      if (insertError) {
        if (insertError.code !== '23505') throw insertError; // Ignore if already admin
      }

      const { error: deleteError } = await this.supabase.client
        .from('area_admin_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      if (userId === this.supabase.authUserId()) {
        this.cache.remove(CACHE_KEYS.adminAreas(userId));
        this.supabase.adminAreasResource.reload();
      }

      this.toast.success('adminRequests.requestApproved');
      return true;
    } catch (e) {
      console.error('[AreasService] approveAreaAdminRequest error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async rejectAreaAdminRequest(requestId: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('area_admin_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      this.toast.success('adminRequests.requestRejected');
      return true;
    } catch (e) {
      console.error('[AreasService] rejectAreaAdminRequest error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
