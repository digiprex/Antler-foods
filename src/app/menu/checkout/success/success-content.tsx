'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
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
  fulfillment_type: string;
  payment_status: string;
  payment_method: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  scheduled_for: string | null;
  tax_total: number | null;
  tip_total: number | null;
  discount_total: number | null;
  order_note: string | null;
  delivery_address: string | null;
  placed_at: string | null;
  restaurant_name: string;
  offer_applied: {
    type: 'coupon' | 'auto_offer';
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

export default function MenuCheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams?.get('orderNumber') || '';
  const restaurantNameParam = searchParams?.get('restaurant') || '';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(!!orderNumber);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
  const offerApplied = order?.offer_applied ?? null;
  const tip = order?.tip_total ?? null;
  const tax = order?.tax_total ?? null;
  const paymentMethod = order?.payment_method || searchParams?.get('payment') || '';
  const schedule = searchParams?.get('schedule') || '';
  const placedAt = formatDate(order?.placed_at ?? null);
  const orderNote = order?.order_note || '';

  const handleDownloadInvoice = () => {
    const doc = generateInvoicePDF({
      orderNumber,
      restaurantName,
      customerName,
      email,
      phone,
      fulfillmentLabel,
      address,
      paymentMethod,
      placedAt,
      items,
      subtotal,
      total,
      discount,
      tip,
      tax,
      offerApplied,
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

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          {/* Header */}
          <div className="border-b border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] px-6 py-8 sm:px-8 sm:py-10">
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
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-[15px]">
              {restaurantName
                ? `We have sent your order to ${restaurantName}. The restaurant will take it from here.`
                : 'We have received your order and the restaurant will take it from here.'}
            </p>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {/* Order info cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {orderNumber ? (
                <div className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Order number
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {orderNumber}
                  </p>
                </div>
              ) : null}

              {typeof total === 'number' ? (
                <div className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Total paid
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">
                    {formatPrice(total)}
                  </p>
                </div>
              ) : null}

              {fulfillmentLabel ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Fulfillment
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {fulfillmentLabel}
                  </p>
                </div>
              ) : null}

              {schedule ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Scheduled for
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-950">
                    {schedule}
                  </p>
                </div>
              ) : null}

              {paymentMethod ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Payment method
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-slate-950">
                    {paymentMethod}
                  </p>
                </div>
              ) : null}

              {address ? (
                <div className="rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Delivery address
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-950">
                    {address}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Order items */}
            {isLoading ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-6 text-center text-sm text-stone-500">
                Loading order details...
              </div>
            ) : items.length > 0 ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Items ordered
                </p>
                <div className="divide-y divide-stone-200">
                  {items.map((item) => (
                    <div
                      key={item.order_item_id}
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-950">
                            {item.item_name}
                            <span className="ml-2 text-stone-500">x{item.quantity}</span>
                          </p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-medium text-slate-950">
                          {formatPrice(item.line_total)}
                        </p>
                      </div>
                      <div className="mt-1 space-y-0.5 pl-0.5">
                        <p className="text-xs text-stone-500">
                          Base price: {formatPrice(item.base_item_price)} each
                        </p>
                        {item.selected_modifiers && item.selected_modifiers.length > 0 ? (
                          <div className="text-xs text-stone-500">
                            <span className="font-medium text-stone-600">Modifiers: </span>
                            {item.selected_modifiers.map((m, i) => (
                              <span key={m.name}>
                                {i > 0 ? ', ' : ''}
                                {m.name}
                                {m.price > 0 ? (
                                  <span className="text-stone-400"> +{formatPrice(m.price)}</span>
                                ) : null}
                              </span>
                            ))}
                            {item.modifier_total > 0 ? (
                              <span className="ml-1 text-stone-400">
                                (modifier total: {formatPrice(item.modifier_total)})
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {item.item_note ? (
                          <p className="text-xs text-stone-500">
                            Note: {item.item_note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Order breakdown */}
            {(typeof subtotal === 'number' || typeof tip === 'number' || typeof discount === 'number') ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Order breakdown
                </p>
                <div className="space-y-2 text-sm">
                  {typeof subtotal === 'number' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Subtotal</span>
                      <span className="font-medium text-slate-950">{formatPrice(subtotal)}</span>
                    </div>
                  ) : null}
                  {typeof discount === 'number' && discount > 0 ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700">Discount</span>
                        <span className="font-medium text-emerald-700">-{formatPrice(discount)}</span>
                      </div>
                      {offerApplied ? (
                        <p className="mt-0.5 text-xs text-emerald-600">
                          {offerApplied.type === 'coupon' ? 'Coupon' : 'Offer'}: {offerApplied.title}
                          {offerApplied.discountType === 'percent' ? ` (${offerApplied.value}% off)` : ''}
                          {offerApplied.code ? ` — code: ${offerApplied.code}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {typeof tip === 'number' && tip > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Tip</span>
                      <span className="font-medium text-slate-950">{formatPrice(tip)}</span>
                    </div>
                  ) : null}
                  {typeof tax === 'number' && tax > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Tax</span>
                      <span className="font-medium text-slate-950">{formatPrice(tax)}</span>
                    </div>
                  ) : null}
                  {typeof total === 'number' ? (
                    <div className="flex items-center justify-between border-t border-stone-200 pt-2">
                      <span className="font-semibold text-slate-950">Total</span>
                      <span className="font-semibold text-slate-950">{formatPrice(total)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Order note */}
            {orderNote ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Order note
                </p>
                <p className="text-sm text-slate-950">{orderNote}</p>
              </div>
            ) : null}

            {/* Contact details */}
            {(customerName || email || phone) ? (
              <div className="mt-5 rounded-[20px] border border-stone-200 bg-white px-5 py-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Contact details
                </p>
                <div className="space-y-1.5 text-sm text-slate-950">
                  {customerName ? (
                    <p className="font-medium">{customerName}</p>
                  ) : null}
                  {email ? (
                    <p className="text-stone-600">{email}</p>
                  ) : null}
                  {phone ? (
                    <p className="text-stone-600">{phone}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/menu"
                className="inline-flex h-12 items-center justify-center rounded-[16px] bg-black px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
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
      </div>
    </div>
  );
}
