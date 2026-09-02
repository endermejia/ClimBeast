import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import type { AreaBalanceSummary, AreaPublicTimeline } from '../../models';

@Component({
  selector: 'app-area-revenue-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiSkeleton,
  ],
  template: `
    <div
      class="flex flex-col gap-6 p-6 sm:p-8 rounded-[2.5rem] bg-(--tui-background-elevated) border border-(--tui-border-normal) shadow-xl relative overflow-hidden"
    >
      <!-- Background subtle gradient -->
      <div
        class="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-(--tui-background-accent-1)/5 blur-3xl pointer-events-none"
      ></div>

      <!-- Top Header -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div
            class="w-12 h-12 rounded-2xl bg-(--tui-background-accent-1) text-(--tui-background-base) flex items-center justify-center shrink-0 shadow-lg shadow-(--tui-background-accent-1)/20"
          >
            <tui-icon icon="@tui.coins" class="w-6 h-6" />
          </div>
          <div class="flex flex-col">
            <h3 class="text-xl sm:text-2xl font-black tracking-tight m-0">
              {{ 'areaRevenue.title' | translate }}
            </h3>
            <p class="text-xs text-(--tui-text-secondary) font-medium m-0">
              {{ 'areaRevenue.subtitle' | translate }}
            </p>
          </div>
        </div>

        <!-- Action buttons on top -->
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            tuiButton
            appearance="accent"
            size="s"
            type="button"
            class="rounded-xl!"
            (click)="openDonationDialog()"
          >
            <tui-icon icon="@tui.heart" class="w-3.5 h-3.5" />
            <span>{{ 'areaRevenue.donateButton' | translate }}</span>
          </button>

          @if (canManageArea()) {
            <button
              tuiButton
              appearance="secondary"
              size="s"
              type="button"
              class="rounded-xl!"
              [disabled]="(balance()?.availableBalance ?? 0) <= 0"
              (click)="openMaterialRequestDialog()"
            >
              <tui-icon icon="@tui.package-plus" class="w-3.5 h-3.5" />
              <span>{{ 'areaRevenue.requestMaterial' | translate }}</span>
            </button>

            <button
              tuiButton
              appearance="flat"
              size="s"
              type="button"
              class="rounded-xl!"
              (click)="openHistoryDialog()"
            >
              <tui-icon icon="@tui.history" class="w-3.5 h-3.5" />
              <span>{{ 'areaRevenue.historyButton' | translate }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Main Pot Card -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-3xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
      >
        <!-- Available Balance -->
        <div
          class="flex flex-col gap-1 sm:col-span-2 lg:col-span-1 border-b sm:border-b-0 lg:border-r border-(--tui-border-normal) pb-4 sm:pb-0 lg:pr-4"
        >
          <span
            class="text-[10px] font-black uppercase tracking-wider text-(--tui-text-secondary)"
          >
            {{ 'areaRevenue.availableBalance' | translate }}
          </span>
          @if (balanceResource.isLoading()) {
            <div [tuiSkeleton]="true" class="h-8 w-24 rounded-lg"></div>
          } @else {
            <span
              class="text-3xl font-black text-(--tui-text-accent) tabular-nums"
            >
              {{ balance()?.availableBalance || 0 | number: '1.2-2' }}€
            </span>
          }
          <span class="text-[11px] text-(--tui-text-secondary)">
            {{ 'areaRevenue.availableHelp' | translate }}
          </span>
        </div>

        <!-- Topo Purchases Net -->
        <div class="flex flex-col gap-1">
          <span
            class="text-[10px] font-black uppercase tracking-wider text-(--tui-text-secondary)"
          >
            {{ 'areaRevenue.topoPurchases' | translate }}
          </span>
          @if (balanceResource.isLoading()) {
            <div [tuiSkeleton]="true" class="h-6 w-16 rounded-lg"></div>
          } @else {
            <span
              class="text-xl font-bold text-(--tui-text-primary) tabular-nums"
            >
              +{{ balance()?.totalPurchasesNet || 0 | number: '1.2-2' }}€
            </span>
          }
          <span class="text-[11px] text-(--tui-text-secondary)">
            {{ 'areaRevenue.netFromTopos' | translate }}
          </span>
        </div>

        <!-- Donations Net -->
        <div class="flex flex-col gap-1">
          <span
            class="text-[10px] font-black uppercase tracking-wider text-(--tui-text-secondary)"
          >
            {{ 'areaRevenue.donations' | translate }}
          </span>
          @if (balanceResource.isLoading()) {
            <div [tuiSkeleton]="true" class="h-6 w-16 rounded-lg"></div>
          } @else {
            <span
              class="text-xl font-bold text-(--tui-status-positive) tabular-nums"
            >
              +{{ balance()?.totalDonationsNet || 0 | number: '1.2-2' }}€
            </span>
          }
          <span class="text-[11px] text-(--tui-text-secondary)">
            {{ 'areaRevenue.communityDonations' | translate }}
          </span>
        </div>

        <!-- Material Spent -->
        <div class="flex flex-col gap-1">
          <span
            class="text-[10px] font-black uppercase tracking-wider text-(--tui-text-secondary)"
          >
            {{ 'areaRevenue.materialSpent' | translate }}
          </span>
          @if (balanceResource.isLoading()) {
            <div [tuiSkeleton]="true" class="h-6 w-16 rounded-lg"></div>
          } @else {
            <span
              class="text-xl font-bold text-(--tui-text-secondary) tabular-nums"
            >
              -{{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }}€
            </span>
          }
          <span class="text-[11px] text-(--tui-text-secondary)">
            {{ 'areaRevenue.hardwareInvested' | translate }}
          </span>
        </div>
      </div>

      <!-- Public Transparency Timeline -->
      <div class="flex flex-col gap-4">
        <h4
          class="text-sm font-black uppercase tracking-wider text-(--tui-text-secondary) m-0"
        >
          {{ 'areaRevenue.transparencyTimeline' | translate }}
        </h4>

        @if (timelineResource.isLoading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div [tuiSkeleton]="true" class="h-24 rounded-2xl"></div>
            <div [tuiSkeleton]="true" class="h-24 rounded-2xl"></div>
          </div>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Recent Donations -->
            <div
              class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
            >
              <div
                class="flex items-center gap-2 text-xs font-bold text-(--tui-text-primary)"
              >
                <tui-icon
                  icon="@tui.heart"
                  class="text-(--tui-status-positive) w-4 h-4"
                />
                <span>{{ 'areaRevenue.recentDonations' | translate }}</span>
              </div>

              <div class="flex flex-col gap-2">
                @for (d of donationsList(); track d.id) {
                  <div
                    class="flex items-start justify-between gap-2 text-xs py-1 border-b border-(--tui-border-normal) last:border-0"
                  >
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold truncate">
                        {{
                          d.anonymous
                            ? ('donations.anonymous' | translate)
                            : d.userName || ('donations.anonymous' | translate)
                        }}
                      </span>
                      @if (d.message) {
                        <span
                          class="text-[11px] text-(--tui-text-secondary) italic truncate"
                        >
                          "{{ d.message }}"
                        </span>
                      }
                      <span class="text-[10px] text-(--tui-text-secondary)">
                        {{ d.createdAt | date: 'dd/MM/yyyy' }}
                      </span>
                    </div>
                    <span
                      class="font-black text-(--tui-status-positive) tabular-nums shrink-0"
                    >
                      +{{ d.amount | number: '1.2-2' }}€
                    </span>
                  </div>
                } @empty {
                  <span class="text-xs text-(--tui-text-secondary) py-2">
                    {{ 'areaRevenue.noDonationsYet' | translate }}
                  </span>
                }
              </div>
            </div>

            <!-- Delivered Equipment -->
            <div
              class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal)"
            >
              <div
                class="flex items-center gap-2 text-xs font-bold text-(--tui-text-primary)"
              >
                <tui-icon
                  icon="@tui.hammer"
                  class="text-(--tui-text-accent) w-4 h-4"
                />
                <span>{{ 'areaRevenue.deliveredEquipment' | translate }}</span>
              </div>

              <div class="flex flex-col gap-2">
                @for (m of withdrawalsList(); track m.id) {
                  <div
                    class="flex items-start justify-between gap-2 text-xs py-1 border-b border-(--tui-border-normal) last:border-0"
                  >
                    <div class="flex flex-col min-w-0">
                      <span
                        class="font-bold text-(--tui-text-primary) truncate"
                      >
                        {{
                          m.items[0]?.materialName ||
                            ('areaRevenue.materialBatch' | translate)
                        }}
                        @if (m.items.length > 1) {
                          (+{{ m.items.length - 1 }})
                        }
                      </span>
                      <span class="text-[10px] text-(--tui-text-secondary)">
                        {{ m.reviewedAt || m.createdAt | date: 'dd/MM/yyyy' }}
                      </span>
                    </div>
                    <span
                      class="font-black text-(--tui-text-secondary) tabular-nums shrink-0"
                    >
                      -{{ m.totalAmount | number: '1.2-2' }}€
                    </span>
                  </div>
                } @empty {
                  <span class="text-xs text-(--tui-text-secondary) py-2">
                    {{ 'areaRevenue.noMaterialDeliveredYet' | translate }}
                  </span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaRevenuePanelComponent {
  readonly areaId = input.required<number>();
  readonly areaName = input<string>('');
  readonly isPaywalled = input<boolean>(false);

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
