import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import type { AreaBalanceSummary, AreaPublicTimeline } from '../../models';

import { CountUpDirective } from '../../directives/count-up.directive';

import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-area-revenue-panel',
  standalone: true,
  imports: [
    CommonModule,
    CountUpDirective,
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <div class="flex flex-col w-full select-none">
      <!-- 1. Sección Principal: Donaciones para el área + Bote de equipamiento y mantenimiento -->
      <div
        class="p-4 sm:p-5 border border-(--tui-border-normal) bg-(--tui-background-base) flex flex-col gap-4 rounded-2xl"
        [class.rounded-b-none]="showDetailsOnMobile() || canManageArea()"
      >
        <header class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <h2
              class="flex items-center gap-2 m-0 text-base sm:text-lg font-bold"
            >
              <tui-icon
                icon="@tui.heart-handshake"
                class="text-(--tui-status-positive) shrink-0"
              />
              <span class="break-words">{{
                'areaRevenue.title' | translate
              }}</span>
            </h2>
            <p
              class="m-0 text-xs text-(--tui-text-secondary) break-words mt-0.5"
            >
              {{ 'areaRevenue.subtitle' | translate }}
            </p>
          </div>

          <!-- Botón Info para togglear detalles -->
          <button
            appearance="action-grayscale"
            size="s"
            tuiIconButton
            type="button"
            iconStart="@tui.info"
            class="shrink-0"
            [attr.aria-label]="'areaRevenue.viewDetails' | translate"
            (click)="showDetailsOnMobile.set(!showDetailsOnMobile())"
          ></button>
        </header>

        <!-- Bloque Saldo Actual -->
        <div class="flex items-center gap-3.5 sm:gap-4 min-w-0 pt-1">
          <div
            class="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-(--tui-status-warning-pale) text-(--tui-status-warning) shrink-0 text-2xl sm:text-3xl"
          >
            <tui-icon icon="@tui.coins" />
          </div>
          <div class="flex flex-col min-w-0">
            <span
              class="text-xs sm:text-sm font-semibold text-(--tui-text-secondary)"
            >
              {{ 'areaRevenue.currentPotBalance' | translate }}
            </span>
            <span
              class="text-2xl sm:text-3xl font-black text-(--tui-text-primary) tabular-nums tracking-tight"
              [appCountUp]="balance()?.availableBalance || 0"
              #availableBalanceAnim="appCountUp"
            >
              {{ availableBalanceAnim.currentValue() | number: '1.2-2' }} €
            </span>
          </div>
        </div>

        <!-- Botón de contribución con icono de mano y corazón -->
        <button
          tuiButton
          type="button"
          iconStart="@tui.hand-heart"
          class="w-full rounded-xl !whitespace-normal !h-auto min-h-11 py-2.5 px-3 text-xs sm:text-sm md:text-base font-bold text-white shadow-xs transition-transform active:scale-[0.99] flex items-center justify-center text-center leading-snug cursor-pointer"
          style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);"
          (click)="openDonationDialog()"
        >
          {{ 'areaRevenue.contributeButton' | translate }}
        </button>
      </div>

      <!-- Contenedor secundario: Total Recaudado y Material Suministrado (Debajo) -->
      <div class="flex flex-col" [class.hidden]="!showDetailsOnMobile()">
        <!-- 2. Total recaudado -->
        <div
          class="flex items-center justify-between gap-3 p-3 sm:p-4 border border-t-0 border-(--tui-border-normal) bg-(--tui-background-base) transition-colors hover:bg-(--tui-background-neutral-1) cursor-pointer"
          (click)="openDonationsHistoryDialog()"
          (keydown.enter)="openDonationsHistoryDialog()"
          tabindex="0"
          role="button"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-(--tui-status-positive-pale) text-(--tui-status-positive) shrink-0"
            >
              <tui-icon icon="@tui.heart" />
            </div>
            <div class="flex flex-col min-w-0">
              <span
                class="text-[11px] sm:text-xs font-medium text-(--tui-text-secondary) truncate"
              >
                {{ 'areaRevenue.totalRaised' | translate }}
              </span>
              <span
                class="text-sm sm:text-base font-bold text-(--tui-status-positive) tabular-nums"
                [appCountUp]="totalRaised()"
                #totalRaisedAnim="appCountUp"
              >
                +{{ totalRaisedAnim.currentValue() | number: '1.2-2' }} €
              </span>
            </div>
          </div>

          <button
            appearance="action-grayscale"
            size="xs"
            tuiIconButton
            type="button"
            iconStart="@tui.history"
            [attr.aria-label]="'areaRevenue.recentDonations' | translate"
            (click)="$event.stopPropagation(); openDonationsHistoryDialog()"
          ></button>
        </div>

        <!-- 3. Material suministrado -->
        <div
          class="flex items-center justify-between gap-3 p-3 sm:p-4 border border-t-0 border-(--tui-border-normal) bg-(--tui-background-base) transition-colors hover:bg-(--tui-background-neutral-1) cursor-pointer"
          [class.rounded-b-2xl]="!canManageArea()"
          (click)="openMaterialHistoryDialog()"
          (keydown.enter)="openMaterialHistoryDialog()"
          tabindex="0"
          role="button"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-(--tui-status-info-pale) text-(--tui-status-info) shrink-0"
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
                  class="text-sm sm:text-base font-bold text-(--tui-status-info) tabular-nums"
                >
                  - {{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
                </span>
              }
            </div>
          </div>

          <button
            appearance="action-grayscale"
            size="xs"
            tuiIconButton
            type="button"
            iconStart="@tui.history"
            [attr.aria-label]="'areaRevenue.deliveredEquipment' | translate"
            (click)="$event.stopPropagation(); openMaterialHistoryDialog()"
          ></button>
        </div>
      </div>

      <!-- 4. Acciones de administración al final de todo de la sección -->
      @if (canManageArea()) {
        <div
          class="p-3 sm:p-4 border border-t-0 border-(--tui-border-normal) bg-(--tui-background-base) flex items-center justify-end gap-2 rounded-b-2xl"
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
            appearance="action-grayscale"
            size="s"
            tuiButton
            type="button"
            iconStart="@tui.history"
            (click)="openHistoryDialog()"
          >
            {{ 'areaRevenue.history' | translate }}
          </button>
        </div>
      }
    </div>

    <!-- Dialog: Historial de donaciones -->
    <ng-template #donationsDialog let-observer>
      <div class="flex flex-col gap-3 max-h-[75vh]">
        <div
          class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
        >
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.heart" class="text-emerald-500 shrink-0" />
            <span class="font-bold text-sm text-(--tui-text-primary)">
              {{ 'areaRevenue.totalRaised' | translate }}
            </span>
          </div>
          <span appearance="positive" size="s" tuiBadge>
            +{{ totalRaised() | number: '1.2-2' }} €
          </span>
        </div>

        <tui-scrollbar class="max-h-[60vh] pr-1">
          <div class="flex flex-col gap-2">
            @if (timelineResource.isLoading()) {
              @for (_ of [1, 2, 3]; track $index) {
                <div [tuiSkeleton]="true" class="h-16 rounded-xl"></div>
              }
            } @else {
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
                            : d.userName || ('donations.anonymous' | translate)
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
                  class="py-4"
                />
              }
            }
          </div>
        </tui-scrollbar>
      </div>
    </ng-template>

    <!-- Dialog: Historial de material suministrado -->
    <ng-template #materialDialog let-observer>
      <div class="flex flex-col gap-3 max-h-[75vh]">
        <div
          class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
        >
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.hammer" class="text-blue-500 shrink-0" />
            <span class="font-bold text-sm text-(--tui-text-primary)">
              {{ 'areaRevenue.material' | translate }}
            </span>
          </div>
          <span
            appearance="secondary"
            size="s"
            tuiBadge
            class="font-bold tabular-nums !text-(--tui-status-info)"
          >
            -{{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
          </span>
        </div>

        <tui-scrollbar class="max-h-[60vh] pr-1">
          <div class="flex flex-col gap-2">
            @if (timelineResource.isLoading()) {
              @for (_ of [1, 2, 3]; track $index) {
                <div [tuiSkeleton]="true" class="h-16 rounded-xl"></div>
              }
            } @else {
              @for (m of withdrawalsList(); track m.id) {
                <div
                  class="flex flex-col gap-2 p-3 rounded-lg bg-(--tui-background-base) border border-(--tui-border-normal)"
                >
                  <div class="flex items-start justify-between gap-3">
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
                          @if (m.items.length === 1) {
                            {{ m.items[0].quantity }}x
                            {{ m.items[0].materialName }}
                          } @else {
                            {{
                              m.items[0]?.materialName ||
                                ('areaRevenue.materialBatch' | translate)
                            }}
                          }
                        </span>
                        @if (m.items.length > 1) {
                          <span class="text-[11px] text-(--tui-text-secondary)">
                            +{{ m.items.length - 1 }}
                            {{ 'areaRevenue.moreItems' | translate }}
                          </span>
                        }
                        <span
                          class="text-[10px] text-(--tui-text-secondary) mt-1"
                        >
                          {{ m.reviewedAt || m.createdAt | date: 'dd/MM/yyyy' }}
                        </span>
                      </div>
                    </div>

                    <span
                      appearance="secondary"
                      size="s"
                      tuiBadge
                      class="shrink-0 font-bold tabular-nums !text-(--tui-status-info)"
                    >
                      -{{ m.totalAmount | number: '1.2-2' }} €
                    </span>
                  </div>

                  @if (m.items.length > 1) {
                    <div
                      class="flex flex-col gap-1 pl-9 pt-1.5 border-t border-(--tui-border-normal)/60 text-xs text-(--tui-text-secondary)"
                    >
                      @for (item of m.items; track $index) {
                        <div class="flex items-center justify-between">
                          <span
                            >{{ item.quantity }}x {{ item.materialName }}</span
                          >
                          <span class="tabular-nums font-medium"
                            >{{
                              item.unitPrice * item.quantity | number: '1.2-2'
                            }}
                            €</span
                          >
                        </div>
                      }
                    </div>
                  }
                </div>
              } @empty {
                <app-empty-state
                  icon="@tui.hammer"
                  message="areaRevenue.noMaterialDeliveredYet"
                  class="py-4"
                />
              }
            }
          </div>
        </tui-scrollbar>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaRevenuePanelComponent {
  readonly areaId = input.required<number>();
  readonly areaName = input<string>('');
  readonly isPaywalled = input<boolean>(false);
  readonly areaPrice = input<number>(0);
  readonly isPurchased = input<boolean>(false);
  readonly toposCount = input<number>(0);

  readonly showDetailsOnMobile = signal(false);

  private readonly donationsDialog =
    viewChild<TemplateRef<TuiDialogContext<void>>>('donationsDialog');
  private readonly materialDialog =
    viewChild<TemplateRef<TuiDialogContext<void>>>('materialDialog');

  private readonly revenueService = inject(AreaRevenueService);
  private readonly donationsService = inject(AreaDonationsService);
  private readonly requestsService = inject(AreaMaterialRequestsService);
  private readonly authState = inject(AuthStateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

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

  openDonationDialog(): void {
    this.donationsService.openDonationDialog(this.areaId(), this.areaName(), {
      areaPrice: this.areaPrice(),
      isPurchased: this.isPurchased(),
      isPaywalled: this.isPaywalled(),
      toposCount: this.toposCount(),
    });
  }

  openDonationsHistoryDialog(): void {
    const template = this.donationsDialog();
    if (!template) return;
    void firstValueFrom(
      this.dialogs.open(template, {
        label: this.translate.instant('areaRevenue.recentDonations'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  openMaterialHistoryDialog(): void {
    const template = this.materialDialog();
    if (!template) return;
    void firstValueFrom(
      this.dialogs.open(template, {
        label: this.translate.instant('areaRevenue.deliveredEquipment'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
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
