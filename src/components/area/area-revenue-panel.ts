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

import { TuiButton, TuiExpand, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiProgress, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCard, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import { EmptyStateComponent } from '../ui/empty-state';

import type { AreaBalanceSummary, AreaPublicTimeline } from '../../models';

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
    TuiProgress,
    TuiSkeleton,
  ],
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }
    tui-expand {
      background: transparent !important;
      padding: 0 !important;
      margin: 0 !important;
    }
  `,
  template: `
    <section
      tuiCardLarge="compact"
      appearance="outline"
      class="select-none transition-shadow hover:shadow-xs"
    >
      <!-- Cabecera principal -->
      <header
        tuiHeader="body-m"
        class="flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-1"
      >
        <div class="w-full sm:w-auto sm:flex-1">
          <h2
            class="flex items-center gap-2 m-0 text-base sm:text-lg font-bold"
          >
            <tui-icon icon="@tui.coins" class="text-amber-500 shrink-0" />
            <span class="break-words">{{
              'areaRevenue.title' | translate
            }}</span>
          </h2>
          <p
            tuiSubtitle
            class="m-0 text-xs text-(--tui-text-secondary) break-words mt-0.5"
          >
            {{ 'areaRevenue.subtitle' | translate }}
          </p>
        </div>

        <!-- Acciones para administradores en la cabecera (debajo en pantallas pequeñas, a la derecha en sm+) -->
        @if (canManageArea()) {
          <aside
            tuiAccessories
            class="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0"
          >
            <button
              appearance="secondary"
              size="s"
              tuiButton
              type="button"
              iconStart="@tui.hammer"
              [disabled]="(balance()?.availableBalance ?? 0) <= 0"
              (click)="openMaterialRequestDialog()"
            >
              {{ 'areaRevenue.request' | translate }}
            </button>
            <button
              appearance="flat"
              size="s"
              tuiButton
              type="button"
              iconStart="@tui.history"
              (click)="openHistoryDialog()"
            >
              {{ 'areaRevenue.history' | translate }}
            </button>
          </aside>
        }
      </header>

      <div class="flex flex-col gap-4 sm:gap-5 pt-3">
        <!-- 1. Bloque superior asimétrico (siempre visible) -->
        <div
          class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch w-full"
        >
          <!-- Tarjeta destacada Saldo Actual (Izquierda) -->
          <div
            class="md:col-span-7 lg:col-span-8 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 gap-4"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div
                  class="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 text-2xl sm:text-3xl"
                >
                  <tui-icon icon="@tui.coins" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs sm:text-sm font-semibold text-(--tui-text-secondary)"
                  >
                    {{ 'areaRevenue.currentPotBalance' | translate }}
                  </span>
                  @if (balanceResource.isLoading()) {
                    <span
                      [tuiSkeleton]="true"
                      class="w-32 h-8 sm:h-10 rounded mt-1"
                    ></span>
                  } @else {
                    <span
                      class="text-2xl sm:text-4xl font-black text-(--tui-text-primary) tabular-nums tracking-tight"
                    >
                      {{ balance()?.availableBalance || 0 | number: '1.2-2' }} €
                    </span>
                  }
                </div>
              </div>

              <!-- Botón sutil dentro de Saldo actual -->
              <button
                appearance="flat"
                size="s"
                tuiButton
                type="button"
                class="text-xs text-(--tui-text-secondary) hover:text-(--tui-text-primary) shrink-0 -mt-1 -mr-1"
                (click)="collapsed.set(!collapsed())"
              >
                {{
                  (collapsed()
                    ? 'areaRevenue.viewDetails'
                    : 'areaRevenue.hideDetails'
                  ) | translate
                }}
              </button>
            </div>

            <!-- Botón de contribución integrado directamente bajo el saldo principal (responsive) -->
            <button
              tuiButton
              type="button"
              class="w-full rounded-xl !whitespace-normal !h-auto min-h-11 py-2.5 px-3 text-xs sm:text-sm md:text-base font-bold text-white shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center text-center leading-snug cursor-pointer"
              style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);"
              (click)="openDonationDialog()"
            >
              {{ 'areaRevenue.contributeButton' | translate }}
            </button>
          </div>

          <!-- Columna derecha: tarjetas métricas apiladas -->
          <div
            class="md:col-span-5 lg:col-span-4 flex flex-col justify-between gap-2.5 sm:gap-3"
          >
            <!-- 1. Total recaudado -->
            <div
              class="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 active:scale-[0.99]"
              (click)="collapsed.set(false)"
              (keydown.enter)="collapsed.set(false)"
              tabindex="0"
              role="button"
            >
              <div
                class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0"
              >
                <tui-icon icon="@tui.heart" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-[11px] sm:text-xs font-medium text-(--tui-text-secondary) truncate"
                >
                  {{ 'areaRevenue.totalRaised' | translate }}
                </span>
                @if (balanceResource.isLoading()) {
                  <span
                    [tuiSkeleton]="true"
                    class="w-16 h-5 rounded mt-0.5"
                  ></span>
                } @else {
                  <span
                    class="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums"
                  >
                    +{{ totalRaised() | number: '1.2-2' }} €
                  </span>
                }
              </div>
            </div>

            <!-- 3. Material suministrado -->
            <div
              class="flex items-center gap-3 p-3 rounded-xl bg-amber-900/10 dark:bg-amber-950/25 border border-amber-900/20 dark:border-amber-900/30 flex-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 active:scale-[0.99]"
              (click)="collapsed.set(false)"
              (keydown.enter)="collapsed.set(false)"
              tabindex="0"
              role="button"
            >
              <div
                class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-800/20 text-amber-800 dark:text-amber-400 shrink-0"
              >
                <tui-icon icon="@tui.hammer" />
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-[11px] sm:text-xs font-medium text-(--tui-text-secondary) truncate"
                >
                  {{ 'areaRevenue.material' | translate }}
                </span>
                @if (balanceResource.isLoading()) {
                  <span
                    [tuiSkeleton]="true"
                    class="w-16 h-5 rounded mt-0.5"
                  ></span>
                } @else {
                  <span
                    class="text-sm sm:text-base font-bold text-amber-900 dark:text-amber-300 tabular-nums"
                  >
                    -
                    {{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
                  </span>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Barra de progreso de meta -->
        <div
          class="flex flex-col gap-2 pt-1 cursor-pointer select-none"
          (click)="collapsed.set(false)"
          (keydown.enter)="collapsed.set(false)"
          tabindex="0"
          role="button"
        >
          <div
            class="flex items-center justify-between text-xs sm:text-sm font-medium gap-2"
          >
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <span class="text-(--tui-text-primary) font-semibold truncate">
                {{
                  'areaRevenue.nextGoal' | translate: { target: goal().target }
                }}
              </span>
              <span
                tuiBadge
                size="s"
                appearance="positive"
                class="text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
              >
                {{ goal().percentage }}%
              </span>
            </div>
            <span
              class="text-(--tui-text-primary) font-bold tabular-nums shrink-0"
            >
              {{ goal().current | number: '1.0-0' }} € /
              {{ goal().target | number: '1.0-0' }} €
            </span>
          </div>

          <progress
            [max]="goal().target"
            size="m"
            tuiProgressBar
            color="var(--tui-status-positive)"
            [style.color]="'var(--tui-status-positive)'"
            [value]="goal().current"
            class="w-full cursor-pointer"
          ></progress>
        </div>

        <!-- 3. Muro de transparencia comunitaria (expandible) -->
        <tui-expand [expanded]="!collapsed()">
          <div class="flex flex-col gap-3 pt-3">
            <div class="flex flex-col">
              <h3
                class="text-xs sm:text-sm font-bold uppercase tracking-wider text-(--tui-text-primary) m-0"
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
                      +{{ totalRaised() | number: '1.2-2' }} €
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
        </tui-expand>
      </div>
    </section>
  `,
  host: { class: 'block mb-6' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaRevenuePanelComponent {
  readonly areaId = input.required<number>();
  readonly areaName = input<string>('');
  readonly isPaywalled = input<boolean>(false);
  readonly areaPrice = input<number>(0);
  readonly isPurchased = input<boolean>(false);
  readonly toposCount = input<number>(0);

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
  readonly totalRaised = computed(
    () =>
      (this.balance()?.totalPurchasesNet || 0) +
      (this.balance()?.totalDonationsNet || 0),
  );
  readonly timeline = computed(() => this.timelineResource.value());

  readonly donationsList = computed(() => this.timeline()?.donations ?? []);
  readonly withdrawalsList = computed(() => this.timeline()?.withdrawals ?? []);

  readonly goal = computed(() => {
    const current = this.balance()?.availableBalance ?? 0;
    const step = 500;
    const target = Math.max(
      step,
      Math.ceil((current > 0 ? current : 1) / step) * step,
    );
    const percentage = Math.min(
      100,
      Math.max(0, Math.round((current / target) * 100)),
    );
    return {
      current,
      target,
      percentage,
    };
  });

  openDonationDialog(): void {
    this.donationsService.openDonationDialog(this.areaId(), this.areaName(), {
      areaPrice: this.areaPrice(),
      isPurchased: this.isPurchased(),
      isPaywalled: this.isPaywalled(),
      toposCount: this.toposCount(),
    });
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
