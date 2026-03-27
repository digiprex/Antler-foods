'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { RestaurantOffersModal } from '@/features/restaurant-menu/components/restaurant-offers-modal';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { useMenuCart } from '@/features/restaurant-menu/hooks/use-menu-cart';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import { evaluateMenuOffers } from '@/features/restaurant-menu/lib/menu-offers';
import { resolveCustomerAuthView } from '@/features/restaurant-menu/lib/customer-auth';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
import { getAllMenuItems } from '@/features/restaurant-menu/lib/menu-selectors';
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

interface CheckoutCouponOffer {
  couponId: string;
  code: string;
  discountType: 'percent' | 'amount';
  value: number;
  minSpend: number;
  discountAmount: number;
  isEligible: boolean;
  title: string;
  description: string;
  helperText: string;
  savingsText: string;
  isBestOffer: boolean;
}

interface CheckoutGiftCardOffer {
  giftCardId: string;
  code: string;
  email: string;
  currentBalance: number;
  expiryDate: string;
}

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

function buildOfferCartLines(
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    basePrice: number;
    selectedAddOns: Array<{ price: number }>;
  }>,
) {
  return items.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    quantity: item.quantity,
    unitPrice: roundCurrency(
      item.basePrice +
        item.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0),
    ),
  }));
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

async function requestValidateCoupon(
  restaurantId: string,
  subtotal: number,
  couponCode: string,
) {
  const response = await fetch('/api/menu-orders/validate-coupon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      restaurantId,
      subtotal,
      couponCode,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    coupon?: CheckoutCouponOffer;
  } | null;

  return {
    ok: response.ok,
    error: payload?.error ?? null,
    coupon: payload?.coupon ?? null,
  };
}

