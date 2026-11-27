import {
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { EquipperRequestsService } from '../../services/equipper-requests.service';

import {
  AdminRequestRow,
  AdminRequestsTableComponent,
} from '../../components/admin/admin-requests-table';

import { EquipperRequestWithDetails } from '../../models';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-equipper-requests',
  standalone: true,
  imports: [AdminRequestsTableComponent],
  template: `
    <app-admin-requests-table
      [rows]="rows()"
      [loading]="loading()"
      headerIcon="@tui.user-check"
      iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      titleKey="adminEquipperRequests.title"
      descriptionKey="adminEquipperRequests.description"
      userColumnKey="adminEquipperRequests.user"
      targetColumnKey="adminEquipperRequests.equipper"
      emptyIcon="@tui.users"
      [sortable]="false"
      approveLabelKey="adminEquipperRequests.approve"
      rejectLabelKey="adminEquipperRequests.reject"
      rejectAppearance="secondary"
      (approve)="approve($event)"
      (reject)="reject($event)"
    />
  `,
  host: { class: 'flex grow min-h-0' },
})
export class AdminEquipperRequestsComponent {
  private readonly equipperRequests = inject(EquipperRequestsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly requests: WritableSignal<EquipperRequestWithDetails[]> =
    signal([]);
  protected readonly loading = signal(true);

  protected readonly rows = computed<AdminRequestRow[]>(() =>
    this.requests().map((req) => ({
      id: req.id,
      createdAt: req.created_at,
      user: req.user,
      targetName: req.equipper.name,
      targetLink: ['/equipper', req.equipper.id],
    })),
  );

  constructor() {
    if (this.isBrowser) {
      void this.loadRequests();
    }
  }

  private async loadRequests(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.equipperRequests.getAllPendingRequests();
      this.requests.set(data);
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          'adminEquipperRequests.approveConfirmTitle',
        ),
        size: 's',
        data: {
          content: this.translate.instant(
            'adminEquipperRequests.approveConfirmText',
            {
              user: req.user.name || this.translate.instant('anonymous'),
              equipper: req.equipper.name,
            },
          ),
          yes: this.translate.instant('accept'),
          no: this.translate.instant('cancel'),
          appearance: 'primary',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const ok = await this.equipperRequests.approveRequest(
      req.id,
      req.equipper.id,
      req.user.id,
    );
    if (ok) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }

  protected async reject(row: AdminRequestRow): Promise<void> {
    const req = this.requests().find((r) => r.id === row.id);
    if (!req) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          'adminEquipperRequests.rejectConfirmTitle',
        ),
        size: 's',
        data: {
          content: this.translate.instant(
            'adminEquipperRequests.rejectConfirmText',
            {
              user: req.user.name || this.translate.instant('anonymous'),
              equipper: req.equipper.name,
            },
          ),
          yes: this.translate.instant('accept'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const ok = await this.equipperRequests.rejectRequest(req.id);
    if (ok) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
