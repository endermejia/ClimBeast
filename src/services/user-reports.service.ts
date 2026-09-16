import { inject, Injectable } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { ReportUserDialogComponent } from '../components/dialogs/report-user-dialog';

import {
  CreateUserReportDto,
  ReportUserDialogData,
  UserReportStatus,
  UserReportWithDetails,
} from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class UserReportsService {
  private readonly supabase = inject(SupabaseService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = inject(IS_BROWSER);

  async openReportDialog(targetUser: ReportUserDialogData): Promise<boolean> {
    if (!this.isBrowser) return false;

    await this.supabase.whenReady();
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) {
      this.toast.error(
        this.translate.instant('auth.loginRequired') || 'Login required',
      );
      return false;
    }

    if (currentUserId === targetUser.userId) {
      this.toast.warning(this.translate.instant('cannotReportSelf'));
      return false;
    }

    const result = await firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(ReportUserDialogComponent),
        {
          label: this.translate.instant('reportUser'),
          size: 'm',
          data: targetUser,
        },
      ),
      { defaultValue: false },
    );

    return result ?? false;
  }

  async reportUser(
    payload: CreateUserReportDto,
  ): Promise<{ success: boolean; alreadyReported?: boolean }> {
    if (!this.isBrowser) return { success: false };

    await this.supabase.whenReady();
    const currentUserId = this.supabase.authUserId();
    if (!currentUserId) {
      this.toast.error(
        this.translate.instant('auth.loginRequired') || 'Login required',
      );
      return { success: false };
    }

    if (currentUserId === payload.reported_id) {
      this.toast.warning(this.translate.instant('cannotReportSelf'));
      return { success: false };
    }

    try {
      const { error } = await this.supabase.client.from('user_reports').insert({
        reporter_id: currentUserId,
        reported_id: payload.reported_id,
        reason: payload.reason,
        details: payload.details?.trim() || null,
        status: 'pending',
      } as never);

      if (error) {
        // Code 23505: unique constraint violation on pending report
        if (error.code === '23505') {
          this.toast.warning(this.translate.instant('reportAlreadyPending'));
          return { success: false, alreadyReported: true };
        }
        console.error('[UserReportsService] report error:', error);
        this.toast.error(this.translate.instant('reportError'));
        return { success: false };
      }

      this.toast.success(this.translate.instant('reportSuccess'));
      return { success: true };
    } catch (err) {
      console.error('[UserReportsService] report exception:', err);
      this.toast.error(this.translate.instant('reportError'));
      return { success: false };
    }
  }

  async getUserReports(
    status?: UserReportStatus,
  ): Promise<UserReportWithDetails[]> {
    if (!this.isBrowser) return [];

    await this.supabase.whenReady();
    try {
      let query = this.supabase.client
        .from('user_reports')
        .select(
          `
          id,
          created_at,
          reporter_id,
          reported_id,
          reason,
          details,
          status,
          reporter:user_profiles!reporter_id(id, name, avatar),
          reported:user_profiles!reported_id(id, name, avatar)
        `,
        )
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[UserReportsService] getUserReports error:', error);
        return [];
      }

      return (data as unknown as UserReportWithDetails[]) || [];
    } catch (err) {
      console.error('[UserReportsService] getUserReports exception:', err);
      return [];
    }
  }

  async updateReportStatus(
    reportId: number,
    status: UserReportStatus,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;

    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('user_reports')
        .update({ status } as never)
        .eq('id', reportId);

      if (error) {
        console.error('[UserReportsService] updateReportStatus error:', error);
        this.toast.error(
          this.translate.instant('admin.userReports.updateError'),
        );
        return false;
      }

      this.toast.success(
        this.translate.instant('admin.userReports.updatedSuccess'),
      );
      return true;
    } catch (err) {
      console.error('[UserReportsService] updateReportStatus exception:', err);
      this.toast.error(this.translate.instant('admin.userReports.updateError'));
      return false;
    }
  }

  async deleteReport(reportId: number): Promise<boolean> {
    if (!this.isBrowser) return false;

    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('user_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        console.error('[UserReportsService] deleteReport error:', error);
        this.toast.error(
          this.translate.instant('admin.userReports.deleteError'),
        );
        return false;
      }

      this.toast.success(
        this.translate.instant('admin.userReports.deletedSuccess'),
      );
      return true;
    } catch (err) {
      console.error('[UserReportsService] deleteReport exception:', err);
      this.toast.error(this.translate.instant('admin.userReports.deleteError'));
      return false;
    }
  }
}
