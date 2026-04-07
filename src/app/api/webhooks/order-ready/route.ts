import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { createUberDirectDelivery } from '@/lib/server/delivery/uber-direct';
import { createDoorDashDriveDelivery } from '@/lib/server/delivery/doordash-drive';
// Delivery emails (tracking, courier assigned, etc.) are handled by the
// provider webhook handlers as status updates arrive.

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
      poc_email
      poc_phone_number
    }
  }
`;

const CLAIM_ORDER_FOR_DISPATCH = `
  mutation ClaimOrderForDispatch($order_id: uuid!, $delivery_provider: String!) {
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
              { delivery_dispatch_status: { _is_null: true } }
              { delivery_dispatch_status: { _eq: "pending_ready" } }
              { delivery_dispatch_status: { _eq: "failed" } }
            ]
          }
        ]
      }
      _set: {
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
    $delivery_provider: String!
    $delivery_provider_delivery_id: String!
    $delivery_tracking_url: String
    $delivery_quote: String
    $delivery_dispatched_at: timestamptz!
    $delivery_last_status_at: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: {
        delivery_provider: $delivery_provider
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
    $delivery_provider: String!
    $delivery_error: String!
    $delivery_last_status_at: timestamptz!
  ) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: {
        delivery_provider: $delivery_provider
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
  let deliveryProvider: string | null = null;

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

    // Determine which provider to use from the order
    deliveryProvider = normalizeText(nextRow?.delivery_provider) || 'uber_direct';

    const claimResult = await adminGraphqlRequest<{
      update_orders?: { affected_rows?: number | null } | null;
    }>(CLAIM_ORDER_FOR_DISPATCH, {
      order_id: orderId,
      delivery_provider: deliveryProvider,
    });

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
      throw new Error('Order could not be loaded for delivery dispatch.');
    }

    const formattedAddress = normalizeText(order.delivery_address);
    const contactPhone = normalizeText(order.contact_phone);
    if (!formattedAddress) {
      throw new Error('Delivery address is missing for this order.');
    }
    if (!contactPhone) {
      throw new Error('Delivery phone number is missing for this order.');
    }

    const restaurantId = normalizeText(order.restaurant_id);
    const restaurantResult = await adminGraphqlRequest<{
      restaurants_by_pk?: {
        name?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        postal_code?: string | null;
        phone_number?: string | null;
        email?: string | null;
        poc_email?: string | null;
        poc_phone_number?: string | null;
      } | null;
    }>(GET_RESTAURANT_FOR_DISPATCH, { restaurant_id: restaurantId });

    const restaurant = restaurantResult.restaurants_by_pk;
    const pickupAddressParts = [
      normalizeText(restaurant?.address),
      normalizeText(restaurant?.city),
      normalizeText(restaurant?.state),
      normalizeText(restaurant?.postal_code),
      normalizeText(restaurant?.country),
    ].filter(Boolean);
    const pickupAddress = pickupAddressParts.length > 0 ? pickupAddressParts.join(', ') : null;

    if (!pickupAddress) {
      throw new Error('Restaurant address is not configured for delivery dispatch.');
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
      throw new Error('Order items are missing for delivery dispatch.');
    }

    const pickupInput = {
      address: pickupAddress,
      name: normalizeText(restaurant?.name),
      phoneNumber: normalizeText(restaurant?.phone_number),
    };

    const dropoffAddressInput = {
      formattedAddress,
      placeId: normalizeText(order.delivery_place_id),
      latitude: numericValueOrNull(order.delivery_latitude),
      longitude: numericValueOrNull(order.delivery_longitude),
      houseFlatFloor: normalizeText(order.delivery_house_flat_floor),
      instructions: normalizeText(order.delivery_instructions),
    };

    const dropoffContactInput = {
      firstName: normalizeText(order.contact_first_name) || 'Customer',
      lastName: normalizeText(order.contact_last_name) || 'Order',
      email: normalizeText(order.contact_email),
      phone: contactPhone,
    };

    const externalOrderId =
      normalizeText(order.order_number) || normalizeText(order.order_id) || orderId;
    const externalUserId =
      normalizeText(order.customer_id) ||
      normalizeText(order.contact_email) ||
      contactPhone ||
      orderId;

    let dispatchResult: { deliveryId: string; quoteId?: string; trackingUrl: string | null };

    if (deliveryProvider === 'doordash_drive') {
      const result = await createDoorDashDriveDelivery({
        restaurantId: restaurantId || '',
        locationId: normalizeText(order.location_id),
        externalOrderId,
        externalUserId,
        orderValue: numericValue(order.sub_total),
        pickup: pickupInput,
        orderItems,
        dropoffAddress: dropoffAddressInput,
        dropoffContact: dropoffContactInput,
      });
      dispatchResult = {
        deliveryId: result.deliveryId,
        trackingUrl: result.trackingUrl,
      };
    } else {
      const result = await createUberDirectDelivery({
        restaurantId: restaurantId || '',
        locationId: normalizeText(order.location_id),
        externalOrderId,
        externalUserId,
        orderValue: numericValue(order.sub_total),
        pickup: pickupInput,
        orderItems,
        pickupAt: undefined,
        dropoffAddress: dropoffAddressInput,
        dropoffContact: dropoffContactInput,
      });
      dispatchResult = {
        deliveryId: result.deliveryId,
        quoteId: result.quoteId,
        trackingUrl: result.trackingUrl,
      };
    }

    const lastStatusAt = new Date().toISOString();
    await adminGraphqlRequest(MARK_ORDER_DISPATCHED, {
      order_id: orderId,
      delivery_provider: deliveryProvider,
      delivery_provider_delivery_id: dispatchResult.deliveryId,
      delivery_tracking_url: dispatchResult.trackingUrl,
      delivery_quote: dispatchResult.quoteId || normalizeText(order.delivery_quote),
      delivery_dispatched_at: lastStatusAt,
      delivery_last_status_at: lastStatusAt,
    });

    return NextResponse.json({
      success: true,
      order_id: orderId,
      delivery_provider: deliveryProvider,
      delivery_provider_delivery_id: dispatchResult.deliveryId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to dispatch delivery.';

    if (orderId) {
      try {
        await adminGraphqlRequest(MARK_ORDER_DISPATCH_FAILED, {
          order_id: orderId,
          delivery_provider: deliveryProvider || 'uber_direct',
          delivery_error: message,
          delivery_last_status_at: new Date().toISOString(),
        });
      } catch (updateError) {
        console.error('[Delivery Dispatch] Failed to persist dispatch error:', updateError);
      }
    }

    console.error('[Delivery Dispatch] Event handling error:', {
      eventId: payload?.id || null,
      orderId,
      deliveryProvider,
      error,
    });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
