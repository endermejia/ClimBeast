import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableSortChange,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { LayoutService } from '../../services/layout.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { AvatarUrlPipe } from '../../pipes';

export interface AdminRequestRow {
  id: string | number;
  createdAt?: string | null;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  targetName: string;
  targetLink: (string | number)[];
}

@Component({
  selector: 'app-admin-requests-table',
  imports: [
    AvatarUrlPipe,
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
  ],
  template: `
    <section class="flex flex-col w-full max-w-7xl mx-auto p-4 grow min-h-0">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (rows().length; as requestsCount) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ requestsCount }}
                </tui-badge-notification>
              }
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                [class]="iconBgClass()"
              >
                <tui-icon [icon]="headerIcon()" />
              </div>
            </tui-badged-content>
            {{ titleKey() | translate }}
          </a>
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ descriptionKey() | translate }}
      </p>

      <tui-scrollbar class="flex grow min-h-0">
        @if (loading() || rows().length > 0) {
          <table
            [size]="tableSize()"
            tuiTable
            class="w-full"
            [columns]="columns"
            [direction]="direction()"
            [sorter]="activeSorter()"
            (sortChange)="onSortChange($event)"
          >
            @let sortedList = rows() | tuiTableSort;
            <thead tuiThead>
              <tr tuiThGroup>
                <th
                  *tuiHead="'user'"
                  tuiTh
                  class="user-column"
                  [sorter]="activeUserSorter()"
                  [sticky]="true"
                >
                  {{ userColumnKey() | translate }}
                </th>
                <th
                  *tuiHead="'target'"
                  tuiTh
                  class="target-column"
                  [sorter]="activeTargetSorter()"
                >
                  {{ targetColumnKey() | translate }}
                </th>
                <th
                  *tuiHead="'actions'"
                  tuiTh
                  class="actions-column w-60!"
                  [sorter]="null"
                >
                  {{ 'actions' | translate }}
                </th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="sortedList">
              @if (loading()) {
                @for (_item of skeletons; track $index) {
                  <tr tuiTr>
                    <td *tuiCell="'user'" tuiTd class="p-4">
                      <div [tuiSkeleton]="true" class="w-32 h-4"></div>
                    </td>
                    <td *tuiCell="'target'" tuiTd class="p-4">
                      <div [tuiSkeleton]="true" class="w-48 h-4"></div>
                    </td>
                    <td *tuiCell="'actions'" tuiTd class="p-4">
                      <div class="flex items-center gap-2 flex-nowrap">
                        <div
                          [tuiSkeleton]="true"
                          class="w-20 h-9 rounded-full"
                        ></div>
                        <div
                          [tuiSkeleton]="true"
                          class="w-20 h-9 rounded-full"
                        ></div>
                      </div>
                    </td>
                  </tr>
                }
              } @else {
                @for (row of sortedList; track row.id) {
                  <tr tuiTr>
                    <td *tuiCell="'user'" tuiTd class="p-4">
                      <div class="flex items-center gap-3">
                        <a [routerLink]="['/profile', row.user.id]">
                          <span tuiAvatar size="s">
                            @if (row.user.avatar; as avatar) {
                              <img [src]="avatar | avatarUrl" alt="avatar" />
                            } @else {
                              <tui-icon icon="@tui.user" />
                            }
                          </span>
                        </a>
                        <a
                          tuiLink
                          [routerLink]="['/profile', row.user.id]"
                          class="font-medium"
                        >
                          {{ row.user.name || ('anonymous' | translate) }}
                        </a>
                      </div>
                    </td>
                    <td *tuiCell="'target'" tuiTd class="p-4">
                      <div class="font-medium">
                        <a tuiLink [routerLink]="row.targetLink">{{
                          row.targetName
                        }}</a>
                      </div>
                    </td>
                    <td *tuiCell="'actions'" tuiTd class="p-4">
                      <div
                        class="flex items-center gap-2 flex-nowrap whitespace-nowrap"
                      >
                        <button
                          tuiButton
                          size="m"
                          appearance="primary"
                          type="button"
                          class="rounded-full! shrink-0"
                          (click)="approve.emit(row)"
                        >
                          {{ approveLabelKey() | translate }}
                        </button>
                        <button
                          tuiButton
                          size="m"
                          [appearance]="rejectAppearance()"
                          type="button"
                          class="rounded-full! shrink-0"
                          (click)="reject.emit(row)"
                        >
                          {{ rejectLabelKey() | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state [icon]="emptyIcon()" [message]="emptyMessageKey()" />
        }
      </tui-scrollbar>
    </section>
  `,
  styles: [
    `
      .user-column {
        min-width: 250px;
      }
      .target-column {
        min-width: 250px;
      }
      .actions-column {
        min-width: 240px;
      }
    `,
  ],
  host: { class: 'flex grow min-h-0' },
})
export class AdminRequestsTableComponent {
  private readonly layoutService = inject(LayoutService);

  readonly rows = input.required<AdminRequestRow[]>();
  readonly loading = input<boolean>(false);
  readonly headerIcon = input.required<string>();
  readonly iconBgClass = input.required<string>();
  readonly titleKey = input.required<string>();
  readonly descriptionKey = input.required<string>();
  readonly userColumnKey = input.required<string>();
  readonly targetColumnKey = input.required<string>();
  readonly emptyIcon = input<string>('@tui.shield');
  readonly emptyMessageKey = input<string>('empty');
  readonly sortable = input<boolean>(true);
  readonly approveLabelKey = input<string>('adminRequests.approve');
  readonly rejectLabelKey = input<string>('adminRequests.reject');
  readonly rejectAppearance = input<string>('negative');

  readonly approve = output<AdminRequestRow>();
  readonly reject = output<AdminRequestRow>();

  protected readonly columns = ['user', 'target', 'actions'];
  protected readonly skeletons = Array(5).fill(0);

  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<TuiComparator<AdminRequestRow>>((a, b) =>
    tuiDefaultSort(a.createdAt ?? '', b.createdAt ?? ''),
  );

  protected readonly userSorter: TuiComparator<AdminRequestRow> = (a, b) =>
    tuiDefaultSort(a.user.name || '', b.user.name || '');

  protected readonly targetSorter: TuiComparator<AdminRequestRow> = (a, b) =>
    tuiDefaultSort(a.targetName || '', b.targetName || '');

  private readonly noopSorter: TuiComparator<AdminRequestRow> = () => 0;

  protected readonly activeSorter = computed<TuiComparator<AdminRequestRow>>(
    () => (this.sortable() ? this.sorter() : this.noopSorter),
  );

  protected readonly activeUserSorter =
    computed<TuiComparator<AdminRequestRow> | null>(() =>
      this.sortable() ? this.userSorter : null,
    );

  protected readonly activeTargetSorter =
    computed<TuiComparator<AdminRequestRow> | null>(() =>
      this.sortable() ? this.targetSorter : null,
    );

  protected readonly tableSize = computed<'s' | 'l'>(() =>
    this.layoutService.isMobile() ? 's' : 'l',
  );

  protected onSortChange(sort: TuiTableSortChange<AdminRequestRow>): void {
    if (!this.sortable()) return;
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.userSorter);
  }
}
