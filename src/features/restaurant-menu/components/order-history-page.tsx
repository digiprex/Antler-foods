'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
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
  deliveryFee: number | null;
  total: number;
  placedAt: string | null;
  createdAt: string | null;
  scheduledFor: string | null;
  deliveryAddress: string | null;
  deliveryTrackingUrl: string | null;
  deliveryDispatchStatus: string | null;
  pickupAddress: string | null;
  orderNote: string | null;
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
  'preparing',
  'ready',
  'out_for_delivery',
  'processing',
]);

const COMPLETED_STATUSES = new Set(['delivered']);
const CANCELLED_STATUSES = new Set(['cancelled', 'failed', 'refunded']);

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatShortDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(status: string) {
  const n = status.trim().toLowerCase();
  if (n === 'delivered' || n === 'ready') return { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' };
  if (n === 'cancelled' || n === 'failed' || n === 'refunded') return { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
  if (n === 'preparing' || n === 'processing') return { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' };
  if (n === 'courier_assigned') return { bg: 'bg-indigo-500', text: 'text-indigo-700', light: 'bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' };
  if (n === 'out_for_delivery') return { bg: 'bg-violet-500', text: 'text-violet-700', light: 'bg-violet-50 border-violet-200', dot: 'bg-violet-500' };
  if (n === 'pending') return { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' };
  return { bg: 'bg-slate-400', text: 'text-slate-700', light: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' };
}

function paymentBadge(status: string) {
  const n = status.trim().toLowerCase();
  if (n === 'paid') return { dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (n === 'failed' || n === 'refunded') return { dot: 'bg-red-500', cls: 'bg-red-50 text-red-700 border-red-200' };
  if (n === 'pending' || n === 'processing') return { dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 border-slate-200' };
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').split(' ').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function formatModifierLines(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const r = entry as Record<string, unknown>;
      const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim()
        : typeof r.modifierGroupName === 'string' && r.modifierGroupName.trim() ? r.modifierGroupName.trim() : null;
      if (!name) return null;
      const price = typeof r.price === 'number' ? r.price : typeof r.price === 'string' && r.price.trim() ? Number.parseFloat(r.price) : 0;
      return Number.isFinite(price) && price > 0 ? `${name} (+${formatPrice(price)})` : name;
    })
    .filter((line): line is string => Boolean(line));
}

function orderTimestamp(order: OrderHistoryOrder) {
  const primary = order.placedAt || order.createdAt;
  if (!primary) return 0;
  const parsed = new Date(primary);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function orderMatchesFilter(order: OrderHistoryOrder, filter: OrderFilter) {
  const n = order.status.trim().toLowerCase();
  if (filter === 'active') return ACTIVE_STATUSES.has(n);
  if (filter === 'completed') return COMPLETED_STATUSES.has(n);
  if (filter === 'cancelled') return CANCELLED_STATUSES.has(n);
  return true;
}

function canCancelOrder(order: OrderHistoryOrder) {
  const status = order.status.trim().toLowerCase();
  if (order.fulfillmentType === 'pickup') {
    return !new Set(['ready', 'delivered', 'cancelled', 'refunded']).has(status);
  }
  return !new Set(['delivered', 'cancelled', 'refunded']).has(status);
}

function canRefundOrder(order: OrderHistoryOrder) {
  const status = order.status.trim().toLowerCase();
  return status !== 'refunded';
}

/* ─── Order Detail Modal ──────────────────────────────────── */
function OrderDetailModal({
  order,
  restaurantName,
  customerProfile,
  onClose,
  onDownloadInvoice,
  onCancelOrder,
  isCancelling,
  onRefundOrder,
  isRefunding,
}: {
  order: OrderHistoryOrder;
  restaurantName: string;
  customerProfile: { name?: string; email?: string; phone?: string | null } | null;
  onClose: () => void;
  onDownloadInvoice: (order: OrderHistoryOrder) => void;
  onCancelOrder: (order: OrderHistoryOrder) => void;
  isCancelling: boolean;
  onRefundOrder: (order: OrderHistoryOrder) => void;
  isRefunding: boolean;
}) {
  const sc = statusColor(order.status);
  const pb = paymentBadge(order.paymentStatus);
  const isDelivery = order.fulfillmentType === 'delivery';
  const orderedAt = order.placedAt || order.createdAt;
  const itemCount = order.items.reduce((s, i) => s + (i.quantity > 0 ? i.quantity : 1), 0);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-slate-950">Order #{order.orderNumber || 'N/A'}</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${sc.light} ${sc.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {formatLabel(order.status)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{formatDate(orderedAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fulfillment</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatLabel(order.fulfillmentType || 'pickup')}</p>
            </div>
            <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pb.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${pb.dot}`} />
                  {formatLabel(order.paymentStatus || 'pending')}
                </span>
              </div>
            </div>
            <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Items</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
            </div>
            {order.scheduledFor ? (
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Scheduled</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatShortDate(order.scheduledFor)}</p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Order Date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatShortDate(orderedAt)}</p>
              </div>
            )}
          </div>

          {/* Order status timeline */}
          {isDelivery ? (() => {
            const steps = [
              { key: 'confirmed', label: 'Order Confirmed' },
              { key: 'preparing', label: 'Preparing' },
              { key: 'courier_assigned', label: 'Courier Assigned' },
              { key: 'out_for_delivery', label: 'Out for Delivery' },
              { key: 'delivered', label: 'Delivered' },
            ];
            const statusOrder = ['pending', 'confirmed', 'preparing', 'courier_assigned', 'out_for_delivery', 'delivered'];
            const orderStatus = order.status?.toLowerCase() || 'pending';
            const dispatchStatus = order.deliveryDispatchStatus?.toLowerCase() || null;

            const getActiveIndex = () => {
              const orderIdx = statusOrder.indexOf(orderStatus);
              const dispatchIdx = dispatchStatus === 'courier_assigned' ? statusOrder.indexOf('courier_assigned') :
                dispatchStatus === 'picked_up' ? statusOrder.indexOf('out_for_delivery') :
                dispatchStatus === 'delivered' ? statusOrder.indexOf('delivered') : -1;
              return Math.max(orderIdx, dispatchIdx);
            };
            const activeIndex = getActiveIndex();

            const isCancelled = orderStatus === 'cancelled' || orderStatus === 'failed' || dispatchStatus === 'cancelled';
            if (isCancelled) return null;

            return (
              <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50/60 p-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Delivery Status</p>
                <div className="flex items-center gap-1">
                  {steps.map((step, idx) => {
                    const stepIdx = statusOrder.indexOf(step.key);
                    const isCompleted = stepIdx <= activeIndex;
                    const isCurrent = stepIdx === activeIndex;
                    return (
                      <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
                        <div className="flex w-full items-center">
                          {idx > 0 && (
                            <div className={`h-0.5 flex-1 rounded-full transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                          )}
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isCurrent ? 'bg-emerald-500 ring-4 ring-emerald-100' : isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}>
                            {isCompleted ? (
                              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            )}
                          </div>
                          {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full transition-colors ${stepIdx < activeIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        <span className={`text-center text-[9px] font-medium leading-tight ${isCurrent ? 'text-emerald-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : null}

          {/* Delivery address */}
          {isDelivery && order.deliveryAddress ? (
            <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Delivery Address</p>
              <div className="mt-1.5 flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm text-slate-700">{order.deliveryAddress}</p>
              </div>
            </div>
          ) : null}

          {/* Pickup address */}
          {!isDelivery && order.pickupAddress ? (
            <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pickup Address</p>
              <div className="mt-1.5 flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-sm text-slate-700">{order.pickupAddress}</p>
              </div>
            </div>
          ) : null}

          {/* Delivery tracking */}
          {order.deliveryTrackingUrl ? (
            <div className="mt-4">
              <a
                href={order.deliveryTrackingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Track Delivery
              </a>
            </div>
          ) : null}

          {/* Order note */}
          {order.orderNote ? (
            <div className="mt-4 rounded-[14px] border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Order Note</p>
              <p className="mt-1 text-sm text-slate-700">{order.orderNote}</p>
            </div>
          ) : null}

          {/* Items list */}
          {order.items.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Order Items</p>
              <div className="overflow-hidden rounded-[14px] border border-slate-200">
                <div className="divide-y divide-slate-100">
                  {order.items.map((item) => {
                    const quantity = item.quantity > 0 ? item.quantity : 1;
                    const unitPrice = item.lineTotal / quantity;
                    const modifierLines = formatModifierLines(item.selectedModifiers);
                    return (
                      <div key={item.orderItemId} className="flex items-start justify-between gap-3 bg-white px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-slate-900">{item.itemName}</span>
                            {quantity > 1 ? (
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">x{quantity}</span>
                            ) : null}
                          </div>
                          {modifierLines.length > 0 ? (
                            <div className="mt-0.5">
                              {modifierLines.map((mod, idx) => (
                                <p key={`${item.orderItemId}-m-${idx}`} className="text-[11px] text-slate-400">+ {mod}</p>
                              ))}
                            </div>
                          ) : null}
                          {quantity > 1 ? (
                            <p className="mt-0.5 text-[11px] text-slate-400">{formatPrice(unitPrice)} each</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">{formatPrice(item.lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Totals */}
          <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200 bg-slate-50/70">
            <div className="space-y-2 px-4 py-3 text-sm">
              {order.subtotal > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
              ) : null}
              {order.deliveryFee && order.deliveryFee > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery fee</span>
                  <span>{formatPrice(order.deliveryFee)}</span>
                </div>
              ) : null}
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountTotal)}</span>
                </div>
              ) : null}
              {order.taxTotal > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span>{formatPrice(order.taxTotal)}</span>
                </div>
              ) : null}
              {order.tipTotal > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tip</span>
                  <span>{formatPrice(order.tipTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-950">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onDownloadInvoice(order)}
              className="inline-flex items-center gap-2 rounded-[12px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12-4-4m4 4 4-4M4 20h16" />
              </svg>
              Download Invoice
            </button>
            {order.orderNumber ? (
              <Link
                href={`/menu/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                className="inline-flex items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Receipt
              </Link>
            ) : null}
          </div>
          {canCancelOrder(order) ? (
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => onCancelOrder(order)}
              className="inline-flex items-center gap-2 rounded-[12px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          ) : null}
          {canRefundOrder(order) ? (
            <button
              type="button"
              disabled={isRefunding}
              onClick={() => onRefundOrder(order)}
              className="inline-flex items-center gap-2 rounded-[12px] border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefunding ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                </svg>
              )}
              {isRefunding ? 'Requesting...' : 'Request Refund'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────── */
function SkeletonLoader() {
  return (
    <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
      <div className="divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-md bg-slate-100" />
              <div className="h-3 w-48 animate-pulse rounded bg-slate-50" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
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
  const [selectedOrder, setSelectedOrder] = useState<OrderHistoryOrder | null>(null);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest');
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<OrderHistoryOrder | null>(null);
  const [refundConfirmOrder, setRefundConfirmOrder] = useState<OrderHistoryOrder | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.refresh();
  };

  useEffect(() => {
    const syncNavbarAuthSlot = () => {
      setNavbarAuthSlot(document.getElementById('menu-navbar-auth-slot'));
    };
    syncNavbarAuthSlot();
    const observer = new MutationObserver(() => syncNavbarAuthSlot());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

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
    if (isAuthLoading) return;
    if (!hasCustomerSession) router.replace('/menu');
  }, [hasCustomerSession, isAuthLoading, router]);

  useEffect(() => {
    if (isAuthLoading || !hasCustomerSession) return;
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
          { method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal },
        );
        const payload = (await response.json().catch(() => null)) as OrderHistoryResponse | null;
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
        if (controller.signal.aborted) return;
        console.error('[Menu Orders] Failed to load order history:', requestError);
        setError('Unable to load your order history right now.');
        setOrders([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadOrders();
    return () => controller.abort();
  }, [hasCustomerSession, isAuthLoading, restaurantId]);

  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status.trim().toLowerCase())).length;
    return { totalOrders, totalSpent, activeCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders
      .filter((order) => orderMatchesFilter(order, activeFilter))
      .filter((order) => {
        if (!query) return true;
        const fields = [order.orderNumber, order.status, order.paymentStatus, ...order.items.map((i) => i.itemName)];
        return fields.some((f) => f.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const diff = orderTimestamp(b) - orderTimestamp(a);
        return sortDirection === 'newest' ? diff : -diff;
      });
  }, [orders, activeFilter, searchQuery, sortDirection]);

  const handleDownloadInvoice = useCallback((order: OrderHistoryOrder) => {
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
      pickupAddress: order.pickupAddress,
      paymentMethod: formatLabel(order.paymentStatus || 'pending'),
      placedAt: formatDate(order.placedAt || order.createdAt),
      items: invoiceItems,
      subtotal: order.subtotal,
      total: order.total,
      discount: order.discountTotal,
      deliveryFee: order.deliveryFee,
      tip: order.tipTotal,
      tax: order.taxTotal,
      offerApplied: null,
      couponCode: '',
      giftCardCode: '',
      orderNote: order.orderNote || '',
    });
    doc.save(`invoice-${order.orderNumber || order.orderId}.pdf`);
  }, [restaurantName, customerProfile]);

  const handleCancelRequest = useCallback((order: OrderHistoryOrder) => {
    setCancelConfirmOrder(order);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelConfirmOrder || !restaurantId) return;
    setIsCancelling(true);
    try {
      const res = await fetch('/api/menu-orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          order_id: cancelConfirmOrder.orderId,
          restaurant_id: restaurantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to cancel order.');
        return;
      }
      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === cancelConfirmOrder.orderId ? { ...o, status: 'cancelled' } : o,
        ),
      );
      if (selectedOrder?.orderId === cancelConfirmOrder.orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      }
      setCancelConfirmOrder(null);
    } catch {
      alert('Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  }, [cancelConfirmOrder, restaurantId, selectedOrder]);

  const handleRefundRequest = useCallback((order: OrderHistoryOrder) => {
    setRefundConfirmOrder(order);
  }, []);

  const handleConfirmRefund = useCallback(async () => {
    if (!refundConfirmOrder || !restaurantId) return;
    setIsRefunding(true);
    try {
      const res = await fetch('/api/menu-orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          order_id: refundConfirmOrder.orderId,
          restaurant_id: restaurantId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to request refund.');
        return;
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === refundConfirmOrder.orderId ? { ...o, status: 'refunded' } : o,
        ),
      );
      if (selectedOrder?.orderId === refundConfirmOrder.orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'refunded' });
      }
      setRefundConfirmOrder(null);
    } catch {
      alert('Failed to request refund.');
    } finally {
      setIsRefunding(false);
    }
  }, [refundConfirmOrder, restaurantId, selectedOrder]);

  if (!isAuthLoading && !hasCustomerSession) return null;

  const filterCounts = {
    all: orders.length,
    active: orders.filter((o) => ACTIVE_STATUSES.has(o.status.trim().toLowerCase())).length,
    completed: orders.filter((o) => COMPLETED_STATUSES.has(o.status.trim().toLowerCase())).length,
    cancelled: orders.filter((o) => CANCELLED_STATUSES.has(o.status.trim().toLowerCase())).length,
  };

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_32%,#ffffff_74%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10"
      style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        {/* Back link */}
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

        {/* Header card */}
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {restaurantName}
              </p>
              <h1 className="mt-1 text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.35rem]">
                Order History
              </h1>
              {customerProfile?.name ? (
                <p className="mt-0.5 text-sm text-slate-500">Welcome back, {customerProfile.name.split(' ')[0]}</p>
              ) : null}
            </div>

            {/* Stats */}
            {!isLoading && !error && orders.length > 0 ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-[14px] border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-slate-950">{summary.totalOrders}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Orders</p>
                </div>
                <div className="rounded-[14px] border border-slate-100 bg-white px-4 py-3 text-center shadow-sm">
                  <p className="text-xl font-bold text-slate-950">{formatPrice(summary.totalSpent)}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Spent</p>
                </div>
                {summary.activeCount > 0 ? (
                  <div className="rounded-[14px] border border-blue-100 bg-blue-50 px-4 py-3 text-center shadow-sm">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                      </span>
                      <p className="text-xl font-bold text-blue-700">{summary.activeCount}</p>
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Active</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Toolbar */}
        {!isLoading && !error && orders.length > 0 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter tabs */}
            <div className="flex gap-1 rounded-[14px] border border-slate-200 bg-slate-100 p-1">
              {(
                [
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['completed', 'Delivered'],
                  ['cancelled', 'Cancelled'],
                ] as Array<[OrderFilter, string]>
              ).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-sm font-semibold transition ${
                    activeFilter === filter
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                  {filterCounts[filter] > 0 ? (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      activeFilter === filter ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {filterCounts[filter]}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Search + sort */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="h-10 w-full rounded-[12px] border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 sm:w-64"
                />
              </div>
              <button
                type="button"
                onClick={() => setSortDirection((c) => (c === 'newest' ? 'oldest' : 'newest'))}
                className="flex h-10 items-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <svg className={`h-4 w-4 transition ${sortDirection === 'oldest' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {sortDirection === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            </div>
          </div>
        ) : null}

        {/* Content */}
        <div className="mt-5">
          {isLoading ? (
            <SkeletonLoader />
          ) : error ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50/60 px-8 py-14 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-red-800">{error}</p>
              {!hasCustomerSession && !isAuthenticated ? (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Link href="/menu?auth=login" className="inline-flex rounded-[12px] bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                    Sign in
                  </Link>
                  {isGuestSession ? (
                    <Link href="/menu?auth=signup" className="inline-flex rounded-[12px] border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                      Create account
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-900">No orders yet</h2>
              <p className="mt-1.5 text-sm text-slate-500">Your orders will appear here once you place one.</p>
              <Link href="/menu" className="mt-6 inline-flex rounded-[12px] bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Browse menu
              </Link>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold text-slate-900">No matching orders</p>
              <p className="mt-1 text-sm text-slate-500">Try a different filter or search term.</p>
              <button
                type="button"
                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                className="mt-4 inline-flex rounded-[12px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          ) : (
            /* Orders table card */
            <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              {/* Table header */}
              <div className="hidden border-b border-slate-100 bg-slate-50/80 px-6 py-3 sm:grid sm:grid-cols-[1fr_120px_120px_100px_100px_40px] sm:items-center sm:gap-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Order</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Date</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment</p>
                <p className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const orderedAt = order.placedAt || order.createdAt;
                  const sc = statusColor(order.status);
                  const pb = paymentBadge(order.paymentStatus);
                  const isDelivery = order.fulfillmentType === 'delivery';
                  const itemCount = order.items.reduce((s, i) => s + (i.quantity > 0 ? i.quantity : 1), 0);

                  return (
                    <button
                      key={order.orderId}
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="group flex w-full flex-col gap-2 px-5 py-4 text-left transition hover:bg-slate-50/70 sm:grid sm:grid-cols-[1fr_120px_120px_100px_100px_40px] sm:items-center sm:gap-4 sm:px-6 sm:py-3.5"
                    >
                      {/* Order info */}
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${sc.light}`}>
                          {isDelivery ? (
                            <svg className={`h-4 w-4 ${sc.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                            </svg>
                          ) : (
                            <svg className={`h-4 w-4 ${sc.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">#{order.orderNumber || 'N/A'}</p>
                          <p className="truncate text-[11px] text-slate-400">{itemCount} {itemCount === 1 ? 'item' : 'items'} &middot; {formatLabel(order.fulfillmentType || 'pickup')}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <p className="hidden text-xs text-slate-500 sm:block">{formatShortDate(orderedAt)}</p>

                      {/* Status badge */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${sc.light} ${sc.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                          {formatLabel(order.status)}
                        </span>
                      </div>

                      {/* Payment */}
                      <div className="hidden sm:block">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${pb.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pb.dot}`} />
                          {formatLabel(order.paymentStatus || 'pending')}
                        </span>
                      </div>

                      {/* Total */}
                      <p className="text-right text-sm font-bold text-slate-950 sm:text-sm">{formatPrice(order.total)}</p>

                      {/* Arrow */}
                      <div className="hidden justify-end sm:flex">
                        <svg className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>

                      {/* Mobile: extra info row */}
                      <div className="flex items-center justify-between sm:hidden">
                        <p className="text-xs text-slate-400">{formatShortDate(orderedAt)}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${pb.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${pb.dot}`} />
                          {formatLabel(order.paymentStatus || 'pending')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder ? (
        <OrderDetailModal
          order={selectedOrder}
          restaurantName={restaurantName}
          customerProfile={customerProfile}
          onClose={() => setSelectedOrder(null)}
          onDownloadInvoice={handleDownloadInvoice}
          onCancelOrder={handleCancelRequest}
          isCancelling={isCancelling}
          onRefundOrder={handleRefundRequest}
          isRefunding={isRefunding}
        />
      ) : null}

      {/* Cancel confirmation dialog */}
      {cancelConfirmOrder ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={() => !isCancelling && setCancelConfirmOrder(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Cancel Order</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to cancel order{' '}
              <span className="font-semibold text-slate-900">#{cancelConfirmOrder.orderNumber}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelConfirmOrder(null)}
                className="flex-1 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="flex-1 rounded-[12px] bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Cancelling...
                  </span>
                ) : (
                  'Yes, Cancel Order'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Refund confirmation dialog */}
      {refundConfirmOrder ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={() => !isRefunding && setRefundConfirmOrder(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative z-10 w-full max-w-sm rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Request Refund</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to request a refund for order{' '}
              <span className="font-semibold text-slate-900">#{refundConfirmOrder.orderNumber}</span>?
              The restaurant will review your request.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setRefundConfirmOrder(null)}
                className="flex-1 rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleConfirmRefund}
                className="flex-1 rounded-[12px] bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefunding ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Requesting...
                  </span>
                ) : (
                  'Yes, Request Refund'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
