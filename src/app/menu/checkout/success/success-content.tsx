'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { ProfileDropdown } from '@/features/restaurant-menu/components/profile-dropdown';
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf';

interface OrderItem {
  order_item_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  line_total: number;
  selected_modifiers: Array<{
    name: string;
    price: number;
  }> | null;
  base_item_price: number;
  modifier_total: number;
  item_note: string | null;
}

interface OrderData {
  order_id: string;
  order_number: string;
  created_at: string;
  status: string;
  sub_total: number;
  cart_total: number;
  coupon_used: string | null;
  gift_card_used: string | null;
  fulfillment_type: string;
  payment_status: string;
  payment_method: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  scheduled_for: string | null;
  service_fee: number | null;
  tip_total: number | null;
  discount_total: number | null;
  delivery_fee: number | null;
  order_note: string | null;
  delivery_address: string | null;
  placed_at: string | null;
  restaurant_id: string | null;
  restaurant_name: string;
  pickup_address: string | null;
  delivery_provider: string | null;
  delivery_provider_delivery_id: string | null;
  delivery_tracking_url: string | null;
  delivery_dispatch_status: string | null;
  delivery_dispatched_at: string | null;
  delivery_last_status_at: string | null;
  delivery_error: string | null;
  loyalty_discount: number | null;
  loyalty_points_redeemed: number | null;
  offer_applied: {
    type: 'auto_offer';
    code?: string | null;
    title: string;
    description?: string | null;
    discountType: 'percent' | 'amount';
    value: number;
    discountAmount: number;
  } | null;
}

