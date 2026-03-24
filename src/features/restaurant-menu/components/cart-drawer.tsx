'use client';

import { ChevronDownIcon, ChevronRightIcon, XIcon } from '@/features/restaurant-menu/components/icons';
import { CompactQuantityStepper } from '@/features/restaurant-menu/components/compact-quantity-stepper';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { CartItem, FulfillmentMode } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  mode: FulfillmentMode;
  deliveryAddress: string;
  scheduleLabel: string;
  onClose: () => void;
  onModeChange: (mode: FulfillmentMode) => void;
  onDeliveryAddressChange: (value: string) => void;
  onOpenSchedule: () => void;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onCheckout: () => void;
}

function getCartItemTotal(item: CartItem) {
  const addOnTotal = item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  return (item.basePrice + addOnTotal) * item.quantity;
}

export function CartDrawer({
  open,
  items,
  itemCount,
  subtotal,
  mode,
  deliveryAddress,
  scheduleLabel,
  onClose,
  onModeChange,
  onDeliveryAddressChange,
  onOpenSchedule,
  onUpdateQuantity,
  onCheckout,
}: CartDrawerProps) {
  useScrollLock(open);

  if (!open) {
    return null;
  }

  const rewardPoints = Math.round(subtotal * 10);
  const checkoutDisabled = itemCount === 0 || (mode === 'delivery' && !deliveryAddress.trim());

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/45 px-2 py-2 sm:px-4 sm:py-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="flex h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-stone-100 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                Cart
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in your order
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label="Close cart"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-[22px] bg-stone-100 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onModeChange('pickup')}
                className={`h-12 rounded-[18px] text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                  mode === 'pickup'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pickup
              </button>
              <button
                type="button"
                onClick={() => onModeChange('delivery')}
                className={`h-12 rounded-[18px] text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                  mode === 'delivery'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Delivery
              </button>
            </div>
          </div>

          <div className={`mt-3 grid gap-3 ${mode === 'delivery' ? 'sm:grid-cols-[minmax(0,1fr)_210px]' : ''}`}>
            {mode === 'delivery' ? (
              <label className="flex h-14 items-center rounded-[18px] border border-stone-200 bg-white px-4 shadow-sm">
                <span className="sr-only">Delivery address</span>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(event) => onDeliveryAddressChange(event.target.value)}
                  placeholder="Delivery address"
                  className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            ) : null}

            <button
              type="button"
              onClick={onOpenSchedule}
              className="flex h-14 items-center justify-between rounded-[18px] border border-stone-200 bg-white px-4 text-left shadow-sm transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              <span className="min-w-0 truncate text-[13px] font-semibold text-slate-900 sm:text-sm">
                {scheduleLabel}
              </span>
              <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {items.length ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[22px] border border-stone-200 bg-stone-50 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950 sm:text-[1.05rem]">
                            {item.name}
                          </p>
                          {item.selectedAddOns.length ? (
                            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                              {item.selectedAddOns.map((addOn) => addOn.name).join(', ')}
                            </p>
                          ) : null}
                          {item.notes ? (
                            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">{item.notes}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-base font-semibold text-slate-950 sm:text-[1.05rem]">
                          {formatPrice(getCartItemTotal(item))}
                        </p>
                      </div>

                      <div className="mt-3">
                        <CompactQuantityStepper
                          quantity={item.quantity}
                          onDecrease={() => onUpdateQuantity(item.key, item.quantity - 1)}
                          onIncrease={() => onUpdateQuantity(item.key, item.quantity + 1)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center">
              <p className="text-sm font-medium text-stone-700">Your cart is empty.</p>
              <p className="mt-2 text-xs text-stone-500">Add something from the menu to continue.</p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 bg-white px-5 pb-5 pt-4 sm:px-6">
          <div className="rounded-[18px] bg-stone-100 px-4 py-3 text-center text-xs font-semibold text-slate-900 sm:text-sm">
            You'll earn {rewardPoints} points with this order
          </div>

          <div className="mt-4 flex items-center justify-between text-slate-950">
            <span className="text-[1.55rem] font-semibold tracking-tight sm:text-[1.7rem]">Subtotal</span>
            <span className="text-[1.55rem] font-semibold tracking-tight sm:text-[1.7rem]">{formatPrice(subtotal)}</span>
          </div>

          <button
            type="button"
            onClick={onCheckout}
            disabled={checkoutDisabled}
            className="mt-4 flex h-16 w-full items-center justify-center gap-2 rounded-[18px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:text-base"
          >
            Go to checkout
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}