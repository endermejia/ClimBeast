import {
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';

import {
  AdminRequestRow,
  AdminRequestsTableComponent,
} from '../../components/admin/admin-requests-table';

import type { IndoorCenterAdminRequestWithCenter } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-indoor-admin-requests',
  imports: [AdminRequestsTableComponent],
  template: `
    <app-admin-requests-table
      [rows]="rows()"
      [loading]="loading()"
      headerIcon="@tui.dumbbell"
      iconBgClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
      titleKey="admin.indoorAdminRequests.title"
      descriptionKey="admin.indoorAdminRequests.description"
      userColumnKey="admin.indoorAdminRequests.user"
      targetColumnKey="admin.indoorAdminRequests.center"
      emptyIcon="@tui.shield"
      emptyMessageKey="admin.indoorAdminRequests.empty"
      (approve)="approve($event)"
      (reject)="reject($event)"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class AdminIndoorAdminRequestsComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly indoor = inject(IndoorService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly requests: WritableSignal<
    IndoorCenterAdminRequestWithCenter[]
  > = signal([]);

  protected readonly rows = computed<AdminRequestRow[]>(() =>
    this.requests().map((req) => ({
      id: req.id,
      createdAt: req.created_at,
      user: req.user,
      targetName: req.center.name,
      targetLink: ['/indoor', req.center.slug],
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
      const reqs = await this.indoor.getIndoorCenterAdminRequests();
      this.requests.set(reqs);
    } catch (e) {
      console.error(
        '[AdminIndoorAdminRequests] Exception loading requests:',
        e,
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.indoor.approveIndoorCenterAdminRequest(
      req.id,
      req.center.id,
      req.user.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
      this.supabase.adminIndoorCentersResource.reload();
    }
  }

  protected async reject(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.indoor.rejectIndoorCenterAdminRequest(req.id);
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
export default AdminIndoorAdminRequestsComponent;
