'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

interface OrderHistoryItem {
  orderItemId: string;
  itemName: string;
  quantity: number;
  lineTotal: number;
}

interface OrderHistoryOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  paymentStatus: string;
  subtotal: number;
  taxTotal: number;
  tipTotal: number;
  discountTotal: number;
  total: number;
  placedAt: string | null;
  createdAt: string | null;
  scheduledFor: string | null;
  deliveryAddress: string | null;
  items: OrderHistoryItem[];
}

interface OrderHistoryResponse {
  success?: boolean;
  authenticated?: boolean;
  error?: string;
  orders?: OrderHistoryOrder[];
}

interface OrderHistoryPageProps {
  restaurantId?: string | null;
  restaurantName: string;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'completed' || normalized === 'delivered' || normalized === 'ready') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'cancelled' || normalized === 'failed' || normalized === 'refunded') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized === 'preparing' || normalized === 'confirmed' || normalized === 'processing') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-stone-200 bg-stone-50 text-stone-700';
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function OrderHistoryPage({
  restaurantId,
  restaurantName,
}: OrderHistoryPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderHistoryOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestSession, setIsGuestSession] = useState(false);

  useEffect(() => {
    if (!restaurantId) {
      setError('Restaurant context is missing.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/menu-orders/history?restaurantId=${encodeURIComponent(restaurantId)}`,
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | OrderHistoryResponse
          | null;

        if (!response.ok) {
          setOrders([]);
          setIsAuthenticated(payload?.authenticated === true);
          setIsGuestSession(response.status === 403);
          setError(payload?.error || 'Unable to load your order history.');
          return;
        }

        setIsAuthenticated(Boolean(payload?.authenticated));
        setIsGuestSession(false);
        setOrders(Array.isArray(payload?.orders) ? payload.orders : []);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[Menu Orders] Failed to load order history:', requestError);
        setError('Unable to load your order history right now.');
        setOrders([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [restaurantId]);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    return { totalOrders, totalSpent };
  }, [orders]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4">
          <Link
            href="/menu"
            className="inline-flex items-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
          >
            Back to menu
          </Link>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {restaurantName}
          </p>
          <h1 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">
            Your order history
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Review your recent orders, totals, and order statuses.
          </p>

          {isLoading ? (
            <div className="mt-6 rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">
              Loading your orders...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-[18px] border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-800">
              <p>{error}</p>
              {!isAuthenticated ? (
                <Link
                  href="/menu?auth=login"
                  className="mt-3 inline-flex rounded-[12px] border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                >
                  Sign in
                </Link>
              ) : null}
              {isGuestSession ? (
                <Link
                  href="/menu?auth=signup"
                  className="mt-3 ml-2 inline-flex rounded-[12px] border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                >
                  Create account
                </Link>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Total orders
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-slate-950">
                    {summary.totalOrders}
                  </p>
                </div>
                <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Total spent
                  </p>
                  <p className="mt-1.5 text-xl font-semibold text-slate-950">
                    {formatPrice(summary.totalSpent)}
                  </p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="mt-6 rounded-[18px] border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
                  <h2 className="text-lg font-semibold text-slate-950">
                    No orders yet
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Place your first order and it will appear here.
                  </p>
                  <Link
                    href="/menu"
                    className="mt-4 inline-flex rounded-[12px] bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    Start ordering
                  </Link>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {orders.map((order) => {
                    const orderedAt = order.placedAt || order.createdAt;
                    const itemCount = order.items.reduce(
                      (sum, item) => sum + (item.quantity > 0 ? item.quantity : 0),
                      0,
                    );

                    return (
                      <article
                        key={order.orderId}
                        className="rounded-[20px] border border-stone-200 bg-white px-5 py-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                              Order number
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-slate-950">
                              {order.orderNumber || 'N/A'}
                            </h2>
                            <p className="mt-1 text-sm text-stone-600">
                              {formatDate(orderedAt)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusClass(order.status)}`}
                            >
                              {formatLabel(order.status)}
                            </span>
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusClass(order.paymentStatus)}`}
                            >
                              {formatLabel(order.paymentStatus)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
                          <p>
                            <span className="font-semibold text-slate-900">Type: </span>
                            {formatLabel(order.fulfillmentType || 'pickup')}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Items: </span>
                            {itemCount}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Total: </span>
                            {formatPrice(order.total)}
                          </p>
                        </div>

                        {order.fulfillmentType === 'delivery' && order.deliveryAddress ? (
                          <p className="mt-2 text-sm text-stone-600">
                            <span className="font-medium text-slate-900">Delivered to:</span>{' '}
                            {order.deliveryAddress}
                          </p>
                        ) : null}

                        {order.items.length ? (
                          <div className="mt-4 rounded-[14px] border border-stone-200 bg-stone-50 px-3.5 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                              Items
                            </p>
                            <ul className="space-y-1.5 text-sm text-stone-700">
                              {order.items.slice(0, 4).map((item) => (
                                <li
                                  key={item.orderItemId}
                                  className="flex items-center justify-between gap-3"
                                >
                                  <span className="truncate">
                                    {item.itemName} x{item.quantity}
                                  </span>
                                  <span className="whitespace-nowrap font-medium text-slate-900">
                                    {formatPrice(item.lineTotal)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            {order.items.length > 4 ? (
                              <p className="mt-2 text-xs text-stone-500">
                                +{order.items.length - 4} more items
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {order.orderNumber ? (
                          <div className="mt-4">
                            <Link
                              href={`/menu/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                              className="inline-flex rounded-[12px] border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-stone-50"
                            >
                              View receipt
                            </Link>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
