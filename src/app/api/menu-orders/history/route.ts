import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_CUSTOMER_ORDERS = `
  query GetCustomerOrders(
    $restaurant_id: uuid!
    $customer_id: uuid!
    $limit: Int!
    $offset: Int!
  ) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
      order_by: [{ placed_at: desc_nulls_last }, { created_at: desc }]
      limit: $limit
      offset: $offset
    ) {
      order_id
      order_number
      status
      fulfillment_type
      payment_status
      sub_total
      service_fee
      tip_total
      discount_total
      cart_total
      delivery_fee_total
      delivery_quote_id
      placed_at
      created_at
      scheduled_for
      delivery_address
      delivery_tracking_url
      delivery_dispatch_status
      order_note
      cancelled_by
      cancelled_at
      refunded_at
      refund_amount
    }
  }
`;

const GET_CUSTOMER_ORDERS_COUNT = `
  query GetCustomerOrdersCount(
    $restaurant_id: uuid!
    $customer_id: uuid!
  ) {
    orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

const GET_ORDER_ITEMS_BY_ORDER_IDS = `
  query GetOrderItemsByOrderIds($order_ids: [uuid!]!) {
    order_items(
      where: {
        order_id: { _in: $order_ids }
        is_deleted: { _eq: false }
      }
      order_by: [{ created_at: asc }]
    ) {
      order_item_id
      order_id
      item_name
      quantity
      line_total
      selected_modifiers
    }
  }
`;

const GET_DELIVERY_QUOTES_BY_IDS = `
  query GetDeliveryQuotesByIds($ids: [uuid!]!) {
    delivery_quotes(where: { delivery_quote_id: { _in: $ids } }) {
      delivery_quote_id
      delivery_fee
    }
  }
