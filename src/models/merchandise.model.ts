import type { Database } from './supabase-generated';

export type MerchandiseItem =
  Database['public']['Tables']['merchandise_items']['Row'];
export type MerchandisePurchase =
  Database['public']['Tables']['merchandise_purchases']['Row'];

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type MerchandiseStock =
  Database['public']['Tables']['merchandise_stock']['Row'];

export interface OrderDetail extends Order {
  items: (OrderItem & {
    product_name?: string;
    product_image?: string | null;
    product_slug?: string | null;
    product_data?: MerchandiseItemDetail;
  })[];
}

export type CartItemRecord = Database['public']['Tables']['cart_items']['Row'];

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  image_urls: string[] | null;
  type: 'merchandise' | 'area';
  quantity: number;
  numericId?: number; // Used for areas (int)
  selectedSize?: string;
  selectedColor?: string;
  maxStock?: number; // Max units allowed (merchandise with stock control)
}

export type OrderStatus =
  'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface MerchandiseItemDetail extends MerchandiseItem {
  stock?: MerchandiseStock[];
}

/** Supabase query result for merchandise items with stock join */
export type MerchandiseItemWithStockRow =
  | (Database['public']['Tables']['merchandise_items']['Row'] & {
      stock: MerchandiseStock[];
    })
  | null;
