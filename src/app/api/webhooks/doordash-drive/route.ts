import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  parseDoorDashDriveWebhookPayload,
  verifyDoorDashDriveWebhookSignature,
  type DoorDashWebhookPayload,
} from '@/lib/server/delivery/doordash-drive';
import {
  sendOrderDeliveryTrackingEmail,
  sendOrderDeliveredReviewEmail,
  sendOrderDeliveryStatusEmail,
} from '@/lib/server/email';

const UPDATE_DELIVERY_STATUS = `
  mutation UpdateDeliveryStatus(
    $delivery_id: String!
    $delivery_dispatch_status: String!
    $delivery_tracking_url: String
    $delivery_last_status_at: timestamptz!
    $delivery_error: String
  ) {
    update_orders(
      where: {
        delivery_provider_delivery_id: { _eq: $delivery_id }
        is_deleted: { _eq: false }
      }
      _set: {
        delivery_dispatch_status: $delivery_dispatch_status
        delivery_tracking_url: $delivery_tracking_url
        delivery_last_status_at: $delivery_last_status_at
        delivery_error: $delivery_error
      }
    ) {
      affected_rows
    }
  }
`;

const UPDATE_DELIVERY_STATUS_AND_ORDER = `
  mutation UpdateDeliveryStatusAndOrder(
    $delivery_id: String!
    $delivery_dispatch_status: String!
    $delivery_tracking_url: String
    $delivery_last_status_at: timestamptz!
    $delivery_error: String
    $status: String!
  ) {
    update_orders(
      where: {
        delivery_provider_delivery_id: { _eq: $delivery_id }
        is_deleted: { _eq: false }
      }
      _set: {
        delivery_dispatch_status: $delivery_dispatch_status
        delivery_tracking_url: $delivery_tracking_url
        delivery_last_status_at: $delivery_last_status_at
        delivery_error: $delivery_error
        status: $status
      }
    ) {
      affected_rows
    }
  }
`;

const GET_ORDER_BY_DELIVERY_ID = `
  query GetOrderByDeliveryId($delivery_id: String!) {
    orders(
      where: {
        delivery_provider_delivery_id: { _eq: $delivery_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      order_id
      order_number
      contact_email
      contact_first_name
      contact_last_name
      restaurant_id
      delivery_tracking_url
      delivery_dispatch_status
    }
  }
`;

const INSERT_DELIVERY_STATUS = `
  mutation InsertDeliveryStatus(
    $order_id: uuid!
    $delivery_id: String!
    $webhook_event_id: String
    $kind: String
    $raw_status: jsonb
    $mapped_delivery_status: String!
    $mapped_order_status: String
    $tracking_url: String
    $error: jsonb
    $raw_payload: jsonb!
    $email_sent: String
  ) {
    insert_delivery_statuses_one(object: {
      order_id: $order_id
      delivery_id: $delivery_id
      webhook_event_id: $webhook_event_id
      kind: $kind
      raw_status: $raw_status
      mapped_delivery_status: $mapped_delivery_status
      mapped_order_status: $mapped_order_status
      tracking_url: $tracking_url
      error: $error
      raw_payload: $raw_payload
      email_sent: $email_sent
    }) {
      id
    }
  }
`;

const UPDATE_DELIVERY_STATUS_EMAIL = `
  mutation UpdateDeliveryStatusEmail($id: uuid!, $email_sent: String!) {
    update_delivery_statuses_by_pk(
      pk_columns: { id: $id }
      _set: { email_sent: $email_sent }
    ) {
      id
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
      gmb_link
      google_place_id
    }
  }
`;

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildGoogleReviewUrl(
  gmbLink: string | null,
  placeId: string | null,
): string | null {
  if (gmbLink) {
    return gmbLink;
  }
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  return null;
}

/**
 * Map DoorDash delivery_status to our internal delivery + order statuses.
 * DoorDash statuses: created, confirmed, enroute_to_pickup, arrived_at_pickup,
 *   picked_up, enroute_to_dropoff, arrived_at_dropoff, delivered, cancelled, returned
 */
