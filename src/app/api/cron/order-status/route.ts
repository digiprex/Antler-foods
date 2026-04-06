import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { createUberDirectDelivery } from '@/lib/server/delivery/uber-direct';
import { sendOrderDeliveryTrackingEmail, sendOrderPickupReadyEmail } from '@/lib/server/email';

const GET_PREPARING_ORDERS = `
  query GetPreparingOrders {
    orders(
      where: {
        status: { _eq: "preparing" }
        confirmed_at: { _is_null: false }
        is_deleted: { _eq: false }
      }
    ) {
      order_id
      restaurant_id
      confirmed_at
      fulfillment_type
    }
  }
`;

const GET_RESTAURANTS_PREPARATION_TIMES = `
  query GetRestaurantsPreparationTimes($ids: [uuid!]!) {
    restaurants(where: { restaurant_id: { _in: $ids } }) {
      restaurant_id
      preparation_time
    }
  }
`;

const UPDATE_TO_READY = `
  mutation UpdateToReady($order_ids: [uuid!]!) {
    update_orders(
      where: { order_id: { _in: $order_ids } }
      _set: { status: "ready" }
    ) {
      affected_rows
    }
  }
`;

const GET_PICKUP_ORDER_FOR_EMAIL = `
  query GetPickupOrderForEmail($order_id: uuid!) {
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

const GET_ORDER_FOR_DISPATCH = `
  query GetOrderForDispatch($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      order_number
      customer_id
      restaurant_id
      location_id
      status
      payment_status
      fulfillment_type
      sub_total
      contact_first_name
      contact_last_name
      contact_email
      contact_phone
      delivery_address
      delivery_place_id
      delivery_latitude
      delivery_longitude
      delivery_house_flat_floor
      delivery_instructions
      delivery_provider
      delivery_provider_delivery_id
      delivery_dispatch_status
      delivery_quote
    }
  }
`;

const GET_ORDER_ITEMS = `
  query GetOrderItemsForDispatch($order_id: uuid!) {
    order_items(
      where: { order_id: { _eq: $order_id }, is_deleted: { _eq: false } }
      order_by: { created_at: asc }
    ) {
      item_name
      quantity
      line_total
      item_note
    }
  }
`;

const GET_RESTAURANT_FOR_DISPATCH = `
  query GetRestaurantForDispatch($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      address
      city
      state
      country
      postal_code
      phone_number
      email
    }
  }
`;

const CLAIM_ORDER_FOR_DISPATCH = `
  mutation ClaimOrderForDispatch($order_id: uuid!) {
    update_orders(
      where: {
        order_id: { _eq: $order_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        status: { _eq: "ready" }
        fulfillment_type: { _eq: "delivery" }
        delivery_provider_delivery_id: { _is_null: true }
        _and: [
          {
            _or: [
              { delivery_provider: { _is_null: true } }
              { delivery_provider: { _eq: "uber_direct" } }
            ]
          }
          {
            _or: [
              { delivery_dispatch_status: { _is_null: true } }
              { delivery_dispatch_status: { _eq: "pending_ready" } }
              { delivery_dispatch_status: { _eq: "failed" } }
            ]
          }
        ]
      }
      _set: {
        delivery_provider: "uber_direct"
        delivery_dispatch_status: "dispatch_requested"
        delivery_error: null
      }
    ) {
      affected_rows
    }
  }
`;

const MARK_ORDER_DISPATCHED = `
  mutation MarkOrderDispatched(
    $order_id: uuid!
    $delivery_provider_delivery_id: String!
    $delivery_tracking_url: String
    $delivery_quote: String
    $delivery_dispatched_at: timestamptz!
    $delivery_last_status_at: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: {
        delivery_provider: "uber_direct"
        delivery_provider_delivery_id: $delivery_provider_delivery_id
        delivery_tracking_url: $delivery_tracking_url
        delivery_dispatch_status: "created"
        delivery_dispatched_at: $delivery_dispatched_at
        delivery_last_status_at: $delivery_last_status_at
        delivery_error: null
        delivery_quote: $delivery_quote
      }
    ) {
      order_id
      delivery_provider_delivery_id
    }
  }
