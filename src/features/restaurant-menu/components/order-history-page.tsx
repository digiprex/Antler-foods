'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { ProfileDropdown } from '@/features/restaurant-menu/components/profile-dropdown';
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf';

interface OrderHistoryItem {
  orderItemId: string;
  itemName: string;
  quantity: number;
  lineTotal: number;
  selectedModifiers?: unknown;
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

type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const ACTIVE_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'processing',
]);

const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
const CANCELLED_STATUSES = new Set(['cancelled', 'failed', 'refunded']);

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

function statusIcon(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'completed' || normalized === 'delivered' || normalized === 'ready') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (normalized === 'cancelled' || normalized === 'failed' || normalized === 'refunded') {
    return (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  if (normalized === 'preparing' || normalized === 'confirmed' || normalized === 'processing') {
    return (
      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }

  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
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

function paymentStatusDot(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === 'paid' || normalized === 'completed') {
    return 'bg-emerald-500';
  }

  if (normalized === 'failed' || normalized === 'refunded') {
    return 'bg-red-500';
  }

  if (normalized === 'pending' || normalized === 'processing') {
    return 'bg-amber-500';
  }

  return 'bg-stone-400';
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatModifierLines(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const name = typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : typeof record.modifierGroupName === 'string' && record.modifierGroupName.trim()
          ? record.modifierGroupName.trim()
          : null;

      if (!name) {
        return null;
      }

      const price =
        typeof record.price === 'number'
          ? record.price
          : typeof record.price === 'string' && record.price.trim()
            ? Number.parseFloat(record.price)
            : 0;

      const hasPrice = Number.isFinite(price) && price > 0;
      return hasPrice ? `${name} (+${formatPrice(price)})` : name;
    })
    .filter((line): line is string => Boolean(line));
}

function orderTimestamp(order: OrderHistoryOrder) {
  const primary = order.placedAt || order.createdAt;
  if (!primary) {
    return 0;
  }

  const parsed = new Date(primary);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function orderMatchesFilter(order: OrderHistoryOrder, filter: OrderFilter) {
  const normalized = order.status.trim().toLowerCase();

  if (filter === 'active') {
    return ACTIVE_STATUSES.has(normalized);
  }

  if (filter === 'completed') {
    return COMPLETED_STATUSES.has(normalized);
  }

  if (filter === 'cancelled') {
    return CANCELLED_STATUSES.has(normalized);
  }

  return true;
}

function SkeletonLoader() {
  return (
    <div className="mt-8 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-[22px] border border-stone-200 bg-white p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
              <div className="h-6 w-32 animate-pulse rounded-lg bg-stone-200" />
              <div className="h-3.5 w-44 animate-pulse rounded bg-stone-100" />
            </div>
            <div className="h-7 w-24 animate-pulse rounded-full bg-stone-200" />
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
            {[...Array(3)].map((__, j) => (
              <div key={j} className="h-4 w-28 animate-pulse rounded bg-stone-100" />
            ))}
          </div>
          <div className="mt-5 rounded-[16px] border border-stone-100 bg-stone-50 p-4">
            <div className="space-y-3">
              {[...Array(2)].map((__, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="h-3.5 w-36 animate-pulse rounded bg-stone-200" />
                  <div className="h-3.5 w-14 animate-pulse rounded bg-stone-200" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-28 animate-pulse rounded-[12px] bg-stone-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrderHistoryPage({
  restaurantId,
  restaurantName,
}: OrderHistoryPageProps) {
  const router = useRouter();
  const {
    customerProfile,
    hasCustomerSession,
    isLoading: isAuthLoading,
    isLoggingOut,
    logout,
  } = useMenuCustomerAuth(restaurantId);
  const [navbarAuthSlot, setNavbarAuthSlot] = useState<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderHistoryOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuestSession, setIsGuestSession] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest');

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  useEffect(() => {
    const syncNavbarAuthSlot = () => {
      setNavbarAuthSlot(document.getElementById('menu-navbar-auth-slot'));
    };

    syncNavbarAuthSlot();

    const observer = new MutationObserver(() => {
      syncNavbarAuthSlot();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Hide navbar sign-in/sign-up links when customer is logged in
  useEffect(() => {
    const authLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href="/login"], a[href="/signup"]'),
    );

    authLinks.forEach((link) => {
      if (!('menuAuthOriginalDisplay' in link.dataset)) {
        link.dataset.menuAuthOriginalDisplay = link.style.display || '';
      }

      link.style.display = hasCustomerSession ? 'none' : link.dataset.menuAuthOriginalDisplay || '';
    });

    return () => {
      authLinks.forEach((link) => {
        link.style.display = link.dataset.menuAuthOriginalDisplay || '';
        delete link.dataset.menuAuthOriginalDisplay;
      });
    };
  }, [hasCustomerSession]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!hasCustomerSession) {
      router.replace('/menu');
    }
  }, [hasCustomerSession, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !hasCustomerSession) {
      return;
    }

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
  }, [hasCustomerSession, isAuthLoading, restaurantId]);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const completedCount = orders.filter((order) =>
      COMPLETED_STATUSES.has(order.status.trim().toLowerCase()),
    ).length;
    return { totalOrders, totalSpent, completedCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = orders
      .filter((order) => orderMatchesFilter(order, activeFilter))
      .filter((order) => {
        if (!query) {
          return true;
        }

        const orderNumber = order.orderNumber.toLowerCase();
        const status = order.status.toLowerCase();
        const paymentStatus = order.paymentStatus.toLowerCase();
        const itemNames = order.items.map((item) => item.itemName.toLowerCase()).join(' ');

        return (
          orderNumber.includes(query) ||
          status.includes(query) ||
          paymentStatus.includes(query) ||
          itemNames.includes(query)
        );
      })
      .sort((a, b) => {
        const diff = orderTimestamp(b) - orderTimestamp(a);
        return sortDirection === 'newest' ? diff : -diff;
      });

    return result;
  }, [orders, activeFilter, searchQuery, sortDirection]);

  if (!isAuthLoading && !hasCustomerSession) {
    return null;
  }

  const handleDownloadInvoice = (order: OrderHistoryOrder) => {
    const invoiceItems = order.items.map((item) => {
      const quantity = item.quantity > 0 ? item.quantity : 1;
      const basePrice = quantity > 0 ? item.lineTotal / quantity : item.lineTotal;

      return {
        item_name: item.itemName,
        item_price: basePrice,
        quantity,
        line_total: item.lineTotal,
        selected_modifiers: null,
        base_item_price: basePrice,
        modifier_total: 0,
        item_note: null,
      };
    });

    const doc = generateInvoicePDF({
      orderNumber: order.orderNumber || order.orderId,
      restaurantName,
      customerName: customerProfile?.name || 'Customer',
      email: customerProfile?.email || '',
      phone: customerProfile?.phone || '',
      fulfillmentLabel: formatLabel(order.fulfillmentType || 'pickup'),
      address: order.deliveryAddress || '',
      paymentMethod: formatLabel(order.paymentStatus || 'pending'),
      placedAt: formatDate(order.placedAt || order.createdAt),
      items: invoiceItems,
      subtotal: order.subtotal,
      total: order.total,
      discount: order.discountTotal,
      tip: order.tipTotal,
      tax: order.taxTotal,
      offerApplied: null,
      couponCode: '',
      giftCardCode: '',
      orderNote: '',
    });

    doc.save(`invoice-${order.orderNumber || order.orderId}.pdf`);
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_32%,#ffffff_74%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10"
      style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-5">
          <Link
            href="/menu"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_4px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-950 hover:shadow-[0_10px_26px_rgba(15,23,42,0.1)]"
          >
            <svg className="h-4 w-4 transition group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to menu
          </Link>
        </div>

        <div>
          {/* Header */}
          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {restaurantName}
                </p>
                <h1 className="mt-2 text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.35rem]">
                  Order history
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Review your recent orders, totals, and statuses.
                </p>
              </div>

              {!isLoading && !error && orders.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Orders
                    </p>
                    <p className="mt-0.5 text-lg font-bold text-slate-950">
                      {summary.totalOrders}
                    </p>
                  </div>
                  <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-2.5 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Spent
                    </p>
                    <p className="mt-0.5 text-lg font-bold text-slate-950">
                      {formatPrice(summary.totalSpent)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Content */}
          <div className="mt-5 px-1 sm:px-2 lg:px-0">
            {isLoading ? (
              <SkeletonLoader />
            ) : error ? (
              <div className="rounded-[20px] border border-red-200 bg-red-50/60 px-6 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-red-800">{error}</p>
                {!hasCustomerSession && !isAuthenticated ? (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Link
                      href="/menu?auth=login"
                      className="inline-flex rounded-[12px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Sign in
                    </Link>
                    {isGuestSession ? (
                      <Link
                        href="/menu?auth=signup"
                        className="inline-flex rounded-[12px] border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-stone-50"
                      >
                        Create account
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-stone-300 bg-stone-50/50 px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
                  <svg className="h-7 w-7 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">
                  No orders yet
                </h2>
                <p className="mt-1.5 text-sm text-stone-500">
                  Your orders will appear here once you place one.
                </p>
                <Link
                  href="/menu"
                  className="mt-5 inline-flex rounded-[12px] bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
                >
                  Browse menu
                </Link>
              </div>
            ) : (
              <div>
                <div className="mb-6 rounded-[18px] border border-slate-200 bg-slate-50/70 p-3.5 sm:p-4">
                  <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ['all', `All (${summary.totalOrders})`],
                        ['active', 'In progress'],
                        ['completed', `Completed (${summary.completedCount})`],
                        ['cancelled', 'Cancelled'],
                      ] as Array<[OrderFilter, string]>
                    ).map(([filter, label]) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          activeFilter === filter
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search order #, status, or item name..."
                        className="h-11 w-full rounded-[14px] border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-slate-900/30"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSortDirection((current) =>
                          current === 'newest' ? 'oldest' : 'newest',
                        )
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {sortDirection === 'newest' ? 'Newest first' : 'Oldest first'}
                    </button>
                  </div>
                </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-stone-300 bg-stone-50/60 px-5 py-10 text-center">
                    <p className="text-base font-semibold text-slate-900">No matching orders</p>
                    <p className="mt-1.5 text-sm text-stone-500">
                      Try a different filter or search term.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFilter('all');
                        setSearchQuery('');
                      }}
                      className="mt-4 inline-flex rounded-[12px] border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-stone-50"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                  const orderedAt = order.placedAt || order.createdAt;
                  const itemCount = order.items.reduce(
                    (sum, item) => sum + (item.quantity > 0 ? item.quantity : 0),
                    0,
                  );
                  const isExpanded = expandedOrder === order.orderId;

                  return (
                    <article
                      key={order.orderId}
                      className="group rounded-[22px] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)]"
                    >
                      {/* Order header — clickable to expand */}
                      <button
                        type="button"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.orderId)}
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                              #{order.orderNumber || 'N/A'}
                            </h2>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] ${statusClass(order.status)}`}
                            >
                              {statusIcon(order.status)}
                              {formatLabel(order.status)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
                            <span>{formatDate(orderedAt)}</span>
                            <span className="hidden sm:inline">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${paymentStatusDot(order.paymentStatus)}`} />
                              {formatLabel(order.paymentStatus)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span className="text-base font-bold text-slate-950 sm:text-lg">
                            {formatPrice(order.total)}
                          </span>
                          <svg
                            className={`h-5 w-5 text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded ? (
                        <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                          {/* Order details table */}
                          <div className="overflow-x-auto rounded-[14px] border border-slate-200">
                            <table className="min-w-full text-sm">
                              <tbody className="divide-y divide-slate-200">
                                <tr className="bg-slate-50/70">
                                  <td className="px-4 py-2.5 font-semibold text-slate-700">Fulfillment</td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    {formatLabel(order.fulfillmentType || 'pickup')}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2.5 font-semibold text-slate-700">Payment status</td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    {formatLabel(order.paymentStatus || 'pending')}
                                  </td>
                                </tr>
                                {order.scheduledFor ? (
                                  <tr className="bg-slate-50/70">
                                    <td className="px-4 py-2.5 font-semibold text-slate-700">Scheduled for</td>
                                    <td className="px-4 py-2.5 text-slate-600">{formatDate(order.scheduledFor)}</td>
                                  </tr>
                                ) : null}
                                {order.fulfillmentType === 'delivery' && order.deliveryAddress ? (
                                  <tr>
                                    <td className="px-4 py-2.5 font-semibold text-slate-700">Delivery address</td>
                                    <td className="px-4 py-2.5 text-slate-600">{order.deliveryAddress}</td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>

                          {/* Items table */}
                          {order.items.length > 0 ? (
                            <div className="mt-4 overflow-x-auto rounded-[16px] border border-slate-200 bg-slate-50/70">
                              <table className="min-w-full text-sm">
                                <thead className="border-b border-slate-200 bg-white/80">
                                  <tr>
                                    <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Item</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Qty</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Unit</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-slate-700">Line total</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/70">
                                  {order.items.map((item) => {
                                    const quantity = item.quantity > 0 ? item.quantity : 1;
                                    const unitPrice = item.lineTotal / quantity;
                                    const modifierLines = formatModifierLines(item.selectedModifiers);

                                    return (
                                      <tr
                                    key={item.orderItemId}
                                    className="bg-white/20"
                                  >
                                        <td className="px-4 py-2.5">
                                          <p className="font-medium text-slate-900">{item.itemName}</p>
                                          {modifierLines.length > 0 ? (
                                            <div className="mt-1.5 space-y-1">
                                              {modifierLines.map((modifier, index) => (
                                                <p
                                                  key={`${item.orderItemId}-modifier-${index}`}
                                                  className="text-xs text-slate-500"
                                                >
                                                  + {modifier}
                                                </p>
                                              ))}
                                            </div>
                                          ) : null}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">{quantity}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-600">{formatPrice(unitPrice)}</td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                                          {formatPrice(item.lineTotal)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : null}

                          {/* Totals table */}
                          {(order.subtotal > 0 || order.discountTotal > 0 || order.tipTotal > 0 || order.taxTotal > 0) ? (
                            <div className="mt-4 overflow-x-auto rounded-[14px] border border-slate-200">
                              <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-slate-200">
                              {order.subtotal > 0 ? (
                                    <tr className="bg-slate-50/70 text-slate-600">
                                      <td className="px-4 py-2.5">Subtotal</td>
                                      <td className="px-4 py-2.5 text-right">{formatPrice(order.subtotal)}</td>
                                    </tr>
                              ) : null}
                              {order.discountTotal > 0 ? (
                                    <tr className="text-emerald-600">
                                      <td className="px-4 py-2.5">Discount</td>
                                      <td className="px-4 py-2.5 text-right">-{formatPrice(order.discountTotal)}</td>
                                    </tr>
                              ) : null}
                              {order.taxTotal > 0 ? (
                                    <tr className="bg-slate-50/70 text-slate-600">
                                      <td className="px-4 py-2.5">Tax</td>
                                      <td className="px-4 py-2.5 text-right">{formatPrice(order.taxTotal)}</td>
                                    </tr>
                              ) : null}
                              {order.tipTotal > 0 ? (
                                    <tr className="text-slate-600">
                                      <td className="px-4 py-2.5">Tip</td>
                                      <td className="px-4 py-2.5 text-right">{formatPrice(order.tipTotal)}</td>
                                    </tr>
                              ) : null}
                                  <tr className="bg-slate-900 text-white">
                                    <td className="px-4 py-2.5 font-semibold">Total</td>
                                    <td className="px-4 py-2.5 text-right font-semibold">{formatPrice(order.total)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : null}

                          {/* Actions */}
                          <div className="mt-5 flex flex-wrap items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoice(order)}
                              className="inline-flex items-center gap-2 rounded-[12px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12-4-4m4 4 4-4M4 20h16" />
                              </svg>
                              Download invoice
                            </button>
                            {order.orderNumber ? (
                              <Link
                                href={`/menu/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                                className="inline-flex items-center gap-2 rounded-[12px] border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-stone-300 hover:shadow-md"
                              >
                                <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View receipt
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {navbarAuthSlot && !isAuthLoading && hasCustomerSession && customerProfile
        ? createPortal(
            <ProfileDropdown
              profile={customerProfile}
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
            />,
            navbarAuthSlot,
          )
        : null}
    </div>
  );
}
