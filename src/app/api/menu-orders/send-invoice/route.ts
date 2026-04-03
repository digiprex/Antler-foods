import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendOrderInvoiceEmail } from '@/lib/server/email';

const GET_ORDER_BY_NUMBER = `
  query GetOrderByNumber($order_number: String!) {
    orders(
      where: {
        order_number: { _eq: $order_number }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
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

const GET_ORDER_ITEMS = `
  query GetOrderItems($order_id: uuid!) {
    order_items(
      where: {
        order_id: { _eq: $order_id }
        is_deleted: { _eq: false }
      }
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderNumber = body?.orderNumber;

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required.' },
        { status: 400 },
      );
    }

    const orderData = await adminGraphqlRequest<{
      orders: Array<Record<string, unknown>>;
    }>(GET_ORDER_BY_NUMBER, { order_number: orderNumber });

    const order = orderData.orders?.[0];
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 },
      );
    }

    const email = (order.contact_email as string) || '';
    if (!email) {
      return NextResponse.json(
        { error: 'No email address on this order.' },
        { status: 400 },
      );
    }

    const itemsData = await adminGraphqlRequest<{
      order_items: Array<Record<string, unknown>>;
    }>(GET_ORDER_ITEMS, { order_id: order.order_id });

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

    await sendOrderInvoiceEmail(email, {
      order: { ...order, delivery_fee: deliveryFee },
      items: itemsData.order_items || [],
      restaurantName,
      pickupAddress,
      restaurantEmail,
      restaurantPhone,
      restaurantLogo,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Menu Orders] Send invoice error:', error);
    return NextResponse.json(
      { error: 'Unable to send invoice email.' },
      { status: 500 },
    );
  }
}
