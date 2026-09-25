import { inject, Injectable, signal } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { IndoorCenterFormComponent } from '../components/forms/indoor-center-form';
import IndoorRouteFormComponent from '../components/forms/indoor-route-form';
import TopoFormComponent from '../components/forms/topo-form';

import {
  EquipperDto,
  IndoorAscentDto,
  IndoorAscentInsertDto,
  IndoorAscentQueryRow,
  IndoorAscentWithExtras,
  IndoorCenterAdminRequestWithCenter,
  IndoorCenterDto,
  IndoorCenterRoutesetterRequestWithCenter,
  IndoorInventoryDto,
  IndoorRouteDto,
  IndoorRouteWithExtras,
  IndoorSaleDto,
  IndoorTopoDto,
  IndoorTopoListItem,
  IndoorTopoQueryRow,
  IndoorTopoRouteWithRoute,
  IndoorVoucherDto,
  IndoorVoucherPurchaseWithVoucher,
  RouteAscentWithExtras,
} from '../models';
import type { TopoPath } from '../models/topo.model';

import { CACHE_KEYS } from '../constants';
import { handleErrorToast, slugify } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { AscentsService } from './ascents.service';
import { AuthStateService } from './auth-state.service';
import { CacheService } from './cache.service';

import { EquipperService } from './equipper.service';
import { FavoritesDataService } from './favorites-data.service';
import { IndoorCentersDataService } from './indoor-centers-data.service';
import { IndoorDataService } from './indoor-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

type CenterRouteQuery = IndoorRouteDto & {
  ascents: Pick<IndoorAscentDto, 'id' | 'type' | 'user_id' | 'rate'>[];
  equippers: { equipper: EquipperDto | null }[];
  topo_routes: { topo: Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> | null }[];
};

@Injectable({
  providedIn: 'root',
})
export class IndoorService {
  private readonly supabase = inject(SupabaseService);
  private readonly indoorCentersData = inject(IndoorCentersDataService);
  private readonly authState = inject(AuthStateService);
  private readonly indoorData = inject(IndoorDataService);
  private readonly favoritesData = inject(FavoritesDataService);
  private readonly ascentsService = inject(AscentsService);
  private readonly equipperService = inject(EquipperService);
  private readonly cache = inject(CacheService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  private readonly isBrowser = inject(IS_BROWSER);
  loading = signal(false);

  /** Toggle like for an indoor center using Supabase RPC toggle_indoor_center_like */
  async toggleIndoorCenterLike(centerId: string): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    try {
      if (!centerId) {
        throw new Error(
          `[IndoorService] toggleIndoorCenterLike invalid centerId: ${String(centerId)}`,
        );
      }
      const params = { p_center_id: centerId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_indoor_center_like',
        params,
      );
      if (error) throw error;
      const liked = data;
      // Update global indoor centers list
      this.indoorCentersData.indoorCentersResource.update((value) => {
        if (!value) return value;
        return value
          .map((item) => (item.id === centerId ? { ...item, liked } : item))
          .sort((a, b) => {
            // First sort by liked status (liked items first)
            if (a.liked && !b.liked) return -1;
            if (!a.liked && b.liked) return 1;
            // Then sort by name
            return a.name.localeCompare(b.name);
          });
      });
      if (!liked) {
        this.favoritesData.likedIndoorCentersResource.update((curr) =>
          (curr || []).filter((item) => item.id !== centerId),
        );
        this.toast.showWithUndo('messages.toasts.favoriteRemoved', () => {
          void this.toggleIndoorCenterLike(centerId);
        });
      } else {
        this.toast.success('messages.toasts.favoriteAdded');
      }
      this.favoritesData.likedIndoorCentersResource.reload();
      return liked;
    } catch (e) {
      console.error('[IndoorService] toggleIndoorCenterLike error', e);
      throw e;
    }
  }

  /** Signals to outdoor/indoor consumers that routes should be reloaded */
  reloadCenterRoutes(): void {
    this.indoorCentersData.indoorRoutesReloadTick.update((v) => v + 1);
  }

