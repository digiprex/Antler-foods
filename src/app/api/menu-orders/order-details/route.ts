import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

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
      delivery_provider
      delivery_provider_delivery_id
      delivery_tracking_url
      delivery_dispatch_status
      delivery_dispatched_at
      delivery_last_status_at
      delivery_error
      delivery_quote
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
      order_item_id
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

const GET_RESTAURANT_DETAILS = `
  query GetRestaurantDetails($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      address
      city
      state
      country
      postal_code
    }
  }
`;

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get('orderNumber');

  if (!orderNumber) {
    return NextResponse.json(
      { error: 'Order number is required.' },
      { status: 400 },
    );
  }

  try {
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

    const itemsData = await adminGraphqlRequest<{
      order_items: Array<Record<string, unknown>>;
    }>(GET_ORDER_ITEMS, { order_id: order.order_id });

    let restaurantName = '';
    let pickupAddress: string | null = null;
    if (order.restaurant_id) {
      const restData = await adminGraphqlRequest<{
        restaurants_by_pk: {
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          postal_code?: string;
        } | null;
      }>(GET_RESTAURANT_DETAILS, { restaurant_id: order.restaurant_id });
      const rest = restData.restaurants_by_pk;
      restaurantName = rest?.name || '';
      if (order.fulfillment_type === 'pickup') {
        pickupAddress = [rest?.address, rest?.city, rest?.state, rest?.postal_code, rest?.country]
          .map((v) => (typeof v === 'string' && v.trim() ? v.trim() : null))
          .filter(Boolean)
          .join(', ') || null;
      }
    }

    // Parse offer_applied JSON string to object
    let parsedOfferApplied = null;
    if (order.offer_applied) {
      try {
        parsedOfferApplied = typeof order.offer_applied === 'string'
          ? JSON.parse(order.offer_applied)
          : order.offer_applied;
      } catch {
        parsedOfferApplied = null;
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

    return NextResponse.json({
      order: {
        ...order,
        delivery_fee: deliveryFee,
        restaurant_name: restaurantName,
        pickup_address: pickupAddress,
        offer_applied: parsedOfferApplied,
      },
      items: itemsData.order_items || [],
    });
  } catch (error) {
    console.error('[Menu Orders] Order details error:', error);
    return NextResponse.json(
      { error: 'Unable to fetch order details.' },
      { status: 500 },
    );
  }
}
