import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { getStripe } from '@/lib/server/stripe';
import { sendInvoiceForOrder } from '@/lib/server/order-invoice';

const GET_ORDER_PAYMENT_REF = `
  query GetOrderPaymentRef($order_id: uuid!) {
    orders_by_pk(order_id: $order_id) {
      order_id
      status
      payment_status
      payment_reference
    }
  }
`;

const CONFIRM_PAID_ORDER = `
  mutation ConfirmPaidOrder($order_id: uuid!, $confirmed_at: timestamptz!) {
    update_orders(
      where: {
        order_id: { _eq: $order_id }
        status: { _eq: "pending" }
      }
      _set: {
        payment_status: "paid"
        status: "preparing"
        confirmed_at: $confirmed_at
      }
    ) {
      affected_rows
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Order ID is required.' },
        { status: 400 },
      );
    }

    const orderData = await adminGraphqlRequest<{
      orders_by_pk: {
        order_id: string;
        status: string;
        payment_status: string;
        payment_reference: string | null;
      } | null;
    }>(GET_ORDER_PAYMENT_REF, { order_id: orderId });

    const order = orderData.orders_by_pk;
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 },
      );
    }

    // Already confirmed — email was already sent by whoever confirmed first
    if (order.status !== 'pending') {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    // Verify payment with Stripe before confirming
    if (!order.payment_reference) {
      return NextResponse.json(
        { error: 'No payment reference found.' },
        { status: 400 },
      );
    }

    const pi = await getStripe().paymentIntents.retrieve(order.payment_reference);
    if (pi.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment has not been completed.' },
        { status: 402 },
      );
    }

    // Conditional update — only transitions if still "pending".
    // If the webhook already confirmed, affected_rows will be 0.
    const result = await adminGraphqlRequest<{
      update_orders: { affected_rows: number };
    }>(CONFIRM_PAID_ORDER, {
      order_id: orderId,
      confirmed_at: new Date().toISOString(),
    });

    // Only send invoice if we were the one to confirm (prevents duplicate emails)
    if ((result.update_orders?.affected_rows ?? 0) > 0) {
      try {
        await sendInvoiceForOrder(orderId);
      } catch (emailErr) {
        console.error('[Confirm Payment] Invoice email failed:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Confirm Payment] Error:', error);
    return NextResponse.json(
      { error: 'Unable to confirm payment.' },
      { status: 500 },
    );
  }
}
