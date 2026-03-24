'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon, ClockIcon, MapPinIcon } from '@/features/restaurant-menu/components/icons';
import { CompactQuantityStepper } from '@/features/restaurant-menu/components/compact-quantity-stepper';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type {
  FulfillmentMode,
  RestaurantMenuData,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RestaurantMenuCheckoutPageProps {
  data: RestaurantMenuData;
  locationId?: string | null;
  mode?: string | null;
  scheduleDayId?: string | null;
  scheduleTime?: string | null;
  deliveryAddress?: string | null;
}

const TAX_RATE = 0.138;

type TipPreset = '10' | '15' | '20' | 'custom';

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getCartItemTotal(basePrice: number, addOnTotal: number, quantity: number) {
  return (basePrice + addOnTotal) * quantity;
}

function getHeadingFontStyle() {
  return {
    fontFamily: 'Georgia, Times New Roman, serif',
    fontStyle: 'italic',
  } as const;
}

const fieldClassName =
  'h-[4.5rem] w-full rounded-[18px] border border-black/15 bg-white px-5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black/35';

export default function RestaurantMenuCheckoutPage({
  data,
  locationId,
  mode,
  scheduleDayId,
  scheduleTime,
  deliveryAddress,
}: RestaurantMenuCheckoutPageProps) {
  const {
    items,
    subtotal,
    isHydrated,
    updateItemQuantity,
  } = useMenuCart();
  const fulfillmentMode: FulfillmentMode = mode === 'delivery' ? 'delivery' : 'pickup';
  const selectedLocation =
    data.locations.find((location) => location.id === locationId) || data.locations[0];
  const selectedDay =
    data.scheduleDays.find((day) => day.id === scheduleDayId) ||
    data.scheduleDays.find((day) => day.slots.length > 0) ||
    data.scheduleDays[0];
  const selectedTime = scheduleTime || selectedDay?.slots[0] || 'ASAP';
  const scheduleLabel = selectedDay
    ? `${selectedDay.label}, ${selectedDay.dateLabel} ${selectedTime}`.trim()
    : selectedTime;
  const resolvedDeliveryAddress = deliveryAddress?.trim() || data.defaultDeliveryAddress || '';
  const [tipPreset, setTipPreset] = useState<TipPreset>('20');
  const [tipAmount, setTipAmount] = useState(0);

  useEffect(() => {
    const nextTipAmount =
      tipPreset === '10'
        ? roundCurrency(subtotal * 0.1)
        : tipPreset === '15'
          ? roundCurrency(subtotal * 0.15)
          : tipPreset === '20'
            ? roundCurrency(subtotal * 0.2)
            : tipAmount;

    if (tipPreset !== 'custom') {
      setTipAmount(nextTipAmount);
    }
  }, [subtotal, tipPreset, tipAmount]);

  if (!isHydrated) {
    return <div className="min-h-screen bg-stone-50" />;
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-10 text-center shadow-sm">
          <h1 className="text-[2.25rem] font-semibold text-slate-950" style={getHeadingFontStyle()}>
            Checkout
          </h1>
          <p className="mt-3 text-sm text-slate-600">Your cart is empty.</p>
          <Link
            href="/menu"
            className="mt-6 inline-flex rounded-[16px] bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  const taxesAndFees = roundCurrency(subtotal * TAX_RATE);
  const total = roundCurrency(subtotal + taxesAndFees + tipAmount);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Menu
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
          <div className="space-y-8">
            <div>
              <h1
                className="text-[2.7rem] font-semibold tracking-tight text-slate-950 sm:text-[3.5rem]"
                style={getHeadingFontStyle()}
              >
                Checkout
              </h1>
            </div>

            <section className="space-y-3">
              <h2 className="text-[1.6rem] font-semibold text-slate-950 sm:text-[1.85rem]" style={getHeadingFontStyle()}>
                {fulfillmentMode === 'pickup' ? 'Pickup details' : 'Delivery details'}
              </h2>
              <div className="rounded-[24px] border border-black/10 bg-white px-5 py-5 shadow-sm sm:px-6">
                <div className="space-y-3">
                  <p className="flex items-start gap-3 text-sm leading-6 text-slate-900 sm:text-[15px]">
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {fulfillmentMode === 'pickup'
                        ? `Pick up from ${selectedLocation?.fullAddress || 'Location unavailable'}`
                        : resolvedDeliveryAddress || 'Delivery address not set'}
                    </span>
                  </p>
                  <p className="flex items-start gap-3 text-sm leading-6 text-slate-900 sm:text-[15px]">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{scheduleLabel}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[1.6rem] font-semibold text-slate-950 sm:text-[1.85rem]" style={getHeadingFontStyle()}>
                Tip
              </h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: '10', percent: '10%', amount: roundCurrency(subtotal * 0.1) },
                  { key: '15', percent: '15%', amount: roundCurrency(subtotal * 0.15) },
                  { key: '20', percent: '20%', amount: roundCurrency(subtotal * 0.2) },
                ].map((preset) => {
                  const selected = tipPreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setTipPreset(preset.key as TipPreset)}
                      className={`min-h-[5.75rem] w-full rounded-[18px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-[170px] ${
                        selected
                          ? 'border-black/60 bg-white text-slate-950 shadow-sm'
                          : 'border-black/10 bg-white text-slate-700 hover:border-black/20'
                      }`}
                    >
                      <div className="text-lg font-semibold sm:text-xl">{formatPrice(preset.amount)}</div>
                      <div className="mt-1 text-xs text-slate-600 sm:text-sm">{preset.percent}</div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const response = window.prompt('Enter custom tip amount', tipAmount ? tipAmount.toFixed(2) : '0.00');
                    if (response == null) {
                      return;
                    }

                    const parsed = Number.parseFloat(response);
                    setTipPreset('custom');
                    setTipAmount(Number.isFinite(parsed) && parsed >= 0 ? roundCurrency(parsed) : 0);
                  }}
                      className={`min-h-[5.75rem] w-full rounded-[18px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-[170px] ${
                    tipPreset === 'custom'
                      ? 'border-black/60 bg-white text-slate-950 shadow-sm'
                      : 'border-black/10 bg-white text-slate-700 hover:border-black/20'
                  }`}
                >
                  <div className="text-lg font-semibold sm:text-xl">{tipPreset === 'custom' ? formatPrice(tipAmount) : 'Custom'}</div>
                  <div className="mt-1 text-xs text-slate-600 sm:text-sm">{tipPreset === 'custom' ? 'Custom tip' : 'Set amount'}</div>
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[1.6rem] font-semibold text-slate-950 sm:text-[1.85rem]" style={getHeadingFontStyle()}>
                Your information
              </h2>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">Mobile number</span>
                  <input type="tel" placeholder="(555) 555-5555" className={fieldClassName} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">First name</span>
                    <input type="text" placeholder="First name" className={fieldClassName} />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">Last name</span>
                    <input type="text" placeholder="Last name" className={fieldClassName} />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">Email address</span>
                  <input type="email" placeholder="Email address" className={fieldClassName} />
                </label>
                <label className="flex items-start gap-3 text-[13px] text-slate-900 sm:text-sm">
                  <input type="checkbox" defaultChecked className="mt-0.5 h-5 w-5 rounded-full border-black accent-black" />
                  <span>Get promotional emails from {data.restaurant.name}</span>
                </label>
                <label className="flex items-start gap-3 text-[13px] text-slate-900 sm:text-sm">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 rounded-full border-black accent-black" />
                  <span>Get promotional texts from {data.restaurant.name}</span>
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[1.6rem] font-semibold text-slate-950 sm:text-[1.85rem]" style={getHeadingFontStyle()}>
                Payment
              </h2>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">Card number</span>
                  <input type="text" placeholder="0000 0000 0000 0000" className={fieldClassName} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">Expiry date</span>
                    <input type="text" placeholder="MM / YY" className={fieldClassName} />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">Security code</span>
                    <input type="text" placeholder="CVC" className={fieldClassName} />
                  </label>
                </div>
              </div>
            </section>

            <div className="space-y-4 pb-10">
              <button
                type="button"
                className="flex h-16 w-full items-center justify-center gap-2 rounded-[18px] bg-black text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:max-w-[320px] sm:text-base"
              >
                Place order
              </button>
              <p className="max-w-3xl text-xs leading-6 text-slate-700 sm:text-sm">
                By signing up, you agree to receive email marketing communications and transactional order updates.
              </p>
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-[1.55rem] font-semibold text-slate-950 sm:text-[1.75rem]" style={getHeadingFontStyle()}>
                Order summary
              </h2>
              <div className="mt-5 space-y-3 text-sm text-slate-900 sm:text-[15px]">
                <div className="flex items-center justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    Taxes & fees
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                  </span>
                  <span className="font-medium">{formatPrice(taxesAndFees)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Tip</span>
                  <span className="font-medium">{formatPrice(tipAmount)}</span>
                </div>
                <button type="button" className="border-b border-black/20 pb-1 text-left text-sm text-slate-700 transition hover:text-slate-950 sm:text-[15px]">
                  Add coupon or gift card
                </button>
              </div>
              <div className="mt-6 border-t border-stone-200 pt-5">
                <div className="flex items-center justify-between gap-4 text-[1.5rem] font-semibold text-slate-950 sm:text-[1.7rem]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[24px] bg-white p-5 shadow-sm sm:p-6">
              {items.map((item) => {
                const addOnTotal = item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
                return (
                  <div key={item.key} className="rounded-[20px] border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-start gap-3">
                      <img src={item.image} alt={item.name} className="h-14 w-14 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950 sm:text-[15px]">{item.name}</p>
                            {item.selectedAddOns.length ? (
                              <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{item.selectedAddOns.map((addOn) => addOn.name).join(', ')}</p>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-slate-950 sm:text-[15px]">{formatPrice(getCartItemTotal(item.basePrice, addOnTotal, item.quantity))}</p>
                        </div>
                        <CompactQuantityStepper
                          quantity={item.quantity}
                          onDecrease={() => updateItemQuantity(item.key, item.quantity - 1)}
                          onIncrease={() => updateItemQuantity(item.key, item.quantity + 1)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
