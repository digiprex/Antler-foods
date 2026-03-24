'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MenuAuthSidebar,
  type MenuAuthView,
} from '@/features/restaurant-menu/components/menu-auth-sidebar';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ClockIcon,
  MapPinIcon,
} from '@/features/restaurant-menu/components/icons';
import { CompactQuantityStepper } from '@/features/restaurant-menu/components/compact-quantity-stepper';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
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

interface CheckoutContactFields {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
}

const TAX_RATE = 0.138;

type TipPreset = '10' | '15' | '20' | 'custom';

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getCartItemTotal(
  basePrice: number,
  addOnTotal: number,
  quantity: number,
) {
  return (basePrice + addOnTotal) * quantity;
}

function getHeadingFontStyle() {
  return {
    fontFamily: 'Georgia, Times New Roman, serif',
    fontStyle: 'italic',
  } as const;
}

function splitName(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

const fieldClassName =
  'h-11 w-full rounded-[14px] border border-stone-300 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-black/35 sm:h-12 sm:rounded-[16px]';

export default function RestaurantMenuCheckoutPage({
  data,
  locationId,
  mode,
  scheduleDayId,
  scheduleTime,
  deliveryAddress,
}: RestaurantMenuCheckoutPageProps) {
  const { items, subtotal, cartNote, isHydrated, updateItemQuantity } =
    useMenuCart();
  const restaurantId = data.restaurantId || data.locations[0]?.id || null;
  const {
    customerProfile,
    hasCustomerSession,
    isGuestCustomer,
    applyCustomerProfile,
    logout,
  } = useMenuCustomerAuth(restaurantId);
  const fulfillmentMode: FulfillmentMode =
    mode === 'delivery' ? 'delivery' : 'pickup';
  const selectedLocation =
    data.locations.find((location) => location.id === locationId) ||
    data.locations[0];
  const selectedDay =
    data.scheduleDays.find((day) => day.id === scheduleDayId) ||
    data.scheduleDays.find((day) => day.slots.length > 0) ||
    data.scheduleDays[0];
  const selectedTime = scheduleTime || selectedDay?.slots[0] || 'ASAP';
  const scheduleLabel = selectedDay
    ? `${selectedDay.label}, ${selectedDay.dateLabel} ${selectedTime}`.trim()
    : selectedTime;
  const resolvedDeliveryAddress =
    deliveryAddress?.trim() || data.defaultDeliveryAddress || '';
  const [tipPreset, setTipPreset] = useState<TipPreset>('20');
  const [tipAmount, setTipAmount] = useState(0);
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarView, setAuthSidebarView] =
    useState<MenuAuthView>('login');
  const [contactFields, setContactFields] = useState<CheckoutContactFields>({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [guestError, setGuestError] = useState<string | null>(null);
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const brandName = data.restaurant.name.replace(' Menu', '');

  const openAuthSidebar = (view: MenuAuthView) => {
    setAuthSidebarView(view);
    setAuthSidebarOpen(true);
  };

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

  useEffect(() => {
    if (!customerProfile) {
      return;
    }

    const { firstName, lastName } = splitName(customerProfile.name);

    setContactFields((current) => ({
      phone: current.phone || customerProfile.phone || '',
      firstName: current.firstName || firstName,
      lastName: current.lastName || lastName,
      email: current.email || customerProfile.email || '',
    }));
  }, [customerProfile]);

  const handleContactFieldChange = (
    field: keyof CheckoutContactFields,
    value: string,
  ) => {
    setContactFields((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleContinueAsGuest = async () => {
    setGuestError(null);

    if (!restaurantId) {
      setGuestError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    if (
      !contactFields.firstName.trim() ||
      !contactFields.lastName.trim() ||
      !contactFields.email.trim() ||
      !contactFields.phone.trim()
    ) {
      setGuestError('Enter your first name, last name, email, and phone number before continuing as guest.');
      document
        .getElementById('checkout-contact-fields')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setIsSubmittingGuest(true);

    try {
      const response = await fetch('/api/menu-auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId,
          firstName: contactFields.firstName,
          lastName: contactFields.lastName,
          email: contactFields.email,
          phone: contactFields.phone,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: MenuCustomerProfile }
        | null;

      if (!response.ok || !payload?.customer) {
        setGuestError(payload?.error ?? 'Unable to continue as guest.');
        return;
      }

      applyCustomerProfile(payload.customer);
      toast.success('Guest checkout is ready.');
    } finally {
      setIsSubmittingGuest(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    applyCustomerProfile(null);
    setAuthSidebarOpen(false);
  };

  if (!isHydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1
            className="text-[1.95rem] font-semibold text-slate-950 sm:text-[2.2rem]"
            style={getHeadingFontStyle()}
          >
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
    <div className="min-h-screen bg-white px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Menu
        </Link>

        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h1
                className="text-[1.95rem] font-semibold tracking-tight text-slate-950 sm:text-[2.65rem]"
                style={getHeadingFontStyle()}
              >
                Checkout
              </h1>
            </div>

            {!hasCustomerSession ? (
              <section className="rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="space-y-4">
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      Faster checkout
                    </p>
                    <h2 className="text-[1.2rem] font-semibold text-slate-950 sm:text-[1.35rem]">
                      Sign in or create an account
                    </h2>
                    <p className="text-sm leading-6 text-stone-600">
                      Use your saved info and loyalty points, or continue as guest below.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => openAuthSidebar('login')}
                      className="inline-flex h-10 w-full items-center justify-center rounded-[14px] bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:h-11 sm:w-auto sm:min-w-[150px]"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthSidebar('signup')}
                      className="inline-flex h-10 w-full items-center justify-center rounded-[14px] border border-stone-300 bg-white px-5 text-sm font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:h-11 sm:w-auto sm:min-w-[150px]"
                    >
                      Sign up
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-stone-200" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-700">
                      Or continue as guest
                    </span>
                    <span className="h-px flex-1 bg-stone-200" />
                  </div>

                  <div className="rounded-[16px] border border-black/15 bg-black/[0.03] px-4 py-3.5 text-sm text-stone-800 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-700">
                          Guest checkout
                        </p>
                        <p className="mt-2 leading-6">
                          Continue as guest using the contact and payment fields below.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleContinueAsGuest}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-stone-300"
                        disabled={isSubmittingGuest}
                      >
                        {isSubmittingGuest ? 'Starting guest checkout...' : 'Continue as guest'}
                      </button>
                    </div>
                    {guestError ? (
                      <p className="mt-3 text-sm text-red-700">{guestError}</p>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : customerProfile ? (
              <section className="rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                      {isGuestCustomer ? 'Guest checkout active' : 'Signed in'}
                    </p>
                    <h2 className="mt-1 text-[1.15rem] font-semibold text-slate-950 sm:text-[1.3rem]">
                      {customerProfile.name}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {customerProfile.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isGuestCustomer ? (
                      <button
                        type="button"
                        onClick={() => openAuthSidebar('signup')}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                      >
                        Create account
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-10 items-center justify-center rounded-[14px] border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-2.5">
              <h2
                className="text-[1.3rem] font-semibold text-slate-950 sm:text-[1.5rem]"
                style={getHeadingFontStyle()}
              >
                {fulfillmentMode === 'pickup'
                  ? 'Pickup details'
                  : 'Delivery details'}
              </h2>
              <div className="rounded-[18px] border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-4">
                <div className="space-y-3">
                  <p className="flex items-start gap-3 text-sm leading-6 text-slate-900">
                    <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {fulfillmentMode === 'pickup'
                        ? `Pick up from ${selectedLocation?.fullAddress || 'Location unavailable'}`
                        : resolvedDeliveryAddress || 'Delivery address not set'}
                    </span>
                  </p>
                  <p className="flex items-start gap-3 text-sm leading-6 text-slate-900">
                    <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{scheduleLabel}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2.5">
              <h2
                className="text-[1.3rem] font-semibold text-slate-950 sm:text-[1.5rem]"
                style={getHeadingFontStyle()}
              >
                Tip
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                {[
                  {
                    key: '10',
                    percent: '10%',
                    amount: roundCurrency(subtotal * 0.1),
                  },
                  {
                    key: '15',
                    percent: '15%',
                    amount: roundCurrency(subtotal * 0.15),
                  },
                  {
                    key: '20',
                    percent: '20%',
                    amount: roundCurrency(subtotal * 0.2),
                  },
                ].map((preset) => {
                  const selected = tipPreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setTipPreset(preset.key as TipPreset)}
                      className={`min-h-[4.85rem] w-full rounded-[16px] border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-[150px] ${
                        selected
                          ? 'border-black/60 bg-white text-slate-950 shadow-sm'
                          : 'border-black/10 bg-white text-slate-700 hover:border-black/20'
                      }`}
                    >
                      <div className="text-base font-semibold sm:text-lg">
                        {formatPrice(preset.amount)}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {preset.percent}
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const response = window.prompt(
                      'Enter custom tip amount',
                      tipAmount ? tipAmount.toFixed(2) : '0.00',
                    );
                    if (response == null) {
                      return;
                    }

                    const parsed = Number.parseFloat(response);
                    setTipPreset('custom');
                    setTipAmount(
                      Number.isFinite(parsed) && parsed >= 0
                        ? roundCurrency(parsed)
                        : 0,
                    );
                  }}
                  className={`min-h-[4.85rem] w-full rounded-[16px] border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-[150px] ${
                    tipPreset === 'custom'
                      ? 'border-black/60 bg-white text-slate-950 shadow-sm'
                      : 'border-black/10 bg-white text-slate-700 hover:border-black/20'
                  }`}
                >
                  <div className="text-base font-semibold sm:text-lg">
                    {tipPreset === 'custom' ? formatPrice(tipAmount) : 'Custom'}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {tipPreset === 'custom' ? 'Custom tip' : 'Set amount'}
                  </div>
                </button>
              </div>
            </section>

            <section id="checkout-contact-fields" className="space-y-2.5">
              <h2
                className="text-[1.3rem] font-semibold text-slate-950 sm:text-[1.5rem]"
                style={getHeadingFontStyle()}
              >
                Your information
              </h2>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">
                    Mobile number
                  </span>
                  <input
                    type="tel"
                    placeholder="(555) 555-5555"
                    className={fieldClassName}
                    value={contactFields.phone}
                    onChange={(event) =>
                      handleContactFieldChange('phone', event.target.value)
                    }
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">
                      First name
                    </span>
                    <input
                      type="text"
                      placeholder="First name"
                      className={fieldClassName}
                      value={contactFields.firstName}
                      onChange={(event) =>
                        handleContactFieldChange('firstName', event.target.value)
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">
                      Last name
                    </span>
                    <input
                      type="text"
                      placeholder="Last name"
                      className={fieldClassName}
                      value={contactFields.lastName}
                      onChange={(event) =>
                        handleContactFieldChange('lastName', event.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">
                    Email address
                  </span>
                  <input
                    type="email"
                    placeholder="Email address"
                    className={fieldClassName}
                    value={contactFields.email}
                    onChange={(event) =>
                      handleContactFieldChange('email', event.target.value)
                    }
                  />
                </label>
                <label className="flex items-start gap-3 text-[13px] text-slate-900 sm:text-sm">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 h-5 w-5 rounded-full border-black accent-black"
                  />
                  <span>
                    Get promotional emails from {data.restaurant.name}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-[13px] text-slate-900 sm:text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 rounded-full border-black accent-black"
                  />
                  <span>Get promotional texts from {data.restaurant.name}</span>
                </label>
              </div>
            </section>

            <section className="space-y-2.5">
              <h2
                className="text-[1.3rem] font-semibold text-slate-950 sm:text-[1.5rem]"
                style={getHeadingFontStyle()}
              >
                Payment
              </h2>
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-900">
                  <span className="mb-2 block text-[13px] sm:text-sm">
                    Card number
                  </span>
                  <input
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    className={fieldClassName}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">
                      Expiry date
                    </span>
                    <input
                      type="text"
                      placeholder="MM / YY"
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-900">
                    <span className="mb-2 block text-[13px] sm:text-sm">
                      Security code
                    </span>
                    <input
                      type="text"
                      placeholder="CVC"
                      className={fieldClassName}
                    />
                  </label>
                </div>
              </div>
            </section>

            <div className="space-y-4 pb-10">
              <button
                type="button"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-black text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:h-12 sm:max-w-[280px]"
              >
                Place order
              </button>
              <p className="max-w-3xl text-xs leading-6 text-slate-700 sm:text-sm">
                By signing up, you agree to receive email marketing
                communications and transactional order updates.
              </p>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:space-y-5">
            <div className="rounded-[18px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <h2
                className="text-[1.3rem] font-semibold text-slate-950 sm:text-[1.45rem]"
                style={getHeadingFontStyle()}
              >
                Order summary
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    Taxes & fees
                    <ChevronDownIcon className="h-4 w-4 text-slate-500" />
                  </span>
                  <span className="font-medium">
                    {formatPrice(taxesAndFees)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Tip</span>
                  <span className="font-medium">{formatPrice(tipAmount)}</span>
                </div>
                <button
                  type="button"
                  className="border-b border-black/20 pb-1 text-left text-sm text-slate-700 transition hover:text-slate-950"
                >
                  Add coupon or gift card
                </button>
                {cartNote.trim() ? (
                  <div className="rounded-[16px] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      special note
                    </p>
                    <p className="mt-2 leading-6">{cartNote.trim()}</p>
                  </div>
                ) : null}
              </div>
              <div className="mt-5 border-t border-stone-200 pt-4">
                <div className="flex items-center justify-between gap-4 text-[1.3rem] font-semibold text-slate-950 sm:text-[1.45rem]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[18px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              {items.map((item) => {
                const addOnTotal = item.selectedAddOns.reduce(
                  (sum, addOn) => sum + addOn.price,
                  0,
                );
                return (
                  <div
                    key={item.key}
                    className="rounded-[16px] border border-stone-200 bg-stone-50 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-12 w-12 rounded-[14px] object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {item.name}
                            </p>
                            {item.selectedAddOns.length ? (
                              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                {item.selectedAddOns
                                  .map((addOn) => addOn.name)
                                  .join(', ')}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-sm font-semibold text-slate-950">
                            {formatPrice(
                              getCartItemTotal(
                                item.basePrice,
                                addOnTotal,
                                item.quantity,
                              ),
                            )}
                          </p>
                        </div>
                        <CompactQuantityStepper
                          quantity={item.quantity}
                          onDecrease={() =>
                            updateItemQuantity(item.key, item.quantity - 1)
                          }
                          onIncrease={() =>
                            updateItemQuantity(item.key, item.quantity + 1)
                          }
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

      <MenuAuthSidebar
        open={authSidebarOpen}
        view={authSidebarView}
        restaurantId={restaurantId}
        restaurantName={brandName}
        hasCustomerSession={hasCustomerSession}
        customerProfile={customerProfile}
        onClose={() => setAuthSidebarOpen(false)}
        onViewChange={setAuthSidebarView}
        onAuthenticatedCustomer={applyCustomerProfile}
      />
    </div>
  );
}


