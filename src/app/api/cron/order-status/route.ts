import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_PREPARING_ORDERS = `
  query GetPreparingOrders {
    orders(
      where: {
        status: { _eq: "preparing" }
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

const UPDATE_TO_READY = `
  mutation UpdateToReady($order_ids: [uuid!]!) {
    update_orders(
      where: { order_id: { _in: $order_ids } }
      _set: { status: "ready" }
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
    const ordersData = await adminGraphqlRequest<{
      orders: Array<{ order_id: string; restaurant_id: string; confirmed_at: string }>;
    }>(GET_PREPARING_ORDERS, {});

    const orders = ordersData.orders || [];
    if (orders.length === 0) {
      return NextResponse.json({ success: true, toReady: 0 });
    }

    // Get preparation times for relevant restaurants
    const restaurantIds = [...new Set(orders.map((o) => o.restaurant_id))];
    const restData = await adminGraphqlRequest<{
      restaurants: Array<{ restaurant_id: string; preparation_time?: number | null }>;
    }>(GET_RESTAURANTS_PREPARATION_TIMES, { ids: restaurantIds });

    const prepTimeByRestaurant = new Map<string, number>();
    for (const r of restData.restaurants || []) {
      const time = Number(r.preparation_time) || 0;
      if (time > 0) {
        prepTimeByRestaurant.set(r.restaurant_id, time);
      }
    }

    // Find preparing orders that have exceeded preparation_time since confirmed_at
    const now = Date.now();
    const toReadyIds: string[] = [];

    for (const order of orders) {
      const prepMinutes = prepTimeByRestaurant.get(order.restaurant_id);
      if (!prepMinutes) continue;
      const confirmedAt = new Date(order.confirmed_at).getTime();
      if (Number.isNaN(confirmedAt)) continue;
      if (now - confirmedAt >= prepMinutes * 60 * 1000) {
        toReadyIds.push(order.order_id);
      }
    }

    let affected = 0;
    if (toReadyIds.length > 0) {
      const result = await adminGraphqlRequest<{
        update_orders: { affected_rows: number };
      }>(UPDATE_TO_READY, { order_ids: toReadyIds });
      affected = result.update_orders?.affected_rows || 0;
      console.log(`[Cron] ${affected} order(s) → ready:`, toReadyIds);
    }

    return NextResponse.json({ success: true, toReady: affected });
  } catch (error) {
    console.error('[Cron] Order status transition error:', error);
    return NextResponse.json(
      { error: 'Failed to process order transitions' },
      { status: 500 },
    );
  }
}
