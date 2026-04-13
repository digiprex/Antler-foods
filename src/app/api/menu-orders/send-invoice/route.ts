import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendInvoiceForOrder } from '@/lib/server/order-invoice';

const GET_ORDER_ID_BY_NUMBER = `
  query GetOrderIdByNumber($order_number: String!) {
    orders(
      where: {
        order_number: { _eq: $order_number }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      order_id
      contact_email
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderNumber = body?.orderNumber;

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required.' },
        { status: 400 },
      );
    }

    const orderData = await adminGraphqlRequest<{
      orders: Array<{ order_id: string; contact_email?: string }>;
    }>(GET_ORDER_ID_BY_NUMBER, { order_number: orderNumber });

    const order = orderData.orders?.[0];
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found.' },
        { status: 404 },
      );
    }

    if (!order.contact_email) {
      return NextResponse.json(
        { error: 'No email address on this order.' },
        { status: 400 },
      );
    }

    await sendInvoiceForOrder(order.order_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Menu Orders] Send invoice error:', error);
    return NextResponse.json(
      { error: 'Unable to send invoice email.' },
      { status: 500 },
    );
  }
}
