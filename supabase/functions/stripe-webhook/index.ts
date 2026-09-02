import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id || session.client_reference_id;

      // Extract exact fee and net amount from Stripe Balance Transaction
      const totalGross = session.amount_total ? session.amount_total / 100 : 0;
      let stripeFee = 0;
      let netAmount = totalGross;

      if (session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(
            session.payment_intent as string,
            { expand: ['latest_charge.balance_transaction'] },
          );
          const charge = pi.latest_charge as Stripe.Charge;
          const bt = charge?.balance_transaction as Stripe.BalanceTransaction;
          if (bt && typeof bt.fee === 'number') {
            stripeFee = bt.fee / 100;
            netAmount = (bt.net || session.amount_total! - bt.fee) / 100;
          }
        } catch (feeError) {
          console.warn('Could not retrieve balance_transaction fee:', feeError);
        }
      }

      // Case 1: Area Donation
      if (
        session.metadata?.single_item_type === 'area_donation' ||
        session.metadata?.anonymous !== undefined
      ) {
        const areaId = parseInt(session.metadata?.area_id || '0', 10);
        const isAnonymous = session.metadata?.anonymous === 'true';
        const message = session.metadata?.donor_message || null;

        if (areaId > 0) {
          const { error: donationError } = await supabaseAdmin
            .from('area_donations')
            .insert({
              area_id: areaId,
              user_id: isAnonymous ? null : userId,
              gross_amount: totalGross,
              stripe_fee: stripeFee,
              net_amount: netAmount,
              anonymous: isAnonymous,
              donor_message: message,
              stripe_session_id: session.id,
            });

          if (donationError) {
            console.error('Error inserting donation:', donationError);
            throw donationError;
          }
        }
      }
      // Case 2: Direct Single Area Purchase
      else if (
        session.metadata?.single_item_type === 'area' ||
        (session.metadata?.area_id && !session.metadata?.shipping_name)
      ) {
        const areaId = parseInt(session.metadata.area_id, 10);
        if (areaId > 0 && userId) {
          const { error: purchaseError } = await supabaseAdmin
            .from('area_purchases')
            .insert({
              user_id: userId,
              area_id: areaId,
              amount: totalGross, // legacy field
              gross_amount: totalGross,
              stripe_fee: stripeFee,
              net_amount: netAmount,
              stripe_session_id: session.id,
            });

          if (purchaseError) {
            console.error('Error inserting area purchase:', purchaseError);
            throw purchaseError;
          }
        }
      }
      // Case 3: Shop Orders (Physical Merchandise)
      else if (session.metadata?.shipping_name) {
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { expand: ['data.price.product'] },
        );

        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: userId,
            status: 'paid',
            total_amount: totalGross,
            currency: session.currency || 'eur',
            shipping_name: session.metadata.shipping_name,
            shipping_phone: session.metadata.shipping_phone || '',
            shipping_address: session.metadata.shipping_address,
            shipping_city: session.metadata.shipping_city,
            shipping_zip: session.metadata.shipping_zip,
            shipping_country: session.metadata.shipping_country,
            stripe_session_id: session.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItems = lineItems.data.map((item) => {
          const product = item.price?.product as Stripe.Product;
          const metadata = product.metadata;

          return {
            order_id: order.id,
            item_type: metadata.item_type || 'merchandise',
            item_id: metadata.item_id,
            item_numeric_id: null,
            quantity: item.quantity || 1,
            unit_price: metadata.unit_price
              ? parseFloat(metadata.unit_price)
              : item.price?.unit_amount
                ? item.price.unit_amount / 100
                : 0,
            selected_size: metadata.selected_size || null,
            selected_color: metadata.selected_color || null,
          };
        });

        const { error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Decrement stock for merchandise items
        for (const item of orderItems) {
          if (item.item_type === 'merchandise' && item.item_id) {
            const qty = item.quantity || 1;
            if (item.selected_size) {
              const { data: stockRow } = await supabaseAdmin
                .from('merchandise_stock')
                .select('id, stock')
                .eq('item_id', item.item_id)
                .eq('size', item.selected_size)
                .maybeSingle();

              if (stockRow) {
                const updatedStock = Math.max(0, (stockRow.stock || 0) - qty);
                await supabaseAdmin
                  .from('merchandise_stock')
                  .update({
                    stock: updatedStock,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', stockRow.id);
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