async function requestValidateGiftCard(
  restaurantId: string,
  email: string,
  giftCardCode: string,
) {
  const response = await fetch('/api/menu-orders/validate-gift-card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      restaurantId,
      email,
      giftCardCode,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    giftCard?: CheckoutGiftCardOffer;
  } | null;

  return {
    ok: response.ok,
    error: payload?.error ?? null,
    giftCard: payload?.giftCard ?? null,
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
  const {
    items,
    subtotal,
    cartNote,
    isHydrated,
    updateItemQuantity,
    clearCart,
  } = useMenuCart();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = data.restaurantId || data.locations[0]?.id || null;
  const {
    customerProfile,
    hasCustomerSession,
    isGuestCustomer,
    applyCustomerProfile,
    logout,
  } = useMenuCustomerAuth(restaurantId);
  const pickupAllowed = data.pickupAllowed !== false;
  const deliveryAllowed = data.deliveryAllowed !== false;
  const fulfillmentMode: FulfillmentMode =
    !pickupAllowed && deliveryAllowed
      ? 'delivery'
      : pickupAllowed && !deliveryAllowed
        ? 'pickup'
      : mode === 'delivery'
        ? 'delivery'
        : 'pickup';
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
  const tipsEnabled = data.allowTips !== false;
  const [tipPreset, setTipPreset] = useState<TipPreset>('20');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipInput, setCustomTipInput] = useState('0.00');
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarView, setAuthSidebarView] = useState<MenuAuthView>('login');
  const [contactFields, setContactFields] = useState<CheckoutContactFields>({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
  });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] =
    useState<CheckoutCouponOffer | null>(null);
  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [isRedeemingGiftCard, setIsRedeemingGiftCard] = useState(false);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [appliedGiftCard, setAppliedGiftCard] =
    useState<CheckoutGiftCardOffer | null>(null);
  const [isOrderSummaryDrawerOpen, setIsOrderSummaryDrawerOpen] =
    useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [isOffersSectionOpen, setIsOffersSectionOpen] = useState(false);
  const brandName = data.restaurant.name.replace(' Menu', '');

  const setAuthQueryParam = (view: MenuAuthView | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (view) {
      nextParams.set('auth', view);
    } else {
      nextParams.delete('auth');
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const openAuthSidebar = (view: MenuAuthView) => {
    setAuthSidebarView(view);
    setAuthSidebarOpen(true);
  };

  const closeAuthSidebar = () => {
    setAuthSidebarOpen(false);

    if (!resolveCustomerAuthView(searchParams.get('auth'))) {
      return;
    }

    setAuthQueryParam(null);
  };

  const handleAuthSidebarViewChange = (view: MenuAuthView) => {
    setAuthSidebarView(view);

    if (!resolveCustomerAuthView(searchParams.get('auth'))) {
      return;
    }

    setAuthQueryParam(view);
  };

  useEffect(() => {
    const requestedAuthView = resolveCustomerAuthView(searchParams.get('auth'));

    if (!requestedAuthView) {
      return;
    }

    setAuthSidebarView(requestedAuthView);
    setAuthSidebarOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!tipsEnabled) {
      setTipAmount(0);
      return;
    }

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
  }, [subtotal, tipPreset, tipAmount, tipsEnabled]);

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

  const ensureGuestCheckoutSession = async () => {
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

    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      customer?: MenuCustomerProfile;
    } | null;

    if (!response.ok || !payload?.customer) {
      setCheckoutError(
        payload?.error ?? 'Unable to continue as guest right now.',
      );

      if (response.status === 409) {
        openAuthSidebar('login');
      }

      return null;
    }

    applyCustomerProfile(payload.customer);
    return payload.customer;
  };

  const handleApplyCoupon = async () => {
    if (!restaurantId) {
      setCouponError('Restaurant context is missing.');
      return;
    }

    const normalizedCode = couponCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setCouponError('Enter a coupon code.');
      return;
    }

    setCouponError(null);
    setIsApplyingCoupon(true);

    try {
      const payload = await requestValidateCoupon(
        restaurantId,
        subtotal,
        normalizedCode,
      );

      if (!payload.ok || !payload.coupon) {
        setAppliedCoupon(null);
        setCouponError(
          payload.error ?? 'Unable to validate this coupon right now.',
        );
        return;
      }

      setAppliedCoupon(payload.coupon);
      setCouponCodeInput('');
      toast.success(`${payload.coupon.code} applied.`);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = (options?: {
    showToast?: boolean;
    clearInput?: boolean;
  }) => {
    const currentCode = appliedCoupon?.code;
    setAppliedCoupon(null);
    setCouponError(null);

    if (options?.clearInput !== false) {
      setCouponCodeInput('');
    }

    if (options?.showToast !== false && currentCode) {
      toast.success(`${currentCode} removed.`);
    }
  };

  const handleRedeemGiftCard = async () => {
    if (!restaurantId) {
      setGiftCardError('Restaurant context is missing.');
      return;
    }

    const normalizedEmail = contactFields.email.trim().toLowerCase();
    if (!normalizedEmail) {
      setGiftCardError('Enter checkout email before redeeming a gift card.');
      return;
    }

    const normalizedCode = giftCardCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setGiftCardError('Enter a gift card code.');
      return;
    }

    setGiftCardError(null);
    setIsRedeemingGiftCard(true);

    try {
      const payload = await requestValidateGiftCard(
        restaurantId,
        normalizedEmail,
        normalizedCode,
      );

      if (!payload.ok || !payload.giftCard) {
        setAppliedGiftCard(null);
        setGiftCardError(
          payload.error ?? 'Unable to validate this gift card right now.',
        );
        return;
      }

      setAppliedGiftCard(payload.giftCard);
      setGiftCardCodeInput('');
      toast.success(`${payload.giftCard.code} redeemed.`);
    } finally {
      setIsRedeemingGiftCard(false);
    }
  };

  const handleRemoveGiftCard = () => {
    if (appliedGiftCard?.code) {
      toast.success(`${appliedGiftCard.code} removed.`);
    }
    setAppliedGiftCard(null);
    setGiftCardError(null);
    setGiftCardCodeInput('');
  };

  useEffect(() => {
    if (!restaurantId || !appliedCoupon) {
      return;
    }

    let active = true;

    const refreshAppliedCoupon = async () => {
      const payload = await requestValidateCoupon(
        restaurantId,
        subtotal,
        appliedCoupon.code,
      );

      if (!active) {
        return;
      }

      if (!payload.ok || !payload.coupon) {
        setAppliedCoupon(null);
        setCouponError(
          payload.error ??
            'This coupon no longer applies to the current order.',
        );
        toast.error(
          payload.error ??
            'Coupon removed because the current subtotal no longer qualifies.',
        );
        return;
      }

      setCouponError(null);
      setAppliedCoupon(payload.coupon);
    };

    void refreshAppliedCoupon();

    return () => {
      active = false;
    };
  }, [restaurantId, subtotal, appliedCoupon?.code]);

  useEffect(() => {
    if (!isOrderSummaryDrawerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOrderSummaryDrawerOpen]);

  useEffect(() => {
    if (appliedCoupon || appliedGiftCard || couponError || giftCardError) {
      setIsOffersSectionOpen(true);
    }
  }, [appliedCoupon, appliedGiftCard, couponError, giftCardError]);

  const handleLogout = async () => {
    await logout();
    applyCustomerProfile(null);
    closeAuthSidebar();
  };

  const handlePlaceOrder = async () => {
    setCheckoutError(null);
    const normalizedCheckoutEmail = contactFields.email.trim().toLowerCase();

    if (!restaurantId) {
      setCheckoutError(
        'Restaurant context is missing. Return to the menu and try again.',
      );
      return;
    }

    if (
      !contactFields.firstName.trim() ||
      !contactFields.lastName.trim() ||
      !normalizedCheckoutEmail ||
      !contactFields.phone.trim()
    ) {
      setCheckoutError(
        'Enter your first name, last name, email, and phone number before placing your order.',
      );
      document
        .getElementById('checkout-contact-fields')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (appliedGiftCard && appliedGiftCard.email !== normalizedCheckoutEmail) {
      setCheckoutError('Gift card email must match checkout email.');
      return;
    }

    if (fulfillmentMode === 'delivery' && !resolvedDeliveryAddress.trim()) {
      setCheckoutError(
        'Enter a delivery address before placing a delivery order.',
      );
      return;
    }

    setIsPlacingOrder(true);

    try {
      if (!hasCustomerSession) {
        const guestCustomer = await ensureGuestCheckoutSession();

        if (!guestCustomer) {
          return;
        }
      }

      const response = await fetch('/api/menu-orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId,
          locationId: selectedLocation?.id || locationId || restaurantId,
          fulfillmentType: fulfillmentMode,
          scheduleDayId: selectedDay?.id || scheduleDayId || null,
          scheduleTime: selectedTime,
          deliveryAddress:
            fulfillmentMode === 'delivery' ? resolvedDeliveryAddress : null,
          contact: {
            firstName: contactFields.firstName,
            lastName: contactFields.lastName,
            email: contactFields.email,
            phone: contactFields.phone,
          },
          items,
          tipAmount: tipsEnabled ? tipAmount : 0,
          couponCode: appliedCoupon?.code || null,
          giftCardCode: appliedGiftCard?.code || null,
          orderNote: cartNote,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        order?: {
          orderNumber?: string;
          total?: number;
        };
      } | null;

      if (!response.ok) {
        setCheckoutError(
          payload?.error ?? 'Unable to place your order right now.',
        );
        return;
      }

      clearCart();

      const successParams = new URLSearchParams();
      if (payload?.order?.orderNumber) {
        successParams.set('orderNumber', payload.order.orderNumber);
      }
      if (typeof payload?.order?.total === 'number') {
        successParams.set('total', payload.order.total.toFixed(2));
      }
      successParams.set('mode', fulfillmentMode);
      if (scheduleLabel) {
        successParams.set('schedule', scheduleLabel);
      }
      if (brandName) {
        successParams.set('restaurant', brandName);
      }

      const successQuery = successParams.toString();
      router.replace(
        successQuery
          ? '/menu/checkout/success?' + successQuery
          : '/menu/checkout/success',
      );
      router.refresh();
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isHydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
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

  const normalizedCouponInput = couponCodeInput.trim().toUpperCase();
  const normalizedGiftCardInput = giftCardCodeInput.trim().toUpperCase();
  const menuItemNameById = new Map(
    getAllMenuItems(data.categories).map((item) => [item.id, item.name]),
  );
  const restaurantOfferEvaluations = evaluateMenuOffers({
    offers: data.offers,
    cartLines: buildOfferCartLines(items),
    itemNameById: menuItemNameById,
  });
  const restaurantOffers = restaurantOfferEvaluations.offers;
  const restaurantOfferCount = restaurantOffers.length;
  const activeRestaurantOffer = appliedCoupon
    ? null
    : restaurantOfferEvaluations.bestOffer;
  const restaurantOffersStatus = appliedCoupon
    ? 'Manual coupon active. Restaurant offers are paused for this order.'
    : activeRestaurantOffer
      ? `${activeRestaurantOffer.headline} auto-applies, saving ${formatPrice(activeRestaurantOffer.discountAmount)}.`
      : restaurantOfferCount > 0
        ? `${restaurantOfferCount} restaurant offer${restaurantOfferCount === 1 ? '' : 's'} available.`
        : 'No restaurant offers available right now.';
  const effectiveTipAmount = tipsEnabled ? tipAmount : 0;
  const discountAmount =
    appliedCoupon?.discountAmount || activeRestaurantOffer?.discountAmount || 0;
  const preGiftCardTotal = roundCurrency(subtotal + effectiveTipAmount - discountAmount);
  const giftCardAppliedAmount = appliedGiftCard
    ? roundCurrency(
        Math.min(appliedGiftCard.currentBalance, Math.max(preGiftCardTotal, 0)),
      )
    : 0;
  const showAppliedCouponActions = Boolean(
    appliedCoupon && !normalizedCouponInput,
  );
  const showRedeemedGiftCardActions = Boolean(
    appliedGiftCard && !normalizedGiftCardInput,
  );
  const total = roundCurrency(
    Math.max(preGiftCardTotal - giftCardAppliedAmount, 0),
  );
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const orderSummaryPanel = (
    <div className="rounded-[18px] border border-stone-200 bg-white p-3.5 shadow-sm sm:p-4 lg:sticky lg:top-0 lg:z-10 lg:flex lg:h-[calc(100vh-_-0.8rem)] lg:flex-col lg:rounded-t-[30px] lg:rounded-b-none lg:border-b-0">
      <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
        Order summary
      </h2>
      <div className="mt-3 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        <div className="space-y-2.5 rounded-[16px] border border-stone-200 bg-stone-50 px-3 py-2.5">
          <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => {
              const addOnTotal = item.selectedAddOns.reduce(
                (sum, addOn) => sum + addOn.price,
                0,
              );
              return (
                <div key={item.key} className="flex items-start gap-2.5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-[12px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex-1">
                        <p className="truncate text-sm font-semibold leading-tight text-slate-950 sm:text-[13px]">
                          {item.name}
                        </p>
                        {item.selectedAddOns.length ? (
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                            {item.selectedAddOns
                              .map((addOn) => addOn.name)
                              .join(', ')}
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-950 sm:text-[13px]">
                        {formatPrice(
                          getCartItemTotal(
                            item.basePrice,
                            addOnTotal,
                            item.quantity,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-2.5">
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
        </div>

        {cartNote.trim() ? (
          <div className="rounded-[14px] border border-stone-200 bg-stone-50 px-3 py-2.5 text-[12px] text-slate-700">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              special note
            </p>
            <p className="mt-1.5 leading-5">{cartNote.trim()}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-[16px] border border-stone-200 bg-stone-50 px-3.5 py-3 lg:mt-auto">
        <button
          type="button"
          onClick={() => setIsOffersSectionOpen((current) => !current)}
          className="flex w-full items-start justify-between gap-3 text-left"
          aria-expanded={isOffersSectionOpen}
        >
          <div>
            <p className="text-[13px] font-semibold text-slate-950">
              Offers and gift cards
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Save on this order with your coupon or gift card.
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white text-slate-700 transition hover:border-stone-400 hover:bg-stone-100">
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${isOffersSectionOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {isOffersSectionOpen ? (
          <div className="mt-3 space-y-3">
            <div className="space-y-2 rounded-[14px] border border-stone-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Coupon
                </p>
                {appliedCoupon ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    Applied
                  </span>
                ) : null}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleApplyCoupon();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(event) => {
                    setCouponCodeInput(event.target.value.toUpperCase());
                    if (couponError) {
                      setCouponError(null);
                    }
                  }}
                  placeholder="Coupon code"
                  className="h-9 w-full rounded-[12px] border border-stone-300 bg-white px-3 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-950 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-black/35"
                  disabled={isApplyingCoupon}
                />
                {showAppliedCouponActions ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveCoupon()}
                    className="inline-flex h-9 w-full items-center justify-center rounded-[12px] border border-stone-300 bg-white px-3 text-[12px] font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-auto"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isApplyingCoupon}
                    className="inline-flex h-9 w-full items-center justify-center rounded-[12px] bg-black px-3 text-[12px] font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
                  >
                    {isApplyingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </form>
              {couponError ? (
                <p className="text-[11px] text-red-700">{couponError}</p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-[14px] border border-stone-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Gift card
                </p>
                {appliedGiftCard ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    Redeemed
                  </span>
                ) : null}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleRedeemGiftCard();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="text"
                  value={giftCardCodeInput}
                  onChange={(event) => {
                    setGiftCardCodeInput(event.target.value.toUpperCase());
                    if (giftCardError) {
                      setGiftCardError(null);
                    }
                  }}
                  placeholder="Gift card code"
                  className="h-9 w-full rounded-[12px] border border-stone-300 bg-white px-3 text-[12px] font-medium uppercase tracking-[0.06em] text-slate-950 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-black/35"
                  disabled={isRedeemingGiftCard}
                />
                {showRedeemedGiftCardActions ? (
                  <button
                    type="button"
                    onClick={handleRemoveGiftCard}
                    className="inline-flex h-9 w-full items-center justify-center rounded-[12px] border border-stone-300 bg-white px-3 text-[12px] font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-auto"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isRedeemingGiftCard}
                    className="inline-flex h-9 w-full items-center justify-center rounded-[12px] bg-black px-3 text-[12px] font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-stone-300 sm:w-auto"
                  >
                    {isRedeemingGiftCard ? 'Redeeming...' : 'Redeem'}
                  </button>
                )}
              </form>
              {giftCardError ? (
                <p className="text-[11px] text-red-700">{giftCardError}</p>
              ) : appliedGiftCard ? (
                <p className="text-[11px] text-emerald-700">
                  {appliedGiftCard.code} balance{' '}
                  {formatPrice(appliedGiftCard.currentBalance)}.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2.5 rounded-[14px] border border-stone-200 bg-white p-2.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                  Restaurant offers
                </p>
                <p
                  className={`mt-1 text-[11px] leading-5 ${appliedCoupon ? 'text-amber-700' : activeRestaurantOffer ? 'text-emerald-700' : 'text-slate-500'}`}
                >
                  {restaurantOffersStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOffersModalOpen(true)}
                disabled={restaurantOfferCount === 0}
                className="inline-flex h-9 w-full shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white px-4 text-[12px] font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 sm:w-auto"
              >
                {restaurantOfferCount > 0
                  ? `View offers (${restaurantOfferCount})`
                  : 'No offers'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 border-t border-stone-200 pt-3">
        <div className="mb-2.5 space-y-2 text-[13px] text-slate-900">
          <div className="flex items-center justify-between gap-4">
            <span>Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Tip</span>
            <span className="font-medium">{formatPrice(effectiveTipAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span>Discount</span>
              {appliedCoupon ? (
                <>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    {appliedCoupon.title}
                  </span>
                </>
              ) : activeRestaurantOffer ? (
                <>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                    AUTO
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    {activeRestaurantOffer.headline}
                  </span>
                </>
              ) : null}
            </span>
            <span
              className={`font-medium ${discountAmount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}
            >
              {discountAmount > 0
                ? `- ${formatPrice(discountAmount)}`
                : formatPrice(0)}
            </span>
          </div>
          {giftCardAppliedAmount > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span>Gift card</span>
                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  {appliedGiftCard?.code}
                </span>
              </span>
              <span className="font-medium text-emerald-700">
                - {formatPrice(giftCardAppliedAmount)}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-4 text-[1.15rem] font-semibold text-slate-950 sm:text-[1.25rem]">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white px-4 py-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-24 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-6 lg:pb-6">
      <div className="mx-auto max-w-[1440px]">
        <Link
          href="/menu"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Menu
        </Link>

        <div className="mt-4 grid gap-5 lg:h-[calc(100vh-7.25rem)] lg:grid-cols-[minmax(0,660px)_400px] lg:justify-center lg:overflow-hidden lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,760px)_430px]">
          <div className="space-y-5 sm:space-y-6 lg:h-full lg:overflow-y-auto lg:pr-5 lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <div>
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
                Checkout
              </h1>
            </div>

            {customerProfile ? (
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {isGuestCustomer ? (
                      <button
                        type="button"
                        onClick={() => openAuthSidebar('signup')}
                        className="inline-flex h-10 w-full items-center justify-center rounded-[14px] bg-black px-4 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-auto"
                      >
                        Create account
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex h-10 w-full items-center justify-center rounded-[14px] border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:w-auto"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-2.5">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
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

            {tipsEnabled ? (
              <section className="space-y-2.5">
                <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
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
                      setTipPreset('custom');
                      setCustomTipInput(
                        tipAmount ? tipAmount.toFixed(2) : '0.00',
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
                {tipPreset === 'custom' ? (
                  <div className="max-w-[320px]">
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-slate-600">
                      Enter custom tip amount
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={customTipInput}
                        onChange={(event) => {
                          const inputValue = event.target.value;
                          setCustomTipInput(inputValue);
                          const parsed = Number.parseFloat(inputValue);
                          setTipAmount(
                            Number.isFinite(parsed) && parsed >= 0
                              ? roundCurrency(parsed)
                              : 0,
                          );
                        }}
                        className="h-11 w-full rounded-[14px] border border-black/15 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-black/35 focus:ring-2 focus:ring-black/10"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section id="checkout-contact-fields" className="space-y-2.5">
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
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
                        handleContactFieldChange(
                          'firstName',
                          event.target.value,
                        )
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
              <h2 className="text-[1.35rem] font-semibold tracking-tight text-slate-950 sm:text-[1.5rem]">
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
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-black text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:h-12 sm:max-w-[280px]"
              >
                {isPlacingOrder ? 'Placing order...' : 'Place order'}
              </button>
              {checkoutError ? (
                <div className="max-w-3xl rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {checkoutError}
                </div>
              ) : null}
              <p className="max-w-3xl text-xs leading-6 text-slate-700 sm:text-sm">
                By signing up, you agree to receive email marketing
                communications and transactional order updates.
              </p>
            </div>
          </div>

          <aside className="hidden space-y-3.5 lg:block lg:h-full lg:overflow-y-auto lg:rounded-[30px] lg:border lg:border-stone-200 lg:bg-stone-50 lg:p-0 lg:shadow-[0_24px_64px_rgba(15,23,42,0.08)] lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            {orderSummaryPanel}
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOrderSummaryDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-[14px] bg-black px-4 py-3 text-left text-white"
        >
          <span className="text-sm font-semibold">
            Order summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="text-sm font-semibold">{formatPrice(total)}</span>
        </button>
      </div>

      {isOrderSummaryDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close order summary"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsOrderSummaryDrawerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-[24px] bg-stone-50 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_48px_rgba(15,23,42,0.2)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-stone-300" />
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOrderSummaryDrawerOpen(false)}
                className="rounded-[10px] border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
            {orderSummaryPanel}
          </div>
        </div>
      ) : null}

      <RestaurantOffersModal
        open={isOffersModalOpen}
        offers={restaurantOffers}
        hasManualCoupon={Boolean(appliedCoupon)}
        onClose={() => setIsOffersModalOpen(false)}
      />

      <MenuAuthSidebar
        open={authSidebarOpen}
        view={authSidebarView}
        restaurantId={restaurantId}
        restaurantName={brandName}
        hasCustomerSession={hasCustomerSession}
        customerProfile={customerProfile}
        onClose={closeAuthSidebar}
        onViewChange={handleAuthSidebarViewChange}
        onAuthenticatedCustomer={applyCustomerProfile}
      />
    </div>
  );
}
