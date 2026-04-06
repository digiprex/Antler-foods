import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/server/stripe';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendOrderInvoiceEmail } from '@/lib/server/email';

const GET_ORDER_FOR_INVOICE = `
  query GetOrderForInvoice($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      order_number
      created_at
      status
      sub_total
      cart_total
      coupon_used
      gift_card_used
      fulfillment_type
      payment_status
      payment_method
      contact_first_name
      contact_last_name
      contact_email
      contact_phone
      scheduled_for
      tax_total
      tip_total
      discount_total
      order_note
      delivery_address
      delivery_quote_id
      placed_at
      restaurant_id
      offer_applied
    }
  }
`;

const GET_ORDER_ITEMS_FOR_INVOICE = `
  query GetOrderItemsForInvoice($order_id: uuid!) {
    order_items(
      where: { order_id: { _eq: $order_id }, is_deleted: { _eq: false } }
      order_by: { created_at: asc }
    ) {
      item_name
      item_price
      quantity
      line_total
      selected_modifiers
      base_item_price
      modifier_total
      item_note
    }
  }
`;

const GET_RESTAURANT_FOR_INVOICE = `
  query GetRestaurantForInvoice($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      email
      phone_number
      logo
      address
      city
      state
      country
      postal_code
    }
  }
`;


const UPDATE_ORDER_PAYMENT_STATUS = `
  mutation UpdateOrderPaymentStatus($order_id: uuid!, $payment_status: String!, $payment_reference: String, $status: String, $confirmed_at: timestamptz) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id },
      _set: { payment_status: $payment_status, payment_reference: $payment_reference, status: $status, confirmed_at: $confirmed_at }
    ) {
      order_id
      payment_status
      status
    }
  }
`;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await adminGraphqlRequest(UPDATE_ORDER_PAYMENT_STATUS, {
        order_id: orderId,
        payment_status: 'paid',
        payment_reference: paymentIntent.id,
        status: 'preparing',
        confirmed_at: new Date().toISOString(),
      });

      // Send order confirmation email
      try {
        const orderData = await adminGraphqlRequest<{
          orders_by_pk: Record<string, unknown> | null;
        }>(GET_ORDER_FOR_INVOICE, { order_id: orderId });

        const order = orderData.orders_by_pk;
        const contactEmail = typeof order?.contact_email === 'string' ? order.contact_email.trim() : '';

        if (order && contactEmail) {
          const itemsData = await adminGraphqlRequest<{
            order_items: Array<Record<string, unknown>>;
          }>(GET_ORDER_ITEMS_FOR_INVOICE, { order_id: orderId });

          let restaurantName = '';
          let pickupAddress: string | null = null;
          let restaurantEmail: string | null = null;
          let restaurantPhone: string | null = null;
          let restaurantLogo: string | null = null;
          if (order.restaurant_id) {
            const restData = await adminGraphqlRequest<{
              restaurants_by_pk: {
                name?: string;
                email?: string;
                phone_number?: string;
                logo?: string;
                address?: string;
                city?: string;
                state?: string;
                country?: string;
                postal_code?: string;
              } | null;
            }>(GET_RESTAURANT_FOR_INVOICE, { restaurant_id: order.restaurant_id });
            const rest = restData.restaurants_by_pk;
            restaurantName = rest?.name || '';
            restaurantEmail = rest?.email || null;
            restaurantPhone = rest?.phone_number || null;
            restaurantLogo = rest?.logo || null;
            if (order.fulfillment_type === 'pickup') {
              pickupAddress = [rest?.address, rest?.city, rest?.state, rest?.postal_code, rest?.country]
                .map((v) => (typeof v === 'string' && v.trim() ? v.trim() : null))
                .filter(Boolean)
                .join(', ') || null;
            }
          }

          let deliveryFee: number | null = null;
          const quoteId = typeof order.delivery_quote_id === 'string' ? order.delivery_quote_id : null;
          if (quoteId) {
            try {
              const quoteData = await adminGraphqlRequest<{
                delivery_quotes_by_pk: { delivery_fee?: number | null } | null;
              }>(`query ($id: uuid!) { delivery_quotes_by_pk(delivery_quote_id: $id) { delivery_fee } }`, { id: quoteId });
              const fee = quoteData.delivery_quotes_by_pk?.delivery_fee;
              deliveryFee = typeof fee === 'number' ? fee : null;
            } catch {
              // silent
            }
          }

          await sendOrderInvoiceEmail(contactEmail, {
            order: { ...order, delivery_fee: deliveryFee },
            items: itemsData.order_items || [],
            restaurantName,
            pickupAddress,
            restaurantEmail,
            restaurantPhone,
            restaurantLogo,
          });
        }
      } catch (emailError) {
        console.error('[Stripe Webhook] Order confirmation email failed:', emailError);
      }

    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await adminGraphqlRequest(UPDATE_ORDER_PAYMENT_STATUS, {
        order_id: orderId,
        payment_status: 'failed',
        payment_reference: paymentIntent.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
