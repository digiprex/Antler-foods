export const dynamic = 'force-dynamic';

/**
 * Orders API Route
 * 
 * Handles CRUD operations for orders and order_items tables.
 * Based on the provided schema:
 * 
 * Orders table:
 * - order_id: uuid, primary key, unique, default: gen_random_uuid()
 * - created_at: timestamp with time zone, default: now()
 * - updated_at: timestamp with time zone, default: now()
 * - is_deleted: boolean, default: false
 * - customer_id: uuid
 * - location_id: uuid
 * - status: text
 * - restaurant_id: uuid
 * - sub_total: numeric
 * - cart_total: numeric
 * - coupon_used: text, nullable
 * - fulfillment_type: text, nullable
 * - payment_status: text, nullable
 * - contact_first_name: text, nullable
 * - contact_last_name: text, nullable
 * - contact_email: text, nullable
 * - contact_phone: text, nullable
 * - scheduled_for: timestamp with time zone, nullable
 * - tax_total: numeric, nullable, default: 0
 * - tip_total: numeric, nullable, default: 0
 * - discount_total: numeric, nullable, default: 0
 * - order_note: text, nullable
 * - delivery_address: text, nullable
 * - placed_at: timestamp with time zone, nullable
 * - order_number: text, nullable
 * - payment_method: text, nullable
 * - payment_reference: text, nullable
 * 
 * Order Items table:
 * - order_item_id: uuid, primary key, unique, default: gen_random_uuid()
 * - created_at: timestamp with time zone, default: now()
 * - updated_at: timestamp with time zone, default: now()
 * - is_deleted: boolean, default: false
 * - item_name: text
 * - menu_id: uuid
 * - item_id: uuid
 * - order_id: uuid
 * - item_price: numeric
 * - quantity: integer, nullable
 * - line_total: numeric, nullable
 * - selected_modifiers: jsonb, nullable
 * - base_item_price: numeric, nullable
 * - modifier_total: numeric, nullable, default: 0
 * - item_note: text, nullable
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendOrderDeliveryStatusEmail } from '@/lib/server/email';

/**
 * GraphQL query to fetch orders for a restaurant
 */
const GET_ORDERS_QUERY = `
  query GetOrders($restaurant_id: uuid!, $limit: Int, $offset: Int, $status_filter: String) {
    orders(
      where: {
        restaurant_id: {_eq: $restaurant_id}
        is_deleted: {_eq: false}
        status: {_ilike: $status_filter}
      }
      order_by: {created_at: desc}
      limit: $limit
      offset: $offset
    ) {
      order_id
      created_at
      updated_at
      customer_id
      location_id
      status
      restaurant_id
      sub_total
      cart_total
      coupon_used
      gift_card_used
      fulfillment_type
      payment_status
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
      cancelled_by
      cancelled_at
      placed_at
      order_number
      payment_method
      payment_reference
      offer_applied
    }
  }
`;

/**
 * GraphQL query to fetch order items for specific orders
 */
