import { inject, Injectable, signal } from '@angular/core';

import type { OrderDetail } from '../models';

import { extractErrorMessage } from '../utils';

import { CartService } from './cart.service';

import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly supabase = inject(SupabaseService);
  private readonly cart = inject(CartService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  async startStripeCheckout(
    shippingInfo: Record<string, unknown>,
  ): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const items = this.cart.items();
    if (items.length === 0) {
      this.error.set('Cart is empty');
      this.loading.set(false);
      return;
    }

    try {
      await this.cart.refreshStock();
      if (this.cart.hasOutOfStockItems()) {
        this.error.set(
          'Hay artículos en tu carrito sin stock suficiente. Por favor, revisa tu pedido.',
        );
        this.loading.set(false);
        return;
      }

      // Invoke 'create-checkout-session' Edge Function
      const { data, error } = await this.supabase.client.functions.invoke(
        'create-checkout-session',
        {
          headers: {
            'ngsw-bypass': 'true',
          },
          body: {
            items: items.map((i) => ({
              id: i.id,
              type: i.type,
              quantity: i.quantity,
              numericId: i.numericId,
              selectedSize: i.selectedSize,
              selectedColor: i.selectedColor,
            })),
            shippingInfo,
            success_url:
              window.location.origin +
              '/order-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: window.location.origin + '/order-failed',
          },
        },
      );

      if (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'context' in error &&
          typeof (error as { context?: { json?: () => Promise<unknown> } })
            .context?.json === 'function'
        ) {
          try {
            const body = (await (
              error as { context: { json: () => Promise<unknown> } }
            ).context.json()) as { error?: string } | null;
            if (body?.error) {
              throw new Error(body.error);
            }
          } catch (jsonErr: unknown) {
            if (
              jsonErr instanceof Error &&
              jsonErr.message &&
              jsonErr.message !== error.message
            ) {
              throw jsonErr;
            }
          }
        }
        throw error;
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (e: unknown) {
      console.error('[CheckoutService] Stripe error', e);
      this.error.set(extractErrorMessage(e) || 'Error redirecting to Stripe');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOrder(
    sessionId: string,
    retries = 5,
    delay = 2000,
  ): Promise<OrderDetail | null> {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await this.supabase.client
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('stripe_session_id', sessionId)
        .maybeSingle();

      if (data) {
        return data as OrderDetail;
      }

      if (error) {
        console.error('Error verifying order', error);
      }

      // Wait before next retry
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return null;
  }
}