`;

interface OrderRecord {
  order_id?: string | null;
  order_number?: string | null;
  status?: string | null;
  fulfillment_type?: string | null;
  payment_status?: string | null;
  sub_total?: number | string | null;
  service_fee?: number | string | null;
  tip_total?: number | string | null;
  discount_total?: number | string | null;
  cart_total?: number | string | null;
  delivery_fee_total?: number | string | null;
  delivery_quote_id?: string | null;
  placed_at?: string | null;
  created_at?: string | null;
  scheduled_for?: string | null;
  delivery_address?: string | null;
  delivery_tracking_url?: string | null;
  delivery_dispatch_status?: string | null;
  order_note?: string | null;
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  refunded_at?: string | null;
  refund_amount?: number | string | null;
}

interface OrderItemRecord {
  order_item_id?: string | null;
  order_id?: string | null;
  item_name?: string | null;
  quantity?: number | null;
  line_total?: number | string | null;
  selected_modifiers?: unknown;
}

interface GetCustomerOrdersResponse {
  orders?: OrderRecord[];
}

interface GetOrderItemsByOrderIdsResponse {
  order_items?: OrderItemRecord[];
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export async function GET(request: NextRequest) {
  const restaurantId =
    text(request.nextUrl.searchParams.get('restaurantId')) ||
    text(request.nextUrl.searchParams.get('restaurant_id'));

  if (!restaurantId) {
    return NextResponse.json(
      { success: false, error: 'restaurantId is required.' },
      { status: 400 },
    );
  }

  // Pagination parameters
  const limitParam = request.nextUrl.searchParams.get('limit');
  const offsetParam = request.nextUrl.searchParams.get('offset');
  const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam, 10))) : 25;
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10)) : 0;

  try {
    const cookieValue = request.cookies.get(getMenuCustomerSessionCookieName())?.value;
    const customer = await readMenuCustomerSession(cookieValue, restaurantId);

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: 'Please sign in to view your order history.',
        },
        { status: 401 },
      );
    }

    if (customer.isGuest) {
      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          error: 'Order history is available for signed-in accounts only.',
        },
        { status: 403 },
      );
    }

    // Fetch restaurant details for pickup address
    let pickupAddress: string | null = null;
    try {
      const restData = await adminGraphqlRequest<{
        restaurants_by_pk: { address?: string; city?: string; state?: string; postal_code?: string; country?: string } | null;
      }>(`query ($id: uuid!) { restaurants_by_pk(restaurant_id: $id) { address city state postal_code country } }`, { id: restaurantId });
      const rest = restData.restaurants_by_pk;
      if (rest) {
        pickupAddress = [rest.address, rest.city, rest.state, rest.postal_code, rest.country]
          .map((v) => (typeof v === 'string' && v.trim() ? v.trim() : null))
          .filter(Boolean)
          .join(', ') || null;
      }
    } catch {
      // silent
    }

    // Fetch total count for pagination
    const countData = await adminGraphqlRequest<{
      orders_aggregate?: { aggregate?: { count?: number } };
    }>(GET_CUSTOMER_ORDERS_COUNT, {
      restaurant_id: restaurantId,
      customer_id: customer.customerId,
    });

    const totalOrders = countData.orders_aggregate?.aggregate?.count || 0;

    const ordersData = await adminGraphqlRequest<GetCustomerOrdersResponse>(
      GET_CUSTOMER_ORDERS,
      {
        restaurant_id: restaurantId,
        customer_id: customer.customerId,
        limit,
        offset,
      },
    );

    const orders = Array.isArray(ordersData.orders) ? ordersData.orders : [];
    const orderIds = orders
      .map((order) => text(order.order_id))
      .filter((value): value is string => Boolean(value));

    let itemsByOrderId = new Map<string, OrderItemRecord[]>();

    if (orderIds.length > 0) {
      const itemsData = await adminGraphqlRequest<GetOrderItemsByOrderIdsResponse>(
        GET_ORDER_ITEMS_BY_ORDER_IDS,
        { order_ids: orderIds },
      );

      const orderItems = Array.isArray(itemsData.order_items)
        ? itemsData.order_items
        : [];

      itemsByOrderId = orderItems.reduce((map, item) => {
        const orderId = text(item.order_id);
        if (!orderId) {
          return map;
        }

        const existing = map.get(orderId) || [];
        existing.push(item);
        map.set(orderId, existing);
        return map;
      }, new Map<string, OrderItemRecord[]>());
    }

    // Fall back to delivery_quotes only for older orders without a fee snapshot.
    const deliveryQuoteIds = orders
      .filter((order) => order.delivery_fee_total == null)
      .map((order) => text(order.delivery_quote_id))
      .filter((id): id is string => Boolean(id));

    let deliveryFeeByQuoteId = new Map<string, number>();
    if (deliveryQuoteIds.length > 0) {
      try {
        const quotesData = await adminGraphqlRequest<{
          delivery_quotes?: Array<{ delivery_quote_id?: string; delivery_fee?: number | string | null }>;
        }>(GET_DELIVERY_QUOTES_BY_IDS, { ids: deliveryQuoteIds });
        for (const q of quotesData.delivery_quotes || []) {
          const qId = typeof q.delivery_quote_id === 'string' ? q.delivery_quote_id : '';
          if (qId) {
            deliveryFeeByQuoteId.set(qId, numberValue(q.delivery_fee));
          }
        }
      } catch {
        // silent — delivery fee is optional
      }
    }

    const payload = orders.map((order) => {
      const orderId = text(order.order_id) || '';
      const quoteId = text(order.delivery_quote_id);
      const orderItems = (itemsByOrderId.get(orderId) || []).map((item) => ({
        orderItemId: text(item.order_item_id) || '',
        itemName: text(item.item_name) || 'Item',
        quantity:
          typeof item.quantity === 'number' && Number.isFinite(item.quantity)
            ? item.quantity
            : 0,
        lineTotal: numberValue(item.line_total),
        selectedModifiers: item.selected_modifiers ?? null,
      }));

      const deliveryFee =
        order.delivery_fee_total != null
          ? numberValue(order.delivery_fee_total)
          : quoteId
            ? (deliveryFeeByQuoteId.get(quoteId) ?? null)
            : null;

      return {
        orderId,
        orderNumber: text(order.order_number) || '',
        status: text(order.status) || 'pending',
        fulfillmentType: text(order.fulfillment_type) || 'pickup',
        paymentStatus: text(order.payment_status) || 'pending',
        subtotal: numberValue(order.sub_total),
        serviceFee: numberValue(order.service_fee),
        tipTotal: numberValue(order.tip_total),
        discountTotal: numberValue(order.discount_total),
        deliveryFee,
        total: numberValue(order.cart_total),
        placedAt: text(order.placed_at),
        createdAt: text(order.created_at),
        scheduledFor: text(order.scheduled_for),
        deliveryAddress: text(order.delivery_address),
        deliveryTrackingUrl: text(order.delivery_tracking_url),
        deliveryDispatchStatus: text(order.delivery_dispatch_status),
        pickupAddress: text(order.fulfillment_type) === 'pickup' ? pickupAddress : null,
        orderNote: text(order.order_note),
        cancelledBy: text(order.cancelled_by),
        cancelledAt: text(order.cancelled_at),
        refundedAt: text(order.refunded_at),
        refundAmount: numberValue(order.refund_amount),
        items: orderItems,
      };
    });

    return NextResponse.json({
      success: true,
      authenticated: true,
      customer: {
        id: customer.customerId,
        email: customer.email,
        name: customer.name,
      },
      orders: payload,
      pagination: {
        total: totalOrders,
        limit,
        offset,
        hasMore: offset + payload.length < totalOrders,
      },
    });
  } catch (error) {
    console.error('[Menu Orders] Order history error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to fetch order history right now.' },
      { status: 500 },
    );
  }
}
