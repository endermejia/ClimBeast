import { computed, effect, inject, Injectable, signal } from '@angular/core';

import type { CartProduct } from '../models';

import { IS_BROWSER } from '../app/is-browser';

import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly supabase = inject(SupabaseService);

  // Cart state
  private readonly _items = signal<CartProduct[]>([]);
  readonly items = this._items.asReadonly();
  readonly showCart = signal(false);

  readonly totalItems = computed(() =>
    this._items().reduce((acc, item) => acc + item.quantity, 0),
  );

  readonly totalPrice = computed(() =>
    this._items().reduce((acc, item) => acc + item.price * item.quantity, 0),
  );

  readonly hasOutOfStockItems = computed(() =>
    this._items().some(
      (item) =>
        item.type === 'merchandise' &&
        item.maxStock !== undefined &&
        (item.maxStock <= 0 || item.quantity > item.maxStock),
    ),
  );

  readonly outOfStockItems = computed(() =>
    this._items().filter(
      (item) =>
        item.type === 'merchandise' &&
        item.maxStock !== undefined &&
        (item.maxStock <= 0 || item.quantity > item.maxStock),
    ),
  );

  private readonly CART_STORAGE_KEY = 'climbeast_cart';
  private _syncedUserId: string | null = null;

  constructor() {
    if (this.isBrowser) {
      this.loadCart();
    }

    // Auto-save to localStorage
    effect(() => {
      if (this.isBrowser) {
        localStorage.setItem(
          this.CART_STORAGE_KEY,
          JSON.stringify(this._items()),
        );
      }
    });

    // Refresh stock when cart overlay is opened
    effect(() => {
      if (this.showCart() && this.isBrowser) {
        void this.refreshStock();
      }
    });

    // Sync with Supabase only once per unique user session (not on every auth event)
    effect(() => {
      const userId = this.supabase.authUserId();
      if (userId && userId !== this._syncedUserId) {
        this._syncedUserId = userId;
        this.syncWithSupabase();
      } else if (!userId && this._syncedUserId) {
        // User logged out: reset flag
        this._syncedUserId = null;
      }
    });
  }

  addItem(product: Omit<CartProduct, 'quantity'>): void {
    if (product.maxStock !== undefined && product.maxStock <= 0) {
      return;
    }
    const current = this._items();
    const existing = current.find((i) => this.itemsMatch(i, product));

    if (existing) {
      // Check stock limit before increasing quantity
      const maxStock = existing.maxStock ?? product.maxStock;
      if (maxStock !== undefined && existing.quantity >= maxStock) {
        return;
      }
      this.updateQuantity(
        product.id,
        product.type,
        existing.quantity + 1,
        product.selectedSize,
        product.selectedColor,
      );
    } else {
      // New item: add to local state and persist to DB
      this._items.set([...current, { ...product, quantity: 1 }]);

      const userId = this.supabase.authUserId();
      if (userId) {
        this.saveToSupabase(
          product.id,
          product.type,
          1,
          product.selectedSize,
          product.selectedColor,
        );
      }
    }
  }

  removeItem(
    id: string,
    type: CartProduct['type'],
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    this._items.update((items) =>
      items.filter(
        (i) => !this.itemsMatch(i, { id, type, selectedSize, selectedColor }),
      ),
    );

    const userId = this.supabase.authUserId();
    if (userId) {
      this.removeFromSupabase(id, type, selectedSize, selectedColor);
    }
  }

  updateQuantity(
    id: string,
    type: CartProduct['type'],
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    if (quantity <= 0) {
      this.removeItem(id, type, selectedSize, selectedColor);
      return;
    }

    this._items.update((items) =>
      items.map((i) => {
        if (!this.itemsMatch(i, { id, type, selectedSize, selectedColor }))
          return i;
        const capped =
          i.maxStock !== undefined ? Math.min(quantity, i.maxStock) : quantity;
        return { ...i, quantity: capped };
      }),
    );

    const userId = this.supabase.authUserId();
    if (userId) {
      this.saveToSupabase(id, type, quantity, selectedSize, selectedColor);
    }
  }

  clear(): void {
    this._items.set([]);
    const userId = this.supabase.authUserId();
    if (userId) {
      this.clearSupabase();
    }
  }

  async refreshStock(): Promise<void> {
    const currentItems = this._items();
    const merchItems = currentItems.filter((i) => i.type === 'merchandise');
    if (merchItems.length === 0) return;

    const merchandiseIds = [...new Set(merchItems.map((i) => i.id))];
    const { data, error } = await this.supabase.client
      .from('merchandise_items')
      .select(
        'id, name, price, image_urls, active, stock:merchandise_stock(size, stock)',
      )
      .in('id', merchandiseIds);

    if (error || !data) return;

    const merchandiseMap = new Map(
      (
        data as {
          id: string;
          name: string;
          price: number;
          image_urls: string[] | null;
          active: boolean | null;
          stock: { size: string; stock: number }[] | null;
        }[]
      ).map((m) => [m.id, m]),
    );

    this._items.update((items) =>
      items.map((i) => {
        if (i.type !== 'merchandise') return i;
        const item = merchandiseMap.get(i.id);
        if (!item || item.active === false) {
          return { ...i, maxStock: 0 };
        }
        let maxStock: number | undefined = undefined;
        const stockList = item.stock;
        if (stockList && stockList.length > 0) {
          if (i.selectedSize) {
            const entry = stockList.find((s) => s.size === i.selectedSize);
            maxStock = entry ? (entry.stock ?? 0) : 0;
          } else {
            maxStock = stockList.reduce((acc, s) => acc + (s.stock || 0), 0);
          }
        }
        return {
          ...i,
          name: item.name ?? i.name,
          price: item.price ?? i.price,
          image_urls: item.image_urls ?? i.image_urls,
          maxStock,
        };
      }),
    );
  }

  private loadCart(): void {
    const saved = localStorage.getItem(this.CART_STORAGE_KEY);
    if (saved) {
      try {
        this._items.set(JSON.parse(saved));
        void this.refreshStock();
      } catch (e) {
        console.error('Error loading cart from localStorage', e);
      }
    }
  }

  private async syncWithSupabase(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('cart_items')
      .select('*');

    if (error) {
      console.error('Error syncing cart from Supabase', error);
      return;
    }

    if (data && data.length > 0) {
      const dbItems: CartProduct[] = [];

      // Group IDs by item type
      const merchandiseIds = [
        ...new Set(
          data
            .filter((row) => row.item_type === 'merchandise')
            .map((row) => row.item_id),
        ),
      ];
      const areaIds = [
        ...new Set(
          data
            .filter((row) => row.item_type === 'area')
            .map((row) => parseInt(row.item_id)),
        ),
      ];

      // Batch fetch details
      const [merchandiseRes, areasRes] = await Promise.all([
        merchandiseIds.length > 0
          ? this.supabase.client
              .from('merchandise_items')
              .select(
                'id, name, price, image_urls, active, stock:merchandise_stock(size, stock)',
              )
              .in('id', merchandiseIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                name: string;
                price: number;
                image_urls: string[] | null;
                active: boolean | null;
                stock: { size: string; stock: number }[] | null;
              }[],
            }),
        areaIds.length > 0
          ? this.supabase.client
              .from('areas')
              .select('id, name, price')
              .in('id', areaIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Create lookup maps
      const merchandiseMap = new Map(
        (
          (merchandiseRes.data || []) as {
            id: string;
            name: string;
            price: number;
            image_urls: string[] | null;
            active: boolean | null;
            stock: { size: string; stock: number }[] | null;
          }[]
        ).map((m) => [m.id, m]),
      );
      const areasMap = new Map((areasRes.data || []).map((a) => [a.id, a]));

      // Fetch details for each item type to reconstruct full CartProduct
      for (const row of data) {
        let itemDetail: CartProduct | null = null;
        if (row.item_type === 'merchandise') {
          const item = merchandiseMap.get(row.item_id);
          if (item) {
            let maxStock: number | undefined = undefined;
            if (item.active === false) {
              maxStock = 0;
            } else {
              const stockList = item.stock;
              if (stockList && stockList.length > 0) {
                if (row.selected_size) {
                  const entry = stockList.find(
                    (s) => s.size === row.selected_size,
                  );
                  maxStock = entry ? (entry.stock ?? 0) : 0;
                } else {
                  maxStock = stockList.reduce(
                    (acc, s) => acc + (s.stock || 0),
                    0,
                  );
                }
              }
            }
            itemDetail = {
              id: item.id,
              name: item.name,
              price: item.price,
              image_urls: item.image_urls,
              type: 'merchandise',
              quantity: row.quantity ?? 1,
              selectedSize: row.selected_size ?? undefined,
              selectedColor: row.selected_color ?? undefined,
              maxStock,
            };
          }
        } else if (row.item_type === 'area') {
          const area = areasMap.get(parseInt(row.item_id));
          if (area) {
            itemDetail = {
              id: area.id.toString(),
              numericId: area.id,
              name: area.name,
              price: area.price ?? 0,
              image_urls: null,
              type: 'area',
              quantity: row.quantity ?? 1,
            };
          }
        }

        if (itemDetail) {
          // Deduplicate: if the DB somehow has duplicate rows, merge them
          const existing = dbItems.find((i) => this.itemsMatch(i, itemDetail!));
          if (existing) {
            // Keep the higher quantity (shouldn't happen with delete+insert, but safe)
            existing.quantity = Math.max(
              existing.quantity,
              itemDetail.quantity,
            );
          } else {
            dbItems.push(itemDetail);
          }
        }
      }

      // DB is the single source of truth: replace local state entirely
      this._items.set(dbItems);
    } else {
      // No items in DB: clear local cart to stay in sync
      this._items.set([]);
    }
  }

  private async saveToSupabase(
    id: string,
    type: string,
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    // Upsert with NULL columns is unreliable in Postgres without NULLS NOT DISTINCT.
    // Use delete+insert to guarantee no duplicates.
    let deleteQuery = this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', id)
      .eq('item_type', type);

    if (selectedSize) {
      deleteQuery = deleteQuery.eq('selected_size', selectedSize);
    } else {
      deleteQuery = deleteQuery.is('selected_size', null);
    }
    if (selectedColor) {
      deleteQuery = deleteQuery.eq('selected_color', selectedColor);
    } else {
      deleteQuery = deleteQuery.is('selected_color', null);
    }

    await deleteQuery;

    await this.supabase.client.from('cart_items').insert({
      user_id: userId,
      item_id: id,
      item_type: type,
      quantity,
      selected_size: selectedSize ?? null,
      selected_color: selectedColor ?? null,
      updated_at: new Date().toISOString(),
    });
  }

  private async removeFromSupabase(
    id: string,
    type: string,
    selectedSize?: string,
    selectedColor?: string,
  ): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    // .match() with undefined doesn't match NULL in Postgres, so build query explicitly
    let query = this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', id)
      .eq('item_type', type);

    if (selectedSize) {
      query = query.eq('selected_size', selectedSize);
    } else {
      query = query.is('selected_size', null);
    }

    if (selectedColor) {
      query = query.eq('selected_color', selectedColor);
    } else {
      query = query.is('selected_color', null);
    }

    await query;
  }

  private async clearSupabase(): Promise<void> {
    const userId = this.supabase.authUserId();
    if (!userId) return;

    await this.supabase.client
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
  }

  private itemsMatch(
    a: Pick<CartProduct, 'id' | 'type' | 'selectedSize' | 'selectedColor'>,
    b: Pick<CartProduct, 'id' | 'type' | 'selectedSize' | 'selectedColor'>,
  ): boolean {
    return (
      a.id === b.id &&
      a.type === b.type &&
      (a.selectedSize || undefined) === (b.selectedSize || undefined) &&
      (a.selectedColor || undefined) === (b.selectedColor || undefined)
    );
  }
}
