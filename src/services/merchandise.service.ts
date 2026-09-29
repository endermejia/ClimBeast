import { inject, Injectable, signal } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { MerchandiseItemDialogComponent } from '../components/dialogs/merchandise-item-dialog';

import { OrderDetailsDialogComponent } from '../components/dialogs/order-details-dialog';
import { PurchaseHistoryDialogComponent } from '../components/dialogs/purchase-history-dialog';

import type {
  MerchandiseItem,
  MerchandiseItemDetail,
  MerchandiseItemWithStockRow,
  OrderDetail,
  OrderItem,
  OrderStatus,
} from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class MerchandiseService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);

  async getMerchandiseItems(
    onlyActive = true,
    includeStock = false,
  ): Promise<MerchandiseItemDetail[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    let query = this.supabase.client
      .from('merchandise_items')
      .select(includeStock ? '*, stock:merchandise_stock(*)' : '*')
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MerchandiseService] getMerchandiseItems error', error);
      return [];
    }
    if (!includeStock) {
      return (data || []) as unknown as MerchandiseItemDetail[];
    }
    return ((data as unknown as MerchandiseItemWithStockRow[]) || []).map(
      (item) => ({
        ...item,
        stock: item?.stock ?? [],
      }),
    ) as unknown as MerchandiseItemDetail[];
  }

  async getMerchandiseItemById(
    id: string,
  ): Promise<MerchandiseItemDetail | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('merchandise_items')
      .select('*, stock:merchandise_stock(*)')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as MerchandiseItemDetail;
  }

  async upsertMerchandiseItem(
    item: Partial<MerchandiseItemDetail>,
  ): Promise<MerchandiseItem | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      const { stock, ...merchData } = item;
      const { data, error } = await this.supabase.client
        .from('merchandise_items')
        .upsert(merchData as MerchandiseItem)
        .select()
        .single();

      if (error) throw error;

      if (stock && Array.isArray(stock) && data?.id) {
        for (const s of stock) {
          if (s.size) {
            await this.supabase.client.from('merchandise_stock').upsert(
              {
                item_id: data.id,
                size: s.size,
                stock: s.stock ?? 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'item_id, size' },
            );
          }
        }
      }

      return data as MerchandiseItem;
    } catch (e) {
      console.error('[MerchandiseService] upsertMerchandiseItem error', e);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async deleteMerchandiseItem(id: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      const { error } = await this.supabase.client
        .from('merchandise_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('[MerchandiseService] deleteMerchandiseItem error', e);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getUserOrders(userId?: string): Promise<OrderDetail[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const uid = userId || this.supabase.authUserId();
    if (!uid) return [];

    const { data, error } = await this.supabase.client
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MerchandiseService] getUserOrders error', error);
      return [];
    }

    return this.enrichOrdersWithProductData((data as OrderDetail[]) || []);
  }

  async getAllOrders(): Promise<OrderDetail[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MerchandiseService] getAllOrders error', error);
      return [];
    }

    return this.enrichOrdersWithProductData((data as OrderDetail[]) || []);
  }

  private async enrichOrdersWithProductData(
    orders: OrderDetail[],
  ): Promise<OrderDetail[]> {
    if (!orders || orders.length === 0) return [];

    const merchIds = [
      ...new Set(
        orders
          .flatMap((o) => o.items ?? [])
          .filter((i: OrderItem) => i.item_type === 'merchandise' && i.item_id)
          .map((i: OrderItem) => i.item_id as string),
      ),
    ];
    const areaIds = [
      ...new Set(
        orders
          .flatMap((o) => o.items ?? [])
          .filter((i: OrderItem) => i.item_type === 'area' && i.item_numeric_id)
          .map((i: OrderItem) => i.item_numeric_id as number),
      ),
    ];

    const infoMap = new Map<
      string | number,
      {
        name: string;
        image?: string | null;
        slug?: string | null;
        data?: MerchandiseItemDetail;
      }
    >();

    const queries = [];
    if (merchIds.length > 0) {
      queries.push(
        this.supabase.client
          .from('merchandise_items')
          .select('*')
          .in('id', merchIds),
      );
    }
    if (areaIds.length > 0) {
      queries.push(
        this.supabase.client
          .from('areas')
          .select('id, name, slug')
          .in('id', areaIds),
      );
    }

    const results = await Promise.all(queries);
    for (const res of results) {
      if (res.data) {
        for (const item of res.data) {
          const row = item as {
            id: string | number;
            name: string;
            image_urls?: string[] | null;
            slug?: string | null;
          };
          const image = row.image_urls?.[0];
          infoMap.set(row.id, {
            name: row.name,
            image,
            slug: row.slug,
            data: row as MerchandiseItemDetail,
          });
        }
      }
    }

    return orders.map((order) => ({
      ...order,
      items: (order.items || []).map((item) => {
        const idKey =
          item.item_type === 'area' ? item.item_numeric_id : item.item_id;
        const info = idKey ? infoMap.get(idKey) : undefined;
        return {
          ...item,
          product_name: info?.name || 'Producto',
          product_image: info?.image || null,
          product_slug: info?.slug || null,
          product_data: info?.data,
        };
      }),
    }));
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<boolean> {
    if (!this.isBrowser) return false;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      const { error } = await this.supabase.client
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('[MerchandiseService] updateOrderStatus error', e);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }

  async uploadShopImage(file: File): Promise<string | null> {
    if (!this.isBrowser) return null;
    await this.supabase.whenReady();

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `shop/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('merchandise')
      .upload(filePath, file);

    if (error) {
      console.error('[MerchandiseService] uploadShopImage error', error);
      return null;
    }

    return this.supabase.getPublicUrl('merchandise', data.path);
  }

  /**
   * Abre la ficha del artículo. Si un admin edita o borra desde el diálogo,
   * se aplica la acción y se devuelve `true` para que quien lo abrió pueda
   * refrescar su lista.
   */
  async openMerchandiseItem(item: MerchandiseItemDetail): Promise<boolean> {
    const action = await firstValueFrom(
      this.dialogs.open<'edit' | 'delete' | undefined>(
        new PolymorpheusComponent(MerchandiseItemDialogComponent),
        {
          data: item,
          label: this.translate.instant(
            item.name || 'merchandising.items.title',
          ),
          size: 'l',
        },
      ),
      { defaultValue: undefined },
    );

    if (action === 'edit') return this.editItem(item);
    if (action === 'delete') return this.deleteItem(item);
    return false;
  }

  /** Formulario de creación (`item` vacío) o edición. `true` si se guardó. */
  async editItem(item?: MerchandiseItemDetail): Promise<boolean> {
    // Import dinámico: mantiene el formulario de edición (y su drag-drop)
    // fuera del bundle inicial y evita el ciclo con este servicio.
    const { AdminMerchandiseDialogComponent } =
      await import('../components/dialogs/admin-merchandise-dialog');

    const result = await firstValueFrom(
      this.dialogs.open<MerchandiseItemDetail | null>(
        new PolymorpheusComponent(AdminMerchandiseDialogComponent),
        {
          data: item,
          label: this.translate.instant(
            item ? 'merchandising.items.edit' : 'merchandising.items.new',
          ),
          size: 'm',
          dismissible: true,
        },
      ),
      { defaultValue: null },
    );

    return !!result;
  }

  /** Confirma y borra el artículo. Devuelve `true` si se borró. */
  async deleteItem(item: MerchandiseItemDetail): Promise<boolean> {
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('merchandising.items.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('merchandising.items.deleteConfirm', {
            name: item.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return false;

    const ok = await this.deleteMerchandiseItem(item.id);
    if (ok) {
      this.toast.success(
        this.translate.instant('merchandising.items.deleteSuccess'),
      );
    } else {
      this.toast.error(
        this.translate.instant('merchandising.items.deleteError'),
      );
    }
    return ok;
  }

  openOrderDetails(order: OrderDetail): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(OrderDetailsDialogComponent),
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

  openPurchaseHistory(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(PurchaseHistoryDialogComponent),
        {
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }
}