function normalizeDoorDashStatus(rawStatus: string | null) {
  const status = rawStatus?.trim().toLowerCase().replace(/[\s-]+/g, '_') || null;

  if (!status) {
    return {
      deliveryStatus: 'created',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  if (status.includes('cancel') || status.includes('return')) {
    return {
      deliveryStatus: 'cancelled',
      orderStatus: null as string | null,
      error: 'DoorDash Drive marked this delivery as cancelled or returned.',
    };
  }

  if (status === 'delivered') {
    return {
      deliveryStatus: 'delivered',
      orderStatus: 'delivered',
      error: null as string | null,
    };
  }

  if (
    status === 'picked_up' ||
    status.includes('enroute_to_dropoff') ||
    status.includes('arrived_at_dropoff')
  ) {
    return {
      deliveryStatus: 'picked_up',
      orderStatus: 'out_for_delivery',
      error: null as string | null,
    };
  }

  if (
    status === 'confirmed' ||
    status.includes('enroute_to_pickup') ||
    status.includes('arrived_at_pickup')
  ) {
    return {
      deliveryStatus: 'courier_assigned',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  if (status === 'created') {
    return {
      deliveryStatus: 'created',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  return {
    deliveryStatus: status,
    orderStatus: null as string | null,
    error: null as string | null,
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const authHeader = request.headers.get('authorization');

  console.log('[DoorDash Webhook] Received webhook event:', {
    bodyLength: rawBody.length,
    hasAuth: !!authHeader,
    rawBody: rawBody.substring(0, 1000),
  });

  // DoorDash sends a Bearer token in the Authorization header (not HMAC signature)
  const webhookSecret = process.env.DOORDASH_DRIVE_WEBHOOK_SIGNING_SECRET?.trim() || null;
  if (webhookSecret) {
    const expectedToken = webhookSecret.replace(/^Bearer\s+/i, '');
    const receivedToken = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!receivedToken || receivedToken !== expectedToken) {
      console.warn('[DoorDash Webhook] Auth verification failed:', {
        expected: expectedToken.substring(0, 8) + '...',
        received: receivedToken ? receivedToken.substring(0, 8) + '...' : '(empty)',
      });
      return NextResponse.json(
        { error: 'Invalid DoorDash webhook authorization.' },
        { status: 401 },
      );
    }
  }

  const payload = JSON.parse(rawBody) as DoorDashWebhookPayload;
  const event = parseDoorDashDriveWebhookPayload(payload);

  console.log('[DoorDash Webhook] Parsed payload:', {
    deliveryId: event?.deliveryId,
    status: event?.status,
  });

  if (!event) {
    console.warn('[DoorDash Webhook] Could not parse event, skipping');
    return NextResponse.json({ success: true, skipped: true }, { status: 202 });
  }

  const lastStatusAt = event.updatedAt || new Date().toISOString();
  const trackingUrl = event.trackingUrl;
  const mappedStatus = normalizeDoorDashStatus(event.status);

  console.log('[DoorDash Webhook] Status mapping:', {
    deliveryId: event.deliveryId,
    rawStatus: event.status,
    mappedDeliveryStatus: mappedStatus.deliveryStatus,
    mappedOrderStatus: mappedStatus.orderStatus,
    trackingUrl,
    error: mappedStatus.error,
  });

  const baseVariables = {
    delivery_id: event.deliveryId,
    delivery_dispatch_status: mappedStatus.deliveryStatus,
    delivery_tracking_url: trackingUrl,
    delivery_last_status_at: lastStatusAt,
    delivery_error: mappedStatus.error,
  };

  const mutation = mappedStatus.orderStatus
    ? UPDATE_DELIVERY_STATUS_AND_ORDER
    : UPDATE_DELIVERY_STATUS;

  const variables = mappedStatus.orderStatus
    ? { ...baseVariables, status: mappedStatus.orderStatus }
    : baseVariables;

  // Fetch the order BEFORE the mutation for duplicate-email checks and audit logging
  const shouldEmail =
    mappedStatus.deliveryStatus === 'courier_assigned' ||
    mappedStatus.deliveryStatus === 'cancelled' ||
    mappedStatus.orderStatus === 'out_for_delivery' ||
    mappedStatus.orderStatus === 'delivered';

  let previousOrder: Record<string, unknown> | null = null;
  try {
    const orderData = await adminGraphqlRequest<{
      orders: Array<Record<string, unknown>>;
    }>(GET_ORDER_BY_DELIVERY_ID, { delivery_id: event.deliveryId });
    previousOrder = orderData.orders?.[0] ?? null;
  } catch (err) {
    console.error('[DoorDash Webhook] Pre-mutation order fetch failed:', err);
  }

  // Log every webhook event into delivery_statuses for audit trail
  let deliveryStatusRowId: string | null = null;
  if (previousOrder?.order_id) {
    try {
      const deliveryStatusVars: Record<string, unknown> = {
        order_id: previousOrder.order_id,
        delivery_id: event.deliveryId,
        mapped_delivery_status: mappedStatus.deliveryStatus,
        raw_payload: payload,
      };
      if (event.status)
        deliveryStatusVars.raw_status = { status: event.status };
      if (mappedStatus.orderStatus)
        deliveryStatusVars.mapped_order_status = mappedStatus.orderStatus;
      if (trackingUrl) deliveryStatusVars.tracking_url = trackingUrl;
      if (mappedStatus.error)
        deliveryStatusVars.error = { message: mappedStatus.error };
      deliveryStatusVars.kind = 'doordash_drive_webhook';

      const insertResult = await adminGraphqlRequest<{
        insert_delivery_statuses_one: { id: string } | null;
      }>(INSERT_DELIVERY_STATUS, deliveryStatusVars);
      deliveryStatusRowId =
        insertResult.insert_delivery_statuses_one?.id ?? null;
    } catch (err) {
      console.error(
        '[DoorDash Webhook] Failed to insert delivery_status:',
        err,
      );
    }
  }

  const mutationResult = await adminGraphqlRequest<{
    update_orders?: { affected_rows?: number };
  }>(mutation, variables);
  console.log('[DoorDash Webhook] DB update result:', {
    deliveryId: event.deliveryId,
    affectedRows: mutationResult?.update_orders?.affected_rows ?? 'unknown',
  });

  if (shouldEmail && previousOrder) {
    const order = previousOrder;
    const contactEmail = normalizeText(order?.contact_email);

    if (contactEmail) {
      try {
        const customerName =
          [
            normalizeText(order.contact_first_name),
            normalizeText(order.contact_last_name),
          ]
            .filter(Boolean)
            .join(' ') || null;
        const orderNumber =
          normalizeText(order.order_number) ||
          normalizeText(order.order_id) ||
          '';

        let restaurantName = 'Restaurant';
        let googleReviewUrl: string | null = null;
        let restaurantEmail: string | null = null;
        let restaurantPhone: string | null = null;

        if (order.restaurant_id) {
          const restData = await adminGraphqlRequest<{
            restaurants_by_pk: {
              name?: string;
              email?: string;
              phone_number?: string;
              poc_email?: string;
              poc_phone_number?: string;
              gmb_link?: string;
              google_place_id?: string;
            } | null;
          }>(GET_RESTAURANT_FOR_EMAIL, {
            restaurant_id: order.restaurant_id,
          });

          const rest = restData.restaurants_by_pk;
          restaurantName = normalizeText(rest?.name) || 'Restaurant';
          restaurantEmail =
            normalizeText(rest?.poc_email) || normalizeText(rest?.email);
          restaurantPhone =
            normalizeText(rest?.poc_phone_number) ||
            normalizeText(rest?.phone_number);
          googleReviewUrl = buildGoogleReviewUrl(
            normalizeText(rest?.gmb_link),
            normalizeText(rest?.google_place_id),
          );
        }

        let emailSentType: string | null = null;

        if (mappedStatus.orderStatus === 'out_for_delivery') {
          if (order.delivery_dispatch_status === 'picked_up') {
            console.log(
              '[DoorDash Webhook] Skipping duplicate out_for_delivery email for order:',
              orderNumber,
            );
          } else {
            await sendOrderDeliveryTrackingEmail(contactEmail, {
              orderNumber,
              restaurantName,
              trackingUrl:
                normalizeText(order.delivery_tracking_url) || trackingUrl,
              customerName,
              restaurantEmail,
              restaurantPhone,
            });
            emailSentType = 'out_for_delivery';
          }
        } else if (mappedStatus.orderStatus === 'delivered') {
          await sendOrderDeliveredReviewEmail(contactEmail, {
            orderNumber,
            restaurantName,
            customerName,
            googleReviewUrl,
          });
          emailSentType = 'delivered';
        } else if (mappedStatus.deliveryStatus === 'cancelled') {
          if (order.delivery_dispatch_status === 'cancelled') {
            console.log(
              '[DoorDash Webhook] Skipping duplicate cancelled email for order:',
              orderNumber,
            );
          } else {
            await sendOrderDeliveryStatusEmail(contactEmail, {
              orderNumber,
              restaurantName,
              status: 'cancelled',
              cancelledBy: 'system',
              customerName,
              restaurantEmail,
              restaurantPhone,
            });
            emailSentType = 'cancelled';
          }
        } else if (mappedStatus.deliveryStatus === 'courier_assigned') {
          if (order.delivery_dispatch_status === 'courier_assigned') {
            console.log(
              '[DoorDash Webhook] Skipping duplicate courier_assigned email for order:',
              orderNumber,
            );
          } else {
            await sendOrderDeliveryStatusEmail(contactEmail, {
              orderNumber,
              restaurantName,
              status: 'courier_assigned',
              trackingUrl:
                normalizeText(order.delivery_tracking_url) || trackingUrl,
              customerName,
              restaurantEmail,
              restaurantPhone,
            });
            emailSentType = 'courier_assigned';
          }
        }

        if (emailSentType && deliveryStatusRowId) {
          try {
            await adminGraphqlRequest(UPDATE_DELIVERY_STATUS_EMAIL, {
              id: deliveryStatusRowId,
              email_sent: emailSentType,
            });
          } catch (err) {
            console.error(
              '[DoorDash Webhook] Failed to update email_sent:',
              err,
            );
          }
        }
      } catch (emailErr) {
        console.error(
          `[DoorDash Webhook] Email failed for delivery ${event.deliveryId}:`,
          emailErr,
        );
      }
    }
  }

  console.log('[DoorDash Webhook] Completed processing:', {
    deliveryId: event.deliveryId,
    deliveryStatus: mappedStatus.deliveryStatus,
    orderStatus: mappedStatus.orderStatus,
  });

  return NextResponse.json({
    success: true,
    delivery_id: event.deliveryId,
    delivery_dispatch_status: mappedStatus.deliveryStatus,
  });
}
