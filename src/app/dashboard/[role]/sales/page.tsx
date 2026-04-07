'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface SalesSummary {
  totalOrders: number;
  totalRevenue: number;
  subtotal: number;
  totalTax: number;
  totalTips: number;
  totalDiscounts: number;
  avgOrderValue: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

interface FulfillmentBreakdown {
  pickup: { count: number; revenue: number };
  delivery: { count: number; revenue: number };
}

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface RecentOrder {
  order_id: string;
  order_number: string;
  cart_total: number;
  status: string;
  fulfillment_type: string;
  contact_first_name: string;
  contact_last_name: string;
  placed_at: string;
}

interface SalesData {
  summary: SalesSummary;
  fulfillment: FulfillmentBreakdown;
  topItems: TopItem[];
  dailyRevenue: DailyRevenue[];
  recentOrders: RecentOrder[];
  period: { from: string; to: string; days: number };
}

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-green-50 text-green-700';
    case 'cancelled':
    case 'refunded':
      return 'bg-red-50 text-red-700';
    case 'preparing':
      return 'bg-orange-50 text-orange-700';
    case 'ready':
      return 'bg-purple-50 text-purple-700';
    case 'out_for_delivery':
      return 'bg-blue-50 text-blue-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
}

export default function DashboardSalesPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') ?? '';
  const restaurantName = searchParams?.get('restaurant_name') ?? '';
  const [periodDays, setPeriodDays] = useState(30);
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sales?restaurant_id=${encodeURIComponent(restaurantId)}&period_days=${periodDays}`,
      );
      if (!res.ok) throw new Error('Failed to fetch sales data');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Unknown error');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, periodDays]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  // Chart bar scaling
  const maxDailyRevenue = useMemo(() => {
    if (!data?.dailyRevenue) return 0;
    return Math.max(...data.dailyRevenue.map((d) => d.revenue), 1);
  }, [data?.dailyRevenue]);

  const maxItemRevenue = useMemo(() => {
    if (!data?.topItems) return 0;
    return Math.max(...data.topItems.map((i) => i.revenue), 1);
  }, [data?.topItems]);

  if (!restaurantId) {
    return (
      <section className="space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Sales</h1>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Select a restaurant to view sales data.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Sales</h1>
          {restaurantName && (
            <p className="mt-1 text-sm text-gray-500">{restaurantName}</p>
          )}
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriodDays(opt.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                periodDays === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={formatCurrency(data.summary.totalRevenue)}
              sub={`${data.summary.totalOrders} orders`}
              color="purple"
            />
            <StatCard
              label="Avg Order Value"
              value={formatCurrency(data.summary.avgOrderValue)}
              color="blue"
            />
            <StatCard
              label="Delivered"
              value={String(data.summary.deliveredOrders)}
              sub={data.summary.totalOrders ? `${Math.round((data.summary.deliveredOrders / data.summary.totalOrders) * 100)}% of orders` : undefined}
              color="green"
            />
            <StatCard
              label="Cancelled"
              value={String(data.summary.cancelledOrders)}
              sub={data.summary.totalOrders ? `${Math.round((data.summary.cancelledOrders / data.summary.totalOrders) * 100)}% of orders` : undefined}
              color="red"
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat label="Subtotal" value={formatCurrency(data.summary.subtotal)} />
            <MiniStat label="Tax Collected" value={formatCurrency(data.summary.totalTax)} />
            <MiniStat label="Tips" value={formatCurrency(data.summary.totalTips)} />
            <MiniStat label="Discounts" value={`-${formatCurrency(data.summary.totalDiscounts)}`} />
          </div>

          {/* Fulfillment Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-medium text-gray-500">Pickup Orders</h3>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.fulfillment.pickup.count}</p>
              <p className="mt-1 text-sm text-gray-500">{formatCurrency(data.fulfillment.pickup.revenue)} revenue</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-medium text-gray-500">Delivery Orders</h3>
              <p className="mt-2 text-2xl font-bold text-gray-900">{data.fulfillment.delivery.count}</p>
              <p className="mt-1 text-sm text-gray-500">{formatCurrency(data.fulfillment.delivery.revenue)} revenue</p>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          {data.dailyRevenue.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Daily Revenue</h3>
              <div className="flex items-end gap-[2px] overflow-x-auto" style={{ minHeight: 160 }}>
                {data.dailyRevenue.map((day) => {
                  const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 140 : 0;
                  return (
                    <div key={day.date} className="group relative flex flex-col items-center" style={{ flex: '1 1 0', minWidth: periodDays <= 30 ? 16 : 6 }}>
                      <div
                        className="w-full rounded-t bg-purple-500 transition-colors group-hover:bg-purple-600"
                        style={{ height: Math.max(height, 2), minHeight: 2 }}
                      />
                      <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:block whitespace-nowrap">
                        <p className="font-medium">{formatDate(day.date)}</p>
                        <p>{formatCurrency(day.revenue)}</p>
                        <p>{day.orders} order{day.orders !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-400">
                <span>{formatDate(data.dailyRevenue[0].date)}</span>
                <span>{formatDate(data.dailyRevenue[data.dailyRevenue.length - 1].date)}</span>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Top Items */}
            {data.topItems.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Selling Items</h3>
                <div className="space-y-3">
                  {data.topItems.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-medium text-gray-400">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="truncate text-sm font-medium text-gray-900">{item.name}</span>
                          <span className="ml-2 shrink-0 text-sm font-semibold text-gray-900">{formatCurrency(item.revenue)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-purple-500"
                              style={{ width: `${(item.revenue / maxItemRevenue) * 100}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">{item.quantity} sold</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Orders */}
            {data.recentOrders.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Orders</h3>
                <div className="space-y-2">
                  {data.recentOrders.map((order) => (
                    <div
                      key={order.order_id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            #{order.order_number}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(order.status)}`}
                          >
                            {order.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {[order.contact_first_name, order.contact_last_name].filter(Boolean).join(' ')}
                          {order.placed_at ? ` \u00b7 ${formatDateTime(order.placed_at)}` : ''}
                        </p>
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(order.cart_total) || 0)}
                        </p>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {order.fulfillment_type?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.summary.totalOrders === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-500">No paid orders in the last {periodDays} days.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'purple' | 'blue' | 'green' | 'red';
}) {
  const accent = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }[color];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${accent.split(' ')[0]}`} />
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
