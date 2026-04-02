import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  parseUberDirectWebhookPayload,
  verifyUberDirectWebhookSignature,
  type UberWebhookPayload,
} from '@/lib/server/delivery/uber-direct';

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

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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

  if (!verifyUberDirectWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid Uber webhook signature.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as UberWebhookPayload;
  const event = parseUberDirectWebhookPayload(payload);

  if (!event) {
    return NextResponse.json({ success: true, skipped: true }, { status: 202 });
  }

  const lastStatusAt =
    normalizeText((payload.data as Record<string, unknown> | undefined)?.updated) ||
    event.createdAt ||
    new Date().toISOString();
  const trackingUrl = event.trackingUrl;
  const mappedStatus = normalizeUberStatus(event.status, event.kind);

  const variables = {
    delivery_id: event.deliveryId,
    delivery_dispatch_status: mappedStatus.deliveryStatus,
    delivery_tracking_url: trackingUrl,
    delivery_last_status_at: lastStatusAt,
    delivery_error: mappedStatus.error,
    status: mappedStatus.orderStatus,
  };

  const mutation = mappedStatus.orderStatus
    ? UPDATE_DELIVERY_STATUS_AND_ORDER
    : UPDATE_DELIVERY_STATUS;

  await adminGraphqlRequest(mutation, variables);

  return NextResponse.json({
    success: true,
    delivery_id: event.deliveryId,
    delivery_dispatch_status: mappedStatus.deliveryStatus,
  });
}