`;

const MARK_ORDER_DISPATCH_FAILED = `
  mutation MarkOrderDispatchFailed(
    $order_id: uuid!
    $delivery_error: String!
    $delivery_last_status_at: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: {
        delivery_provider: "uber_direct"
        delivery_dispatch_status: "failed"
        delivery_error: $delivery_error
        delivery_last_status_at: $delivery_last_status_at
      }
    ) {
      order_id
    }
  }
`;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numOrNull(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function dispatchOrderViaUber(orderId: string) {
  // Claim for dispatch (atomic check)
  const claimResult = await adminGraphqlRequest<{
    update_orders?: { affected_rows?: number | null } | null;
  }>(CLAIM_ORDER_FOR_DISPATCH, { order_id: orderId });

  if ((claimResult.update_orders?.affected_rows || 0) === 0) {
    return; // Already dispatched or not eligible
  }

  const orderResult = await adminGraphqlRequest<{
    orders_by_pk?: Record<string, unknown> | null;
  }>(GET_ORDER_FOR_DISPATCH, { order_id: orderId });

  const order = orderResult.orders_by_pk;
  if (!order?.order_id) throw new Error('Order not found for dispatch.');

  const deliveryAddress = text(order.delivery_address);
  const contactPhone = text(order.contact_phone);
  if (!deliveryAddress) throw new Error('Delivery address missing.');
  if (!contactPhone) throw new Error('Contact phone missing.');

  const restaurantId = text(order.restaurant_id);
  const restResult = await adminGraphqlRequest<{
    restaurants_by_pk?: {
      name?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postal_code?: string | null;
      phone_number?: string | null;
    } | null;
  }>(GET_RESTAURANT_FOR_DISPATCH, { restaurant_id: restaurantId });

  const restaurant = restResult.restaurants_by_pk;
  const pickupAddress = [
    text(restaurant?.address),
    text(restaurant?.city),
    text(restaurant?.state),
    text(restaurant?.postal_code),
    text(restaurant?.country),
  ].filter(Boolean).join(', ') || null;

  if (!pickupAddress) throw new Error('Restaurant address not configured.');

  const itemsResult = await adminGraphqlRequest<{
    order_items?: Array<{
      item_name?: string | null;
      quantity?: number | null;
      line_total?: number | string | null;
      item_note?: string | null;
    }>;
  }>(GET_ORDER_ITEMS, { order_id: orderId });

  const orderItems = (itemsResult.order_items || []).map((item) => ({
    name: text(item.item_name) || 'Menu item',
    quantity: Math.max(Number(item.quantity || 1), 1),
    lineTotal: num(item.line_total),
    description: text(item.item_note),
  }));

  if (orderItems.length === 0) throw new Error('Order items missing.');

  const dispatchResult = await createUberDirectDelivery({
    restaurantId: restaurantId || '',
    locationId: text(order.location_id),
    externalOrderId: text(order.order_number) || text(order.order_id) || orderId,
    externalUserId: text(order.customer_id) || text(order.contact_email) || contactPhone || orderId,
    orderValue: num(order.sub_total),
    pickup: {
      address: pickupAddress,
      name: text(restaurant?.name),
      phoneNumber: text(restaurant?.phone_number),
    },
    orderItems,
    dropoffAddress: {
      formattedAddress: deliveryAddress,
      placeId: text(order.delivery_place_id),
      latitude: numOrNull(order.delivery_latitude),
      longitude: numOrNull(order.delivery_longitude),
      houseFlatFloor: text(order.delivery_house_flat_floor),
      instructions: text(order.delivery_instructions),
    },
    dropoffContact: {
      firstName: text(order.contact_first_name) || 'Customer',
      lastName: text(order.contact_last_name) || 'Order',
      email: text(order.contact_email),
      phone: contactPhone,
    },
  });

  const lastStatusAt = new Date().toISOString();
  await adminGraphqlRequest(MARK_ORDER_DISPATCHED, {
    order_id: orderId,
    delivery_provider_delivery_id: dispatchResult.deliveryId,
    delivery_tracking_url: dispatchResult.trackingUrl,
    delivery_quote: dispatchResult.quoteId,
    delivery_dispatched_at: lastStatusAt,
    delivery_last_status_at: lastStatusAt,
  });

  // Send tracking email
  const customerEmail = text(order.contact_email);
  if (customerEmail) {
    try {
      await sendOrderDeliveryTrackingEmail(customerEmail, {
        orderNumber: text(order.order_number) || text(order.order_id) || orderId,
        restaurantName: text(restaurant?.name) || 'Restaurant',
        trackingUrl: dispatchResult.trackingUrl,
        customerName: [text(order.contact_first_name), text(order.contact_last_name)]
          .filter(Boolean)
          .join(' '),
      });
    } catch (emailErr) {
      console.error(`[Cron] Tracking email failed for order ${orderId}:`, emailErr);
    }
  }

  console.log(`[Cron] Uber Direct dispatched for order ${orderId}, delivery ${dispatchResult.deliveryId}`);
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const isLocal = process.env.NODE_ENV === 'development';

  // Skip auth check in local dev
  if (
    !isLocal &&
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const debug: Record<string, unknown>[] = [];
  const log = (step: string, data?: unknown) => {
    const entry = { step, timestamp: new Date().toISOString(), ...(data != null ? { data } : {}) };
    debug.push(entry);
    console.log(`[Cron] ${step}`, data != null ? JSON.stringify(data) : '');
  };

  try {
    // 1. Get preparing orders
    log('Fetching preparing orders');
    const ordersData = await adminGraphqlRequest<{
      orders: Array<{ order_id: string; restaurant_id: string; confirmed_at: string; fulfillment_type: string | null }>;
    }>(GET_PREPARING_ORDERS, {});

    const orders = ordersData.orders || [];
    log('Found preparing orders', {
      count: orders.length,
      orders: orders.map((o) => ({
        order_id: o.order_id,
        restaurant_id: o.restaurant_id,
        confirmed_at: o.confirmed_at,
        fulfillment_type: o.fulfillment_type,
      })),
    });

    if (orders.length === 0) {
      return NextResponse.json({ success: true, toReady: 0, dispatched: 0, debug });
    }

    // 2. Get preparation times
    const restaurantIds = [...new Set(orders.map((o) => o.restaurant_id))];
    const restData = await adminGraphqlRequest<{
      restaurants: Array<{ restaurant_id: string; preparation_time?: number | null }>;
    }>(GET_RESTAURANTS_PREPARATION_TIMES, { ids: restaurantIds });

    const prepTimeByRestaurant = new Map<string, number>();
    for (const r of restData.restaurants || []) {
      const time = Number(r.preparation_time) || 0;
      if (time > 0) {
        prepTimeByRestaurant.set(r.restaurant_id, time);
      }
    }

    log('Restaurant preparation times', Object.fromEntries(prepTimeByRestaurant));

    // 3. Find orders past preparation time → ready
    const now = Date.now();
    const toReadyIds: string[] = [];
    const deliveryOrderIds = new Set<string>();
    const pickupOrderIds = new Set<string>();
    const skipped: Array<{ order_id: string; reason: string }> = [];

    for (const order of orders) {
      const prepMinutes = prepTimeByRestaurant.get(order.restaurant_id);
      if (!prepMinutes) {
        skipped.push({ order_id: order.order_id, reason: 'no preparation_time configured for restaurant' });
        continue;
      }
      const confirmedAt = new Date(order.confirmed_at).getTime();
      if (Number.isNaN(confirmedAt)) {
        skipped.push({ order_id: order.order_id, reason: `invalid confirmed_at: ${order.confirmed_at}` });
        continue;
      }
      const elapsedMs = now - confirmedAt;
      const requiredMs = prepMinutes * 60 * 1000;
      if (elapsedMs >= requiredMs) {
        toReadyIds.push(order.order_id);
        if (order.fulfillment_type === 'delivery') {
          deliveryOrderIds.add(order.order_id);
        } else if (order.fulfillment_type === 'pickup') {
          pickupOrderIds.add(order.order_id);
        }
        log(`Order ${order.order_id} ready`, {
          elapsed: `${Math.round(elapsedMs / 1000)}s`,
          required: `${Math.round(requiredMs / 1000)}s`,
          fulfillment_type: order.fulfillment_type,
        });
      } else {
        skipped.push({
          order_id: order.order_id,
          reason: `not ready yet (${Math.round(elapsedMs / 1000)}s / ${Math.round(requiredMs / 1000)}s)`,
        });
      }
    }

    if (skipped.length > 0) {
      log('Skipped orders', skipped);
    }

    log('Orders to transition', {
      toReadyCount: toReadyIds.length,
      toReadyIds,
      deliveryCount: deliveryOrderIds.size,
      deliveryOrderIds: [...deliveryOrderIds],
    });

    // 4. Bulk update to ready
    let affectedReady = 0;
    if (toReadyIds.length > 0) {
      const result = await adminGraphqlRequest<{
        update_orders: { affected_rows: number };
      }>(UPDATE_TO_READY, { order_ids: toReadyIds });
      affectedReady = result.update_orders?.affected_rows || 0;
      log(`Updated ${affectedReady} order(s) to ready`, toReadyIds);
    }

    // 5. Send pickup ready emails
    for (const orderId of pickupOrderIds) {
      try {
        const orderResult = await adminGraphqlRequest<{
          orders_by_pk?: Record<string, unknown> | null;
        }>(GET_PICKUP_ORDER_FOR_EMAIL, { order_id: orderId });

        const order = orderResult.orders_by_pk;
        const customerEmail = text(order?.contact_email);
        if (!order || !customerEmail) continue;

        const restaurantId = text(order.restaurant_id);
        let restaurantName = 'Restaurant';
        let pickupAddress: string | null = null;

        let restaurantEmail: string | null = null;
        let restaurantPhone: string | null = null;

        if (restaurantId) {
          const restResult = await adminGraphqlRequest<{
            restaurants_by_pk?: {
              name?: string | null;
              address?: string | null;
              city?: string | null;
              state?: string | null;
              postal_code?: string | null;
              country?: string | null;
              phone_number?: string | null;
              email?: string | null;
            } | null;
          }>(GET_RESTAURANT_FOR_DISPATCH, { restaurant_id: restaurantId });

          const restaurant = restResult.restaurants_by_pk;
          restaurantName = text(restaurant?.name) || 'Restaurant';
          restaurantEmail = text(restaurant?.email);
          restaurantPhone = text(restaurant?.phone_number);
          pickupAddress = [
            text(restaurant?.address),
            text(restaurant?.city),
            text(restaurant?.state),
            text(restaurant?.postal_code),
            text(restaurant?.country),
          ].filter(Boolean).join(', ') || null;
        }

        await sendOrderPickupReadyEmail(customerEmail, {
          orderNumber: text(order.order_number) || text(order.order_id) || orderId,
          restaurantName,
          customerName: [text(order.contact_first_name), text(order.contact_last_name)]
            .filter(Boolean)
            .join(' '),
          pickupAddress,
          restaurantEmail,
          restaurantPhone,
        });
        log(`Pickup ready email sent for order ${orderId}`);
      } catch (err) {
        console.error(`[Cron] Pickup ready email failed for order ${orderId}:`, err);
        log(`Pickup ready email FAILED for order ${orderId}`, {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // 6. Dispatch only delivery orders via Uber Direct
    let dispatched = 0;
    const dispatchResults: Array<{ order_id: string; success: boolean; error?: string }> = [];

    for (const orderId of deliveryOrderIds) {
      try {
        log(`Dispatching order ${orderId} via Uber Direct`);
        await dispatchOrderViaUber(orderId);
        dispatched++;
        dispatchResults.push({ order_id: orderId, success: true });
        log(`Dispatch succeeded for order ${orderId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Uber dispatch failed';
        console.error(`[Cron] Dispatch failed for order ${orderId}:`, message);
        dispatchResults.push({ order_id: orderId, success: false, error: message });
        log(`Dispatch FAILED for order ${orderId}`, { error: message });
        try {
          await adminGraphqlRequest(MARK_ORDER_DISPATCH_FAILED, {
            order_id: orderId,
            delivery_error: message,
            delivery_last_status_at: new Date().toISOString(),
          });
        } catch (updateErr) {
          console.error(`[Cron] Failed to persist dispatch error for ${orderId}:`, updateErr);
        }
      }
    }

    log('Cron run complete', { toReady: affectedReady, dispatched, total: orders.length });

    return NextResponse.json({
      success: true,
      toReady: affectedReady,
      dispatched,
      dispatchResults,
      debug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('FATAL ERROR', { error: message, stack: error instanceof Error ? error.stack : undefined });
    console.error('[Cron] Order status transition error:', error);
    return NextResponse.json(
      { error: 'Failed to process order transitions', debug },
      { status: 500 },
    );
  }
}
