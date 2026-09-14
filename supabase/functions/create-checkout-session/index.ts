import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ngsw-bypass',
};

function validateRedirectUrl(
  urlStr: unknown,
  origin: string,
  defaultPath: string,
): string {
  if (typeof urlStr !== 'string' || !urlStr.trim()) {
    return `${origin}${defaultPath}`;
  }
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('/')) {
    return `${origin}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    const allowedHosts = [
      'climbeast.com',
      'www.climbeast.com',
      'localhost',
      '127.0.0.1',
    ];
    const originHost = origin ? new URL(origin).hostname : '';
    if (originHost && parsed.hostname === originHost) {
      return parsed.toString();
    }
    if (
      allowedHosts.includes(parsed.hostname) ||
      parsed.hostname.endsWith('.vercel.app')
    ) {
      return parsed.toString();
    }
  } catch {
    // Fall through to default
  }
  return `${origin}${defaultPath}`;
}

interface RequestItem {
  type: 'merchandise' | 'area' | 'area_donation';
  id?: string | number;
  numericId?: number;
  areaId?: number;
  amount?: number;
  quantity?: number;
  selectedSize?: string;
  selectedColor?: string;
  anonymous?: boolean;
  message?: string;
}

interface EnrichedItem extends RequestItem {
  name: string;
  price: number;
  image_url: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const items: RequestItem[] = body.items;
    const shipping_info = body.shipping_info || body.shippingInfo;

    if (!items || items.length === 0) throw new Error('No items in request');

    const hasPhysicalItems = items.some((item) => item.type === 'merchandise');
    if (hasPhysicalItems && !shipping_info) {
      throw new Error('Shipping info is required for physical merchandise');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Enrich item details from DB
    const enrichedItems: EnrichedItem[] = [];
    for (const item of items) {
      if (item.type === 'merchandise') {
        const { data } = await supabaseAdmin
          .from('merchandise_items')
          .select('name, price, image_urls, active')
          .eq('id', item.id)
          .single();
        if (!data) throw new Error(`Merchandise item not found: ${item.id}`);
        if (data.active === false) {
          throw new Error(`El producto "${data.name}" ya no está disponible.`);
        }

        const requestedQty = item.quantity || 1;

        if (item.selectedSize) {
          const { data: stockData } = await supabaseAdmin
            .from('merchandise_stock')
            .select('stock')
            .eq('item_id', item.id)
            .eq('size', item.selectedSize)
            .maybeSingle();

          const availableStock = stockData?.stock ?? 0;
          if (availableStock < requestedQty) {
            if (availableStock <= 0) {
              throw new Error(
                `El producto "${data.name}" (Talla: ${item.selectedSize}) está agotado.`,
              );
            } else {
              throw new Error(
                `Solo quedan ${availableStock} unidades de "${data.name}" (Talla: ${item.selectedSize}).`,
              );
            }
          }
        } else {
          const { data: stockRecords } = await supabaseAdmin
            .from('merchandise_stock')
            .select('stock')
            .eq('item_id', item.id);

          if (stockRecords && stockRecords.length > 0) {
            const totalStock = stockRecords.reduce(
              (acc, s) => acc + (s.stock || 0),
              0,
            );
            if (totalStock < requestedQty) {
              throw new Error(
                `No hay suficiente stock disponible para "${data.name}".`,
              );
            }
          }
        }

        const urls = data.image_urls as string[] | null;
        enrichedItems.push({
          ...item,
          quantity: requestedQty,
          name: data.name,
          price: data.price,
          image_url: urls?.[0] || null,
        });
      } else if (item.type === 'area') {
        const rawAreaId = item.id || item.numericId || item.areaId;
        const areaId =
          typeof rawAreaId === 'number'
            ? rawAreaId
            : parseInt(String(rawAreaId), 10);
        if (!Number.isInteger(areaId) || areaId <= 0) {
          throw new Error('Invalid area ID');
        }

        const { data } = await supabaseAdmin
          .from('areas')
          .select('id, name, price')
          .eq('id', areaId)
          .single();
        if (!data) throw new Error(`Area not found: ${areaId}`);
        if (!data.price || data.price <= 0)
          throw new Error('Area price is invalid');

        enrichedItems.push({
          ...item,
          id: data.id.toString(),
          name: `Croquis: ${data.name}`,
          price: data.price,
          quantity: 1,
          image_url: null,
        });
      } else if (item.type === 'area_donation') {
        const rawAreaId = item.areaId || item.id || item.numericId;
        const areaId =
          typeof rawAreaId === 'number'
            ? rawAreaId
            : parseInt(String(rawAreaId), 10);
        if (!Number.isInteger(areaId) || areaId <= 0) {
          throw new Error('Invalid area ID');
        }

        const donationAmount = Number(item.amount);
        if (
          !Number.isFinite(donationAmount) ||
          donationAmount < 1.0 ||
          donationAmount > 10000.0
        ) {
          throw new Error(
            'Donation amount must be between €1.00 and €10,000.00',
          );
        }
        const sanitizedAmount = Math.round(donationAmount * 100) / 100;
        const sanitizedMessage =
          typeof item.message === 'string'
            ? item.message.trim().slice(0, 500)
            : '';

        const { data } = await supabaseAdmin
          .from('areas')
          .select('id, name')
          .eq('id', areaId)
          .single();
        if (!data) throw new Error(`Area not found: ${areaId}`);

        enrichedItems.push({
          ...item,
          id: data.id.toString(),
          name: `Donación al equipamiento: ${data.name}`,
          price: sanitizedAmount,
          quantity: 1,
          image_url: null,
          anonymous: !!item.anonymous,
          message: sanitizedMessage,
        });
      } else {
        throw new Error(`Unsupported item type: ${item.type}`);
      }
    }

    // 2. Create Stripe line items
    const line_items = enrichedItems.map((item) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            item_id: item.id?.toString(),
            item_type: item.type,
            selected_size: (item.selectedSize || '').slice(0, 50),
            selected_color: (item.selectedColor || '').slice(0, 50),
            unit_price: item.price.toString(),
            anonymous: item.anonymous ? 'true' : 'false',
            donor_message: (item.message || '').slice(0, 500),
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity || 1,
    }));

    // 3. Build session metadata
    const sessionMetadata: Record<string, string> = {
      user_id: user.id,
      user_email: (user.email || '').slice(0, 500),
      has_physical_items: hasPhysicalItems ? 'true' : 'false',
      item_count: enrichedItems.length.toString(),
      item_types: Array.from(new Set(enrichedItems.map((i) => i.type))).join(
        ',',
      ),
    };

    if (hasPhysicalItems && shipping_info) {
      sessionMetadata.shipping_full_name = String(
        shipping_info.full_name || shipping_info.name || '',
      ).slice(0, 200);
      sessionMetadata.shipping_address_line1 = String(
        shipping_info.address_line1 || shipping_info.address || '',
      ).slice(0, 200);
      sessionMetadata.shipping_address_line2 = String(
        shipping_info.address_line2 || '',
      ).slice(0, 200);
      sessionMetadata.shipping_city = String(shipping_info.city || '').slice(
        0,
        100,
      );
      sessionMetadata.shipping_state = String(shipping_info.state || '').slice(
        0,
        100,
      );
      sessionMetadata.shipping_postal_code = String(
        shipping_info.postal_code || shipping_info.zip || '',
      ).slice(0, 20);
      sessionMetadata.shipping_country = String(
        shipping_info.country || '',
      ).slice(0, 100);
      sessionMetadata.shipping_phone = String(shipping_info.phone || '').slice(
        0,
        50,
      );
      sessionMetadata.shipping_notes = String(shipping_info.notes || '').slice(
        0,
        500,
      );
      // Compatibility keys
      sessionMetadata.shipping_name = sessionMetadata.shipping_full_name;
      sessionMetadata.shipping_address = sessionMetadata.shipping_address_line1;
      sessionMetadata.shipping_zip = sessionMetadata.shipping_postal_code;
    }

    // If single digital item (area / donation), add convenience metadata
    if (enrichedItems.length === 1) {
      const singleItem = enrichedItems[0];
      if (singleItem.type === 'area') {
        sessionMetadata.single_item_type = 'area';
        sessionMetadata.area_id = singleItem.id?.toString() || '';
      } else if (singleItem.type === 'area_donation') {
        sessionMetadata.single_item_type = 'area_donation';
        sessionMetadata.area_id = singleItem.id?.toString() || '';
        sessionMetadata.donation_area_id = singleItem.id?.toString() || '';
        sessionMetadata.anonymous = singleItem.anonymous ? 'true' : 'false';
        sessionMetadata.is_anonymous = singleItem.anonymous ? 'true' : 'false';
        sessionMetadata.donor_message = (singleItem.message || '').slice(
          0,
          500,
        );
      }
    }

    const origin = req.headers.get('origin') || 'https://climbeast.com';
    const successUrl = validateRedirectUrl(
      body.success_url,
      origin,
      '/order-success?session_id={CHECKOUT_SESSION_ID}',
    );
    const cancelUrl = validateRedirectUrl(
      body.cancel_url,
      origin,
      hasPhysicalItems ? '/merchandising/checkout' : '/explore',
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      client_reference_id: user.id,
      customer_email: user.email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Checkout session error:', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
