import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/server/stripe';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendInvoiceForOrder } from '@/lib/server/order-invoice';
import { syncPayoutBatchByTransferEvent } from '@/lib/server/restaurant-payouts';

const CONFIRM_PAID_ORDER = `
  mutation ConfirmPaidOrder($order_id: uuid!, $payment_reference: String!, $confirmed_at: timestamptz!) {
    update_orders(
      where: {
        order_id: { _eq: $order_id }
        status: { _eq: "pending" }
      }
      _set: {
        payment_status: "paid"
        payment_reference: $payment_reference
        status: "preparing"
        confirmed_at: $confirmed_at
      }
    ) {
      affected_rows
    }
  }
`;

const UPDATE_PAYMENT_FAILED = `
  mutation UpdatePaymentFailed($order_id: uuid!, $payment_reference: String!) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id },
      _set: { payment_status: "failed", payment_reference: $payment_reference }
    ) {
      order_id
    }
  }
`;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      // Conditional update — only transitions if still "pending".
      // If confirm-payment endpoint already handled it, affected_rows is 0.
      const result = await adminGraphqlRequest<{
        update_orders: { affected_rows: number };
      }>(CONFIRM_PAID_ORDER, {
        order_id: orderId,
        payment_reference: paymentIntent.id,
        confirmed_at: new Date().toISOString(),
      });

      // Only send email if we were the first to confirm (prevents duplicates)
      if ((result.update_orders?.affected_rows ?? 0) > 0) {
        try {
          await sendInvoiceForOrder(orderId);
        } catch (emailError) {
          console.error('[Stripe Webhook] Order confirmation email failed:', emailError);
        }
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.order_id;

    if (orderId) {
      await adminGraphqlRequest(UPDATE_PAYMENT_FAILED, {
        order_id: orderId,
        payment_reference: paymentIntent.id,
      });
    }
  }

  if (
    event.type === 'transfer.created' ||
    event.type === 'transfer.updated' ||
    event.type === 'transfer.reversed'
  ) {
    try {
      await syncPayoutBatchByTransferEvent(
        event.data.object as Parameters<typeof syncPayoutBatchByTransferEvent>[0],
        event.type,
      );
    } catch (transferError) {
      console.error('[Stripe Webhook] Transfer sync failed:', transferError);
      return NextResponse.json(
        { error: 'Transfer webhook processing failed.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
