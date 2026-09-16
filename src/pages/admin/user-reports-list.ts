import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiSkeleton,
  type TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { UserReportsService } from '../../services/user-reports.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import {
  UserReportReason,
  UserReportStatus,
  UserReportWithDetails,
} from '../../models';

import { AvatarUrlPipe } from '../../pipes';

interface StatusFilter {
  id: UserReportStatus | 'all';
  labelKey: string;
}

@Component({
  selector: 'app-admin-user-reports-list',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    DatePipe,
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4 grow min-h-0">
      <!-- Header with same admin styling -->
      <header class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold m-0">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50" class="shrink-0">
              @if (pendingCount(); as count) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ count }}
                  </tui-badge-notification>
                </ng-container>
              }
              <div
                class="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.flag" />
              </div>
            </tui-badged-content>
            {{ 'admin.userReports.title' | translate }}
          </a>
        </h1>
      </header>

      <!-- Filter chips -->
      <div class="flex items-center gap-2 overflow-x-auto pb-3">
        @for (st of statusFilters; track st.id) {
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border"
            [class.bg-(--tui-background-accent-1)]="selectedStatus() === st.id"
            [class.text-(--tui-background-base)]="selectedStatus() === st.id"
            [class.border-(--tui-border-focus)]="selectedStatus() === st.id"
            [class.bg-(--tui-background-neutral-1)]="selectedStatus() !== st.id"
            [class.text-(--tui-text-primary)]="selectedStatus() !== st.id"
            [class.border-(--tui-border-normal)]="selectedStatus() !== st.id"
            (click)="selectedStatus.set(st.id)"
          >
            {{ st.labelKey | translate }}
          </button>
        }
      </div>

      <!-- Reports Content -->
      <tui-scrollbar class="grow min-h-0">
        @if (reportsResource.isLoading()) {
          <div class="flex flex-col gap-3">
            @for (i of [1, 2, 3]; track i) {
              <div
                class="h-24 rounded-2xl bg-(--tui-background-neutral-1)"
                tuiSkeleton
              ></div>
            }
          </div>
        } @else if (filteredReports().length === 0) {
          <div class="py-16">
            <app-empty-state
              icon="@tui.flag"
              message="admin.userReports.empty"
            />
          </div>
        } @else {
          <table tuiTable [columns]="columns" class="w-full">
            <thead tuiThead>
              <tr tuiThGroup>
                <th *tuiHead="'reported'" tuiTh class="min-w-[200px]">
                  {{ 'admin.userReports.reported' | translate }}
                </th>
                <th *tuiHead="'reporter'" tuiTh class="min-w-[180px]">
                  {{ 'admin.userReports.reporter' | translate }}
                </th>
                <th *tuiHead="'reason'" tuiTh class="min-w-[220px]">
                  {{ 'admin.userReports.reason' | translate }}
                </th>
                <th *tuiHead="'status'" tuiTh class="min-w-[110px]">
                  {{ 'status' | translate }}
                </th>
                <th *tuiHead="'date'" tuiTh class="min-w-[120px]">
                  {{ 'date' | translate }}
                </th>
                <th *tuiHead="'actions'" tuiTh class="w-28 text-right">
                  {{ 'actions' | translate }}
                </th>
              </tr>
            </thead>
            <tbody tuiTbody>
              @for (report of filteredReports(); track report.id) {
                <tr tuiTr>
                  <!-- Reported User -->
                  <td *tuiCell="'reported'" tuiTd>
                    <a
                      [routerLink]="['/profile', report.reported_id]"
                      class="flex items-center gap-2.5 no-underline text-inherit hover:underline"
                    >
                      <span tuiAvatar size="s">
                        @if (report.reported?.avatar; as avatar) {
                          <img
                            [src]="avatar | avatarUrl"
                            [alt]="report.reported.name || ''"
                          />
                        } @else {
                          <tui-icon icon="@tui.user" />
                        }
                      </span>
                      <div class="flex flex-col min-w-0">
                        <span class="font-bold text-sm truncate">
                          {{ report.reported?.name || ('user' | translate) }}
                        </span>
                        <span
                          class="text-[10px] text-(--tui-text-secondary) font-mono truncate"
                        >
                          {{ report.reported_id }}
                        </span>
                      </div>
                    </a>
                  </td>

                  <!-- Reporter User -->
                  <td *tuiCell="'reporter'" tuiTd>
                    <a
                      [routerLink]="['/profile', report.reporter_id]"
                      class="flex items-center gap-2 no-underline text-inherit hover:underline"
                    >
                      <span tuiAvatar size="xs">
                        @if (report.reporter?.avatar; as avatar) {
                          <img
                            [src]="avatar | avatarUrl"
                            [alt]="report.reporter.name || ''"
                          />
                        } @else {
                          <tui-icon icon="@tui.user" />
                        }
                      </span>
                      <span class="text-sm truncate">
                        {{ report.reporter?.name || ('user' | translate) }}
                      </span>
                    </a>
                  </td>

                  <!-- Reason & Details -->
                  <td *tuiCell="'reason'" tuiTd>
                    <div class="flex flex-col gap-1">
                      <span
                        class="font-semibold text-xs text-red-600 dark:text-red-400"
                      >
                        {{ getReasonLabel(report.reason) | translate }}
                      </span>
                      @if (report.details) {
                        <p
                          class="text-xs text-(--tui-text-secondary) m-0 line-clamp-2"
                        >
                          {{ report.details }}
                        </p>
                      }
                    </div>
                  </td>

                  <!-- Status -->
                  <td *tuiCell="'status'" tuiTd>
                    <span
                      tuiBadge
                      size="s"
                      [appearance]="getStatusAppearance(report.status)"
                    >
                      {{
                        'admin.userReports.statuses.' + report.status
                          | translate
                      }}
                    </span>
                  </td>

                  <!-- Date -->
                  <td
                    *tuiCell="'date'"
                    tuiTd
                    class="text-xs text-(--tui-text-secondary)"
                  >
                    {{ report.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </td>

                  <!-- Actions -->
                  <td *tuiCell="'actions'" tuiTd class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      @if (report.status === 'pending') {
                        <button
                          tuiIconButton
                          type="button"
                          appearance="flat"
                          size="xs"
                          iconStart="@tui.check"
                          (click)="onUpdateStatus(report, 'resolved')"
                          [attr.aria-label]="
                            'admin.userReports.resolve' | translate
                          "
                        ></button>
                        <button
                          tuiIconButton
                          type="button"
                          appearance="flat"
                          size="xs"
                          iconStart="@tui.x"
                          (click)="onUpdateStatus(report, 'dismissed')"
                          [attr.aria-label]="
                            'admin.userReports.dismiss' | translate
                          "
                        ></button>
                      }
                      <button
                        tuiIconButton
                        type="button"
                        appearance="flat-destructive"
                        size="xs"
                        iconStart="@tui.trash"
                        (click)="onDelete(report)"
                        [attr.aria-label]="'delete' | translate"
                      ></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </tui-scrollbar>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserReportsListComponent {
  private readonly userReportsService = inject(UserReportsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  protected readonly columns = [
    'reported',
    'reporter',
    'reason',
    'status',
    'date',
    'actions',
  ];

  protected readonly selectedStatus = signal<UserReportStatus | 'all'>(
    'pending',
  );
  private readonly reloadTrigger = signal<number>(0);

  protected readonly statusFilters: StatusFilter[] = [
    { id: 'pending', labelKey: 'admin.userReports.statuses.pending' },
    { id: 'all', labelKey: 'admin.userReports.statuses.all' },
    { id: 'resolved', labelKey: 'admin.userReports.statuses.resolved' },
    { id: 'dismissed', labelKey: 'admin.userReports.statuses.dismissed' },
  ];

  protected readonly reportsResource = resource({
    params: () => ({
      trigger: this.reloadTrigger(),
    }),
    loader: async () => {
      return await this.userReportsService.getUserReports();
    },
  });

  protected readonly reports = computed(
    () => this.reportsResource.value() ?? [],
  );

  protected readonly pendingCount = computed(
    () => this.reports().filter((r) => r.status === 'pending').length,
  );

  protected readonly filteredReports = computed(() => {
    const st = this.selectedStatus();
    const all = this.reports();
    if (st === 'all') return all;
    return all.filter((r) => r.status === st);
  });

  protected getReasonLabel(reason: UserReportReason): string {
    return `reportReasons.${reason}.title`;
  }

  protected getStatusAppearance(status: UserReportStatus): string {
    switch (status) {
      case 'pending':
        return 'accent';
      case 'resolved':
        return 'positive';
      case 'dismissed':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  protected async onUpdateStatus(
    report: UserReportWithDetails,
    newStatus: UserReportStatus,
  ): Promise<void> {
    const success = await this.userReportsService.updateReportStatus(
      report.id,
      newStatus,
    );
    if (success) {
      this.reloadTrigger.update((v) => v + 1);
    }
  }

  protected async onDelete(report: UserReportWithDetails): Promise<void> {
    const data: TuiConfirmData = {
      content: this.translate.instant('admin.userReports.deleteConfirm'),
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'primary-destructive',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.userReports.deleteTitle'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = await this.userReportsService.deleteReport(report.id);
    if (success) {
      this.reloadTrigger.update((v) => v + 1);
    }
  }
}

export default AdminUserReportsListComponent;
