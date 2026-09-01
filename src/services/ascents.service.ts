import { computed, inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import {
  defer,
  firstValueFrom,
  from,
  Observable,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import {
  AscentDialogData,
  AscentType,
  AscentTypes,
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentUpdateDto,
  RouteAscentWithExtras,
  RouteWithExtras,
  UserProfileBasicDto,
  NotificationTypes,
  RouteAscentCommentDto,
  RouteAscentCommentInsertDto,
  UserAscentStatRecord,
  RouteAscentCommentWithExtras,
} from '../models';

import {
  extractMentionIds,
  getPaginatedProfilesFromJunction,
  handleErrorToast,
} from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { AppNotificationsService } from './app-notifications.service';
import { CragRoutesDataService } from './crag-routes-data.service';
import { EquipperService } from './equipper.service';
import { OutdoorDataService } from './outdoor-data.service';
import { ProfileDataService } from './profile-data.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AscentsService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly profileData = inject(ProfileDataService);
  private readonly outdoorData = inject(OutdoorDataService);
  private readonly cragRoutesData = inject(CragRoutesDataService);
  private readonly equipperService = inject(EquipperService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);
  private readonly notificationsService = inject(AppNotificationsService);

  readonly ascentInfo = computed<
    Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    >
  >(() => {
    const info: Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    > = {
      os: {
        icon: '@tui.eye',
        background: 'var(--tui-status-positive)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      f: {
        icon: '@tui.zap',
        background: 'var(--tui-status-warning)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      rp: {
        icon: '@tui.circle',
        background: 'var(--tui-status-negative)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      attempt: {
        icon: '@tui.circle-dashed',
        background: 'var(--tui-status-neutral)',
        backgroundSubtle: 'var(--tui-status-neutral-pale)',
      },
      default: {
        icon: '@tui.circle',
        background: 'var(--tui-neutral-fill)',
        backgroundSubtle: 'transparent',
      },
    };
    return info;
  });

  async getAscentById(
    id: number | string,
  ): Promise<RouteAscentWithExtras | null> {
    if (!id) return null;
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const isNumericId = typeof id === 'number' || /^\d+$/.test(String(id));

    // Try outdoor ascents first (only for numeric IDs)
    if (isNumericId) {
      const { data } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          *,
          route:routes(
            *,
            crag:crags(
              slug,
              name,
              area_id,
              area:areas(slug, name)
            )
          )
        `,
        )
        .eq('id', id as number)
        .maybeSingle()
        .overrideTypes<
          (RouteAscentDto & { route: Record<string, unknown> | null }) | null
        >();

      if (data) {
        const a = data;

        const { data: user } = await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .eq('id', a.user_id)
          .maybeSingle();

        let mappedRoute: RouteWithExtras | undefined = undefined;
        if (a.route) {
          const routeRaw = Array.isArray(a.route) ? a.route[0] : a.route;
          const routeData = routeRaw as Record<string, unknown>;
          const cragData = (
            Array.isArray(routeData['crag'])
              ? routeData['crag'][0]
              : routeData['crag']
          ) as Record<string, unknown> | undefined;
          const areaData = (
            Array.isArray(cragData?.['area'])
              ? cragData?.['area'][0]
              : cragData?.['area']
          ) as Record<string, unknown> | undefined;

          mappedRoute = {
            ...(routeData as unknown as RouteWithExtras),
            area_id: cragData?.['area_id'] as number,
            crag_slug: cragData?.['slug'] as string,
            crag_name: cragData?.['name'] as string,
            area_slug: areaData?.['slug'] as string,
            area_name: areaData?.['name'] as string,
          } as RouteWithExtras;
        }

        return {
          ...a,
          user: (user as UserProfileBasicDto) || undefined,
          route: mappedRoute,
        } as RouteAscentWithExtras;
      }
    }

    // Fallback: try indoor ascents
    const { data: indoorData, error: indoorError } = await this.supabase.client
      .from('indoor_ascents')
      .select(
        `
        *,
        route:indoor_routes(
          id, name, grade, climbing_kind,
          center:indoor_centers(id, name, slug)
        )
      `,
      )
      .eq('id', String(id))
      .maybeSingle();

    if (indoorError || !indoorData) {
      if (indoorError)
        console.error(
          '[AscentsService] getAscentById indoor error',
          indoorError,
        );
      return null;
    }

    const ia = indoorData as Record<string, unknown>;
    const iRoute = Array.isArray(ia['route'])
      ? (ia['route'][0] as Record<string, unknown> | undefined)
      : (ia['route'] as Record<string, unknown> | undefined);
    const iCenter = iRoute
      ? Array.isArray(iRoute['center'])
        ? (iRoute['center'][0] as Record<string, unknown> | undefined)
        : (iRoute['center'] as Record<string, unknown> | undefined)
      : undefined;

    const { data: indoorUser } = await this.supabase.client
      .from('user_profiles')
      .select('id, name, avatar')
      .eq('id', ia['user_id'] as string)
      .maybeSingle();

    const mappedIndoorRoute = iRoute
      ? ({
          id: iRoute['id'],
          name: iRoute['name'],
          grade: iRoute['grade'],
          climbing_kind: iRoute['climbing_kind'],
          center_slug: iCenter?.['slug'],
          center_name: iCenter?.['name'],
          slug: iRoute['name'],
          liked: false,
          project: false,
        } as unknown as RouteWithExtras)
      : undefined;

    return {
      ...ia,
      comment: (ia['notes'] as string) ?? (ia['comment'] as string) ?? null,
      user: (indoorUser as UserProfileBasicDto) || undefined,
      route: mappedIndoorRoute,
    } as unknown as RouteAscentWithExtras;
  }

  async getUserStats(userId: string): Promise<UserAscentStatRecord[]> {
    if (!userId || !this.isBrowser) return [];
    await this.supabase.whenReady();

    interface OutdoorQueryResult {
      id: number;
      date: string | null;
      type: string | null;
      grade: number | null;
      attempts: number | null;
      private_ascent: boolean | null;
      route: {
        grade: number;
        climbing_kind: string | null;
        name: string;
        slug: string;
        crag: {
          name: string;
          slug: string;
          area: {
            name: string;
            slug: string;
          } | null;
        } | null;
      } | null;
    }

    interface IndoorQueryResult {
      id: string;
      date: string;
      type: string;
      grade: number | null;
      attempts: number | null;
      private_ascent: boolean | null;
      route: {
        grade: number | null;
        climbing_kind: string | null;
        name: string;
        slug: string;
        center: { slug: string } | null;
      } | null;
    }

    const outdoorQuery = this.supabase.client
      .from('route_ascents')
      .select(
        `
        id,
        date,
        type,
        grade,
        attempts,
        private_ascent,
        route:routes (
          grade,
          climbing_kind,
          name,
          slug,
          crag:crags (
            name,
            slug,
            area:areas (
              name,
              slug
            )
          )
        )
      `,
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .overrideTypes<OutdoorQueryResult[]>();

    const indoorQuery = this.supabase.client
      .from('indoor_ascents')
      .select(
        `
        id,
        date,
        type,
        grade,
        attempts,
        private_ascent,
        route:indoor_routes (
          grade,
          climbing_kind,
          name,
          slug,
          center:indoor_centers (
            slug
          )
        )
      `,
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .overrideTypes<IndoorQueryResult[]>();

    const [outdoorResult, indoorResult] = await Promise.all([
      outdoorQuery,
      indoorQuery,
    ]);

    if (outdoorResult.error) {
      console.error(
        '[AscentsService] getUserStats outdoor error',
        outdoorResult.error,
      );
    }
    if (indoorResult.error) {
      console.error(
        '[AscentsService] getUserStats indoor error',
        indoorResult.error,
      );
    }

    const outdoorStats = (outdoorResult.data ?? []).map((a) => {
      const route = a.route;
      const crag = route?.crag;
      const area = crag?.area;

      return {
        id: Number(a.id),
        ascent_date: a.date || '',
        ascent_type: a.type || AscentTypes.RP,
        ascent_grade: a.grade,
        attempts: a.attempts,
        private_ascent: a.private_ascent ?? false,
        route_grade: route?.grade || 0,
        climbing_kind: route?.climbing_kind,
        route_name: route?.name || '',
        route_slug: route?.slug || '',
        crag_name: crag?.name || '',
        crag_slug: crag?.slug || '',
        area_name: area?.name || '',
        area_slug: area?.slug || '',
      } satisfies UserAscentStatRecord;
    });
    const indoorStats = (indoorResult.data ?? []).map(
      (a) =>
        ({
          id: Number(a.id),
          ascent_date: a.date || '',
          ascent_type: a.type || AscentTypes.RP,
          ascent_grade: a.grade,
          attempts: a.attempts,
          private_ascent: a.private_ascent ?? false,
          route_grade: a.route?.grade || 0,
          climbing_kind: a.route?.climbing_kind,
          route_name: a.route?.name || '',
          route_slug: a.route?.slug || '',
          crag_name: '',
          crag_slug: '',
          area_name: '',
          area_slug: '',
          is_indoor: true,
          center_slug: a.route?.center?.slug,
        }) satisfies UserAscentStatRecord,
    );

    return [...outdoorStats, ...indoorStats];
  }

  /** Lightweight: fetch only date+type for all ascents of a user, to power calendar markers. */
  async getUserAscentDates(
    userId: string,
  ): Promise<{ date: string; type: string }[]> {
    if (!userId || !this.isBrowser) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .select('date, type')
      .eq('user_id', userId)
      .not('date', 'is', null)
      .order('date', { ascending: false });

    if (error) {
      console.error('[AscentsService] getUserAscentDates error', error);
      return [];
    }

    return (data ?? []).map((r) => ({
      date: r.date ?? '',
      type: r.type ?? AscentTypes.RP,
    }));
  }

  /** Fetch full stat records for a specific month (year + 1-based month). */
  async getUserAscentsByMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<UserAscentStatRecord[]> {
    if (!userId || !this.isBrowser) return [];
    await this.supabase.whenReady();

    const from_ = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .select(
        `
        id,
        date,
        type,
        grade,
        attempts,
        private_ascent,
        route:routes (
          grade,
          name,
          slug,
          crag:crags (
            name,
            slug,
            area:areas (
              name,
              slug
            )
          )
        )
      `,
      )
      .eq('user_id', userId)
      .gte('date', from_)
      .lte('date', to)
      .order('date', { ascending: false })
      .overrideTypes<MonthQueryResult[]>();

    if (error) {
      console.error('[AscentsService] getUserAscentsByMonth error', error);
      return [];
    }

    interface MonthQueryResult {
      id: number;
      date: string | null;
      type: string | null;
      grade: number | null;
      attempts: number | null;
      private_ascent: boolean | null;
      route: {
        grade: number;
        name: string;
        slug: string;
        crag: {
          name: string;
          slug: string;
          area: { name: string; slug: string } | null;
        } | null;
      } | null;
    }

    return (data ?? []).map((a) => {
      const route = a.route;
      const crag = route?.crag;
      const area = crag?.area;
      return {
        id: a.id,
        ascent_date: a.date ?? '',
        ascent_type: a.type ?? AscentTypes.RP,
        ascent_grade: a.grade,
        attempts: a.attempts,
        private_ascent: a.private_ascent ?? false,
        route_grade: route?.grade ?? 0,
        route_name: route?.name ?? '',
        route_slug: route?.slug ?? '',
        crag_name: crag?.name ?? '',
        crag_slug: crag?.slug ?? '',
        area_name: area?.name ?? '',
        area_slug: area?.slug ?? '',
      } satisfies UserAscentStatRecord;
    });
  }

  async uploadPhoto(ascentId: number, file: File): Promise<void> {
    if (!this.isBrowser) return;

    const toBase64 = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64 = await toBase64(file);
      await this.supabase.whenReady();
      const { error } = await this.supabase.client.functions.invoke(
        'upload-route-ascent-photo',
        {
          body: {
            file_name: file.name,
            content_type: file.type,
            base64,
          },
          headers: {
            'ascent-id': ascentId.toString(),
            'ngsw-bypass': 'true',
          },
        },
      );

      if (error) throw error;

      this.toast.success('messages.toasts.ascentUpdated');
      this.refreshResources(ascentId);
      this.ascentUpdated$.next({ id: ascentId });
    } catch (e) {
      console.error('[AscentsService] uploadPhoto error', e);
      throw e;
    }
  }

  async deletePhoto(ascentId: number): Promise<void> {
    if (!this.isBrowser) return;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client.functions.invoke(
      'delete-route-ascent-photo',
      {
        headers: {
          'ascent-id': ascentId.toString(),
          'ngsw-bypass': 'true',
        },
      },
    );

    if (error) {
      console.error('[AscentsService] deletePhoto error', error);
      throw error;
    }

    this.refreshResources(ascentId);
    this.ascentUpdated$.next({ id: ascentId });
  }

  openAscentDialog(ascentId: number | string): Observable<void> {
    return defer(() =>
      from(import('../components/dialogs/ascent-dialog')),
    ).pipe(
      switchMap(({ AscentDialogComponent }) =>
        this.dialogs.open<void>(
          new PolymorpheusComponent(AscentDialogComponent),
          {
            data: { ascentId },
            label: this.translate.instant('ascent'),
            size: 'm',
          },
        ),
      ),
    );
  }

  viewAscent(ascentId: number | string): void {
    void firstValueFrom(this.openAscentDialog(ascentId), {
      defaultValue: undefined,
    });
  }

  openAscentForm(data: AscentDialogData): Observable<boolean> {
    return defer(() => from(import('../components/forms/ascent-form'))).pipe(
      switchMap(({ default: AscentFormComponent }) =>
        this.dialogs.open<boolean>(
          new PolymorpheusComponent(AscentFormComponent),
          {
            label: this.translate.instant(
              data.ascentData ? 'ascent.edit' : 'ascent.new',
            ),
            size: 'm',
            data,
            dismissible: false,
          },
        ),
      ),
      tap((res) => {
        if (res === null || res) {
          void this.refreshResources();
        }
      }),
    );
  }

  async create(
    payload: Omit<RouteAscentInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteAscentDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] create error', error);
      throw error;
    }
    this.refreshResources();
    this.ascentCreated$.next(data as RouteAscentDto);
    this.toast.success('messages.toasts.ascentCreated');
    return data as RouteAscentDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteAscentUpdateDto, 'id' | 'created_at'>>,
  ): Promise<RouteAscentDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] update error', error);
      throw error;
    }
    this.refreshResources(id, payload as Partial<RouteAscentWithExtras>);
    this.ascentUpdated$.next({
      id,
      changes: payload as Partial<RouteAscentWithExtras>,
    });
    this.toast.success('messages.toasts.ascentUpdated');
    return data as RouteAscentDto;
  }

  async delete(id: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();

    const { data: ascent, error: fetchError } = await this.supabase.client
      .from('route_ascents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[AscentsService] fetch error before delete', fetchError);
      throw fetchError;
    }
    if (!ascent) return false;

    const { error } = await this.supabase.client
      .from('route_ascents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[AscentsService] delete error', error);
      throw error;
    }

    // Update resources by removing the ascent
    const removeFn = (
      data: { items: RouteAscentWithExtras[]; total: number } | undefined,
    ) => {
      if (!data) return { items: [], total: 0 };
      const newItems = data.items.filter((item) => item.id !== id);
      const wasRemoved = newItems.length !== data.items.length;
      if (!wasRemoved) return data;

      return {
        items: newItems,
        total: Math.max(0, data.total - 1),
      };
    };

    // Specifically target the user ascents resource which powers the profile list
    if (this.profileData.userAscentsResource.value()) {
      this.profileData.userAscentsResource.update(removeFn);
    }

    // Also update route ascents if present
    if (this.outdoorData.routeAscentsResource.value()) {
      this.outdoorData.routeAscentsResource.update(removeFn);
    }

    this.refreshResources();
    this.ascentDeleted$.next(id);

    this.toast.showWithUndo('messages.toasts.ascentDeleted', () => {
      this.supabase.client
        .from('route_ascents')
        .insert(ascent as RouteAscentInsertDto)
        .then(({ error: undoError }) => {
          if (undoError) {
            handleErrorToast(undoError, this.toast);
          } else {
            this.refreshResources();
            this.profileData.userAscentsResource.reload();
            this.outdoorData.routeAscentsResource.reload();
            this.ascentCreated$.next(ascent as unknown as RouteAscentDto);
          }
        });
    });

    return true;
  }

  private readonly ascentLikesUpdate$ = new Subject<{
    ascentId: number;
    user_liked: boolean;
    likes_count: number;
  }>();

  private readonly ascentCommentsUpdate$ = new Subject<number>();

  private readonly ascentDeleted$ = new Subject<number | string>();
  private readonly ascentUpdated$ = new Subject<{
    id: number | string;
    changes?: Partial<RouteAscentWithExtras>;
  }>();
  private readonly ascentCreated$ = new Subject<
    RouteAscentDto | RouteAscentWithExtras | void
  >();

  get ascentLikesUpdate() {
    return this.ascentLikesUpdate$.asObservable();
  }

  get ascentCommentsUpdate() {
    return this.ascentCommentsUpdate$.asObservable();
  }

  get ascentDeleted() {
    return this.ascentDeleted$.asObservable();
  }

  get ascentUpdated() {
    return this.ascentUpdated$.asObservable();
  }

  get ascentCreated() {
    return this.ascentCreated$.asObservable();
  }

  notifyAscentDeleted(id: number | string): void {
    this.ascentDeleted$.next(id);
  }

  notifyAscentUpdated(
    id: number | string,
    changes?: Partial<RouteAscentWithExtras>,
  ): void {
    this.ascentUpdated$.next({ id, changes });
  }

  notifyAscentCreated(data?: RouteAscentDto | RouteAscentWithExtras): void {
    this.ascentCreated$.next(data);
  }

  async toggleLike(ascentId: number): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client.rpc(
      'toggle_route_ascent_like',
      {
        p_route_ascent_id: ascentId,
      },
    );
    if (error) {
      console.error('[AscentsService] toggleLike error', error);
      throw error;
    }

    if (data) {
      void this.triggerLikeNotification(ascentId);
    }

    return data;
  }

  private async triggerLikeNotification(ascentId: number) {
    const { data: ascent } = await this.supabase.client
      .from('route_ascents')
      .select('user_id')
      .eq('id', ascentId)
      .single();

    if (ascent) {
      await this.notificationsService.createNotification({
        user_id: ascent.user_id,
        actor_id: this.supabase.authUserId()!,
        type: NotificationTypes.LIKE,
        resource_id: ascentId.toString(),
      });
    }
  }

  async getLikesInfo(ascentId: number): Promise<{
    likes_count: number;
    user_liked: boolean;
  }> {
    if (!this.isBrowser) {
      return { likes_count: 0, user_liked: false };
    }
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();

    const { error, count } = await this.supabase.client
      .from('route_ascent_likes')
      .select('id', { count: 'exact', head: true })
      .eq('route_ascent_id', ascentId);

    if (error) {
      console.error('[AscentsService] getLikesInfo count error', error);
      throw error;
    }

    let user_liked = false;
    if (userId) {
      const { data: likeData, error: likeError } = await this.supabase.client
        .from('route_ascent_likes')
        .select('id')
        .eq('route_ascent_id', ascentId)
        .eq('user_id', userId)
        .maybeSingle();

      if (likeError) {
        console.error(
          '[AscentsService] getLikesInfo like status error',
          likeError,
        );
      }
      user_liked = !!likeData;
    }

    return {
      likes_count: count ?? 0,
      user_liked,
    };
  }

  async getLikesPaginated(
    ascentId: number,
    page = 0,
    pageSize = 20,
    query = '',
  ): Promise<{ items: UserProfileBasicDto[]; total: number }> {
    if (!this.isBrowser) return { items: [], total: 0 };
    await this.supabase.whenReady();

    return getPaginatedProfilesFromJunction(
      this.supabase.client,
      'route_ascent_likes',
      'route_ascent_id',
      ascentId,
      page,
      pageSize,
      query,
      'getLikesPaginated',
    );
  }

  async getCommentsCount(ascentId: number): Promise<number> {
    if (!this.isBrowser) return 0;
    await this.supabase.whenReady();

    const { error, count } = await this.supabase.client
      .from('route_ascent_comments')
      .select('id', { count: 'exact', head: true })
      .eq('route_ascent_id', ascentId);

    if (error) {
      console.error('[AscentsService] getCommentsCount error', error);
      throw error;
    }

    return count ?? 0;
  }

  async toggleCommentLike(commentId: number): Promise<boolean | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client.rpc(
      'toggle_comment_like',
      {
        p_comment_id: commentId,
      },
    );
    if (error) {
      console.error('[AscentsService] toggleCommentLike error', error);
      throw error;
    }
    if (data) {
      void this.triggerCommentLikeNotification(commentId);
    }
    return data;
  }

  async getCommentLikesPaginated(
    commentId: number,
    page = 0,
    pageSize = 20,
    query = '',
  ): Promise<{ items: UserProfileBasicDto[]; total: number }> {
    if (!this.isBrowser) return { items: [], total: 0 };
    await this.supabase.whenReady();

    return getPaginatedProfilesFromJunction(
      this.supabase.client,
      'route_ascent_comment_likes',
      'comment_id',
      commentId,
      page,
      pageSize,
      query,
      'getCommentLikesPaginated',
    );
  }

  async getLastComment(
    ascentId: number,
  ): Promise<RouteAscentCommentWithExtras | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    // Reuse the logic from getComments but for one item
    type CommentWithLikes = RouteAscentCommentDto & {
      likes: { count: number }[];
    };

    const { data: comment, error: commentError } = await this.supabase.client
      .from('route_ascent_comments')
      .select('*, likes:route_ascent_comment_likes(count)')
      .eq('route_ascent_id', ascentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (commentError || !comment) {
      if (commentError)
        console.error('[AscentsService] getLastComment error', commentError);
      return null;
    }

    const { data: user, error: userError } = await this.supabase.client
      .from('user_profiles')
      .select('id, name, avatar')
      .eq('id', (comment as RouteAscentCommentDto).user_id)
      .maybeSingle();

    if (userError || !user) return null;

    const currentUserId = this.supabase.authUserId();
    let userLiked = false;
    if (currentUserId) {
      const { data: like } = await this.supabase.client
        .from('route_ascent_comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .eq('comment_id', (comment as RouteAscentCommentDto).id)
        .maybeSingle();
      userLiked = !!like;
    }

    const c = comment as CommentWithLikes;
    return {
      ...c,
      user_profiles: user as UserProfileBasicDto,
      likes_count: c.likes?.[0]?.count ?? 0,
      user_liked: userLiked,
    } as RouteAscentCommentWithExtras;
  }

  async getComments(ascentId: number): Promise<RouteAscentCommentWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    type CommentWithLikes = RouteAscentCommentDto & {
      likes: { count: number }[];
    };

    // 1. Fetch comments with likes count
    const { data: commentsData, error: commentsError } =
      await this.supabase.client
        .from('route_ascent_comments')
        .select(
          `
        *,
        likes:route_ascent_comment_likes(count)
      `,
        )
        .eq('route_ascent_id', ascentId)
        .order('created_at', { ascending: true });

    if (commentsError) {
      console.error('[AscentsService] getComments error', commentsError);
      throw commentsError;
    }

    if (!commentsData || commentsData.length === 0) {
      return [];
    }

    // 2. Fetch profiles
    const userIds: string[] = Array.from(
      new Set(commentsData.map((c) => c.user_id)),
    );
    const { data: profilesData, error: profilesError } =
      await this.supabase.client
        .from('user_profiles')
        .select('id, name, avatar')
        .in('id', userIds);

    if (profilesError) {
      console.error(
        '[AscentsService] getComments profiles error',
        profilesError,
      );
      throw profilesError;
    }

    const profileMap = new Map(profilesData?.map((p) => [p.id, p]));

    // 3. Fetch user likes for these comments
    const likedCommentIds = new Set<number>();
    const currentUserId = this.supabase.authUserId();
    if (currentUserId) {
      const commentIds: number[] = commentsData.map((c) => c.id);
      const { data: myLikes } = await this.supabase.client
        .from('route_ascent_comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .in('comment_id', commentIds);

      if (myLikes) {
        myLikes.forEach((l) => likedCommentIds.add(l.comment_id));
      }
    }

    return (commentsData as CommentWithLikes[])
      .map((comment) => {
        return {
          ...comment,
          user_profiles: profileMap.get(comment.user_id)!,
          likes_count: comment.likes?.[0]?.count ?? 0,
          user_liked: likedCommentIds.has(comment.id),
        };
      })
      .filter((c) => !!c.user_profiles) as RouteAscentCommentWithExtras[];
  }

  async addComment(
    ascentId: number,
    comment: string,
  ): Promise<RouteAscentCommentDto | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const userId = this.supabase.authUserId();
    if (!userId) return null;

    const payload: RouteAscentCommentInsertDto = {
      route_ascent_id: ascentId,
      user_id: userId,
      comment,
    };

    const { data, error } = await this.supabase.client
      .from('route_ascent_comments')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[AscentsService] addComment error', error);
      throw error;
    }

    if (data) {
      void this.triggerCommentNotification(ascentId);
      void this.triggerMentionNotification(ascentId, comment);
    }

    this.refreshComments(ascentId);

    return data;
  }

  private async triggerCommentNotification(ascentId: number) {
    const { data: ascent } = await this.supabase.client
      .from('route_ascents')
      .select('user_id')
      .eq('id', ascentId)
      .single();

    if (ascent) {
      await this.notificationsService.createNotification({
        user_id: ascent.user_id,
        actor_id: this.supabase.authUserId()!,
        type: NotificationTypes.COMMENT,
        resource_id: ascentId.toString(),
      });
    }
  }

  private async triggerCommentLikeNotification(commentId: number) {
    const { data: comment } = await this.supabase.client
      .from('route_ascent_comments')
      .select('user_id, route_ascent_id')
      .eq('id', commentId)
      .single();

    if (comment) {
      await this.notificationsService.createNotification({
        user_id: comment.user_id,
        actor_id: this.supabase.authUserId()!,
        type: NotificationTypes.LIKED_COMMENT,
        resource_id: comment.route_ascent_id.toString(),
      });
    }
  }

  private async triggerMentionNotification(ascentId: number, comment: string) {
    const mentionedUserIds = extractMentionIds(comment);
    const currentUserId = this.supabase.authUserId();

    const payloads = mentionedUserIds
      .filter((userId) => userId !== currentUserId)
      .map((userId) => ({
        user_id: userId,
        actor_id: currentUserId!,
        type: NotificationTypes.MENTION,
        resource_id: ascentId.toString(),
      }));

    if (payloads.length > 0) {
      await this.notificationsService.createNotifications(payloads);
    }
  }

  async deleteComment(ascentId: number, commentId: number): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client
      .from('route_ascent_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('[AscentsService] deleteComment error', error);
      throw error;
    }

    this.refreshComments(ascentId);

    return true;
  }

  refreshComments(ascentId: number): void {
    this.ascentCommentsUpdate$.next(ascentId);
  }

  openCommentsDialog(ascentId: number): Observable<void> {
    return defer(() =>
      from(import('../components/dialogs/ascent-comments-dialog')),
    ).pipe(
      switchMap(({ AscentCommentsDialogComponent }) =>
        this.dialogs.open<void>(
          new PolymorpheusComponent(AscentCommentsDialogComponent),
          {
            data: { ascentId },
            label: this.translate.instant('comments'),
            size: 'm',
          },
        ),
      ),
    );
  }

  refreshResources(
    ascentId?: number,
    changes?: Partial<RouteAscentWithExtras>,
  ): void {
    if (ascentId && changes) {
      if (
        changes.user_liked !== undefined &&
        changes.likes_count !== undefined
      ) {
        this.ascentLikesUpdate$.next({
          ascentId,
          user_liked: changes.user_liked,
          likes_count: changes.likes_count,
        });
      }

      const updateFn = (
        data: { items: RouteAscentWithExtras[]; total: number } | undefined,
      ) => {
        if (!data) return { items: [], total: 0 };
        return {
          ...data,
          items: data.items.map((item) =>
            item.id === ascentId ? { ...item, ...changes } : item,
          ),
        };
      };

      this.profileData.userAscentsResource.update(updateFn);
      this.outdoorData.routeAscentsResource.update(updateFn);
    } else {
      this.profileData.userAscentsResource.reload();
      this.outdoorData.routeAscentsResource.reload();
    }

    this.outdoorData.routeDetailResource.reload();
    this.cragRoutesData.cragRoutesResource.reload();
    this.outdoorData.topoDetailResource.reload();
    this.profileData.userProjectsResource.reload();
    this.profileData.userTotalAscentsCountResource.reload();
    this.equipperService.equipperRoutesResource.reload();
    this.equipperService.equipperIndoorRoutesResource.reload();
  }
}
