import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/server/stripe';
import {
  disconnectRestaurantStripeAccountByStripeAccountId,
  syncRestaurantStripeAccountByStripeAccountId,
} from '@/lib/server/restaurant-stripe-accounts';

const SYNCABLE_CONNECT_EVENT_TYPES = new Set([
  'account.updated',
  'account.external_account.updated',
  'account.application.deauthorized',
  'payout.created',
  'payout.updated',
  'payout.paid',
  'payout.failed',
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { success: false, error: 'Missing stripe-signature header.' },
      { status: 400 },
    );
  }

  const webhookSecret =
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET ||
    process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { success: false, error: 'Stripe Connect webhook secret is not configured.' },
      { status: 500 },
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[Stripe Connect Webhook] Signature verification failed:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid Stripe webhook signature.' },
      { status: 400 },
    );
  }

  try {
    if (SYNCABLE_CONNECT_EVENT_TYPES.has(event.type)) {
      const stripeAccountId = resolveStripeAccountIdFromEvent(event);
      if (stripeAccountId) {
        if (event.type === 'account.application.deauthorized') {
          await disconnectRestaurantStripeAccountByStripeAccountId(
            stripeAccountId,
            {
              reason: 'deauthorized',
            },
          );
        } else {
          await syncRestaurantStripeAccountByStripeAccountId(stripeAccountId);
        }
      }
    }

    // TODO: Add payout-specific persistence if admin payout controls later need
    // a dedicated payout history/audit surface instead of account-level sync only.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Connect Webhook] Processing failed:', error);
    return NextResponse.json(
      { success: false, error: 'Stripe Connect webhook processing failed.' },
      { status: 500 },
    );
  }
}

function resolveStripeAccountIdFromEvent(event: {
  account?: string | null;
  data?: {
    object?: unknown;
  };
}) {
  if (typeof event.account === 'string' && event.account.trim()) {
    return event.account.trim();
  }

  const object =
    event.data?.object && typeof event.data.object === 'object'
      ? (event.data.object as Record<string, unknown>)
      : null;
  if (!object) {
    return null;
  }

  if (typeof object.id === 'string' && object.id.startsWith('acct_')) {
    return object.id;
  }

  if (typeof object.account === 'string' && object.account.trim()) {
    return object.account.trim();
  }

  return null;
}
