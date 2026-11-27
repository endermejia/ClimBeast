import {
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';

import { AreasService } from '../../services/areas.service';
import { SupabaseService } from '../../services/supabase.service';

import {
  AdminRequestRow,
  AdminRequestsTableComponent,
} from '../../components/admin/admin-requests-table';

import { AreaAdminRequestWithArea as AreaAdminRequest } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-area-requests',
  imports: [AdminRequestsTableComponent],
  template: `
    <app-admin-requests-table
      [rows]="rows()"
      [loading]="loading()"
      headerIcon="@tui.shield"
      iconBgClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
      titleKey="adminRequests.manageTitle"
      descriptionKey="adminRequests.manageDescription"
      userColumnKey="adminRequests.user"
      targetColumnKey="adminRequests.area"
      emptyIcon="@tui.shield"
      emptyMessageKey="adminRequests.empty"
      (approve)="approve($event)"
      (reject)="reject($event)"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class AdminAreaRequestsComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly areas = inject(AreasService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly requests: WritableSignal<AreaAdminRequest[]> = signal([]);

  protected readonly rows = computed<AdminRequestRow[]>(() =>
    this.requests().map((req) => ({
      id: req.id,
      createdAt: req.created_at,
      user: req.user,
      targetName: req.area.name,
      targetLink: ['/area', req.area.slug],
    })),
  );

  constructor() {
    if (this.isBrowser) {
      void this.loadRequests();
    }
  }

  private async loadRequests(): Promise<void> {
    try {
      this.loading.set(true);
      const reqs = await this.areas.getAreaAdminRequests();
      this.requests.set(reqs);
    } catch (e) {
      console.error('[AdminAreaRequests] Exception loading requests:', e);
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.areas.approveAreaAdminRequest(
      req.id,
      req.area.id,
      req.user.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
      this.supabase.adminAreasResource.reload();
    }
  }

  protected async reject(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.areas.rejectAreaAdminRequest(req.id);
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
export default AdminAreaRequestsComponent;
