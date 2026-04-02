import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { createUberDirectDelivery } from '@/lib/server/delivery/uber-direct';
import { sendOrderDeliveryTrackingEmail } from '@/lib/server/email';

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
      delivery_tracking_url
      delivery_dispatch_status
      delivery_quote
      delivery_error
    }
  }
`;

const GET_ORDER_ITEMS = `
  query GetOrderItemsForDispatch($order_id: uuid!) {
    order_items(
      where: {
        order_id: { _eq: $order_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: asc }
    ) {
      item_name
      quantity
      line_total
      item_note
    }
  }
`;

const GET_RESTAURANT_NAME = `
  query GetRestaurantNameForDispatch($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
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

interface HasuraOrderReadyPayload {
  event: {
    op: 'INSERT' | 'UPDATE' | 'DELETE' | 'MANUAL';
    data: {
      old: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    };
  };
  id: string;
  created_at: string;
  trigger: {
    name: string;
  };
}

interface DispatchableOrder {
  order_id?: string | null;
  order_number?: string | null;
  customer_id?: string | null;
  restaurant_id?: string | null;
  location_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_type?: string | null;
  sub_total?: number | string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  delivery_address?: string | null;
  delivery_place_id?: string | null;
  delivery_latitude?: number | string | null;
  delivery_longitude?: number | string | null;
  delivery_house_flat_floor?: string | null;
  delivery_instructions?: string | null;
  delivery_provider?: string | null;
  delivery_provider_delivery_id?: string | null;
  delivery_tracking_url?: string | null;
  delivery_dispatch_status?: string | null;
  delivery_quote?: string | null;
  delivery_error?: string | null;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numericValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numericValueOrNull(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isReadyTransition(
  previousRow: Record<string, unknown> | null,
  nextRow: Record<string, unknown> | null,
) {
  const nextStatus = normalizeText(nextRow?.status)?.toLowerCase();
  const previousStatus = normalizeText(previousRow?.status)?.toLowerCase();
  const paymentStatus = normalizeText(nextRow?.payment_status)?.toLowerCase();
  const fulfillmentType = normalizeText(nextRow?.fulfillment_type)?.toLowerCase();

  return (
    nextStatus === 'ready' &&
    previousStatus !== 'ready' &&
    paymentStatus === 'paid' &&
    fulfillmentType === 'delivery'
  );
}

function assertHasuraEventSecret(request: NextRequest) {
  const configuredSecret = normalizeText(process.env.HASURA_EVENT_SECRET);
  if (!configuredSecret) {
    return;
  }

  const receivedSecret =
    normalizeText(request.headers.get('x-hasura-event-secret')) ||
    normalizeText(request.headers.get('x-webhook-secret'));

  if (receivedSecret !== configuredSecret) {
    throw new Error('Invalid Hasura event secret.');
  }
}

export async function POST(request: NextRequest) {
  let payload: HasuraOrderReadyPayload | null = null;
  let orderId: string | null = null;

  try {
    assertHasuraEventSecret(request);

    payload = (await request.json()) as HasuraOrderReadyPayload;
    const nextRow = payload.event.data.new;
    const previousRow = payload.event.data.old;

    if (!isReadyTransition(previousRow, nextRow)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    orderId = normalizeText(nextRow?.order_id);
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing order_id in event payload.' },
        { status: 400 },
      );
    }

    const claimResult = await adminGraphqlRequest<{
      update_orders?: { affected_rows?: number | null } | null;
    }>(CLAIM_ORDER_FOR_DISPATCH, { order_id: orderId });

    if ((claimResult.update_orders?.affected_rows || 0) === 0) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Order was already dispatched or is no longer eligible.',
      });
    }

    const orderResult = await adminGraphqlRequest<{
      orders_by_pk?: DispatchableOrder | null;
    }>(GET_ORDER_FOR_DISPATCH, { order_id: orderId });

    const order = orderResult.orders_by_pk;
    if (!order?.order_id) {
      throw new Error('Order could not be loaded for Uber dispatch.');
    }

    const formattedAddress = normalizeText(order.delivery_address);
    const contactPhone = normalizeText(order.contact_phone);
    if (!formattedAddress) {
      throw new Error('Delivery address is missing for this order.');
    }
    if (!contactPhone) {
      throw new Error('Delivery phone number is missing for this order.');
    }

    const itemsResult = await adminGraphqlRequest<{
      order_items?: Array<{
        item_name?: string | null;
        quantity?: number | null;
        line_total?: number | string | null;
        item_note?: string | null;
      }>;
    }>(GET_ORDER_ITEMS, { order_id: orderId });

    const orderItems = (itemsResult.order_items || []).map((item) => ({
      name: normalizeText(item.item_name) || 'Menu item',
      quantity: Math.max(Number(item.quantity || 1), 1),
      lineTotal: numericValue(item.line_total),
      description: normalizeText(item.item_note),
    }));

    if (orderItems.length === 0) {
      throw new Error('Order items are missing for Uber dispatch.');
    }

    const dispatchResult = await createUberDirectDelivery({
      restaurantId: normalizeText(order.restaurant_id) || '',
      locationId: normalizeText(order.location_id),
      externalOrderId:
        normalizeText(order.order_number) || normalizeText(order.order_id) || orderId,
      externalUserId:
        normalizeText(order.customer_id) ||
        normalizeText(order.contact_email) ||
        contactPhone ||
        orderId,
      orderValue: numericValue(order.sub_total),
      orderItems,
      dropoffAddress: {
        formattedAddress,
        placeId: normalizeText(order.delivery_place_id),
        latitude: numericValueOrNull(order.delivery_latitude),
        longitude: numericValueOrNull(order.delivery_longitude),
        houseFlatFloor: normalizeText(order.delivery_house_flat_floor),
        instructions: normalizeText(order.delivery_instructions),
      },
      dropoffContact: {
        firstName: normalizeText(order.contact_first_name) || 'Customer',
        lastName: normalizeText(order.contact_last_name) || 'Order',
        email: normalizeText(order.contact_email),
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

    const customerEmail = normalizeText(order.contact_email);
    const restaurantId = normalizeText(order.restaurant_id);
    if (customerEmail && restaurantId) {
      try {
        const restaurantResult = await adminGraphqlRequest<{
          restaurants_by_pk?: { name?: string | null } | null;
        }>(GET_RESTAURANT_NAME, { restaurant_id: restaurantId });

        await sendOrderDeliveryTrackingEmail(customerEmail, {
          orderNumber:
            normalizeText(order.order_number) || normalizeText(order.order_id) || orderId,
          restaurantName:
            normalizeText(restaurantResult.restaurants_by_pk?.name) || 'Restaurant',
          trackingUrl: dispatchResult.trackingUrl,
          customerName: [normalizeText(order.contact_first_name), normalizeText(order.contact_last_name)]
            .filter(Boolean)
            .join(' '),
        });
      } catch (emailError) {
        console.error('[Uber Direct Dispatch] Tracking email failed:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      delivery_provider_delivery_id: dispatchResult.deliveryId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to dispatch Uber Direct delivery.';

    if (orderId) {
      try {
        await adminGraphqlRequest(MARK_ORDER_DISPATCH_FAILED, {
          order_id: orderId,
          delivery_error: message,
          delivery_last_status_at: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error('[Uber Direct Dispatch] Failed to persist dispatch error:', updateError);
      }
    }

    console.error('[Uber Direct Dispatch] Event handling error:', {
      eventId: payload?.id || null,
      orderId,
      error,
    });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

