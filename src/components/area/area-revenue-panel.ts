import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';

import { TuiButton, TuiExpand, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCard, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';

import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import type { AreaBalanceSummary, AreaPublicTimeline } from '../../models';

import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-area-revenue-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    TranslatePipe,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiCard,
    TuiExpand,
    TuiHeader,
    TuiIcon,
    TuiSkeleton,
    TuiTitle,
  ],
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }
  `,
  template: `
    <section
      tuiCardLarge="compact"
      appearance="outline"
      [tuiCardCollapsed]="collapsed()"
      tabindex="0"
      role="button"
      [attr.aria-expanded]="!collapsed()"
      class="cursor-pointer select-none transition-shadow hover:shadow-sm"
      (click)="collapsed.set(!collapsed())"
      (keydown.enter)="collapsed.set(!collapsed())"
      (keydown.space)="collapsed.set(!collapsed())"
    >
      <header
        tuiHeader="body-m"
        class="flex-wrap sm:flex-nowrap gap-3 items-start justify-between"
      >
        <hgroup tuiTitle class="min-w-0 flex-1">
          <h2
            class="flex items-center gap-2 m-0 text-base sm:text-lg font-bold"
          >
            <tui-icon icon="@tui.coins" class="text-amber-500 shrink-0" />
            <span class="break-words">{{
              'areaRevenue.title' | translate
            }}</span>
            <tui-icon
              [icon]="collapsed() ? '@tui.chevron-down' : '@tui.chevron-up'"
              class="text-(--tui-text-secondary) shrink-0 text-base ml-0.5"
            />
          </h2>
          <p
            tuiSubtitle
            class="m-0 text-xs text-(--tui-text-secondary) break-words"
          >
            {{ 'areaRevenue.subtitle' | translate }}
          </p>
        </hgroup>
        <aside
          tuiAccessories
          class="shrink-0 max-sm:w-full max-sm:flex max-sm:justify-end"
        >
          <button
            appearance="accent"
            size="s"
            tuiButton
            type="button"
            class="shrink-0"
            iconStart="@tui.heart"
            (click)="$event.stopPropagation(); openDonationDialog()"
          >
            {{ 'areaRevenue.donateButton' | translate }}
          </button>
        </aside>
      </header>

      <!-- Métricas con código de color -->
      <div tuiCardRow class="flex-col gap-3 py-1">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
          <!-- 1. Saldo disponible (Ámbar / Dorado) -->
          <div
            class="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
          >
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0"
            >
              <tui-icon icon="@tui.coins" />
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-[11px] font-medium text-(--tui-text-secondary) truncate"
              >
                {{ 'areaRevenue.availableBalance' | translate }}
              </span>
              @if (balanceResource.isLoading()) {
                <span
                  [tuiSkeleton]="true"
                  class="w-14 h-5 rounded mt-0.5"
                ></span>
              } @else {
                <span
                  class="text-sm sm:text-base font-extrabold text-amber-700 dark:text-amber-300 tabular-nums"
                >
                  {{ balance()?.availableBalance || 0 | number: '1.2-2' }} €
                </span>
              }
            </div>
          </div>

          <!-- 2. Venta de croquis (Azul cielo) -->
          <div
            class="flex items-center gap-2.5 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20"
          >
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0"
            >
              <tui-icon icon="@tui.map" />
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-[11px] font-medium text-(--tui-text-secondary) truncate"
              >
                {{ 'areaRevenue.topoPurchases' | translate }}
              </span>
              @if (balanceResource.isLoading()) {
                <span
                  [tuiSkeleton]="true"
                  class="w-14 h-5 rounded mt-0.5"
                ></span>
              } @else {
                <span
                  class="text-sm sm:text-base font-extrabold text-sky-700 dark:text-sky-300 tabular-nums"
                >
                  +{{ balance()?.totalPurchasesNet || 0 | number: '1.2-2' }} €
                </span>
              }
            </div>
          </div>

          <!-- 3. Donaciones (Verde Esmeralda) -->
          <div
            class="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0"
            >
              <tui-icon icon="@tui.heart" />
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-[11px] font-medium text-(--tui-text-secondary) truncate"
              >
                {{ 'areaRevenue.donations' | translate }}
              </span>
              @if (balanceResource.isLoading()) {
                <span
                  [tuiSkeleton]="true"
                  class="w-14 h-5 rounded mt-0.5"
                ></span>
              } @else {
                <span
                  class="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums"
                >
                  +{{ balance()?.totalDonationsNet || 0 | number: '1.2-2' }} €
                </span>
              }
            </div>
          </div>

          <!-- 4. Material entregado (Naranja / Gasto) -->
          <div
            class="flex items-center gap-2.5 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
          >
            <div
              class="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0"
            >
              <tui-icon icon="@tui.hammer" />
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-[11px] font-medium text-(--tui-text-secondary) truncate"
              >
                {{ 'areaRevenue.materialSpent' | translate }}
              </span>
              @if (balanceResource.isLoading()) {
                <span
                  [tuiSkeleton]="true"
                  class="w-14 h-5 rounded mt-0.5"
                ></span>
              } @else {
                <span
                  class="text-sm sm:text-base font-extrabold text-orange-700 dark:text-orange-300 tabular-nums"
                >
                  -{{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
                </span>
              }
            </div>
          </div>
        </div>
      </div>

      <tui-expand [expanded]="!collapsed()" (click)="$event.stopPropagation()">
        <div class="flex flex-col gap-6 pt-2 cursor-default">
          <!-- Panel de gestión de equipadores / administradores -->
          @if (canManageArea()) {
            <div
              class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
            >
              <div class="flex flex-col">
                <span class="text-sm font-bold text-(--tui-text-primary)">
                  {{ 'areaRevenue.managementTitle' | translate }}
                </span>
                <span class="text-xs text-(--tui-text-secondary)">
                  {{ 'areaRevenue.managementSubtitle' | translate }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  appearance="secondary"
                  size="s"
                  tuiButton
                  type="button"
                  iconStart="@tui.package-plus"
                  [disabled]="(balance()?.availableBalance ?? 0) <= 0"
                  (click)="openMaterialRequestDialog()"
                >
                  {{ 'areaRevenue.requestMaterial' | translate }}
                </button>

                <button
                  appearance="flat"
                  size="s"
                  tuiButton
                  type="button"
                  iconStart="@tui.history"
                  (click)="openHistoryDialog()"
                >
                  {{ 'areaRevenue.historyButton' | translate }}
                </button>
              </div>
            </div>
          }

          <!-- Muro de transparencia comunitaria -->
          <div class="flex flex-col gap-3">
            <div class="flex flex-col">
              <h3
                class="text-sm font-bold uppercase tracking-wider text-(--tui-text-secondary) m-0"
              >
                {{ 'areaRevenue.transparencyTimeline' | translate }}
              </h3>
              <p class="text-xs text-(--tui-text-secondary) m-0 mt-0.5">
                {{ 'areaRevenue.transparencySubtitle' | translate }}
              </p>
            </div>

            @if (timelineResource.isLoading()) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div [tuiSkeleton]="true" class="h-28 rounded-xl"></div>
                <div [tuiSkeleton]="true" class="h-28 rounded-xl"></div>
              </div>
            } @else {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <!-- Columna 1: Donaciones recibidas -->
                <div
                  class="flex flex-col gap-3 p-4 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
                >
                  <div
                    class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
                  >
                    <div class="flex items-center gap-2">
                      <tui-icon
                        icon="@tui.heart"
                        class="text-emerald-500 shrink-0"
                      />
                      <span class="font-bold text-sm text-(--tui-text-primary)">
                        {{ 'areaRevenue.recentDonations' | translate }}
                      </span>
                    </div>
                    <span appearance="positive" size="s" tuiBadge>
                      +{{ balance()?.totalDonationsNet || 0 | number: '1.2-2' }}
                      €
                    </span>
                  </div>

                  <div class="flex flex-col gap-2">
                    @for (d of donationsList(); track d.id) {
                      <div
                        class="flex items-start justify-between gap-3 p-3 rounded-lg bg-(--tui-background-base) border border-(--tui-border-normal)"
                      >
                        <div class="flex items-start gap-2.5 min-w-0">
                          <span
                            tuiAvatar
                            size="s"
                            [appearance]="d.anonymous ? 'neutral' : 'accent'"
                            class="shrink-0 mt-0.5"
                          >
                            <tui-icon
                              [icon]="d.anonymous ? '@tui.user' : '@tui.heart'"
                            />
                          </span>
                          <div class="flex flex-col min-w-0">
                            <span
                              class="text-xs font-bold truncate text-(--tui-text-primary)"
                            >
                              {{
                                d.anonymous
                                  ? ('donations.anonymous' | translate)
                                  : d.userName ||
                                    ('donations.anonymous' | translate)
                              }}
                            </span>
                            @if (d.message) {
                              <span
                                class="text-xs text-(--tui-text-secondary) italic line-clamp-2 mt-0.5"
                              >
                                "{{ d.message }}"
                              </span>
                            }
                            <span
                              class="text-[10px] text-(--tui-text-secondary) mt-1"
                            >
                              {{ d.createdAt | date: 'dd/MM/yyyy' }}
                            </span>
                          </div>
                        </div>

                        <span
                          appearance="positive"
                          size="s"
                          tuiBadge
                          class="shrink-0 font-bold tabular-nums"
                        >
                          +{{ d.amount | number: '1.2-2' }} €
                        </span>
                      </div>
                    } @empty {
                      <app-empty-state
                        icon="@tui.heart"
                        message="areaRevenue.noDonationsYet"
                        class="py-2"
                      />
                    }
                  </div>
                </div>

                <!-- Columna 2: Material entregado -->
                <div
                  class="flex flex-col gap-3 p-4 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
                >
                  <div
                    class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
                  >
                    <div class="flex items-center gap-2">
                      <tui-icon
                        icon="@tui.hammer"
                        class="text-orange-500 shrink-0"
                      />
                      <span class="font-bold text-sm text-(--tui-text-primary)">
                        {{ 'areaRevenue.deliveredEquipment' | translate }}
                      </span>
                    </div>
                    <span appearance="secondary" size="s" tuiBadge>
                      -{{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
                    </span>
                  </div>

                  <div class="flex flex-col gap-2">
                    @for (m of withdrawalsList(); track m.id) {
                      <div
                        class="flex items-start justify-between gap-3 p-3 rounded-lg bg-(--tui-background-base) border border-(--tui-border-normal)"
                      >
                        <div class="flex items-start gap-2.5 min-w-0">
                          <span
                            tuiAvatar
                            size="s"
                            appearance="neutral"
                            class="shrink-0 mt-0.5"
                          >
                            <tui-icon icon="@tui.package" />
                          </span>
                          <div class="flex flex-col min-w-0">
                            <span
                              class="text-xs font-bold text-(--tui-text-primary) truncate"
                            >
                              {{
                                m.items[0]?.materialName ||
                                  ('areaRevenue.materialBatch' | translate)
                              }}
                            </span>
                            @if (m.items.length > 1) {
                              <span
                                class="text-[11px] text-(--tui-text-secondary)"
                              >
                                +{{ m.items.length - 1 }}
                                {{ 'areaRevenue.moreItems' | translate }}
                              </span>
                            }
                            <span
                              class="text-[10px] text-(--tui-text-secondary) mt-1"
                            >
                              {{
                                m.reviewedAt || m.createdAt | date: 'dd/MM/yyyy'
                              }}
                            </span>
                          </div>
                        </div>

                        <span
                          appearance="secondary"
                          size="s"
                          tuiBadge
                          class="shrink-0 font-bold tabular-nums"
                        >
                          -{{ m.totalAmount | number: '1.2-2' }} €
                        </span>
                      </div>
                    } @empty {
                      <app-empty-state
                        icon="@tui.hammer"
                        message="areaRevenue.noMaterialDeliveredYet"
                        class="py-2"
                      />
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </tui-expand>
    </section>
  `,
  host: { class: 'block mb-6' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaRevenuePanelComponent {
  readonly areaId = input.required<number>();
  readonly areaName = input<string>('');
  readonly isPaywalled = input<boolean>(false);

  readonly collapsed = signal<boolean>(true);

  private readonly revenueService = inject(AreaRevenueService);
  private readonly donationsService = inject(AreaDonationsService);
  private readonly requestsService = inject(AreaMaterialRequestsService);
  private readonly authState = inject(AuthStateService);

  readonly canManageArea = computed(() => {
    const id = this.areaId();
    return (
      this.authState.canEditAsAdmin() ||
      !!this.authState.areaAdminPermissions()[id]
    );
  });

  readonly balanceResource = resource<
    AreaBalanceSummary | null,
    { areaId: number; change: number }
  >({
    params: () => ({
      areaId: this.areaId(),
      change: this.requestsService.requestsChange(),
    }),
    loader: ({ params }) => this.revenueService.getAreaBalance(params.areaId),
  });

  readonly timelineResource = resource<
    AreaPublicTimeline | null,
    { areaId: number; change: number }
  >({
    params: () => ({
      areaId: this.areaId(),
      change: this.requestsService.requestsChange(),
    }),
    loader: ({ params }) =>
      this.revenueService.getAreaPublicTimeline(params.areaId),
  });

  readonly balance = computed(() => this.balanceResource.value());
  readonly timeline = computed(() => this.timelineResource.value());

  readonly donationsList = computed(() => this.timeline()?.donations ?? []);
  readonly withdrawalsList = computed(() => this.timeline()?.withdrawals ?? []);

  openDonationDialog(): void {
    this.donationsService.openDonationDialog(this.areaId(), this.areaName());
  }

  async openMaterialRequestDialog(): Promise<void> {
    const available = this.balance()?.availableBalance ?? 0;
    const ok = await this.requestsService.openMaterialRequestDialog(
      this.areaId(),
      this.areaName(),
      available,
    );
    if (ok) {
      void this.balanceResource.reload();
      void this.timelineResource.reload();
    }
  }

  openHistoryDialog(): void {
    this.requestsService.openHistoryDialog(this.areaId(), this.areaName());
  }
}
