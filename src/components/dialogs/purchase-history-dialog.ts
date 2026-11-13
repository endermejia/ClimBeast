import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  Injector,
  resource,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiSegmented } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { injectContext } from '@taiga-ui/polymorpheus';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { LanguageService } from '../../services/language.service';
import { MerchandiseService } from '../../services/merchandise.service';
import { SupabaseService } from '../../services/supabase.service';

import { OrderDetail } from '../../models/merchandise.model';

import { OrderDetailsDialogComponent } from './order-details-dialog';

interface PurchaseRecord {
  id: string;
  amount: number;
  created_at: string;
  name: string;
  type: 'area' | 'pack' | 'merchandise' | 'donation';
  status?: string;
  slug?: string;
  order?: OrderDetail;
  message?: string | null;
  anonymous?: boolean;
  netAmount?: number;
  stripeFee?: number;
}

@Component({
  selector: 'app-purchase-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    TranslatePipe,
    TuiButton,
    TuiHeader,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiSegmented,
    TuiTitle,
  ],
  template: `
    <div class="flex flex-col gap-0 max-h-[85dvh] -m-4">
      <header tuiHeader class="px-4 py-3 border-b border-(--tui-border-normal)">
        <h2 tuiTitle>{{ 'purchaseHistory.title' | translate }}</h2>
      </header>

      <!-- Segmented filter for all / purchases / donations -->
      <div class="px-4 pt-3 pb-1 shrink-0">
        <tui-segmented
          size="s"
          class="w-full"
          [activeItemIndex]="selectedFilterIndex()"
          (activeItemIndexChange)="selectedFilterIndex.set($event)"
        >
          <button type="button">
            {{ 'purchaseHistory.all' | translate }}
          </button>
          <button type="button">
            {{ 'purchaseHistory.purchases' | translate }}
            @if (purchasesCount() > 0) {
              <span class="opacity-60 text-xs ml-1"
                >({{ purchasesCount() }})</span
              >
            }
          </button>
          <button type="button">
            {{ 'purchaseHistory.donations' | translate }}
            @if (donationsCount() > 0) {
              <span class="opacity-60 text-xs ml-1"
                >({{ donationsCount() }})</span
              >
            }
          </button>
        </tui-segmented>
      </div>

      <tui-scrollbar class="flex-1 overflow-x-hidden!">
        <div class="flex flex-col gap-1 p-2 pb-6">
          @if (purchasesResource.isLoading()) {
            <div class="py-12 flex justify-center">
              <tui-loader />
            </div>
          } @else {
            @for (p of filteredRecords(); track p.id) {
              <div
                class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) transition-colors"
              >
                <div
                  class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-xl bg-(--tui-background-base) flex items-center justify-center border border-(--tui-border-normal)"
                    >
                      <tui-icon
                        [icon]="
                          p.type === 'area'
                            ? '@tui.map-pin'
                            : p.type === 'donation'
                              ? '@tui.heart'
                              : p.type === 'pack'
                                ? '@tui.layers'
                                : '@tui.shopping-bag'
                        "
                        [class.text-emerald-500]="p.type === 'donation'"
                        [class.text-(--tui-text-tertiary)]="
                          p.type !== 'donation'
                        "
                      />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-base truncate">{{
                        p.name
                      }}</span>
                      <div class="flex items-center gap-2 text-xs opacity-60">
                        <span>
                          {{
                            p.created_at
                              | date
                                : 'medium'
                                : undefined
                                : languageService.selectedLanguage()
                          }}
                        </span>
                        @if (p.type === 'donation' && p.anonymous) {
                          <span>•</span>
                          <span class="italic text-[11px]">
                            {{ 'donations.anonymous' | translate }}
                          </span>
                        }
                      </div>
                      @if (p.type === 'donation' && p.message) {
                        <span
                          class="text-xs text-(--tui-text-secondary) italic line-clamp-1 mt-0.5"
                        >
                          "{{ p.message }}"
                        </span>
                      }
                    </div>
                  </div>
                  <div
                    class="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 w-full sm:w-auto"
                  >
                    <span
                      class="font-bold text-lg"
                      [class.text-emerald-600]="p.type === 'donation'"
                      [class.dark:text-emerald-400]="p.type === 'donation'"
                    >
                      {{
                        p.amount
                          | currency
                            : 'EUR'
                            : 'symbol'
                            : '1.2-2'
                            : languageService.selectedLanguage()
                      }}
                    </span>
                    @if (p.type === 'donation' && p.netAmount !== undefined) {
                      <span class="text-[11px] text-(--tui-text-secondary)">
                        ({{ p.netAmount | number: '1.2-2' }} €
                        {{ 'purchaseHistory.destinationPot' | translate }})
                      </span>
                    }
                    @if (p.status) {
                      <span
                        class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border"
                        [ngClass]="{
                          'bg-yellow-500/10 text-yellow-600 border-yellow-500/20':
                            p.status === 'pending',
                          'bg-blue-500/10 text-blue-600 border-blue-500/20':
                            p.status === 'paid',
                          'bg-purple-500/10 text-purple-600 border-purple-500/20':
                            p.status === 'shipped',
                          'bg-green-500/10 text-green-600 border-green-500/20':
                            p.status === 'delivered',
                          'bg-red-500/10 text-red-600 border-red-500/20':
                            p.status === 'cancelled' || p.status === 'refunded',
                        }"
                      >
                        {{
                          'merchandising.order.status.' + p.status | translate
                        }}
                      </span>
                    }
                  </div>
                </div>

                <div
                  class="flex flex-wrap items-center justify-end gap-2 mt-2 sm:mt-1"
                >
                  @if (p.slug) {
                    <button
                      tuiButton
                      appearance="flat"
                      size="s"
                      type="button"
                      class="rounded-xl!"
                      (click)="navigateToArea(p.slug)"
                    >
                      {{ 'view' | translate }}
                    </button>
                  }

                  @if (p.type === 'merchandise' && p.order) {
                    <button
                      tuiButton
                      appearance="flat"
                      size="s"
                      type="button"
                      class="rounded-xl!"
                      (click)="viewOrderDetails(p.order)"
                    >
                      {{ 'merchandising.order.details' | translate }}
                    </button>
                  }

                  @if (
                    p.type === 'merchandise' &&
                    p.status !== 'cancelled' &&
                    p.status !== 'shipped' &&
                    p.status !== 'delivered' &&
                    p.status !== 'refunded'
                  ) {
                    <button
                      tuiButton
                      appearance="action-destructive"
                      size="s"
                      type="button"
                      class="rounded-xl!"
                      (click)="cancelOrder(p.id)"
                    >
                      {{ 'merchandising.order.cancel' | translate }}
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div
                class="py-20 text-center flex flex-col items-center gap-3 opacity-30"
              >
                <tui-icon
                  [icon]="
                    selectedFilterIndex() === 2
                      ? '@tui.heart'
                      : '@tui.shopping-bag'
                  "
                  class="text-6xl"
                />
                <span class="font-medium text-lg">
                  @if (selectedFilterIndex() === 1) {
                    {{ 'purchaseHistory.emptyPurchases' | translate }}
                  } @else if (selectedFilterIndex() === 2) {
                    {{ 'purchaseHistory.emptyDonations' | translate }}
                  } @else {
                    {{ 'purchaseHistory.empty' | translate }}
                  }
                </span>
              </div>
            }
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PurchaseHistoryDialogComponent {
  protected readonly languageService = inject(LanguageService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly merchService = inject(MerchandiseService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  protected readonly context = injectContext<TuiDialogContext<void>>();
  private readonly injector = inject(Injector);

  protected readonly purchasesResource = resource({
    loader: async () => {
      const userId = this.supabase.authUserId();
      if (!userId) return [];

      // Fetch all types of purchases and donations in parallel
      const [areaPurchases, orders, donations] = await Promise.all([
        this.supabase.client
          .from('area_purchases')
          .select('id, amount, created_at, area:areas (name, slug)')
          .eq('user_id', userId),
        this.merchService.getUserOrders(),
        this.supabase.client
          .from('area_donations')
          .select(
            'id, gross_amount, net_amount, stripe_fee, created_at, donor_message, anonymous, area:areas (name, slug)',
          )
          .eq('user_id', userId),
      ]);

      const records: PurchaseRecord[] = [];

      // Process Area Purchases
      if (areaPurchases.data) {
        records.push(
          ...areaPurchases.data.map(
            (p: {
              id: string;
              amount: number;
              created_at: string | null;
              area: { name: string; slug: string } | null;
            }) => ({
              id: p.id,
              amount: p.amount,
              created_at: p.created_at || '',
              name: p.area?.name || 'Unknown Area',
              type: 'area' as const,
              slug: p.area?.slug,
            }),
          ),
        );
      }

      // Process Merchandise Orders
      if (orders) {
        records.push(
          ...orders.map((o) => ({
            id: o.id,
            amount: Number(o.total_amount),
            created_at: o.created_at || '',
            name: `Pedido #${o.id.slice(0, 8)}`,
            type: 'merchandise' as const,
            status: o.status || undefined,
            order: o,
          })),
        );
      }

      // Process Area Donations
      if (donations.data) {
        records.push(
          ...donations.data.map(
            (d: {
              id: number;
              gross_amount: number;
              net_amount: number;
              stripe_fee: number;
              created_at: string;
              donor_message: string | null;
              anonymous: boolean;
              area: { name: string; slug: string } | null;
            }) => ({
              id: `donation-${d.id}`,
              amount: Number(d.gross_amount),
              netAmount: Number(d.net_amount),
              stripeFee: Number(d.stripe_fee),
              created_at: d.created_at || '',
              name: d.area?.name
                ? `${this.translate.instant('donations.title')}: ${d.area.name}`
                : this.translate.instant('donations.title'),
              type: 'donation' as const,
              slug: d.area?.slug,
              message: d.donor_message,
              anonymous: d.anonymous,
            }),
          ),
        );
      }

      // Sort by date descending
      return records.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  selectedFilterIndex = signal<number>(0); // 0: all, 1: purchases, 2: donations

  protected readonly filteredRecords = computed(() => {
    const list = this.purchasesResource.value() || [];
    const filter = this.selectedFilterIndex();
    if (filter === 1) {
      return list.filter((r) => r.type !== 'donation');
    }
    if (filter === 2) {
      return list.filter((r) => r.type === 'donation');
    }
    return list;
  });

  protected readonly purchasesCount = computed(
    () =>
      (this.purchasesResource.value() || []).filter(
        (r) => r.type !== 'donation',
      ).length,
  );
  protected readonly donationsCount = computed(
    () =>
      (this.purchasesResource.value() || []).filter(
        (r) => r.type === 'donation',
      ).length,
  );

  protected navigateToArea(slug: string): void {
    if (!slug) return;
    this.context.completeWith();
    void this.router.navigate(['/area', slug]);
  }

  protected viewOrderDetails(order: OrderDetail): void {
    void firstValueFrom(
      this.dialogService.open(
        new PolymorpheusComponent(OrderDetailsDialogComponent, this.injector),
        {
          data: order,
          label:
            this.translate.instant('merchandising.order.details') +
            ` #${order.id.slice(0, 8)}`,
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  async cancelOrder(orderId: string): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogService.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('merchandising.order.cancelTitle'),
        size: 's',
        data: {
          content: this.translate.instant('merchandising.order.cancelConfirm'),
          yes: this.translate.instant('merchandising.order.cancelYes'),
          no: this.translate.instant('merchandising.order.cancelNo'),
        },
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      const success = await this.merchService.cancelOrder(orderId);
      if (success) {
        void this.purchasesResource.reload();
      }
    }
  }
}
