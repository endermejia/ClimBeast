import { inject, Injectable, signal } from '@angular/core';

import {
  IndoorCenterAdminRequestWithCenter,
  IndoorCenterRoutesetterRequestWithCenter,
} from '../models';

import { CACHE_KEYS } from '../constants';

import { IS_BROWSER } from '../app/is-browser';
import { AuthStateService } from './auth-state.service';
import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

type IndoorRequestTable =
  'indoor_center_admin_requests' | 'indoor_center_routesetter_requests';

type IndoorRequestToastPrefix =
  'admin.indoorAdminRequests' | 'admin.routesetterRequests';

const REQUEST_SELECT =
  'id, created_at, center:indoor_centers(id, name, slug), user:user_profiles(id, name, avatar)';

@Injectable({
  providedIn: 'root',
})
export class IndoorRequestsService {
  private readonly supabase = inject(SupabaseService);
  private readonly authState = inject(AuthStateService);
  private readonly cache = inject(CacheService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = inject(IS_BROWSER);

  readonly loading = signal(false);

  // --- Indoor Center Admin Requests ---

  requestIndoorCenterAdmin(centerId: string): Promise<boolean> {
    return this.submitRequest(
      'indoor_center_admin_requests',
      'admin.indoorAdminRequests',
      centerId,
      'requestIndoorCenterAdmin',
    );
  }

  getIndoorCenterAdminRequests(): Promise<
    IndoorCenterAdminRequestWithCenter[]
  > {
    return this.fetchRequests<IndoorCenterAdminRequestWithCenter>(
      'indoor_center_admin_requests',
      'getIndoorCenterAdminRequests',
    );
  }

  approveIndoorCenterAdminRequest(
    requestId: string,
    centerId: string,
    userId: string,
  ): Promise<boolean> {
    return this.approveRequest({
      requestTable: 'indoor_center_admin_requests',
      toastPrefix: 'admin.indoorAdminRequests',
      requestId,
      userId,
      logLabel: 'approveIndoorCenterAdminRequest',
      insertMember: () =>
        this.supabase.client
          .from('indoor_center_admins')
          .insert({ center_id: centerId, user_id: userId, role: 'admin' }),
      onSelfApproved: () => {
        this.cache.remove(CACHE_KEYS.adminIndoorCenters(userId));
        this.supabase.adminIndoorCentersResource.reload();
      },
    });
  }

  rejectIndoorCenterAdminRequest(requestId: string): Promise<boolean> {
    return this.rejectRequest(
      'indoor_center_admin_requests',
      'admin.indoorAdminRequests',
      requestId,
      'rejectIndoorCenterAdminRequest',
    );
  }

  // --- Indoor Center Routesetter Requests ---

  requestIndoorCenterRoutesetter(centerId: string): Promise<boolean> {
    return this.submitRequest(
      'indoor_center_routesetter_requests',
      'admin.routesetterRequests',
      centerId,
      'requestIndoorCenterRoutesetter',
    );
  }

  getIndoorCenterRoutesetterRequests(
    centerId?: string,
  ): Promise<IndoorCenterRoutesetterRequestWithCenter[]> {
    return this.fetchRequests<IndoorCenterRoutesetterRequestWithCenter>(
      'indoor_center_routesetter_requests',
      'getIndoorCenterRoutesetterRequests',
      centerId,
    );
  }

  approveIndoorCenterRoutesetterRequest(
    requestId: string,
    centerId: string,
    userId: string,
  ): Promise<boolean> {
    return this.approveRequest({
      requestTable: 'indoor_center_routesetter_requests',
      toastPrefix: 'admin.routesetterRequests',
      requestId,
      userId,
      logLabel: 'approveIndoorCenterRoutesetterRequest',
      insertMember: () =>
        this.supabase.client
          .from('indoor_center_routesetters')
          .insert({ center_id: centerId, user_id: userId }),
      onSelfApproved: () => {
        this.supabase.routesetterIndoorCentersResource.reload();
      },
    });
  }

  rejectIndoorCenterRoutesetterRequest(requestId: string): Promise<boolean> {
    return this.rejectRequest(
      'indoor_center_routesetter_requests',
      'admin.routesetterRequests',
      requestId,
      'rejectIndoorCenterRoutesetterRequest',
    );
  }

  // --- Shared Request Helpers ---

  private async submitRequest(
    requestTable: IndoorRequestTable,
    toastPrefix: IndoorRequestToastPrefix,
    centerId: string,
    logLabel: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    const userId = this.authState.userProfile()?.id;
    if (!userId) return false;

    this.loading.set(true);
    try {
      const { error } = await this.insertRequestRow(requestTable, {
        center_id: centerId,
        user_id: userId,
      });

      if (error) {
        if (error.code === '23505') {
          this.toast.info(`${toastPrefix}.alreadyRequested`);
          return true;
        }
        throw error;
      }

      this.toast.success(`${toastPrefix}.requestSent`);
      return true;
    } catch (e) {
      console.error(`[IndoorRequestsService] ${logLabel} error`, e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchRequests<T>(
    requestTable: IndoorRequestTable,
    logLabel: string,
    centerId?: string,
  ): Promise<T[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.queryRequests(requestTable, centerId);

    if (error) {
      console.error(`[IndoorRequestsService] ${logLabel} error`, error);
      return [];
    }
    return (data || []) as unknown as T[];
  }

  private async approveRequest(params: {
    requestTable: IndoorRequestTable;
    toastPrefix: IndoorRequestToastPrefix;
    requestId: string;
    userId: string;
    logLabel: string;
    insertMember: () => PromiseLike<{ error: { code?: string } | null }>;
    onSelfApproved: () => void;
  }): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error: insertError } = await params.insertMember();

      if (insertError && insertError.code !== '23505') {
        throw insertError;
      }

      const { error: deleteError } = await this.deleteRequestRow(
        params.requestTable,
        params.requestId,
      );

      if (deleteError) throw deleteError;

      if (params.userId === this.supabase.authUserId()) {
        params.onSelfApproved();
      }

      this.toast.success(`${params.toastPrefix}.requestApproved`);
      return true;
    } catch (e) {
      console.error(`[IndoorRequestsService] ${params.logLabel} error`, e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private async rejectRequest(
    requestTable: IndoorRequestTable,
    toastPrefix: IndoorRequestToastPrefix,
    requestId: string,
    logLabel: string,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.deleteRequestRow(requestTable, requestId);

      if (error) throw error;

      this.toast.success(`${toastPrefix}.requestRejected`);
      return true;
    } catch (e) {
      console.error(`[IndoorRequestsService] ${logLabel} error`, e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private insertRequestRow(
    table: IndoorRequestTable,
    payload: { center_id: string; user_id: string },
  ) {
    return table === 'indoor_center_admin_requests'
      ? this.supabase.client
          .from('indoor_center_admin_requests')
          .insert(payload)
      : this.supabase.client
          .from('indoor_center_routesetter_requests')
          .insert(payload);
  }

  private deleteRequestRow(table: IndoorRequestTable, requestId: string) {
    return table === 'indoor_center_admin_requests'
      ? this.supabase.client
          .from('indoor_center_admin_requests')
          .delete()
          .eq('id', requestId)
      : this.supabase.client
          .from('indoor_center_routesetter_requests')
          .delete()
          .eq('id', requestId);
  }

  private queryRequests(table: IndoorRequestTable, centerId?: string) {
    if (table === 'indoor_center_admin_requests') {
      const query = this.supabase.client
        .from('indoor_center_admin_requests')
        .select(REQUEST_SELECT)
        .order('created_at', { ascending: false });
      return centerId ? query.eq('center_id', centerId) : query;
    }
    const query = this.supabase.client
      .from('indoor_center_routesetter_requests')
      .select(REQUEST_SELECT)
      .order('created_at', { ascending: false });
    return centerId ? query.eq('center_id', centerId) : query;
  }
}