  async getAllCenters(): Promise<IndoorCenterDto[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as IndoorCenterDto[];
    } finally {
      this.loading.set(false);
    }
  }

  openIndoorCenterForm(data?: {
    centerData?: Partial<IndoorCenterDto>;
  }): Promise<boolean> {
    const isEdit = !!data?.centerData?.id;
    return firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(IndoorCenterFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'indoor.editTitle' : 'indoor.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.indoorCentersData.indoorCentersResource.reload();
        return true;
      }
      return false;
    });
  }

  async createCenter(
    payload: Omit<IndoorCenterDto, 'id' | 'created_at'>,
  ): Promise<IndoorCenterDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();

    const { data, error } = await this.supabase.client
      .from('indoor_centers')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;

    if (data && userId) {
      try {
        await this.supabase.client
          .from('indoor_center_admins')
          .insert({ center_id: data.id, user_id: userId });
      } catch {
        // Ignore if already admin or handled downstream
      }
    }

    return data as IndoorCenterDto;
  }

  async getCenterBySlug(slug: string): Promise<IndoorCenterDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as IndoorCenterDto | null;
    } finally {
      this.loading.set(false);
    }
  }

  async getCenterVouchers(centerId: string): Promise<IndoorVoucherDto[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_vouchers')
      .select('*')
      .eq('center_id', centerId)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  async getUserActiveVouchers(
    userId: string,
    centerId: string,
  ): Promise<IndoorVoucherPurchaseWithVoucher[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('*, voucher:indoor_vouchers(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('indoor_vouchers.center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async getCenterRoutes(
    centerId: string,
    showLegacy = false,
  ): Promise<IndoorRouteWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    let query = this.supabase.client
      .from('indoor_routes')
      .select(
        '*, equippers:indoor_route_equippers(equipper:equippers(*)), ascents:indoor_ascents(id, type, user_id, rate), topo_routes:indoor_topo_routes(topo:indoor_topos(id, name, legacy))',
      )
      .eq('center_id', centerId);

    if (!showLegacy) {
      query = query.or('legacy.eq.false,legacy.is.null');
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return [];

    const userId = this.authState.userProfile()?.id;
    const routes = data as CenterRouteQuery[];
    return routes.map((route) => {
      const ratedAscents = route.ascents.filter(
        (ascent) => ascent.rate !== null && ascent.rate > 0,
      );
      const totalRating = ratedAscents.reduce(
        (sum, ascent) => sum + (ascent.rate || 0),
        0,
      );
      const rating =
        ratedAscents.length > 0 ? totalRating / ratedAscents.length : 0;

      return {
        ...route,
        equippers: route.equippers
          .map((entry) => entry.equipper)
          .filter((equipper): equipper is EquipperDto => equipper !== null),
        topos: route.topo_routes
          .map((entry) => entry.topo)
          .filter(
            (topo): topo is Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> =>
              topo !== null,
          ),
        own_ascent: userId
          ? (route.ascents.find((ascent) => ascent.user_id === userId) ?? null)
          : null,
        ascent_count: route.ascents.length,
        rating: rating || null,
      };
    }) as IndoorRouteWithExtras[];
  }

  async getCenterTopos(
    centerId: string,
    showLegacyTopos = false,
  ): Promise<IndoorTopoListItem[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    let query = this.supabase.client
      .from('indoor_topos')
      .select(
        '*, indoor_topo_routes ( route:indoor_routes ( id, grade, ascents:indoor_ascents(id, user_id) ) )',
      )
      .eq('center_id', centerId);

    if (!showLegacyTopos) {
      query = query.or('legacy.eq.false,legacy.is.null');
    }

    const { data, error } = await query;
    if (error) throw error;

    const userId = this.authState.userProfile()?.id;
    return (data || []).map((t) => {
      const row = t as IndoorTopoQueryRow;
      const grades: Record<number, number> = {};
      const topoRoutes = row.indoor_topo_routes || [];
      let ownAscentsCount = 0;
      for (const tr of topoRoutes) {
        const grade = tr.route?.grade;
        if (grade !== undefined && grade !== null) {
          grades[grade] = (grades[grade] || 0) + 1;
        }
        if (userId && tr.route?.ascents?.some((a) => a.user_id === userId)) {
          ownAscentsCount++;
        }
      }
      return {
        ...row,
        photo: row.image_url,
        grades,
        total_routes: topoRoutes.length,
        own_ascents_count: ownAscentsCount,
        slug: row.id,
        shade_afternoon: false,
        shade_change_hour: null,
        shade_morning: false,
      };
    });
  }

  async checkIn(purchaseId: string): Promise<boolean> {
    const { data: purchase, error: purchaseError } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('remaining_sessions')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    if (
      purchase.remaining_sessions !== null &&
      purchase.remaining_sessions <= 0
    ) {
      throw new Error('No sessions remaining');
    }

    const { error: usageError } = await this.supabase.client
      .from('indoor_voucher_usage')
      .insert({ purchase_id: purchaseId });

    if (usageError) throw usageError;

    if (purchase.remaining_sessions !== null) {
      const { error: updateError } = await this.supabase.client
        .from('indoor_voucher_purchases')
        .update({
          remaining_sessions: purchase.remaining_sessions - 1,
          status:
            purchase.remaining_sessions - 1 === 0 ? 'exhausted' : 'active',
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;
    }

    return true;
  }

  // Admin methods
  async updateCenter(
    centerId: string,
    updates: Partial<IndoorCenterDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_centers')
      .update(updates)
      .eq('id', centerId);

    if (error) throw error;
    return true;
  }

  async deleteCenter(centerId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_centers')
      .delete()
      .eq('id', centerId);

    if (error) throw error;
    this.indoorCentersData.indoorCentersResource.reload();
    return true;
  }

  async getSales(centerId: string): Promise<IndoorSaleDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_sales')
      .select('*')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInventory(centerId: string): Promise<IndoorInventoryDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_inventory')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async uploadAsset(
    centerId: string,
    file: File,
    thumbnailFile?: File,
  ): Promise<string | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `centers/${centerId}/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('indoor-assets')
      .upload(filePath, file);

    if (error) throw error;

    if (thumbnailFile) {
      const dotIndex = fileName.lastIndexOf('.');
      const nameWithoutExt =
        dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
      const thumbPath = `centers/${centerId}/${nameWithoutExt}_thumb.webp`;

      const { error: thumbError } = await this.supabase.client.storage
        .from('indoor-assets')
        .upload(thumbPath, thumbnailFile, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (thumbError) {
        console.warn(
          '[IndoorService] Failed to upload thumbnail asset:',
          thumbError,
        );
      }
    }

    return data.path;
  }

  // Indoor Routes management

  /**
   * `indoor_routes` has a unique (center_id, slug) constraint and routes are
   * slugged from their name, so two routes sharing a name collide. Returns the
   * first free variant inside the center: `base`, `base-2`, `base-3`…
   */
  private async uniqueRouteSlug(
    centerId: string | null,
    baseSlug: string,
    excludeRouteId?: string,
  ): Promise<string> {
    if (!centerId || !baseSlug) return baseSlug;

    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select('id, slug')
      .eq('center_id', centerId);

    if (error) throw error;

    const taken = new Set(
      (data ?? [])
        .filter((route) => route.id !== excludeRouteId)
        .map((route) => route.slug),
    );

    if (!taken.has(baseSlug)) return baseSlug;

    let suffix = 2;
    while (taken.has(`${baseSlug}-${suffix}`)) suffix++;
    return `${baseSlug}-${suffix}`;
  }

  /** center_id of a route, only fetched when an update does not carry it. */
  private async getRouteCenterId(routeId: string): Promise<string | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select('center_id')
      .eq('id', routeId)
      .maybeSingle();

    if (error) throw error;
    return data?.center_id ?? null;
  }

  async createRoute(
    payload: Omit<IndoorRouteDto, 'id' | 'created_at'>,
  ): Promise<IndoorRouteDto | null> {
    const baseSlug = payload.slug || slugify(payload.name);
    const slug = await this.uniqueRouteSlug(payload.center_id, baseSlug);
    const toInsert = {
      ...payload,
      slug,
      user_creator_id: payload.user_creator_id ?? this.supabase.authUserId(),
    };

    let { data, error } = await this.supabase.client
      .from('indoor_routes')
      .insert(toInsert)
      .select('*')
      .single();

    // Two routes created at the same time can pick the same slug: retry once
    if (error?.code === '23505') {
      const retrySlug = await this.uniqueRouteSlug(payload.center_id, baseSlug);
      if (retrySlug !== slug) {
        ({ data, error } = await this.supabase.client
          .from('indoor_routes')
          .insert({ ...toInsert, slug: retrySlug })
          .select('*')
          .single());
      }
    }

    if (error) throw error;
    this.equipperService.equipperIndoorRoutesResource.reload();
    return data as IndoorRouteDto;
  }

  async updateRoute(
    id: string,
    updates: Partial<IndoorRouteDto>,
  ): Promise<boolean> {
    let payload = updates;

    if (payload.slug !== undefined) {
      const centerId =
        payload.center_id !== undefined
          ? payload.center_id
          : await this.getRouteCenterId(id);
      payload = {
        ...payload,
        slug: await this.uniqueRouteSlug(
          centerId,
          payload.slug || slugify(payload.name ?? ''),
          id,
        ),
      };
    }

    const { error } = await this.supabase.client
      .from('indoor_routes')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    this.equipperService.equipperIndoorRoutesResource.reload();
    return true;
  }

  async deleteRoute(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_routes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.equipperService.equipperIndoorRoutesResource.reload();
    this.toast.success('messages.toasts.routeDeleted');
    return true;
  }

  // Indoor Topos management
  async createTopo(
    payload: Omit<IndoorTopoDto, 'id' | 'created_at'>,
  ): Promise<IndoorTopoDto | null> {
    const toInsert = {
      ...payload,
      user_creator_id: payload.user_creator_id ?? this.supabase.authUserId(),
    };
    const { data, error } = await this.supabase.client
      .from('indoor_topos')
      .insert(toInsert)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorTopoDto;
  }

  async updateTopo(
    id: string,
    updates: Partial<IndoorTopoDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_topos')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteTopo(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_topos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  openIndoorRouteForm(
    centerId: string,
    routeData?: IndoorRouteDto,
    options?: { hideTopo?: boolean; defaultTopoId?: string },
  ): Promise<IndoorRouteDto | boolean> {
    return firstValueFrom(
      this.dialogs.open<IndoorRouteDto | boolean>(
        new PolymorpheusComponent(IndoorRouteFormComponent),
        {
          label: this.translate.instant(routeData ? 'edit' : 'create'),
          size: 'm',
          data: {
            centerId,
            routeData,
            hideTopo: options?.hideTopo,
            defaultTopoId: options?.defaultTopoId,
          },
          dismissible: false,
        },
      ),
      { defaultValue: false },
    );
  }

  async openIndoorTopoForm(
    centerId: string,
    topoData?: IndoorTopoDto,
  ): Promise<boolean> {
    let initialRoutes: IndoorRouteDto[] & { path?: TopoPath | null }[] = [];
    if (topoData) {
      try {
        await this.supabase.whenReady();
        const { data } = await this.supabase.client
          .from('indoor_topo_routes')
          .select(
            `
            *,
            route: indoor_routes!inner (*)
          `,
          )
          .eq('topo_id', topoData.id)
          .order('number', { ascending: true });

        if (data) {
          initialRoutes = data.map((tr: unknown) => {
            const row = tr as IndoorTopoRouteWithRoute;
            return { ...row.route, path: row.path } as IndoorRouteDto & {
              path?: TopoPath | null;
            };
          });
        }
      } catch (e) {
        console.error('[IndoorService] Error loading initial topo routes:', e);
      }
    }

    return firstValueFrom(
      this.dialogs.open<boolean>(new PolymorpheusComponent(TopoFormComponent), {
        label: this.translate.instant(
          topoData ? 'topos.editTitle' : 'topos.newTitle',
        ),
        size: 'l',
        data: {
          type: 'indoor',
          centerId,
          indoorTopoData: topoData,
          initialRoutes,
          initialRouteIds: initialRoutes.map((r) => r.id),
        },
        dismissible: false,
      }),
      { defaultValue: false },
    );
  }

  // Indoor Vouchers management
  async createVoucher(
    payload: Omit<IndoorVoucherDto, 'id' | 'created_at'>,
  ): Promise<IndoorVoucherDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_vouchers')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorVoucherDto;
  }

  async updateVoucher(
    id: string,
    updates: Partial<IndoorVoucherDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_vouchers')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async deleteVoucher(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_vouchers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // Equipper & Ascent methods for Indoor Routes
  async getRouteBySlug(
    centerSlug: string,
    routeSlug: string,
  ): Promise<IndoorRouteWithExtras | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select(
        '*, center:indoor_centers!inner(name, slug), topo_routes:indoor_topo_routes(topo:indoor_topos(id, name, legacy))',
      )
      .eq('slug', routeSlug)
      .eq('center.slug', centerSlug)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const route = data as IndoorRouteDto & {
      center?: { name: string; slug: string } | null;
      topo_routes?: {
        topo: Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> | null;
      }[];
    };
    const equippers = await this.getRouteEquippers(route.id);
    const topos = (route.topo_routes ?? [])
      .map((entry) => entry.topo)
      .filter(
        (topo): topo is Pick<IndoorTopoDto, 'id' | 'name' | 'legacy'> =>
          topo !== null,
      );
    return {
      ...route,
      center_name: route.center?.name,
      center_slug: route.center?.slug,
      equippers,
      topos,
    } as IndoorRouteWithExtras;
  }

  async getRouteEquippers(routeId: string): Promise<EquipperDto[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_route_equippers')
      .select('equipper:equippers(*)')
      .eq('route_id', routeId);
    if (error) throw error;
    return (data ?? [])
      .map((item) => item.equipper)
      .filter((equipper): equipper is EquipperDto => equipper !== null);
  }

  async setRouteEquippers(
    routeId: string,
    equippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    if (!this.isBrowser) return;
    await this.supabase.whenReady();

    try {
      const equipperIds: number[] = [];
      const stringEquippers = equippers
        .filter((e): e is string => typeof e === 'string')
        .map((e) => e.trim());

      const existingEquipperMap = new Map<string, number>();

      if (stringEquippers.length > 0) {
        const orQuery = stringEquippers
          .map((name) => `name.ilike.${name.replace(/,/g, '\\,')}`)
          .join(',');

        const { data: existing, error: existingError } =
          await this.supabase.client
            .from('equippers')
            .select('id, name')
            .or(orQuery);

        if (existingError) throw existingError;

        if (existing) {
          for (const eq of existing) {
            existingEquipperMap.set(eq.name.toLowerCase(), eq.id);
          }
        }

        const toCreateNames = Array.from(
          new Set(
            stringEquippers.filter(
              (name) => !existingEquipperMap.has(name.toLowerCase()),
            ),
          ),
        );

        if (toCreateNames.length > 0) {
          const payloads = toCreateNames.map((name) => ({ name }));
          const { data: created, error: createError } =
            await this.supabase.client
              .from('equippers')
              .insert(payloads)
              .select('id, name');

          if (createError) throw createError;

          if (created) {
            for (const eq of created) {
              existingEquipperMap.set(eq.name.toLowerCase(), eq.id);
            }
          }
        }
      }

      for (const item of equippers) {
        if (typeof item === 'string') {
          const id = existingEquipperMap.get(item.trim().toLowerCase());
          if (id !== undefined) equipperIds.push(id);
        } else {
          equipperIds.push(Number(item.id));
        }
      }

      // Sync junction table
      await this.supabase.client
        .from('indoor_route_equippers')
        .delete()
        .eq('route_id', routeId);

      if (equipperIds.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('indoor_route_equippers')
          .insert(
            equipperIds.map((id) => ({ route_id: routeId, equipper_id: id })),
          );

        if (insertError) throw insertError;
      }
    } catch (e) {
      console.error('[IndoorService] setRouteEquippers error', e);
      throw e;
    }
  }

  async getRouteAscents(routeId: string): Promise<IndoorAscentWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .select(
        '*, route:indoor_routes(id, name, slug, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .eq('route_id', routeId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((ascent) => {
      const row = ascent as IndoorAscentQueryRow;
      return {
        ...row,
        route: row.route
          ? {
              ...row.route,
              center_slug: row.route.center?.slug,
              center_name: row.route.center?.name,
            }
          : undefined,
        user: row.user_profile,
      } as IndoorAscentWithExtras;
    });
  }

  async getCenterAscents(centerId: string): Promise<IndoorAscentWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    // First, let's get all route IDs for this center
    const { data: routes, error: routesError } = await this.supabase.client
      .from('indoor_routes')
      .select('id')
      .eq('center_id', centerId);

    if (routesError) throw routesError;
    if (!routes || routes.length === 0) return [];

    const routeIds = routes.map((r) => r.id);

    // Then get all ascents for these route IDs
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .select(
        '*, route:indoor_routes(id, name, slug, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .in('route_id', routeIds)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((ascent) => {
      const row = ascent as IndoorAscentQueryRow;
      return {
        ...row,
        route: row.route
          ? {
              ...row.route,
              center_slug: row.route.center?.slug,
              center_name: row.route.center?.name,
            }
          : undefined,
        user: row.user_profile,
      } as IndoorAscentWithExtras;
    });
  }

  async createRouteAscent(payload: {
    route_id: string;
    user_id: string;
    attempts?: number | null;
    private_ascent?: boolean | null;
    rate?: number | null;
    recommended?: boolean | null;
    grade?: number | null;
    video_url?: string | null;
    photo_path?: string | null;
    type: string;
    date: string;
    notes?: string | null;
  }): Promise<IndoorAscentWithExtras> {
    const { data, error } = await this.supabase.client
      .from('indoor_ascents')
      .insert(payload)
      .select(
        '*, route:indoor_routes(id, name, slug, color, climbing_kind, grade, center:indoor_centers(id, name, slug)), user_profile:user_profiles(id, name, avatar)',
      )
      .single();

    if (error) throw error;
    this.reloadCenterRoutes();
    this.equipperService.equipperIndoorRoutesResource.reload();
    this.toast.success('messages.toasts.ascentCreated');
    const row = data as IndoorAscentQueryRow;
    const result = {
      ...row,
      route: row.route
        ? {
            ...row.route,
            center_slug: row.route.center?.slug,
            center_name: row.route.center?.name,
          }
        : undefined,
      user: row.user_profile,
    } as IndoorAscentWithExtras;
    this.ascentsService.notifyAscentCreated(
      result as unknown as RouteAscentWithExtras,
    );
    return result;
  }

  async updateRouteAscent(
    id: string,
    updates: {
      type?: string;
      date?: string;
      notes?: string | null;
      attempts?: number | null;
      private_ascent?: boolean | null;
      rate?: number | null;
      recommended?: boolean | null;
      grade?: number | null;
      video_url?: string | null;
      photo_path?: string | null;
    },
  ): Promise<void> {
    const { error } = await this.supabase.client
      .from('indoor_ascents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    this.reloadCenterRoutes();
    this.equipperService.equipperIndoorRoutesResource.reload();
    this.ascentsService.notifyAscentUpdated(
      id,
      updates as Partial<RouteAscentWithExtras>,
    );
    this.toast.success('messages.toasts.ascentUpdated');
  }

  async uploadPhoto(ascentId: string, file: File): Promise<void> {
    await this.ascentsService.uploadPhoto(ascentId, file, true);
    this.reloadCenterRoutes();
    this.equipperService.equipperIndoorRoutesResource.reload();
  }

  async deletePhoto(ascentId: string): Promise<void> {
    await this.ascentsService.deletePhoto(ascentId, true);
    this.reloadCenterRoutes();
    this.equipperService.equipperIndoorRoutesResource.reload();
  }

  async deleteRouteAscent(ascentId: string): Promise<void> {
    const { data: ascent, error: fetchError } = await this.supabase.client
      .from('indoor_ascents')
      .select('*')
      .eq('id', ascentId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!ascent) return;

    const { error } = await this.supabase.client
      .from('indoor_ascents')
      .delete()
      .eq('id', ascentId);

    if (error) throw error;

    this.reloadCenterRoutes();
    this.equipperService.equipperIndoorRoutesResource.reload();
    this.ascentsService.refreshResources();
    this.ascentsService.notifyAscentDeleted(ascentId);

    this.toast.showWithUndo('messages.toasts.ascentDeleted', () => {
      this.supabase.client
        .from('indoor_ascents')
        .insert(ascent as IndoorAscentInsertDto)
        .then(({ error: undoError }) => {
          if (undoError) {
            handleErrorToast(undoError, this.toast);
          } else {
            this.reloadCenterRoutes();
            this.indoorData.indoorRouteDetailResource.reload();
            this.indoorData.topoDetailResource.reload();
            this.equipperService.equipperIndoorRoutesResource.reload();
            this.ascentsService.refreshResources();
            this.ascentsService.notifyAscentCreated(
              ascent as unknown as RouteAscentWithExtras,
            );
          }
        });
    });
  }

  // --- Indoor Center Admin Requests ---
  async requestIndoorCenterAdmin(centerId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const userId = this.authState.userProfile()?.id;
    if (!userId) return false;

    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('indoor_center_admin_requests')
        .insert({ center_id: centerId, user_id: userId });

      if (error) {
        if (error.code === '23505') {
          this.toast.info('admin.indoorAdminRequests.alreadyRequested');
          return true;
        }
        throw error;
      }

      this.toast.success('admin.indoorAdminRequests.requestSent');
      return true;
    } catch (e) {
      console.error('[IndoorService] requestIndoorCenterAdmin error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getIndoorCenterAdminRequests(): Promise<
    IndoorCenterAdminRequestWithCenter[]
  > {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_center_admin_requests')
      .select(
        'id, created_at, center:indoor_centers(id, name, slug), user:user_profiles(id, name, avatar)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[IndoorService] getIndoorCenterAdminRequests error',
        error,
      );
      return [];
    }
    return (data || []) as unknown as IndoorCenterAdminRequestWithCenter[];
  }

  async approveIndoorCenterAdminRequest(
    requestId: string,
    centerId: string,
    userId: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error: insertError } = await this.supabase.client
        .from('indoor_center_admins')
        .insert({ center_id: centerId, user_id: userId, role: 'admin' });

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
      }

      const { error: deleteError } = await this.supabase.client
        .from('indoor_center_admin_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      if (userId === this.supabase.authUserId()) {
        this.cache.remove(CACHE_KEYS.adminIndoorCenters(userId));
        this.supabase.adminIndoorCentersResource.reload();
      }

      this.toast.success('admin.indoorAdminRequests.requestApproved');
      return true;
    } catch (e) {
      console.error('[IndoorService] approveIndoorCenterAdminRequest error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async rejectIndoorCenterAdminRequest(requestId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('indoor_center_admin_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      this.toast.success('admin.indoorAdminRequests.requestRejected');
      return true;
    } catch (e) {
      console.error('[IndoorService] rejectIndoorCenterAdminRequest error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  // --- Indoor Center Routesetter Requests ---
  async requestIndoorCenterRoutesetter(centerId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const userId = this.authState.userProfile()?.id;
    if (!userId) return false;

    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('indoor_center_routesetter_requests')
        .insert({ center_id: centerId, user_id: userId });

      if (error) {
        if (error.code === '23505') {
          this.toast.info('admin.routesetterRequests.alreadyRequested');
          return true;
        }
        throw error;
      }

      this.toast.success('admin.routesetterRequests.requestSent');
      return true;
    } catch (e) {
      console.error('[IndoorService] requestIndoorCenterRoutesetter error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getIndoorCenterRoutesetterRequests(
    centerId?: string,
  ): Promise<IndoorCenterRoutesetterRequestWithCenter[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    let query = this.supabase.client
      .from('indoor_center_routesetter_requests')
      .select(
        'id, created_at, center:indoor_centers(id, name, slug), user:user_profiles(id, name, avatar)',
      )
      .order('created_at', { ascending: false });

    if (centerId) {
      query = query.eq('center_id', centerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        '[IndoorService] getIndoorCenterRoutesetterRequests error',
        error,
      );
      return [];
    }
    return (data ||
      []) as unknown as IndoorCenterRoutesetterRequestWithCenter[];
  }

  async approveIndoorCenterRoutesetterRequest(
    requestId: string,
    centerId: string,
    userId: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error: insertError } = await this.supabase.client
        .from('indoor_center_routesetters')
        .insert({ center_id: centerId, user_id: userId });

      if (insertError) {
        if (insertError.code !== '23505') throw insertError;
      }

      const { error: deleteError } = await this.supabase.client
        .from('indoor_center_routesetter_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;

      if (userId === this.supabase.authUserId()) {
        this.supabase.routesetterIndoorCentersResource.reload();
      }

      this.toast.success('admin.routesetterRequests.requestApproved');
      return true;
    } catch (e) {
      console.error(
        '[IndoorService] approveIndoorCenterRoutesetterRequest error',
        e,
      );
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async rejectIndoorCenterRoutesetterRequest(
    requestId: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client
        .from('indoor_center_routesetter_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      this.toast.success('admin.routesetterRequests.requestRejected');
      return true;
    } catch (e) {
      console.error(
        '[IndoorService] rejectIndoorCenterRoutesetterRequest error',
        e,
      );
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