function formatModifiers(
  modifiers: Array<{ name: string; price: number }> | null,
) {
  if (!modifiers || modifiers.length === 0) return null;
  return modifiers.map((m) => (
    <span key={m.name} className="text-stone-500">
      {m.name}
      {m.price > 0 ? ` (+${formatPrice(m.price)})` : ''}
    </span>
  ));
}

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatStatus(value: string | null | undefined) {
  if (!value) return 'Pending';
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function MenuCheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get('orderNumber') || '';
  const restaurantNameParam = searchParams?.get('restaurant') || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(!!orderNumber);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [navbarAuthSlot, setNavbarAuthSlot] = useState<HTMLElement | null>(null);
  const [loyaltyPointsBalance, setLoyaltyPointsBalance] = useState<number | null>(null);
  const [googleReviewBonusPoints, setGoogleReviewBonusPoints] = useState<number>(0);
  const [hasReviewed, setHasReviewed] = useState(false);

  const restaurantId = order?.restaurant_id || null;
  const {
    customerProfile,
    hasCustomerSession,
    isLoading: isAuthLoading,
    isLoggingOut,
    logout,
  } = useMenuCustomerAuth(restaurantId);

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
    if (!restaurantId || !hasCustomerSession) return;
    fetch(`/api/menu-orders/loyalty-balance?restaurant_id=${encodeURIComponent(restaurantId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) {
          if (data.data?.enabled) {
            setLoyaltyPointsBalance(data.data.points_balance ?? 0);
            setGoogleReviewBonusPoints(data.data.google_review_bonus_points ?? 0);
          }
          setHasReviewed(!!data.data?.has_reviewed);
        }
      })
      .catch(() => {});
  }, [restaurantId, hasCustomerSession]);

  useEffect(() => {
    if (!orderNumber) return;

    fetch(`/api/menu-orders/order-details?orderNumber=${encodeURIComponent(orderNumber)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        if (data.items) setItems(data.items);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [orderNumber]);

  const restaurantName = order?.restaurant_name || restaurantNameParam;
  const customerName = order
    ? [order.contact_first_name, order.contact_last_name].filter(Boolean).join(' ')
    : searchParams?.get('name') || '';
  const email = order?.contact_email || searchParams?.get('email') || '';
  const phone = order?.contact_phone || searchParams?.get('phone') || '';
  const fulfillmentLabel =
    (order?.fulfillment_type || searchParams?.get('mode')) === 'delivery'
      ? 'Delivery'
      : 'Pickup';
  const address = order?.delivery_address || searchParams?.get('address') || '';
  const subtotal = order?.sub_total ?? null;
  const total = order?.cart_total ?? null;
  const discount = order?.discount_total ?? null;
  const deliveryFee = order?.delivery_fee ?? null;
  const offerApplied = order?.offer_applied ?? null;
  const tip = order?.tip_total ?? null;
  const tax = order?.service_fee ?? null;
  const paymentMethod = order?.payment_method || searchParams?.get('payment') || '';
  const schedule = searchParams?.get('schedule') || '';
  const placedAt = formatDate(order?.placed_at ?? null);
  const orderNote = order?.order_note || '';
  const isDeliveryOrder = fulfillmentLabel === 'Delivery';
  const pickupAddress = order?.pickup_address || null;
  const deliveryTrackingUrl = order?.delivery_tracking_url || null;

  const handleDownloadInvoice = () => {
    const doc = generateInvoicePDF({
      orderNumber,
      restaurantName,
      customerName,
      email,
      phone,
      fulfillmentLabel,
      address,
      pickupAddress,
      paymentMethod,
      placedAt,
      items,
      subtotal,
      total,
      discount,
      loyaltyDiscount: order?.loyalty_discount ?? null,
      loyaltyPointsRedeemed: order?.loyalty_points_redeemed ?? null,
      deliveryFee,
      tip,
      tax,
      offerApplied,
      couponCode: order?.coupon_used || '',
      giftCardCode: order?.gift_card_used || '',
      orderNote,
    });
    doc.save(`invoice-${orderNumber}.pdf`);
  };

  const handleEmailInvoice = async () => {
    if (!orderNumber) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/menu-orders/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invoice sent to ${email || 'customer'}`);
      } else {
        toast.error(data.error || 'Failed to send invoice.');
      }
    } catch {
      toast.error('Failed to send invoice.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10"
        style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
      >
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Skeleton header */}
          <div className="rounded-[24px] border border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] px-6 py-8 shadow-sm sm:px-8 sm:py-10">
            <div className="h-14 w-14 animate-pulse rounded-full bg-stone-200" />
            <div className="mt-6 h-3 w-28 animate-pulse rounded bg-stone-200" />
            <div className="mt-4 h-9 w-72 animate-pulse rounded-lg bg-stone-200 sm:w-96" />
            <div className="mt-4 h-4 w-80 animate-pulse rounded bg-stone-100 sm:w-[28rem]" />
          </div>

          <div className="px-1 sm:px-2">
            {/* Skeleton info cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                  <div className="h-2.5 w-20 animate-pulse rounded bg-stone-200" />
                  <div className="mt-3 h-6 w-32 animate-pulse rounded bg-stone-200" />
                </div>
              ))}
            </div>

            {/* Skeleton items */}
            <div className="mt-5 rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
              <div className="mb-4 h-2.5 w-24 animate-pulse rounded bg-stone-200" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
                      <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
                    </div>
                    <div className="h-4 w-14 animate-pulse rounded bg-stone-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton breakdown */}
            <div className="mt-5 rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
              <div className="mb-4 h-2.5 w-28 animate-pulse rounded bg-stone-200" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3.5 w-16 animate-pulse rounded bg-stone-200" />
                    <div className="h-3.5 w-14 animate-pulse rounded bg-stone-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="h-12 w-36 animate-pulse rounded-[16px] bg-stone-200" />
              <div className="h-12 w-44 animate-pulse rounded-[16px] bg-stone-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_38%,#ffffff_78%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10"
      style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
    >
      <div className="mx-auto max-w-5xl space-y-5">
          {/* Header */}
          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-8 shadow-sm sm:px-8 sm:py-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 shadow-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>

            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Order confirmed
            </p>
            <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-slate-950 sm:text-[2.4rem]">
              Thanks, your order is in.
            </h1>
            {(customerName || email || phone) ? (
              <div className="mt-4 w-full rounded-[14px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {customerName ? <p className="font-semibold text-slate-950">{customerName}</p> : null}
                {email ? <p>{email}</p> : null}
                {phone ? <p>{phone}</p> : null}
              </div>
            ) : null}
          </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-[15px]">
              {isDeliveryOrder
                ? restaurantName
                  ? `We have sent your order to ${restaurantName}. Delivery details will be shared by email shortly.`
                  : 'We have received your delivery order. Delivery details will be shared by email shortly.'
                : restaurantName
                  ? `We have sent your order to ${restaurantName}. The restaurant will take it from here.`
                  : 'We have received your order and the restaurant will take it from here.'}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                Status: {formatStatus(order?.status)}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                Payment: {formatStatus(order?.payment_status)}
              </span>
              {order?.delivery_dispatch_status ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Delivery: {formatStatus(order.delivery_dispatch_status)}
                </span>
              ) : null}
            </div>
          <div className="px-1 py-1 sm:px-2">
            {/* Order info */}
            <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
              {/* Top row: order number + total */}
              <div className="flex items-stretch divide-x divide-stone-200 border-b border-stone-200">
                {orderNumber ? (
                  <div className="flex-1 px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                      Order number
                    </p>
                    <p className="mt-1.5 text-sm font-bold tracking-tight text-slate-950 sm:text-base">
                      {orderNumber}
                    </p>
                  </div>
                ) : null}
                {typeof total === 'number' ? (
                  <div className="flex-1 px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                      Total paid
                    </p>
                    <p className="mt-1.5 text-sm font-bold tracking-tight text-slate-950 sm:text-base">
                      {formatPrice(total)}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Detail rows */}
              <div className="divide-y divide-stone-100">
                {fulfillmentLabel ? (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-stone-500">Fulfillment</span>
                    <span className="text-sm font-semibold text-slate-950">{fulfillmentLabel}</span>
                  </div>
                ) : null}

                {schedule ? (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-stone-500">Scheduled for</span>
                    <span className="text-sm font-semibold text-slate-950">{schedule}</span>
                  </div>
                ) : null}

                {paymentMethod ? (
                  <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-stone-500">Payment</span>
                    <span className="text-sm font-semibold capitalize text-slate-950">{paymentMethod}</span>
                  </div>
                ) : null}

                {pickupAddress ? (
                  <div className="px-5 py-3">
                    <p className="text-sm text-stone-500">Pickup from</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-950">{pickupAddress}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Delivery details */}
            {isDeliveryOrder ? (
              <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Delivery Details</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {address ? (
                    <div className="flex items-start gap-3 px-5 py-3">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      <div>
                        <p className="text-xs text-slate-500">Delivery address</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">{address}</p>
                      </div>
                    </div>
                  ) : null}
                  {order?.delivery_provider ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Provider</span>
                      <span className="text-sm font-semibold capitalize text-slate-950">{order.delivery_provider.replace(/_/g, ' ')}</span>
                    </div>
                  ) : null}
                  {order?.delivery_dispatch_status ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Dispatch status</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        order.delivery_dispatch_status === 'delivered' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : order.delivery_dispatch_status === 'failed' || order.delivery_dispatch_status === 'cancelled' ? 'border-red-200 bg-red-50 text-red-700'
                        : order.delivery_dispatch_status === 'pickup' || order.delivery_dispatch_status === 'dropoff' ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          order.delivery_dispatch_status === 'delivered' ? 'bg-emerald-500'
                          : order.delivery_dispatch_status === 'failed' || order.delivery_dispatch_status === 'cancelled' ? 'bg-red-500'
                          : order.delivery_dispatch_status === 'pickup' || order.delivery_dispatch_status === 'dropoff' ? 'bg-blue-500'
                          : 'bg-amber-500'
                        }`} />
                        {formatStatus(order.delivery_dispatch_status)}
                      </span>
                    </div>
                  ) : null}
                  {order?.delivery_provider_delivery_id ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Delivery ID</span>
                      <span className="font-mono text-xs text-slate-600">{order.delivery_provider_delivery_id}</span>
                    </div>
                  ) : null}
                  {order?.delivery_dispatched_at ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Dispatched at</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(order.delivery_dispatched_at)}</span>
                    </div>
                  ) : null}
                  {order?.delivery_last_status_at ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Last update</span>
                      <span className="text-sm font-medium text-slate-900">{formatDate(order.delivery_last_status_at)}</span>
                    </div>
                  ) : null}
                  {typeof deliveryFee === 'number' && deliveryFee > 0 ? (
                    <div className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-slate-500">Delivery fee</span>
                      <span className="text-sm font-semibold text-slate-950">{formatPrice(deliveryFee)}</span>
                    </div>
                  ) : null}
                  {order?.delivery_error ? (
                    <div className="px-5 py-3">
                      <div className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs font-medium text-red-700">Delivery issue</p>
                        <p className="mt-0.5 text-xs text-red-600">{order.delivery_error}</p>
                      </div>
                    </div>
                  ) : null}
                  {deliveryTrackingUrl ? (
                    <div className="px-5 py-3">
                      <a
                        href={deliveryTrackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-[12px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        Track delivery
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Order items */}
            {items.length > 0 ? (
              <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/60">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  <span className="px-5 pt-4 inline-block">Items ordered</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-y border-slate-200 bg-white/80">
                      <tr>
                        <th className="px-5 py-2.5 text-left font-semibold text-slate-700">Item</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-slate-700">Qty</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-slate-700">Unit</th>
                        <th className="px-5 py-2.5 text-right font-semibold text-slate-700">Line total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/80">
                      {items.map((item) => {
                        const qty = item.quantity > 0 ? item.quantity : 1;
                        const unit = item.line_total / qty;
                        return (
                          <tr key={item.order_item_id} className="align-top">
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-950">{item.item_name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Base: {formatPrice(item.base_item_price)} each
                              </p>
                              {item.selected_modifiers?.length ? (
                                <div className="mt-1 space-y-0.5">
                                  {item.selected_modifiers.map((modifier, index) => (
                                    <p key={`${item.order_item_id}-m-${index}`} className="text-xs text-slate-500">
                                      + {modifier.name}
                                      {modifier.price > 0 ? ` (${formatPrice(modifier.price)})` : ''}
                                    </p>
                                  ))}
                                  {item.modifier_total > 0 ? (
                                    <p className="text-xs text-slate-500">
                                      Modifier total: {formatPrice(item.modifier_total)}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                              {item.item_note ? (
                                <p className="mt-1 text-xs italic text-slate-500">Note: {item.item_note}</p>
                              ) : null}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">{qty}</td>
                            <td className="px-5 py-3 text-right text-slate-600">{formatPrice(unit)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-900">
                              {formatPrice(item.line_total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Order breakdown */}
            {(typeof subtotal === 'number' || typeof tip === 'number' || typeof discount === 'number') ? (
              <div className="mt-5 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/60">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  <span className="px-5 pt-4 inline-block">Order breakdown</span>
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-slate-200/80">
                  {typeof subtotal === 'number' ? (
                      <tr>
                        <td className="px-5 py-2.5 text-slate-600">Subtotal</td>
                        <td className="px-5 py-2.5 text-right font-medium text-slate-950">{formatPrice(subtotal)}</td>
                      </tr>
                  ) : null}
                  {typeof deliveryFee === 'number' && deliveryFee > 0 ? (
                      <tr>
                        <td className="px-5 py-2.5 text-slate-600">Delivery fee</td>
                        <td className="px-5 py-2.5 text-right font-medium text-slate-950">{formatPrice(deliveryFee)}</td>
                      </tr>
                  ) : null}
                  {typeof discount === 'number' && discount > 0 ? (() => {
                    const loyaltyAmt = typeof order?.loyalty_discount === 'number' ? order.loyalty_discount : 0;
                    const otherAmt = discount - loyaltyAmt;
                    const hasOther = otherAmt > 0.005;
                    const hasLoyalty = loyaltyAmt > 0.005;
                    return (
                      <>
                        {hasOther ? (
                          <tr>
                            <td className="px-5 py-2.5 align-top text-emerald-700">
                              <p>Discount</p>
                              {offerApplied ? (
                                <p className="mt-0.5 text-xs text-emerald-600">
                                  Offer: {offerApplied.title}
                                  {offerApplied.discountType === 'percent' ? ` (${offerApplied.value}% off)` : ''}
                                </p>
                              ) : null}
                              {order?.coupon_used ? (
                                <p className="mt-0.5 text-xs text-emerald-600">Coupon: {order.coupon_used}</p>
                              ) : null}
                              {order?.gift_card_used ? (
                                <p className="mt-0.5 text-xs text-emerald-600">Gift Card: {order.gift_card_used}</p>
                              ) : null}
                            </td>
                            <td className="px-5 py-2.5 text-right font-medium text-emerald-700">-{formatPrice(otherAmt)}</td>
                          </tr>
                        ) : null}
                        {hasLoyalty ? (
                          <tr>
                            <td className="px-5 py-2.5 align-top text-amber-700">
                              <p>Loyalty Discount</p>
                              {typeof order?.loyalty_points_redeemed === 'number' && order.loyalty_points_redeemed > 0 ? (
                                <p className="mt-0.5 text-xs text-amber-600">{order.loyalty_points_redeemed} points redeemed</p>
                              ) : null}
                            </td>
                            <td className="px-5 py-2.5 text-right font-medium text-amber-700">-{formatPrice(loyaltyAmt)}</td>
                          </tr>
                        ) : null}
                        {!hasOther && !hasLoyalty ? (
                          <tr>
                            <td className="px-5 py-2.5 text-emerald-700">Discount</td>
                            <td className="px-5 py-2.5 text-right font-medium text-emerald-700">-{formatPrice(discount)}</td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })() : null}
                  {typeof tip === 'number' && tip > 0 ? (
                      <tr>
                        <td className="px-5 py-2.5 text-slate-600">Tip</td>
                        <td className="px-5 py-2.5 text-right font-medium text-slate-950">{formatPrice(tip)}</td>
                      </tr>
                  ) : null}
                  {typeof tax === 'number' && tax > 0 ? (
                      <tr>
                        <td className="px-5 py-2.5 text-slate-600">Service Fee</td>
                        <td className="px-5 py-2.5 text-right font-medium text-slate-950">{formatPrice(tax)}</td>
                      </tr>
                  ) : null}
                  {typeof total === 'number' ? (
                      <tr className="bg-slate-900 text-white">
                        <td className="px-5 py-2.5 font-semibold">Total</td>
                        <td className="px-5 py-2.5 text-right font-semibold">{formatPrice(total)}</td>
                      </tr>
                  ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {orderNote ? (
              <div className="mt-5 rounded-[20px] border border-slate-200 bg-white px-5 py-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Order note
                </p>
                <div className="rounded-[14px] border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-sm leading-6 text-slate-800">{orderNote}</p>
                </div>
              </div>
            ) : null}

            {/* Feedback / Google Review CTA — hidden if customer already left a review */}
            {!hasReviewed && (
            <div className="mt-5 overflow-hidden rounded-[20px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40">
              <div className="px-5 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <svg className="h-5.5 w-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-950">
                      How was your experience?
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                      We&apos;d love to hear your feedback!
                      {googleReviewBonusPoints > 0 ? (
                        <> Leave a review and earn <span className="font-semibold text-amber-700">{googleReviewBonusPoints} bonus points</span> as a thank you.</>
                      ) : null}
                    </p>
                    {googleReviewBonusPoints > 0 ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        Leave a review and earn extra rewards
                      </div>
                    ) : null}
                    <div className="mt-4">
                      <Link
                        href="/feedback"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Leave feedback
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              >
                Back to menu
              </Link>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-stone-300 bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download invoice
                </button>
              ) : null}
              {email && orderNumber ? (
                <button
                  type="button"
                  onClick={handleEmailInvoice}
                  disabled={isSendingEmail}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border border-stone-300 bg-white px-6 text-sm font-semibold text-slate-950 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {isSendingEmail ? 'Sending...' : 'Email invoice'}
                </button>
              ) : null}
            </div>
          </div>
      </div>

      {navbarAuthSlot && !isAuthLoading && hasCustomerSession && customerProfile
        ? createPortal(
            <ProfileDropdown
              profile={customerProfile}
              isLoggingOut={isLoggingOut}
              loyaltyPoints={loyaltyPointsBalance}
              onLogout={handleLogout}
            />,
            navbarAuthSlot,
          )
        : null}
    </div>
  );
}


