import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiBadge, TuiSkeleton } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';

import type {
  AreaMaterialRequestWithDetails,
  MaterialRequestStatus,
} from '../../models';

export interface MaterialRequestsHistoryDialogData {
  areaId: number;
  areaName: string;
}

@Component({
  selector: 'app-material-requests-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <div class="flex flex-col gap-6 p-1 max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center justify-between gap-4 border-b pb-4">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-2xl bg-(--tui-background-accent-1) text-(--tui-background-base) flex items-center justify-center shrink-0 shadow-lg shadow-(--tui-background-accent-1)/20"
          >
            <tui-icon icon="@tui.history" class="w-6 h-6" />
          </div>
          <div class="flex flex-col">
            <h3 class="text-xl font-black tracking-tight m-0">
              {{ 'materialRequests.historyTitle' | translate }}
            </h3>
            <p class="text-xs text-(--tui-text-secondary) m-0">
              {{ context.data.areaName }}
            </p>
          </div>
        </div>
      </div>

      <!-- Requests list -->
      <tui-scrollbar class="max-h-[60vh] pr-2">
        <div class="flex flex-col gap-4">
          @if (requestsResource.isLoading()) {
            @for (_ of [1, 2, 3]; track $index) {
              <div [tuiSkeleton]="true" class="h-28 rounded-2xl"></div>
            }
          } @else {
            @for (req of requests(); track req.id) {
              <div
                class="flex flex-col gap-3 p-4 rounded-2xl border border-(--tui-border-normal) bg-(--tui-background-neutral-1)"
              >
                <!-- Top bar: ID, date, status -->
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-xs font-mono font-bold text-(--tui-text-secondary)"
                    >
                      #{{ req.id }}
                    </span>
                    <span class="text-xs text-(--tui-text-secondary)">
                      {{ req.created_at | date: 'dd/MM/yyyy HH:mm' }}
                    </span>
                  </div>

                  <span
                    tuiBadge
                    size="s"
                    [appearance]="getStatusAppearance(req.status)"
                  >
                    {{ 'materialRequests.status.' + req.status | translate }}
                  </span>
                </div>

                <!-- Items list -->
                <div
                  class="flex flex-col gap-1.5 pl-2 border-l-2 border-(--tui-border-normal)"
                >
                  @for (item of req.items; track item.id) {
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium text-(--tui-text-primary)">
                        {{ item.quantity }}x
                        {{ item.material.name || 'Material' }}
                        @if (item.material.description) {
                          <span class="text-(--tui-text-secondary)"
                            >({{ item.material.description }})</span
                          >
                        }
                      </span>
                      <span class="font-bold tabular-nums">
                        {{ item.unit_price * item.quantity | number: '1.2-2' }}€
                      </span>
                    </div>
                  }
                </div>

                <!-- Notes & rejection reason -->
                @if (req.notes) {
                  <p class="text-xs text-(--tui-text-secondary) italic m-0">
                    "{{ req.notes }}"
                  </p>
                }

                @if (req.rejection_reason) {
                  <div
                    class="flex items-center gap-2 p-2.5 rounded-xl bg-(--tui-background-negative-neutral) text-(--tui-status-negative) text-xs"
                  >
                    <tui-icon
                      icon="@tui.triangle-alert"
                      class="w-4 h-4 shrink-0"
                    />
                    <span
                      ><strong
                        >{{
                          'materialRequests.rejectionReason' | translate
                        }}:</strong
                      >
                      {{ req.rejection_reason }}</span
                    >
                  </div>
                }

                <!-- Bottom: Total & Cancel button if pending -->
                <div
                  class="flex items-center justify-between pt-2 border-t border-(--tui-border-normal)"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs text-(--tui-text-secondary)"
                      >{{ 'materialRequests.total' | translate }}:</span
                    >
                    <span class="font-black text-sm tabular-nums"
                      >{{ req.total_amount | number: '1.2-2' }}€</span
                    >
                  </div>

                  @if (req.status === 'pending') {
                    <button
                      tuiButton
                      appearance="negative"
                      size="xs"
                      type="button"
                      [disabled]="cancellingId() === req.id"
                      (click)="cancelRequest(req.id)"
                    >
                      {{ 'materialRequests.cancelRequest' | translate }}
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div
                class="py-12 text-center text-xs text-(--tui-text-secondary)"
              >
                {{ 'materialRequests.noRequestsFound' | translate }}
              </div>
            }
          }
        </div>
      </tui-scrollbar>

      <!-- Close button -->
      <div class="flex justify-end pt-2 border-t">
        <button
          tuiButton
          appearance="secondary"
          size="m"
          type="button"
          (click)="context.completeWith()"
        >
          {{ 'close' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialRequestsHistoryDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, MaterialRequestsHistoryDialogData>>();

  private readonly requestsService = inject(AreaMaterialRequestsService);

  cancellingId = signal<number | null>(null);

  readonly requestsResource = resource<
    AreaMaterialRequestWithDetails[],
    { areaId: number; change: number }
  >({
    params: () => ({
      areaId: this.context.data.areaId,
      change: this.requestsService.requestsChange(),
    }),
    loader: ({ params }) =>
      this.requestsService.getRequestsByArea(params.areaId),
  });

  readonly requests = computed(() => this.requestsResource.value() ?? []);

  getStatusAppearance(status: MaterialRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'accent';
      case 'disposed':
        return 'positive';
      case 'cancelled':
        return 'neutral';
      case 'rejected':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  async cancelRequest(requestId: number): Promise<void> {
    this.cancellingId.set(requestId);
    try {
      const ok = await this.requestsService.cancelRequest(requestId);
      if (ok) {
        void this.requestsResource.reload();
      }
    } finally {
      this.cancellingId.set(null);
    }
  }
}
