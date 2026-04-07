import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { sendOrderDeliveryStatusEmail } from '@/lib/server/email';

const GET_ORDER_FOR_CANCEL = `
  query GetOrderForCancel($order_id: uuid!, $customer_id: uuid!) {
    orders(
      where: {
        order_id: { _eq: $order_id }
        customer_id: { _eq: $customer_id }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      order_id
      order_number
      status
      fulfillment_type
      contact_email
      contact_first_name
      contact_last_name
      restaurant_id
    }
  }
`;

const CANCEL_ORDER = `
  mutation CancelOrder($order_id: uuid!) {
    update_orders_by_pk(
      pk_columns: { order_id: $order_id }
      _set: { status: "cancelled", updated_at: "now()" }
    ) {
      order_id
      status
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
    }
  }
`;

const NON_CANCELLABLE_DELIVERY = new Set(['delivered', 'cancelled', 'refunded']);
const NON_CANCELLABLE_PICKUP = new Set(['ready', 'delivered', 'cancelled', 'refunded']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    const restaurantId = typeof body.restaurant_id === 'string' ? body.restaurant_id.trim() : '';

    if (!orderId || !restaurantId) {
      return NextResponse.json(
        { success: false, error: 'order_id and restaurant_id are required.' },
        { status: 400 },
      );
    }

    // Authenticate customer
    const cookieValue = request.cookies.get(getMenuCustomerSessionCookieName())?.value;
    const customer = await readMenuCustomerSession(cookieValue, restaurantId);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to cancel an order.' },
        { status: 401 },
      );
    }

    // Fetch the order and verify ownership
    const orderData = await adminGraphqlRequest<{
      orders: Array<{
        order_id: string;
        order_number: string;
        status: string;
        fulfillment_type: string;
        contact_email: string;
        contact_first_name: string;
        contact_last_name: string;
        restaurant_id: string;
      }>;
    }>(GET_ORDER_FOR_CANCEL, {
      order_id: orderId,
      customer_id: customer.customerId,
    });

    const order = orderData.orders?.[0];
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found.' },
        { status: 404 },
      );
    }

    // Check if order can be cancelled
    const status = order.status?.trim().toLowerCase();
    const blocked = order.fulfillment_type === 'pickup' ? NON_CANCELLABLE_PICKUP : NON_CANCELLABLE_DELIVERY;
    if (blocked.has(status)) {
      return NextResponse.json(
        { success: false, error: 'This order can no longer be cancelled.' },
        { status: 400 },
      );
    }

    // Cancel the order
    await adminGraphqlRequest(CANCEL_ORDER, { order_id: orderId });

    // Send cancellation email
    try {
      const contactEmail = order.contact_email?.trim();
      if (contactEmail) {
        const customerName = [order.contact_first_name, order.contact_last_name]
          .filter((v) => typeof v === 'string' && v.trim())
          .join(' ') || null;

        let restaurantName = 'Restaurant';
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
            } | null;
          }>(GET_RESTAURANT_FOR_EMAIL, { restaurant_id: order.restaurant_id });

          const rest = restData.restaurants_by_pk;
          restaurantName = rest?.name?.trim() || 'Restaurant';
          restaurantEmail = rest?.poc_email?.trim() || rest?.email?.trim() || null;
          restaurantPhone = rest?.poc_phone_number?.trim() || rest?.phone_number?.trim() || null;
        }

        await sendOrderDeliveryStatusEmail(contactEmail, {
          orderNumber: order.order_number || order.order_id,
          restaurantName,
          status: 'cancelled',
          customerName,
          restaurantEmail,
          restaurantPhone,
        });
      }
    } catch (emailErr) {
      console.error('[Menu Orders] Cancel email failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Menu Orders] Cancel order error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order.' },
      { status: 500 },
    );
  }
}
