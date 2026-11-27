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

import type { IndoorCenterRoutesetterRequestWithCenter } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-routesetter-requests',
  standalone: true,
  imports: [AdminRequestsTableComponent],
  template: `
    <app-admin-requests-table
      [rows]="rows()"
      [loading]="loading()"
      headerIcon="@tui.wrench"
      iconBgClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
      titleKey="admin.routesetterRequests.title"
      descriptionKey="admin.routesetterRequests.description"
      userColumnKey="admin.routesetterRequests.user"
      targetColumnKey="admin.routesetterRequests.center"
      emptyIcon="@tui.wrench"
      emptyMessageKey="admin.routesetterRequests.empty"
      (approve)="approve($event)"
      (reject)="reject($event)"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class AdminRoutesetterRequestsComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly indoor = inject(IndoorService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly requests: WritableSignal<
    IndoorCenterRoutesetterRequestWithCenter[]
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
      const reqs = await this.indoor.getIndoorCenterRoutesetterRequests();
      this.requests.set(reqs);
    } catch (e) {
      console.error(
        '[AdminRoutesetterRequests] Exception loading requests:',
        e,
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.indoor.approveIndoorCenterRoutesetterRequest(
      req.id,
      req.center.id,
      req.user.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
      this.supabase.routesetterIndoorCentersResource.reload();
    }
  }

  protected async reject(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const success = await this.indoor.rejectIndoorCenterRoutesetterRequest(
      req.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
export default AdminRoutesetterRequestsComponent;
