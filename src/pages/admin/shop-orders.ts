import {
  CommonModule,
  DatePipe,
  DecimalPipe,
  UpperCasePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
} from '@taiga-ui/addon-table';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
  TuiLink,
  TuiLoader,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiChevron,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { MerchandiseService } from '../../services/merchandise.service';

import { OrderDetailsDialogComponent } from '../../components/dialogs/order-details-dialog';

import { OrderDetail, OrderStatus } from '../../models/merchandise.model';

import {
  OrderStatusAppearancePipe,
  OrderStatusColorPipe,
} from '../../pipes/order-status-color.pipe';

@Component({
  selector: 'app-admin-shop-orders',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    OrderStatusAppearancePipe,
    OrderStatusColorPipe,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiHeader,
    TuiIcon,
    TuiLink,
    TuiLoader,
    TuiTable,
    TuiTableCell,
    TuiTableHead,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    TuiTitle,
    UpperCasePipe,
  ],
  template: `
    <div class="p-4 flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <tui-badged-content [style.--tui-radius.%]="50">
              @if (pendingOrdersCount(); as ordersCount) {
                <ng-container tuiSlot="top">
                  <tui-badge-notification tuiAppearance="accent" size="s">
                    {{ ordersCount }}
                  </tui-badge-notification>
                </ng-container>
              }
              <span
                tuiAvatar="@tui.shopping-bag"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'admin.orders.title' | translate"
              ></span>
            </tui-badged-content>

            {{ 'admin.orders.title' | translate }}
          </a>
        </h1>
      </header>

      <tui-loader [overlay]="true" [loading]="ordersResource.isLoading()">
        @if (ordersResource.value(); as orders) {
          <table tuiTable [columns]="columns()" class="w-full">
            <thead>
              <tr tuiThGroup>
                <th tuiTh *tuiHead="'id'">ID</th>
                <th tuiTh *tuiHead="'user'">{{ 'user' | translate }}</th>
                <th tuiTh *tuiHead="'total'">Total</th>
                <th tuiTh *tuiHead="'status'">{{ 'status' | translate }}</th>
                <th tuiTh *tuiHead="'date'">{{ 'date' | translate }}</th>
              </tr>
            </thead>
            <tbody tuiTbody [data]="orders">
              @for (order of orders; track order.id) {
                <tr tuiTr>
                  <td tuiTd *tuiCell="'id'">
                    <button
                      tuiLink
                      type="button"
                      class="font-mono text-xs"
                      (click)="viewDetails(order)"
                    >
                      {{ order.id | slice: 0 : 8 }}
                    </button>
                  </td>
                  <td tuiTd *tuiCell="'user'">
                    <div class="flex flex-col">
                      <span class="font-medium">{{ order.shipping_name }}</span>
                      <span class="text-xs text-(--tui-text-secondary)"
                        >{{ order.shipping_city }},
                        {{ order.shipping_country }}</span
                      >
                      @if (order.shipping_phone) {
                        <span class="text-xs text-(--tui-text-secondary)">{{
                          order.shipping_phone
                        }}</span>
                      }
                    </div>
                  </td>
                  <td tuiTd *tuiCell="'total'">
                    {{ order.total_amount | number: '1.2-2' }}
                    {{ order.currency | uppercase }}
                  </td>
                  <td tuiTd *tuiCell="'status'">
                    <button
                      tuiButton
                      tuiChevron
                      type="button"
                      size="xs"
                      class="rounded-md! px-2!"
                      [appearance]="order.status | orderStatusAppearance"
                      [tuiDropdown]="statusDropdown"
                      [tuiDropdownOpen]="openDropdownId() === order.id"
                      (click)="toggleDropdown(order.id)"
                    >
                      <span class="flex items-center gap-1">
                        <span
                          class="w-2 h-2 rounded-full"
                          [ngClass]="order.status | orderStatusColor"
                          style="background-color: currentColor;"
                        ></span>
                        <span
                          class="text-[10px] font-bold uppercase tracking-wider"
                        >
                          {{
                            'merchandising.order.status.' + order.status
                              | translate
                          }}
                        </span>
                      </span>
                    </button>

                    <ng-template #statusDropdown>
                      <tui-data-list>
                        @for (option of statusOptions; track option) {
                          <button
                            tuiOption
                            new
                            type="button"
                            (click)="onStatusChange(order.id, option)"
                          >
                            <div class="flex items-center gap-2">
                              <span
                                class="w-2 h-2 rounded-full"
                                [ngClass]="option | orderStatusColor"
                                style="background-color: currentColor;"
                              ></span>
                              <span class="text-xs uppercase font-medium">
                                {{
                                  'merchandising.order.status.' + option
                                    | translate
                                }}
                              </span>
                            </div>
                          </button>
                        }
                      </tui-data-list>
                    </ng-template>
                  </td>
                  <td tuiTd *tuiCell="'date'">
                    {{ order.created_at | date: 'short' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="p-12 text-center text-(--tui-text-secondary)">
            {{ 'merchandising.order.noOrders' | translate }}
          </div>
        }
      </tui-loader>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShopOrdersComponent {
  private readonly merchService = inject(MerchandiseService);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly columns = signal([
    'id',
    'user',
    'total',
    'status',
    'date',
  ]);
  protected readonly openDropdownId = signal<string | null>(null);

  readonly statusOptions: OrderStatus[] = [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];

  protected readonly stringifyStatus = (status: OrderStatus): string =>
    this.translate.instant('merchandising.order.status.' + status);

  readonly ordersResource = resource({
    loader: () => this.merchService.getAllOrders(),
  });

  protected readonly pendingOrdersCount = computed(() => {
    const orders = this.ordersResource.value() ?? [];
    return orders.filter(
      (o) => !['delivered', 'cancelled', 'refunded'].includes(o.status ?? ''),
    ).length;
  });

  async onStatusChange(orderId: string, status: OrderStatus): Promise<void> {
    this.openDropdownId.set(null);
    const success = await this.merchService.updateOrderStatus(orderId, status);
    if (success) {
      void this.ordersResource.reload();
    }
  }

  protected toggleDropdown(orderId: string): void {
    this.openDropdownId.set(this.openDropdownId() === orderId ? null : orderId);
  }

  viewDetails(order: OrderDetail): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(OrderDetailsDialogComponent, this.injector),
        {
          data: order,
          label:
            this.translate.instant('merchandising.order.details') +
            ` #${order.id.slice(0, 8)}`,
          size: 'm',
        },
      ),
    );
  }
}

export default AdminShopOrdersComponent;
