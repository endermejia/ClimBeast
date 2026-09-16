import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
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
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiSkeleton,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';
import { SupabaseService } from '../../services/supabase.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import type { IndoorCenterRoutesetterRequestWithCenter } from '../../models';

import { AvatarUrlPipe } from '../../pipes';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-admin-routesetter-requests',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContentComponent,
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
              @if (requests().length; as requestsCount) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                >
                  {{ requestsCount }}
                </tui-badge-notification>
              }
              <div
                class="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0"
              >
                <tui-icon icon="@tui.wrench" />
              </div>
            </tui-badged-content>
            {{ 'admin.routesetterRequests.title' | translate }}
          </a>
        </h1>
      </header>

      <p class="mb-6 text-tui-text-secondary opacity-60">
        {{ 'admin.routesetterRequests.description' | translate }}
      </p>

      <tui-scrollbar class="flex grow">
        @if (requests().length > 0) {
          <table
            [size]="layoutService.isMobile() ? 's' : 'l'"
            tuiTable
            class="w-full"
            [columns]="columns()"
            [direction]="direction()"
            [sorter]="sorter()"
            (sortChange)="onSortChange($event)"
          >
            @let sortedList = requests() | tuiTableSort;
            <thead tuiThead>
              <tr tuiThGroup>
                <th
                  *tuiHead="'user'"
                  tuiTh
                  class="user-column"
                  [sorter]="userSorter"
                  [sticky]="true"
                >
                  {{ 'admin.routesetterRequests.user' | translate }}
                </th>
                <th
                  *tuiHead="'center'"
                  tuiTh
                  class="center-column"
                  [sorter]="centerSorter"
                >
                  {{ 'admin.routesetterRequests.center' | translate }}
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
                    <td *tuiCell="'center'" tuiTd class="p-4">
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
                @for (req of sortedList; track req.id) {
                  <tr tuiTr>
                    <td *tuiCell="'user'" tuiTd class="p-4">
                      <div class="flex items-center gap-3">
                        <a [routerLink]="['/profile', req.user.id]">
                          <span tuiAvatar size="s">
                            @if (req.user.avatar; as avatar) {
                              <img [src]="avatar | avatarUrl" alt="avatar" />
                            } @else {
                              <tui-icon icon="@tui.user" />
                            }
                          </span>
                        </a>
                        <a
                          tuiLink
                          [routerLink]="['/profile', req.user.id]"
                          class="font-medium"
                        >
                          {{ req.user.name || ('anonymous' | translate) }}
                        </a>
                      </div>
                    </td>
                    <td *tuiCell="'center'" tuiTd class="p-4">
                      <div class="font-medium">
                        <a
                          tuiLink
                          [routerLink]="['/indoor', req.center.slug]"
                          >{{ req.center.name }}</a
                        >
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
                          (click.zoneless)="approve(req)"
                        >
                          {{ 'adminRequests.approve' | translate }}
                        </button>
                        <button
                          tuiButton
                          size="m"
                          appearance="negative"
                          type="button"
                          class="rounded-full! shrink-0"
                          (click.zoneless)="reject(req)"
                        >
                          {{ 'adminRequests.reject' | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state
            icon="@tui.wrench"
            [message]="'admin.routesetterRequests.empty' | translate"
          />
        }
      </tui-scrollbar>
    </section>
  `,
  styles: [
    `
      .user-column {
        min-width: 250px;
      }
      .center-column {
        min-width: 250px;
      }
      .actions-column {
        min-width: 240px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminRoutesetterRequestsComponent {
  protected readonly layoutService = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly indoor = inject(IndoorService);
  private readonly isBrowser = inject(IS_BROWSER);
  protected readonly translate = inject(TranslateService);

  protected readonly columns = computed(() => ['user', 'center', 'actions']);

  protected readonly loading: WritableSignal<boolean> = signal(true);
  protected readonly requests: WritableSignal<
    IndoorCenterRoutesetterRequestWithCenter[]
  > = signal([]);

  protected readonly skeletons = Array(5).fill(0);
  protected readonly direction = signal<TuiSortDirection>(TuiSortDirection.Asc);
  protected readonly sorter = signal<
    TuiComparator<IndoorCenterRoutesetterRequestWithCenter>
  >((a, b) => tuiDefaultSort(a.created_at, b.created_at));

  protected userSorter: TuiComparator<IndoorCenterRoutesetterRequestWithCenter> =
    (a, b) => tuiDefaultSort(a.user.name || '', b.user.name || '');

  protected centerSorter: TuiComparator<IndoorCenterRoutesetterRequestWithCenter> =
    (a, b) => tuiDefaultSort(a.center.name || '', b.center.name || '');

  protected onSortChange(
    sort: TuiTableSortChange<IndoorCenterRoutesetterRequestWithCenter>,
  ): void {
    this.direction.set(sort.sortDirection);
    this.sorter.set(sort.sortComparator || this.userSorter);
  }

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

  protected async approve(
    req: IndoorCenterRoutesetterRequestWithCenter,
  ): Promise<void> {
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

  protected async reject(
    req: IndoorCenterRoutesetterRequestWithCenter,
  ): Promise<void> {
    const success = await this.indoor.rejectIndoorCenterRoutesetterRequest(
      req.id,
    );
    if (success) {
      this.requests.update((list) => list.filter((r) => r.id !== req.id));
    }
  }
}
export default AdminRoutesetterRequestsComponent;
