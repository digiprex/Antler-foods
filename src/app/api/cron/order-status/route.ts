import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_CONFIRMED_ORDERS = `
  query GetConfirmedOrders {
    orders(
      where: {
        status: { _eq: "confirmed" }
        confirmed_at: { _is_null: false }
        is_deleted: { _eq: false }
      }
    ) {
      order_id
      restaurant_id
      confirmed_at
    }
  }
`;

const GET_RESTAURANTS_PREPARATION_TIMES = `
  query GetRestaurantsPreparationTimes($ids: [uuid!]!) {
    restaurants(where: { restaurant_id: { _in: $ids } }) {
      restaurant_id
      preparation_time
    }
  }
`;

const BULK_UPDATE_ORDER_STATUS = `
  mutation BulkUpdateOrderStatus($order_ids: [uuid!]!) {
    update_orders(
      where: { order_id: { _in: $order_ids } }
      _set: { status: "preparing" }
    ) {
      affected_rows
    }
  }
`;

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get all confirmed orders with a confirmed_at timestamp
    const ordersData = await adminGraphqlRequest<{
      orders: Array<{
        order_id: string;
        restaurant_id: string;
        confirmed_at: string;
      }>;
    }>(GET_CONFIRMED_ORDERS, {});

    const orders = ordersData.orders || [];
    if (orders.length === 0) {
      return NextResponse.json({ success: true, transitioned: 0 });
    }

    // 2. Get preparation times for all relevant restaurants
    const restaurantIds = [...new Set(orders.map((o) => o.restaurant_id))];
    const restData = await adminGraphqlRequest<{
      restaurants: Array<{
        restaurant_id: string;
        preparation_time?: number | null;
      }>;
    }>(GET_RESTAURANTS_PREPARATION_TIMES, { ids: restaurantIds });

    const prepTimeByRestaurant = new Map<string, number>();
    for (const r of restData.restaurants || []) {
      const time = Number(r.preparation_time) || 0;
      if (time > 0) {
        prepTimeByRestaurant.set(r.restaurant_id, time);
      }
    }

    // 3. Find orders that have exceeded their preparation time
    const now = Date.now();
    const orderIdsToTransition: string[] = [];

    for (const order of orders) {
      const prepMinutes = prepTimeByRestaurant.get(order.restaurant_id);
      if (!prepMinutes) continue;

      const confirmedAt = new Date(order.confirmed_at).getTime();
      if (Number.isNaN(confirmedAt)) continue;

      const elapsedMs = now - confirmedAt;
      if (elapsedMs >= prepMinutes * 60 * 1000) {
        orderIdsToTransition.push(order.order_id);
      }
    }

    // 4. Bulk update
    let affected = 0;
    if (orderIdsToTransition.length > 0) {
      const result = await adminGraphqlRequest<{
        update_orders: { affected_rows: number };
      }>(BULK_UPDATE_ORDER_STATUS, { order_ids: orderIdsToTransition });
      affected = result.update_orders?.affected_rows || 0;
      console.log(
        `[Cron] Transitioned ${affected} order(s) to preparing:`,
        orderIdsToTransition,
      );
    }

    return NextResponse.json({ success: true, transitioned: affected });
  } catch (error) {
    console.error('[Cron] Order status transition error:', error);
    return NextResponse.json(
      { error: 'Failed to process order transitions' },
      { status: 500 },
    );
  }
}