const GET_ORDER_ITEMS_QUERY = `
  query GetOrderItems($order_ids: [uuid!]) {
    order_items(
      where: {
        order_id: {_in: $order_ids}
        is_deleted: {_eq: false}
      }
      order_by: {created_at: asc}
    ) {
      order_item_id
      created_at
      updated_at
      item_name
      menu_id
      item_id
      order_id
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

/**
 * GraphQL query to get order count for pagination
 */
const GET_ORDERS_COUNT_QUERY = `
  query GetOrdersCount($restaurant_id: uuid!, $status_filter: String) {
    orders_aggregate(
      where: {
        restaurant_id: {_eq: $restaurant_id}
        is_deleted: {_eq: false}
        status: {_ilike: $status_filter}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * GraphQL mutation to update order status
 */
const UPDATE_ORDER_STATUS_MUTATION = `
  mutation UpdateOrderStatus(
    $order_id: uuid!
    $status: String!
    $payment_status: String
    $updated_at: timestamptz!
    $cancelled_by: String
    $cancelled_at: timestamptz
  ) {
    update_orders_by_pk(
      pk_columns: {order_id: $order_id}
      _set: {
        status: $status
        payment_status: $payment_status
        updated_at: $updated_at
        cancelled_by: $cancelled_by
        cancelled_at: $cancelled_at
      }
    ) {
      order_id
      status
      payment_status
      updated_at
    }
  }
`;

/**
 * GraphQL mutation to update order details
 */
const UPDATE_ORDER_MUTATION = `
  mutation UpdateOrder(
    $order_id: uuid!
    $status: String
    $fulfillment_type: String
    $payment_status: String
    $contact_first_name: String
    $contact_last_name: String
    $contact_email: String
    $contact_phone: String
    $scheduled_for: timestamptz
    $order_note: String
    $delivery_address: String
    $payment_method: String
    $payment_reference: String
    $updated_at: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: {order_id: $order_id}
      _set: {
        status: $status
        fulfillment_type: $fulfillment_type
        payment_status: $payment_status
        contact_first_name: $contact_first_name
        contact_last_name: $contact_last_name
        contact_email: $contact_email
        contact_phone: $contact_phone
        scheduled_for: $scheduled_for
        order_note: $order_note
        delivery_address: $delivery_address
        payment_method: $payment_method
        payment_reference: $payment_reference
        updated_at: $updated_at
      }
    ) {
      order_id
      status
      fulfillment_type
      payment_status
      contact_first_name
      contact_last_name
      contact_email
      contact_phone
      scheduled_for
      order_note
      delivery_address
      payment_method
      payment_reference
      updated_at
    }
  }
`;

const GET_ORDER_FOR_EMAIL = `
  query GetOrderForEmail($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      order_number
      contact_email
      contact_first_name
      contact_last_name
      restaurant_id
    }
  }
`;

const GET_RESTAURANT_FOR_EMAIL = `
  query GetRestaurantForEmail($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      email
      phone_number
      poc_email
      poc_phone_number
    }
  }
`;

/**
 * GET endpoint to fetch orders for a restaurant
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const includeItems = searchParams.get('include_items') === 'true';

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const statusFilter = status ? `%${status}%` : '%';

    // Fetch orders
    const ordersData = await adminGraphqlRequest(GET_ORDERS_QUERY, {
      restaurant_id: restaurantId,
      limit,
      offset,
      status_filter: statusFilter,
    });

    const orders = (ordersData as any).orders || [];

    // Fetch order count for pagination
    const countData = await adminGraphqlRequest(GET_ORDERS_COUNT_QUERY, {
      restaurant_id: restaurantId,
      status_filter: statusFilter,
    });

    const totalCount = (countData as any).orders_aggregate?.aggregate?.count || 0;

    let ordersWithItems = orders;

    // Optionally include order items
    if (includeItems && orders.length > 0) {
      const orderIds = orders.map((order: any) => order.order_id);
      const itemsData = await adminGraphqlRequest(GET_ORDER_ITEMS_QUERY, {
        order_ids: orderIds,
      });

      const orderItems = (itemsData as any).order_items || [];
      const itemsByOrderId = new Map<string, any[]>();

      for (const item of orderItems) {
        const existingItems = itemsByOrderId.get(item.order_id) || [];
        existingItems.push(item);
        itemsByOrderId.set(item.order_id, existingItems);
      }

      ordersWithItems = orders.map((order: any) => ({
        ...order,
        order_items: itemsByOrderId.get(order.order_id) || [],
      }));
    }

    // Fetch delivery fees from delivery_quotes table
    const quoteIds = ordersWithItems
      .map((o: any) => o.delivery_quote_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

    let feeByQuoteId = new Map<string, number>();
    if (quoteIds.length > 0) {
      try {
        const quotesData = await adminGraphqlRequest(`
          query ($ids: [uuid!]!) {
            delivery_quotes(where: { delivery_quote_id: { _in: $ids } }) {
              delivery_quote_id
              delivery_fee
            }
          }
        `, { ids: quoteIds });
        for (const q of (quotesData as any).delivery_quotes || []) {
          if (q.delivery_quote_id && typeof q.delivery_fee === 'number') {
            feeByQuoteId.set(q.delivery_quote_id, q.delivery_fee);
          }
        }
      } catch {
        // silent
      }
    }

    const ordersWithDeliveryFee = ordersWithItems.map((order: any) => ({
      ...order,
      delivery_fee: order.delivery_quote_id ? (feeByQuoteId.get(order.delivery_quote_id) ?? null) : null,
    }));

    return NextResponse.json({
      success: true,
      orders: ordersWithDeliveryFee,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * PUT endpoint to update order status or details
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, action, ...updateData } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id is required' },
        { status: 400 }
      );
    }

    let data;
    const updatedAt = new Date().toISOString();

    if (action === 'update_status') {
      // Quick status update
      const { status, payment_status } = updateData;
      if (!status) {
        return NextResponse.json(
          { error: 'status is required for status update' },
          { status: 400 }
        );
      }

      data = await adminGraphqlRequest(UPDATE_ORDER_STATUS_MUTATION, {
        order_id,
        status,
        payment_status,
        updated_at: updatedAt,
        cancelled_by: status === 'cancelled' ? 'restaurant' : null,
        cancelled_at: status === 'cancelled' ? updatedAt : null,
      });
    } else {
      // Full order update
      data = await adminGraphqlRequest(UPDATE_ORDER_MUTATION, {
        order_id,
        updated_at: updatedAt,
        ...updateData,
      });
    }

    const order = (data as any).update_orders_by_pk;

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Send cancellation email when order is cancelled
    if (action === 'update_status' && updateData.status === 'cancelled') {
      try {
        const orderData = await adminGraphqlRequest<{
          orders_by_pk: {
            order_id: string;
            order_number?: string;
            contact_email?: string;
            contact_first_name?: string;
            contact_last_name?: string;
            restaurant_id?: string;
          } | null;
        }>(GET_ORDER_FOR_EMAIL, { order_id });

        const fullOrder = orderData.orders_by_pk;
        const contactEmail = fullOrder?.contact_email?.trim();

        if (fullOrder && contactEmail) {
          const customerName = [fullOrder.contact_first_name, fullOrder.contact_last_name]
            .filter((v) => typeof v === 'string' && v.trim())
            .join(' ') || null;
          const orderNumber = fullOrder.order_number || fullOrder.order_id;

          let restaurantName = 'Restaurant';
          let restaurantEmail: string | null = null;
          let restaurantPhone: string | null = null;

          if (fullOrder.restaurant_id) {
            const restData = await adminGraphqlRequest<{
              restaurants_by_pk: {
                name?: string;
                email?: string;
                phone_number?: string;
                poc_email?: string;
                poc_phone_number?: string;
              } | null;
            }>(GET_RESTAURANT_FOR_EMAIL, { restaurant_id: fullOrder.restaurant_id });

            const rest = restData.restaurants_by_pk;
            restaurantName = rest?.name?.trim() || 'Restaurant';
            restaurantEmail = rest?.poc_email?.trim() || rest?.email?.trim() || null;
            restaurantPhone = rest?.poc_phone_number?.trim() || rest?.phone_number?.trim() || null;
          }

          await sendOrderDeliveryStatusEmail(contactEmail, {
            orderNumber,
            restaurantName,
            status: 'cancelled',
            cancelledBy: 'restaurant',
            customerName,
            restaurantEmail,
            restaurantPhone,
          });
          console.log('[Orders API] Cancellation email sent to:', contactEmail, 'order:', orderNumber);
        }
      } catch (emailErr) {
        console.error('[Orders API] Failed to send cancellation email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
