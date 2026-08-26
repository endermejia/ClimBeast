import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiSkeleton,
  type TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { IS_BROWSER } from '../../app/is-browser';

import { EquipperRequestsService } from '../../services/equipper-requests.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { EquipperRequestWithDetails } from '../../models';

import { AvatarUrlPipe } from '../../pipes';

@Component({
  selector: 'app-admin-equipper-requests',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    EmptyStateComponent,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiIcon,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    TuiTable,
    AvatarUrlPipe,
  ],
  template: `
    <section class="flex flex-col w-full max-w-5xl mx-auto p-4 grow min-h-0">
      <header class="mb-4 flex items-center justify-between gap-2">
        <h1 class="text-2xl font-bold">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (requests().length; as requestsCount) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ requestsCount }}
                  </tui-badge-notification>
                </ng-container>
              }
              <span
                tuiAvatar="@tui.user-check"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'adminEquipperRequests.title' | translate"
              ></span>
            </tui-badged-content>

            {{ 'adminEquipperRequests.title' | translate }}
          </a>
        </h1>
      </header>

      <tui-scrollbar class="grow min-h-0">
        @if (loading() || requests().length > 0) {
          <table tuiTable [columns]="columns">
            <thead tuiThead>
              <tr tuiThGroup>
                <th *tuiHead="'user'" tuiTh class="min-w-[240px]">
                  {{ 'adminEquipperRequests.user' | translate }}
                </th>
                <th *tuiHead="'equipper'" tuiTh class="min-w-[240px]">
                  {{ 'adminEquipperRequests.equipper' | translate }}
                </th>
                <th *tuiHead="'actions'" tuiTh class="w-48 text-right">
                  {{ 'actions' | translate }}
                </th>
              </tr>
            </thead>

            <tbody tuiTbody [data]="requests()">
              @if (loading()) {
                @for (_item of skeletons; track $index) {
                  <tr tuiTr>
                    <td *tuiCell="'user'" tuiTd>
                      <div [tuiSkeleton]="true" class="w-40 h-8"></div>
                    </td>
                    <td *tuiCell="'equipper'" tuiTd>
                      <div [tuiSkeleton]="true" class="w-40 h-8"></div>
                    </td>
                    <td *tuiCell="'actions'" tuiTd>
                      <div [tuiSkeleton]="true" class="w-24 h-8 ml-auto"></div>
                    </td>
                  </tr>
                }
              } @else {
                @for (req of requests(); track req.id) {
                  <tr tuiTr>
                    <td *tuiCell="'user'" tuiTd>
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

                    <td *tuiCell="'equipper'" tuiTd>
                      <a
                        tuiLink
                        [routerLink]="['/equipper', req.equipper.id]"
                        class="font-medium"
                      >
                        {{ req.equipper.name }}
                      </a>
                    </td>

                    <td *tuiCell="'actions'" tuiTd class="text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          tuiButton
                          size="s"
                          appearance="primary"
                          (click.zoneless)="approve(req)"
                          class="rounded-xl!"
                        >
                          {{ 'adminEquipperRequests.approve' | translate }}
                        </button>
                        <button
                          tuiButton
                          size="s"
                          appearance="secondary"
                          (click.zoneless)="reject(req)"
                          class="rounded-xl!"
                        >
                          {{ 'adminEquipperRequests.reject' | translate }}
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        } @else {
          <app-empty-state icon="@tui.users" />
        }
      </tui-scrollbar>
    </section>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-grow: 1;
        min-height: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminEquipperRequestsComponent {
  private readonly equipperRequests = inject(EquipperRequestsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly isBrowser = inject(IS_BROWSER);

  protected readonly columns = ['user', 'equipper', 'actions'];
  protected readonly requests: WritableSignal<EquipperRequestWithDetails[]> =
    signal([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = Array(5).fill(0);

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

  protected async approve(req: EquipperRequestWithDetails): Promise<void> {
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

  protected async reject(req: EquipperRequestWithDetails): Promise<void> {
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
