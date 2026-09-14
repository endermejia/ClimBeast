import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  AreaDonationDialogComponent,
  AreaDonationDialogData,
} from '../components/dialogs/area-donation-dialog';

import { handleErrorToast } from '../utils';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AreaDonationsService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly document = inject(DOCUMENT);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  async donate(
    areaId: number,
    amount: number,
    anonymous = false,
    message = '',
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    this.loading.set(true);
    await this.supabase.whenReady();

    const userId = this.supabase.authUserId();
    if (!userId) {
      this.toast.error('errors.unauthorized');
      const currentPath =
        this.document.defaultView?.location.pathname || '/explore';
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: currentPath },
      });
      this.loading.set(false);
      return false;
    }

    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'create-checkout-session',
        {
          headers: { 'ngsw-bypass': 'true' },
          body: {
            items: [
              {
                type: 'area_donation',
                areaId,
                amount,
                anonymous,
                message,
              },
            ],
            success_url: `${window.location.origin}/area/redirect?donation=success&area_id=${areaId}`,
            cancel_url: window.location.href,
          },
        },
      );

      if (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'context' in error &&
          typeof (error as { context?: { json?: () => Promise<unknown> } })
            .context?.json === 'function'
        ) {
          try {
            const body = (await (
              error as { context: { json: () => Promise<unknown> } }
            ).context.json()) as { error?: string } | null;
            if (body?.error) {
              throw new Error(body.error);
            }
          } catch (jsonErr: unknown) {
            if (
              jsonErr instanceof Error &&
              jsonErr.message &&
              jsonErr.message !== error.message
            ) {
              throw jsonErr;
            }
          }
        }
        throw error;
      }

      if (data?.url && this.document.defaultView) {
        this.document.defaultView.location.href = data.url;
        return true;
      }
      return false;
    } catch (e) {
      console.error('[AreaDonationsService] donate error:', e);
      handleErrorToast(e, this.toast);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  openDonationDialog(
    areaId: number,
    areaName?: string,
    options?: Partial<AreaDonationDialogData>,
  ): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(AreaDonationDialogComponent),
        {
          data: {
            areaId,
            areaName,
            ...options,
          } as AreaDonationDialogData,
          label: this.translate.instant('donations.dialogTitle'),
          size: 'l',
        },
      ),
      { defaultValue: undefined },
    );
  }
}
