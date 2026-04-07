export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_SALES_SUMMARY = `
  query GetSalesSummary(
    $restaurant_id: uuid!
    $date_from: timestamptz!
    $date_to: timestamptz!
  ) {
    total: orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      aggregate {
        count
        sum {
          cart_total
          sub_total
          tax_total
          tip_total
          discount_total
        }
      }
    }
    delivered: orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        status: { _eq: "delivered" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      aggregate { count }
    }
    cancelled: orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        status: { _eq: "cancelled" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      aggregate { count }
    }
    pickup: orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        fulfillment_type: { _eq: "pickup" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      aggregate { count sum { cart_total } }
    }
    delivery: orders_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        fulfillment_type: { _eq: "delivery" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      aggregate { count sum { cart_total } }
    }
    recent_orders: orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
      order_by: { placed_at: desc }
      limit: 10
    ) {
      order_id
      order_number
      cart_total
      status
      fulfillment_type
      contact_first_name
      contact_last_name
      placed_at
    }
  }
`;

const GET_PAID_ORDER_IDS = `
  query GetPaidOrderIds(
    $restaurant_id: uuid!
    $date_from: timestamptz!
    $date_to: timestamptz!
  ) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
    ) {
      order_id
    }
  }
`;

const GET_TOP_ITEMS = `
  query GetTopItems($order_ids: [uuid!]!) {
    order_items(
      where: {
        order_id: { _in: $order_ids }
        is_deleted: { _eq: false }
      }
    ) {
      item_name
      quantity
      line_total
    }
  }
`;

const GET_DAILY_REVENUE = `
  query GetDailyRevenue(
    $restaurant_id: uuid!
    $date_from: timestamptz!
    $date_to: timestamptz!
  ) {
    orders(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        payment_status: { _eq: "paid" }
        placed_at: { _gte: $date_from, _lte: $date_to }
      }
      order_by: { placed_at: asc }
    ) {
      placed_at
      cart_total
    }
  }
`;

function toNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const periodDays = parseInt(searchParams.get('period_days') || '30');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - periodDays);

    const variables = {
      restaurant_id: restaurantId,
      date_from: dateFrom.toISOString(),
      date_to: dateTo.toISOString(),
    };

    const [summaryData, orderIdsData, dailyData] = await Promise.all([
      adminGraphqlRequest<{
        total: { aggregate: { count: number; sum: Record<string, unknown> } };
        delivered: { aggregate: { count: number } };
        cancelled: { aggregate: { count: number } };
        pickup: { aggregate: { count: number; sum: { cart_total: unknown } } };
        delivery: { aggregate: { count: number; sum: { cart_total: unknown } } };
        recent_orders: Array<Record<string, unknown>>;
      }>(GET_SALES_SUMMARY, variables),
      adminGraphqlRequest<{
        orders: Array<{ order_id: string }>;
      }>(GET_PAID_ORDER_IDS, variables),
      adminGraphqlRequest<{
        orders: Array<{ placed_at: string; cart_total: number }>;
      }>(GET_DAILY_REVENUE, variables),
    ]);

    // Fetch top items using the paid order IDs
    const paidOrderIds = (orderIdsData.orders || []).map((o) => o.order_id);
    let itemsData: { order_items: Array<{ item_name: string; quantity: number; line_total: number }> } = { order_items: [] };
    if (paidOrderIds.length > 0) {
      itemsData = await adminGraphqlRequest<typeof itemsData>(GET_TOP_ITEMS, { order_ids: paidOrderIds });
    }

    // Aggregate top items
    const itemMap = new Map<string, { quantity: number; revenue: number }>();
    for (const item of itemsData.order_items || []) {
      const existing = itemMap.get(item.item_name) || { quantity: 0, revenue: 0 };
      existing.quantity += toNum(item.quantity);
      existing.revenue += toNum(item.line_total);
      itemMap.set(item.item_name, existing);
    }
    const topItems = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Aggregate daily revenue
    const dayMap = new Map<string, { revenue: number; orders: number }>();
    for (const order of dailyData.orders || []) {
      const day = order.placed_at ? new Date(order.placed_at).toISOString().split('T')[0] : null;
      if (!day) continue;
      const existing = dayMap.get(day) || { revenue: 0, orders: 0 };
      existing.revenue += toNum(order.cart_total);
      existing.orders += 1;
      dayMap.set(day, existing);
    }

    // Fill in missing days with zeros
    const dailyRevenue: Array<{ date: string; revenue: number; orders: number }> = [];
    const cursor = new Date(dateFrom);
    while (cursor <= dateTo) {
      const day = cursor.toISOString().split('T')[0];
      const data = dayMap.get(day) || { revenue: 0, orders: 0 };
      dailyRevenue.push({ date: day, ...data });
      cursor.setDate(cursor.getDate() + 1);
    }

    const sum = summaryData.total.aggregate.sum;

    return NextResponse.json({
      success: true,
      period: { from: dateFrom.toISOString(), to: dateTo.toISOString(), days: periodDays },
      summary: {
        totalOrders: summaryData.total.aggregate.count || 0,
        totalRevenue: toNum(sum?.cart_total),
        subtotal: toNum(sum?.sub_total),
        totalTax: toNum(sum?.tax_total),
        totalTips: toNum(sum?.tip_total),
        totalDiscounts: toNum(sum?.discount_total),
        avgOrderValue: summaryData.total.aggregate.count
          ? toNum(sum?.cart_total) / summaryData.total.aggregate.count
          : 0,
        deliveredOrders: summaryData.delivered.aggregate.count || 0,
        cancelledOrders: summaryData.cancelled.aggregate.count || 0,
      },
      fulfillment: {
        pickup: {
          count: summaryData.pickup.aggregate.count || 0,
          revenue: toNum(summaryData.pickup.aggregate.sum?.cart_total),
        },
        delivery: {
          count: summaryData.delivery.aggregate.count || 0,
          revenue: toNum(summaryData.delivery.aggregate.sum?.cart_total),
        },
      },
      topItems,
      dailyRevenue,
      recentOrders: summaryData.recent_orders || [],
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales data' },
      { status: 500 },
    );
  }
}
