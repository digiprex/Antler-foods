'use client';

import { useEffect, useState } from 'react';
import {
  ChevronRightIcon,
  XIcon,
} from '@/features/restaurant-menu/components/icons';
import { CompactQuantityStepper } from '@/features/restaurant-menu/components/compact-quantity-stepper';
import { CartRecommendationsRail } from '@/features/restaurant-menu/components/cart-recommendations-rail';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type {
  CartItem,
  FulfillmentMode,
  MenuItem,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  checkoutEnabled?: boolean;
  checkoutDisabledMessage?: string | null;
  cartNote: string;
  mode: FulfillmentMode;
  deliveryAddress: string;
  scheduleLabel: string;
  loyaltyPointsPerDollar?: number;
  isSignedIn?: boolean;
  recommendedItems: MenuItem[];
  onClose: () => void;
  onUpdateQuantity: (key: string, quantity: number) => void;
  onUpdateCartNote: (notes: string) => void;
  onOpenRecommendedItem: (itemId: string) => void;
  onQuickAddRecommendedItem: (item: MenuItem) => void;
  getRecommendedItemQuantity: (itemId: string) => number;
  onCheckout: () => void;
}

function getCartItemTotal(item: CartItem) {
  const addOnTotal = item.selectedAddOns.reduce(
    (sum, addOn) => sum + addOn.price,
    0,
  );
  return (item.basePrice + addOnTotal) * item.quantity;
}

export function CartDrawer({
  open,
  items,
  itemCount,
  subtotal,
  checkoutEnabled = true,
  checkoutDisabledMessage,
  cartNote,
  mode,
  deliveryAddress,
  scheduleLabel,
  loyaltyPointsPerDollar = 0,
  isSignedIn = false,
  recommendedItems,
  onClose,
  onUpdateQuantity,
  onUpdateCartNote,
  onOpenRecommendedItem,
  onQuickAddRecommendedItem,
  getRecommendedItemQuantity,
  onCheckout,
}: CartDrawerProps) {
  useScrollLock(open);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsCheckingOut(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const rewardPoints = loyaltyPointsPerDollar > 0 ? Math.floor(subtotal * loyaltyPointsPerDollar) : 0;
  const checkoutDisabled = itemCount === 0 || isCheckingOut || !checkoutEnabled;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-end bg-black/50 backdrop-blur-[1.5px] px-0 py-0 sm:items-stretch sm:px-4 sm:py-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="flex h-[min(92vh,100%)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-stone-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.2)] sm:h-full sm:max-w-[560px] sm:rounded-[28px]">
        <div className="border-b border-stone-200 bg-gradient-to-b from-stone-50/70 to-white px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
                  Cart
                </h2>
                <div className="inline-flex items-center rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 sm:text-xs">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in your order
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-500 transition hover:bg-stone-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
              aria-label="Close cart"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-[18px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Fulfillment
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {mode === 'pickup' ? 'Pickup' : 'Delivery'}
            </p>
            {mode === 'pickup' ? (
              <p className="mt-1 text-xs text-slate-600">{scheduleLabel}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-600">
                {deliveryAddress.trim() || 'Delivery address not provided'}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-stone-50/40 px-4 py-4 sm:px-6">
          {items.length ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[16px] border border-stone-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 rounded-xl border border-stone-200 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 sm:text-base">
                            {item.parentName || item.name}
                          </p>
                          {item.parentName ? (
                            <p className="truncate text-xs text-slate-500">{item.name}</p>
                          ) : null}
                          {item.selectedAddOns.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.selectedAddOns.map((addOn) => (
                                <span
                                  key={`${item.key}-${addOn.id}`}
                                  className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-600"
                                >
                                  {addOn.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950 sm:text-base">
                          {formatPrice(getCartItemTotal(item))}
                        </p>
                      </div>

                      <div className="mt-2">
                        <CompactQuantityStepper
                          quantity={item.quantity}
                          onDecrease={() =>
                            onUpdateQuantity(item.key, item.quantity - 1)
                          }
                          onIncrease={() =>
                            onUpdateQuantity(item.key, item.quantity + 1)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {recommendedItems.length ? (
                <CartRecommendationsRail
                  items={recommendedItems}
                  onOpenItem={onOpenRecommendedItem}
                  onQuickAdd={onQuickAddRecommendedItem}
                  getItemQuantity={getRecommendedItemQuantity}
                />
              ) : null}

              <div className="rounded-[22px] border border-stone-200 bg-white p-4 shadow-sm">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  special note
                </label>
                <textarea
                  value={cartNote}
                  onChange={(event) => onUpdateCartNote(event.target.value)}
                  placeholder="Add a special note for the whole order"
                  className="mt-2 min-h-[84px] w-full rounded-[16px] border border-stone-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-stone-400 focus:ring-2 focus:ring-black/5"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
              <p className="text-sm font-medium text-stone-700">
                Your cart is empty.
              </p>
              <p className="mt-2 text-xs text-stone-500">
                Add something from the menu to continue.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-stone-200 bg-white px-4 pb-4 pt-3 sm:px-6 sm:pb-4">
          {rewardPoints > 0 ? (
            <div className="rounded-[14px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                  <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.28l-4.77 2.51.91-5.33L2.27 6.69l5.34-.78L10 1z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  {isSignedIn ? (
                    <p className="text-[11px] font-semibold text-amber-900 sm:text-xs">
                      You&apos;ll earn <span className="text-amber-700">{rewardPoints} points</span> with this order
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] font-semibold text-amber-900 sm:text-xs">
                        Earn <span className="text-amber-700">{rewardPoints} points</span> on this order
                      </p>
                      <p className="mt-0.5 text-[10px] text-amber-700/80">
                        Sign in or create an account to start earning
                      </p>
                    </>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700">
                  +{rewardPoints}
                </span>
              </div>
            </div>
          ) : null}

          <div className={`${rewardPoints > 0 ? 'mt-2.5' : ''} rounded-[14px] border border-stone-200 bg-white px-3 py-2.5`}>
            <div className="flex items-center justify-between text-slate-950">
              <span className="text-lg font-semibold tracking-tight sm:text-xl">
                Subtotal
              </span>
              <span className="text-lg font-semibold tracking-tight sm:text-xl">
                {formatPrice(subtotal)}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Taxes and fees calculated at checkout.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (checkoutDisabled) {
                return;
              }

              setIsCheckingOut(true);
              void Promise.resolve(onCheckout()).catch(() => {
                setIsCheckingOut(false);
              });
            }}
            disabled={checkoutDisabled}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-black px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.2)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {isCheckingOut ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                Opening checkout...
              </>
            ) : (
              <>
                {checkoutEnabled ? 'Go to checkout' : 'Ordering unavailable'}
                <ChevronRightIcon className="h-4 w-4" />
              </>
            )}
          </button>
          {!checkoutEnabled && checkoutDisabledMessage ? (
            <p className="mt-2 text-center text-xs font-medium text-rose-600">
              {checkoutDisabledMessage}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
