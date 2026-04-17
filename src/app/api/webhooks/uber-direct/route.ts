import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  parseUberDirectWebhookPayload,
  verifyUberDirectWebhookSignature,
  type UberWebhookPayload,
} from '@/lib/server/delivery/uber-direct';
import { sendOrderDeliveryTrackingEmail, sendOrderDeliveredReviewEmail, sendOrderDeliveryStatusEmail } from '@/lib/server/email';
import { isTwilioConfigured, sendSms } from '@/lib/server/twilio';

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
      contact_phone
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
      custom_domain
      staging_domain
    }
  }
`;

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildGoogleReviewUrl(gmbLink: string | null, placeId: string | null): string | null {
  if (gmbLink) {
    return gmbLink;
  }
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  return null;
}

function normalizeUberStatus(rawStatus: string | null, kind: string | null) {
  const status = rawStatus?.trim().toLowerCase().replace(/[\s-]+/g, '_') || null;

  if (!status && kind === 'event.courier_update') {
    return {
      deliveryStatus: 'courier_assigned',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  if (!status) {
    return {
      deliveryStatus: 'created',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  if (status.includes('cancel') || status.includes('undeliverable') || status.includes('return')) {
    return {
      deliveryStatus: 'cancelled',
      orderStatus: null as string | null,
      error: 'Uber Direct marked this delivery as cancelled or undeliverable.',
    };
  }

  if (status === 'delivered' || status === 'completed') {
    return {
      deliveryStatus: 'delivered',
      orderStatus: 'delivered',
      error: null as string | null,
    };
  }

  if (
    status.includes('pickup_complete') ||
    status.includes('picked_up') ||
    status.includes('dropoff') ||
    status.includes('in_transit')
  ) {
    return {
      deliveryStatus: 'picked_up',
      orderStatus: 'out_for_delivery',
      error: null as string | null,
    };
  }

  if (
    kind === 'event.courier_update' ||
    status.includes('pickup') ||
    status.includes('assigned') ||
    status.includes('en_route')
  ) {
    return {
      deliveryStatus: 'courier_assigned',
      orderStatus: null as string | null,
      error: null as string | null,
    };
  }

  if (status === 'created' || status === 'pending' || status === 'scheduled') {
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
  const signature =
    request.headers.get('x-uber-signature') ||
    request.headers.get('x-postmates-signature');

  console.log('[Uber Webhook] Received webhook event');

  if (!verifyUberDirectWebhookSignature(rawBody, signature)) {
    console.warn('[Uber Webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid Uber webhook signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as UberWebhookPayload;
  const event = parseUberDirectWebhookPayload(payload);

  console.log('[Uber Webhook] Parsed payload:', {
    kind: payload.kind,
    status: (payload as Record<string, unknown>).status,
    deliveryId: event?.deliveryId,
    eventStatus: event?.status,
  });

  if (!event) {
    console.warn('[Uber Webhook] Could not parse event, skipping');
    return NextResponse.json({ success: true, skipped: true }, { status: 202 });
  }

  const lastStatusAt =
    normalizeText((payload.data as Record<string, unknown> | undefined)?.updated) ||
    event.createdAt ||
    new Date().toISOString();
  const trackingUrl = event.trackingUrl;
  const mappedStatus = normalizeUberStatus(event.status, event.kind);

  console.log('[Uber Webhook] Status mapping:', {
    deliveryId: event.deliveryId,
    rawStatus: event.status,
    kind: event.kind,
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

  // Fetch the order BEFORE the mutation so we have the previous status for duplicate-email checks
  // and so we can log the event into delivery_statuses
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
    console.error('[Uber Webhook] Pre-mutation order fetch failed:', err);
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
      if (normalizeText(payload.id)) deliveryStatusVars.webhook_event_id = normalizeText(payload.id);
      if (event.kind) deliveryStatusVars.kind = event.kind;
      if (event.status) deliveryStatusVars.raw_status = { status: event.status };
      if (mappedStatus.orderStatus) deliveryStatusVars.mapped_order_status = mappedStatus.orderStatus;
      if (trackingUrl) deliveryStatusVars.tracking_url = trackingUrl;
      if (mappedStatus.error) deliveryStatusVars.error = { message: mappedStatus.error };
      const insertResult = await adminGraphqlRequest<{
        insert_delivery_statuses_one: { id: string } | null;
      }>(INSERT_DELIVERY_STATUS, deliveryStatusVars);
      deliveryStatusRowId = insertResult.insert_delivery_statuses_one?.id ?? null;
    } catch (err) {
      console.error('[Uber Webhook] Failed to insert delivery_status:', err);
    }
  }

  const mutationResult = await adminGraphqlRequest<{ update_orders?: { affected_rows?: number } }>(mutation, variables);
  console.log('[Uber Webhook] DB update result:', {
    deliveryId: event.deliveryId,
    affectedRows: mutationResult?.update_orders?.affected_rows ?? 'unknown',
  });

  if (shouldEmail && previousOrder) {
    const order = previousOrder;
    const contactEmail = normalizeText(order?.contact_email);
    console.log('[Uber Webhook] Triggering email for status:', mappedStatus.deliveryStatus, 'orderStatus:', mappedStatus.orderStatus, 'deliveryId:', event.deliveryId);

    console.log('[Uber Webhook] Order lookup:', {
      deliveryId: event.deliveryId,
      found: !!order,
      orderId: order?.order_id,
      orderNumber: order?.order_number,
      hasEmail: !!contactEmail,
      previousDeliveryStatus: order?.delivery_dispatch_status,
    });

    if (contactEmail) {
      try {
        const customerName = [normalizeText(order.contact_first_name), normalizeText(order.contact_last_name)]
          .filter(Boolean)
          .join(' ') || null;
        const orderNumber = normalizeText(order.order_number) || normalizeText(order.order_id) || '';

        let restaurantName = 'Restaurant';
        let googleReviewUrl: string | null = null;
        let feedbackUrl: string | null = null;
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
              custom_domain?: string;
              staging_domain?: string;
            } | null;
          }>(GET_RESTAURANT_FOR_EMAIL, { restaurant_id: order.restaurant_id });

          const rest = restData.restaurants_by_pk;
          restaurantName = normalizeText(rest?.name) || 'Restaurant';
          restaurantEmail = normalizeText(rest?.poc_email) || normalizeText(rest?.email);
          restaurantPhone = normalizeText(rest?.poc_phone_number) || normalizeText(rest?.phone_number);
          googleReviewUrl = buildGoogleReviewUrl(
            normalizeText(rest?.gmb_link),
            normalizeText(rest?.google_place_id),
          );
          const restaurantDomain = normalizeText(rest?.custom_domain) || normalizeText(rest?.staging_domain);
          if (restaurantDomain) {
            feedbackUrl = `https://${restaurantDomain}/feedback`;
          }
        }

        let emailSentType: string | null = null;

        if (mappedStatus.orderStatus === 'out_for_delivery') {
          if (order.delivery_dispatch_status === 'picked_up') {
            console.log('[Uber Webhook] Skipping duplicate out_for_delivery email for order:', orderNumber);
          } else {
            console.log('[Uber Webhook] Sending delivery tracking email to:', contactEmail, 'order:', orderNumber);
            await sendOrderDeliveryTrackingEmail(contactEmail, {
              orderNumber,
              restaurantName,
              trackingUrl: normalizeText(order.delivery_tracking_url) || trackingUrl,
              customerName,
              restaurantEmail,
              restaurantPhone,
            });
            emailSentType = 'out_for_delivery';
            console.log('[Uber Webhook] Delivery tracking email sent successfully');
          }
        } else if (mappedStatus.orderStatus === 'delivered') {
          console.log('[Uber Webhook] Sending delivered review email to:', contactEmail, 'order:', orderNumber);
          await sendOrderDeliveredReviewEmail(contactEmail, {
            orderNumber,
            restaurantName,
            customerName,
            googleReviewUrl,
            feedbackUrl,
          });
          emailSentType = 'delivered';
          console.log('[Uber Webhook] Delivered review email sent successfully');

          // Send delivered SMS with feedback link
          const contactPhone = normalizeText(order.contact_phone);
          if (contactPhone && isTwilioConfigured()) {
            const smsGreeting = customerName ? `Hi ${customerName}, your` : 'Your';
            const smsBody = feedbackUrl
              ? `${smsGreeting} order #${orderNumber} from ${restaurantName} has been delivered! We'd love your feedback: ${feedbackUrl}`
              : `${smsGreeting} order #${orderNumber} from ${restaurantName} has been delivered! Thank you for ordering.`;
            sendSms(contactPhone, smsBody).catch((smsErr) =>
              console.error('[Uber Webhook] Delivered SMS failed:', smsErr),
            );
          }
        } else if (mappedStatus.deliveryStatus === 'cancelled') {
          if (order.delivery_dispatch_status === 'cancelled') {
            console.log('[Uber Webhook] Skipping duplicate cancelled email for order:', orderNumber);
          } else {
            console.log('[Uber Webhook] Sending cancelled email to:', contactEmail, 'order:', orderNumber);
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
            console.log('[Uber Webhook] Cancelled email sent successfully');
          }
        } else if (mappedStatus.deliveryStatus === 'courier_assigned') {
          if (order.delivery_dispatch_status === 'courier_assigned') {
            console.log('[Uber Webhook] Skipping duplicate courier_assigned email for order:', orderNumber);
          } else {
            console.log('[Uber Webhook] Sending courier assigned email to:', contactEmail, 'order:', orderNumber);
            await sendOrderDeliveryStatusEmail(contactEmail, {
              orderNumber,
              restaurantName,
              status: 'courier_assigned',
              trackingUrl: normalizeText(order.delivery_tracking_url) || trackingUrl,
              customerName,
              restaurantEmail,
              restaurantPhone,
            });
            emailSentType = 'courier_assigned';
            console.log('[Uber Webhook] Delivery status email sent successfully');
          }
        }

        // Update the delivery_statuses row with which email was sent
        if (emailSentType && deliveryStatusRowId) {
          try {
            await adminGraphqlRequest(UPDATE_DELIVERY_STATUS_EMAIL, {
              id: deliveryStatusRowId,
              email_sent: emailSentType,
            });
          } catch (err) {
            console.error('[Uber Webhook] Failed to update email_sent:', err);
          }
        }
      } catch (emailErr) {
        console.error(`[Uber Webhook] Email failed for delivery ${event.deliveryId}:`, emailErr);
      }
    }
  }

  console.log('[Uber Webhook] Completed processing:', {
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
