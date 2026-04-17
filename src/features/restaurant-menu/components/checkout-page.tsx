'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MenuAuthSidebar,
  type MenuAuthView,
} from '@/features/restaurant-menu/components/menu-auth-sidebar';
import {
  BagIcon,
  BikeIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ClockIcon,
  MapPinIcon,
  ShieldIcon,
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
import { StripePaymentProvider } from '@/features/restaurant-menu/components/stripe-provider';
import { StripePaymentSection } from '@/features/restaurant-menu/components/stripe-payment-section';
import { DeliveryAddressInput as DeliveryAddressInputField } from '@/features/restaurant-menu/components/delivery-address-input';
import type { SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';
import type { DeliveryAddressInput } from '@/types/orders.types';

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
  phoneCountryCode: string;
  firstName: string;
  lastName: string;
  email: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
}

const PHONE_COUNTRY_CODES = [
  { code: '+1', label: 'US/CA +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
  { code: '+33', label: 'FR +33' },
  { code: '+49', label: 'DE +49' },
  { code: '+81', label: 'JP +81' },
  { code: '+86', label: 'CN +86' },
  { code: '+52', label: 'MX +52' },
  { code: '+55', label: 'BR +55' },
  { code: '+34', label: 'ES +34' },
  { code: '+39', label: 'IT +39' },
  { code: '+82', label: 'KR +82' },
  { code: '+31', label: 'NL +31' },
  { code: '+46', label: 'SE +46' },
  { code: '+47', label: 'NO +47' },
  { code: '+41', label: 'CH +41' },
  { code: '+65', label: 'SG +65' },
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+234', label: 'NG +234' },
  { code: '+27', label: 'ZA +27' },
  { code: '+254', label: 'KE +254' },
  { code: '+63', label: 'PH +63' },
  { code: '+60', label: 'MY +60' },
  { code: '+66', label: 'TH +66' },
  { code: '+62', label: 'ID +62' },
  { code: '+64', label: 'NZ +64' },
  { code: '+353', label: 'IE +353' },
  { code: '+48', label: 'PL +48' },
];

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

interface CheckoutDeliveryQuote {
  id: string | null;
  provider: string;
  quoteId: string;
  deliveryFee: number;
  currencyCode: string;
  etaMinutes: number | null;
  pickupAt: number;
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

const DELIVERY_ADDRESS_STORAGE_KEY = 'restaurant-menu-delivery-address-v1';

function trimDeliveryAddressText(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function buildDeliveryAddressText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => trimDeliveryAddressText(part))
    .filter(Boolean)
    .join(', ');
}

function buildStructuredDeliveryAddressText(address: DeliveryAddressInput) {
  return buildDeliveryAddressText([
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.countryCode,
  ]);
}

function createManualDeliveryAddress(
  formattedAddress = '',
): DeliveryAddressInput {
  const normalizedAddress = trimDeliveryAddressText(formattedAddress);
  return {
    formattedAddress: normalizedAddress,
    addressLine1: normalizedAddress || undefined,
    source: normalizedAddress ? 'manual' : undefined,
  };
}

function createDeliveryAddressFromProfile(
  _profile: unknown,
): DeliveryAddressInput | null {
  // Address fields have been moved to customer_delivery_addresses table
  return null;
}

function createDeliveryAddressFromPlace(
  place: SelectedGooglePlace,
): DeliveryAddressInput {
  const addressLine1 = trimDeliveryAddressText(place.address) || undefined;
  const city = trimDeliveryAddressText(place.city) || undefined;
  const state = trimDeliveryAddressText(place.state) || undefined;
  const postalCode = trimDeliveryAddressText(place.postalCode) || undefined;
  const countryCode = trimDeliveryAddressText(place.country) || undefined;

  return {
    formattedAddress:
      trimDeliveryAddressText(place.formattedAddress) ||
      buildDeliveryAddressText([
        addressLine1,
        city,
        state,
        postalCode,
        countryCode,
      ]) ||
      trimDeliveryAddressText(place.name),
    placeId: place.placeId || undefined,
    addressLine1,
    city,
    state,
    postalCode,
    countryCode,
    latitude: place.lat ?? undefined,
    longitude: place.lng ?? undefined,
    source: 'google_autocomplete',
  };
}

function readStoredDeliveryAddress(restaurantId: string | null) {
  if (typeof window === 'undefined' || !restaurantId) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      DELIVERY_ADDRESS_STORAGE_KEY,
    );
    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue) as {
      restaurantId?: string;
      address?: DeliveryAddressInput;
    };

    if (
      payload.restaurantId !== restaurantId ||
      !payload.address?.formattedAddress
    ) {
      return null;
    }

    return payload.address;
  } catch {
    return null;
  }
}

function writeStoredDeliveryAddress(
  restaurantId: string | null,
  address: DeliveryAddressInput,
) {
  if (typeof window === 'undefined' || !restaurantId) {
    return;
  }

  if (!trimDeliveryAddressText(address.formattedAddress)) {
    window.sessionStorage.removeItem(DELIVERY_ADDRESS_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(
    DELIVERY_ADDRESS_STORAGE_KEY,
    JSON.stringify({
      restaurantId,
      address: {
        ...address,
        formattedAddress: trimDeliveryAddressText(address.formattedAddress),
      },
    }),
  );
}

async function requestDeliveryQuote(
  restaurantId: string,
  locationId: string | null | undefined,
  subtotal: number,
  deliveryAddressData: DeliveryAddressInput,
  signal?: AbortSignal,
) {
  const response = await fetch('/api/menu-orders/delivery-quote', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    signal,
    body: JSON.stringify({
      restaurantId,
      locationId,
      subtotal,
      deliveryAddressData: {
        formattedAddress: deliveryAddressData.formattedAddress,
        placeId: deliveryAddressData.placeId,
        latitude: deliveryAddressData.latitude,
        longitude: deliveryAddressData.longitude,
        houseFlatFloor: deliveryAddressData.houseFlatFloor,
        instructions: deliveryAddressData.instructions,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    available?: boolean;
    error?: string;
    quote?: CheckoutDeliveryQuote | null;
  } | null;

  return {
    ok: response.ok,
    available: payload?.available ?? false,
    error: payload?.error ?? null,
    quote: payload?.quote ?? null,
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
  'h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10 sm:h-[3.25rem]';

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
  const stripeOrderingEnabled = data.stripeConnected !== false;
  const orderingBlockedMessage =
    data.orderingBlockedMessage ||
    'Online ordering is currently unavailable for this restaurant.';
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
  const taxRate = typeof data.transactionTaxRate === 'number' ? data.transactionTaxRate : 0;
  const serviceFeeCap = typeof data.serviceFeeCappedAt === 'number' ? data.serviceFeeCappedAt : 100;
  const [tipPreset, setTipPreset] = useState<TipPreset>('20');
  const [tipAmount, setTipAmount] = useState(0);
  const [customTipInput, setCustomTipInput] = useState('0.00');
  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarView, setAuthSidebarView] = useState<MenuAuthView>('login');
  const [contactFields, setContactFields] = useState<CheckoutContactFields>({
    phone: '',
    phoneCountryCode: '+1',
    firstName: '',
    lastName: '',
    email: '',
    emailOptIn: true,
    smsOptIn: true,
  });
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const isNavigatingToSuccess = useRef(false);
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
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isOrderSummaryDrawerOpen, setIsOrderSummaryDrawerOpen] =
    useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [isOffersSectionOpen, setIsOffersSectionOpen] = useState(false);
  const [isDeliveryDetailsSectionOpen, setIsDeliveryDetailsSectionOpen] =
    useState(true);
  const allowCashPickup = data.allowCashPickup === true;
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [loyaltyData, setLoyaltyData] = useState<{
    enabled: boolean;
    points_balance: number;
    lifetime_earned: number;
    redemption_rate: number;
    min_redemption_points: number;
    max_redemption_percentage: number;
    points_per_dollar: number;
  } | null>(null);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCheckingDeliveryQuote, setIsCheckingDeliveryQuote] = useState(false);
  const [deliveryQuote, setDeliveryQuote] =
    useState<CheckoutDeliveryQuote | null>(null);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState<string | null>(
    null,
  );
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
  } | null>(null);
  const [deliveryAddressData, setDeliveryAddressData] =
    useState<DeliveryAddressInput>(
      createManualDeliveryAddress(resolvedDeliveryAddress),
    );
  const [isEditingDeliveryAddress, setIsEditingDeliveryAddress] = useState(
    !resolvedDeliveryAddress.trim(),
  );
  const isDeliveryAddressValid = Boolean(
    trimDeliveryAddressText(deliveryAddressData.formattedAddress),
  );
  const isDeliveryDetailsComplete =
    isDeliveryAddressValid &&
    Boolean(deliveryAddressData.addressLine1?.trim()) &&
    Boolean(deliveryAddressData.city?.trim()) &&
    Boolean(deliveryAddressData.state?.trim()) &&
    Boolean(deliveryAddressData.postalCode?.trim()) &&
    Boolean(deliveryAddressData.countryCode?.trim()) &&
    Boolean(deliveryAddressData.houseFlatFloor?.trim()) &&
    Boolean(deliveryAddressData.label?.trim());
  const [savedAddresses, setSavedAddresses] = useState<
    Array<{
      id: string;
      address: string;
      street: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      zip_code: string | null;
      house_no: string | null;
      saved_as: string | null;
      nearby_landmark: string | null;
      is_default: boolean;
      place_id: string | null;
      latitude: string | null;
      longitude: string | null;
    }>
  >([]);
  const [savedAddressesLoaded, setSavedAddressesLoaded] = useState(false);
  const [showSavedAddressPicker, setShowSavedAddressPicker] = useState(false);
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

    const profilePhone = customerProfile.phone || '';
    let parsedCode = '+1';
    let parsedNumber = profilePhone;
    if (profilePhone.startsWith('+')) {
      const sorted = PHONE_COUNTRY_CODES.map((c) => c.code).sort(
        (a, b) => b.length - a.length,
      );
      for (const c of sorted) {
        if (profilePhone.startsWith(c)) {
          parsedCode = c;
          parsedNumber = profilePhone.slice(c.length);
          break;
        }
      }
    }

    setContactFields((current) => ({
      ...current,
      phone: current.phone || parsedNumber,
      phoneCountryCode: current.phone ? current.phoneCountryCode : parsedCode,
      firstName: current.firstName || firstName,
      lastName: current.lastName || lastName,
      email: current.email || customerProfile.email || '',
    }));
  }, [customerProfile]);

  // Fetch loyalty balance when customer session is available
  useEffect(() => {
    if (!restaurantId || !hasCustomerSession || isGuestCustomer) {
      setLoyaltyData(null);
      setLoyaltyPointsToRedeem(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/menu-orders/loyalty-balance?restaurant_id=${encodeURIComponent(restaurantId)}`,
          { credentials: 'same-origin' },
        );
        if (cancelled || !res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success) return;
        setLoyaltyData(json.data);
      } catch {
        // silent — loyalty is optional
      }
    })();

    return () => { cancelled = true; };
  }, [restaurantId, hasCustomerSession, isGuestCustomer]);

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
        phone: `${contactFields.phoneCountryCode}${contactFields.phone.trim()}`,
        emailOptIn: contactFields.emailOptIn,
        smsOptIn: contactFields.smsOptIn,
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
      setIsOffersSectionOpen(false);
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
      setIsOffersSectionOpen(false);
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

  const handleApplyPromoCode = async () => {
    if (!restaurantId) {
      setPromoError('Restaurant context is missing.');
      return;
    }

    const normalizedCode = promoCodeInput.trim().toUpperCase();
    if (!normalizedCode) {
      setPromoError('Enter a promo or gift card code.');
      return;
    }

    setPromoError(null);
    setIsApplyingPromo(true);

    try {
      // Try as coupon first
      const couponResult = await requestValidateCoupon(
        restaurantId,
        subtotal,
        normalizedCode,
      );

      if (couponResult.ok && couponResult.coupon) {
        setAppliedCoupon(couponResult.coupon);
        setCouponCodeInput(normalizedCode);
        setPromoCodeInput('');
        setIsOffersSectionOpen(false);
        toast.success(`${couponResult.coupon.code} applied.`);
        return;
      }

      // Try as gift card
      const normalizedEmail = contactFields.email.trim().toLowerCase();
      if (normalizedEmail) {
        const giftCardResult = await requestValidateGiftCard(
          restaurantId,
          normalizedEmail,
          normalizedCode,
        );

        if (giftCardResult.ok && giftCardResult.giftCard) {
          setAppliedGiftCard(giftCardResult.giftCard);
          setGiftCardCodeInput(normalizedCode);
          setPromoCodeInput('');
          setIsOffersSectionOpen(false);
          toast.success(`${giftCardResult.giftCard.code} redeemed.`);
          return;
        }

        // Both coupon and gift card failed
        setPromoError(
          giftCardResult.error ||
            'This code is not a valid coupon or gift card.',
        );
      } else {
        // No email — can't check gift card, show generic message
        setPromoError(
          'Code not recognised. For gift cards, enter your email first.',
        );
      }
    } finally {
      setIsApplyingPromo(false);
    }
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

  useEffect(() => {
    const storedDeliveryAddress = readStoredDeliveryAddress(restaurantId);

    if (storedDeliveryAddress?.formattedAddress) {
      setDeliveryAddressData(storedDeliveryAddress);
      setIsEditingDeliveryAddress(false);
      return;
    }

    if (resolvedDeliveryAddress.trim()) {
      setDeliveryAddressData((current) => {
        if (trimDeliveryAddressText(current.formattedAddress)) {
          return current;
        }

        return createManualDeliveryAddress(resolvedDeliveryAddress);
      });
      setIsEditingDeliveryAddress(false);
    }
  }, [restaurantId, resolvedDeliveryAddress]);

  // Fetch saved addresses for logged-in users in delivery mode
  useEffect(() => {
    if (
      !hasCustomerSession ||
      isGuestCustomer ||
      fulfillmentMode !== 'delivery' ||
      savedAddressesLoaded
    ) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/menu-auth/addresses', {
          credentials: 'same-origin',
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const addrs = json.addresses || [];
        if (cancelled) return;
        setSavedAddresses(addrs);
        setSavedAddressesLoaded(true);

        // Auto-pick default address if no address is set yet
        const storedDeliveryAddress = readStoredDeliveryAddress(restaurantId);
        if (storedDeliveryAddress?.formattedAddress) return;

        const currentAddr = trimDeliveryAddressText(
          deliveryAddressData.formattedAddress,
        );
        const defaultAddr = trimDeliveryAddressText(
          data.defaultDeliveryAddress,
        );
        if (currentAddr && currentAddr !== defaultAddr) return;

        const defaultSaved =
          addrs.find((a: { is_default: boolean }) => a.is_default) || addrs[0];
        if (!defaultSaved) return;

        setDeliveryAddressData({
          formattedAddress: defaultSaved.address || '',
          placeId: defaultSaved.place_id || undefined,
          addressLine1: defaultSaved.address || undefined,
          addressLine2: defaultSaved.street || undefined,
          city: defaultSaved.city || undefined,
          state: defaultSaved.state || undefined,
          postalCode: defaultSaved.zip_code || undefined,
          countryCode: defaultSaved.country || undefined,
          latitude: defaultSaved.latitude
            ? parseFloat(defaultSaved.latitude)
            : undefined,
          longitude: defaultSaved.longitude
            ? parseFloat(defaultSaved.longitude)
            : undefined,
          houseFlatFloor: defaultSaved.house_no || undefined,
          landmark: defaultSaved.nearby_landmark || undefined,
          label: defaultSaved.saved_as || undefined,
          source: 'saved',
        });
        setIsEditingDeliveryAddress(false);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasCustomerSession,
    isGuestCustomer,
    fulfillmentMode,
    savedAddressesLoaded,
    restaurantId,
    data.defaultDeliveryAddress,
    deliveryAddressData.formattedAddress,
  ]);

  useEffect(() => {
    writeStoredDeliveryAddress(restaurantId, deliveryAddressData);
  }, [restaurantId, deliveryAddressData]);

  useEffect(() => {
    if (!trimDeliveryAddressText(deliveryAddressData.formattedAddress)) {
      setIsEditingDeliveryAddress(true);
    }
  }, [deliveryAddressData.formattedAddress]);

  useEffect(() => {
    if (fulfillmentMode !== 'delivery') {
      setIsCheckingDeliveryQuote(false);
      setDeliveryQuote(null);
      setDeliveryQuoteError(null);
      return;
    }

    if (!restaurantId || !isDeliveryAddressValid || subtotal <= 0) {
      setIsCheckingDeliveryQuote(false);
      setDeliveryQuote(null);
      setDeliveryQuoteError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsCheckingDeliveryQuote(true);
      setDeliveryQuote(null);
      setDeliveryQuoteError(null);
      void requestDeliveryQuote(
        restaurantId,
        selectedLocation?.id || locationId || restaurantId,
        subtotal,
        deliveryAddressData,
        controller.signal,
      )
        .then((payload) => {
          if (!payload.ok || !payload.available || !payload.quote) {
            setDeliveryQuote(null);
            setDeliveryQuoteError(
              payload.error ??
                'Delivery is unavailable for this address right now.',
            );
            return;
          }

          setDeliveryQuote(payload.quote);
          setDeliveryQuoteError(null);
        })
        .catch((error) => {
          if (controller.signal.aborted) {
            return;
          }

          setDeliveryQuote(null);
          setDeliveryQuoteError(
            error instanceof Error
              ? error.message
              : 'Unable to check delivery availability right now.',
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsCheckingDeliveryQuote(false);
          }
        });
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    deliveryAddressData,
    fulfillmentMode,
    isDeliveryAddressValid,
    locationId,
    restaurantId,
    selectedLocation?.id,
    subtotal,
  ]);

  const handleDeliveryAddressChange = (nextAddress: string) => {
    const normalizedAddress = trimDeliveryAddressText(nextAddress);
    setIsEditingDeliveryAddress(true);
    setDeliveryAddressData((current) => {
      if (
        normalizedAddress &&
        normalizedAddress === trimDeliveryAddressText(current.formattedAddress)
      ) {
        return {
          ...current,
          formattedAddress: normalizedAddress,
        };
      }

      return {
        ...createManualDeliveryAddress(nextAddress),
        houseFlatFloor: current.houseFlatFloor,
        landmark: current.landmark,
        instructions: current.instructions,
        label: current.label,
      };
    });
  };

  const handleDeliveryAddressPlaceSelected = (place: SelectedGooglePlace) => {
    setDeliveryAddressData((current) => ({
      ...current,
      ...createDeliveryAddressFromPlace(place),
    }));
    setIsEditingDeliveryAddress(false);
  };

  const handleSelectSavedAddress = (addr: (typeof savedAddresses)[number]) => {
    setDeliveryAddressData({
      formattedAddress: addr.address || '',
      placeId: addr.place_id || undefined,
      addressLine1: addr.address || undefined,
      addressLine2: addr.street || undefined,
      city: addr.city || undefined,
      state: addr.state || undefined,
      postalCode: addr.zip_code || undefined,
      countryCode: addr.country || undefined,
      latitude: addr.latitude ? parseFloat(addr.latitude) : undefined,
      longitude: addr.longitude ? parseFloat(addr.longitude) : undefined,
      houseFlatFloor: addr.house_no || undefined,
      landmark: addr.nearby_landmark || undefined,
      label: addr.saved_as || undefined,
      source: 'saved',
    });
    setIsEditingDeliveryAddress(false);
    setShowSavedAddressPicker(false);
  };

  const handleDeliveryAddressFieldChange = (
    field:
      | 'addressLine1'
      | 'addressLine2'
      | 'city'
      | 'state'
      | 'postalCode'
      | 'countryCode',
    fieldValue: string,
  ) => {
    setDeliveryAddressData((current) => {
      const nextDeliveryAddress = {
        ...current,
        [field]: fieldValue.trim() ? fieldValue.trim() : undefined,
      } satisfies DeliveryAddressInput;
      const formattedAddress =
        buildStructuredDeliveryAddressText(nextDeliveryAddress);

      return {
        ...nextDeliveryAddress,
        formattedAddress:
          formattedAddress || trimDeliveryAddressText(current.formattedAddress),
      };
    });
  };

  const handleDeliveryAddressMetaChange = (
    field: 'houseFlatFloor' | 'landmark' | 'instructions' | 'label',
    fieldValue: string,
  ) => {
    setDeliveryAddressData((current) => ({
      ...current,
      [field]: fieldValue.trim() ? fieldValue.trim() : undefined,
    }));
  };

  const handleLogout = async () => {
    await logout();
    applyCustomerProfile(null);
    closeAuthSidebar();
  };

  const navigateToSuccess = (orderNumber?: string, orderTotal?: number) => {
    const successParams = new URLSearchParams();
    if (orderNumber) {
      successParams.set('orderNumber', orderNumber);
    }
    if (typeof orderTotal === 'number') {
      successParams.set('total', orderTotal.toFixed(2));
    }
    successParams.set('mode', fulfillmentMode);
    if (scheduleLabel) {
      successParams.set('schedule', scheduleLabel);
    }
    if (brandName) {
      successParams.set('restaurant', brandName);
    }
    if (subtotal > 0) {
      successParams.set('subtotal', subtotal.toFixed(2));
    }
    if (taxAmount > 0) {
      successParams.set('tax', taxAmount.toFixed(2));
    }
    if (tipsEnabled && tipAmount > 0) {
      successParams.set('tip', tipAmount.toFixed(2));
    }
    const discountAmount =
      appliedCoupon?.discountAmount ||
      activeRestaurantOffer?.discountAmount ||
      0;
    if (discountAmount > 0) {
      successParams.set('discount', discountAmount.toFixed(2));
    }
    if (contactFields.firstName.trim()) {
      successParams.set(
        'name',
        `${contactFields.firstName.trim()} ${contactFields.lastName.trim()}`.trim(),
      );
    }
    if (contactFields.email.trim()) {
      successParams.set('email', contactFields.email.trim());
    }
    if (contactFields.phone.trim()) {
      successParams.set(
        'phone',
        `${contactFields.phoneCountryCode}${contactFields.phone.trim()}`,
      );
    }
    if (
      fulfillmentMode === 'delivery' &&
      trimDeliveryAddressText(deliveryAddressData.formattedAddress)
    ) {
      successParams.set(
        'address',
        trimDeliveryAddressText(deliveryAddressData.formattedAddress),
      );
    }
    successParams.set('payment', paymentMethod);

    isNavigatingToSuccess.current = true;
    clearCart();

    const successQuery = successParams.toString();
    router.replace(
      successQuery
        ? '/menu/checkout/success?' + successQuery
        : '/menu/checkout/success',
    );
    router.refresh();
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

    if (fulfillmentMode === 'delivery' && !isDeliveryAddressValid) {
      setIsDeliveryDetailsSectionOpen(true);
      setCheckoutError(
        'Enter a valid delivery address before placing a delivery order.',
      );
      document
        .getElementById('delivery-address-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (fulfillmentMode === 'delivery' && !isDeliveryDetailsComplete) {
      setIsDeliveryDetailsSectionOpen(true);
      setCheckoutError(
        'Please fill in all required delivery details: street address, city, state, postal code, country, house/flat/floor, and save address label.',
      );
      document
        .getElementById('delivery-address-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (fulfillmentMode === 'delivery' && isCheckingDeliveryQuote) {
      setIsDeliveryDetailsSectionOpen(true);
      setCheckoutError(
        'Still checking delivery availability. Please wait a moment.',
      );
      return;
    }

    if (fulfillmentMode === 'delivery' && !deliveryQuote) {
      setIsDeliveryDetailsSectionOpen(true);
      setCheckoutError(
        deliveryQuoteError ||
          'Delivery is unavailable for this address right now.',
      );
      document
        .getElementById('delivery-address-section')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const isCashOrder = fulfillmentMode === 'pickup' && allowCashPickup && paymentMethod === 'cash';

    if (!isCashOrder && !stripeOrderingEnabled) {
      setCheckoutError(orderingBlockedMessage);
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
            fulfillmentMode === 'delivery'
              ? trimDeliveryAddressText(deliveryAddressData.formattedAddress)
              : null,
          deliveryAddressData:
            fulfillmentMode === 'delivery' ? deliveryAddressData : null,
          contact: {
            firstName: contactFields.firstName,
            lastName: contactFields.lastName,
            email: contactFields.email,
            phone: `${contactFields.phoneCountryCode}${contactFields.phone.trim()}`,
          },
          items,
          tipAmount: tipsEnabled ? tipAmount : 0,
          loyaltyPointsToRedeem: loyaltyPointsToRedeem > 0 ? loyaltyPointsToRedeem : 0,
          paymentMethod: isCashOrder ? 'cash' : 'card',
          deliveryQuote: fulfillmentMode === 'delivery' ? deliveryQuote : null,
          couponCode: appliedCoupon?.code || null,
          giftCardCode: appliedGiftCard?.code || null,
          orderNote: cartNote,
          emailOptIn: contactFields.emailOptIn,
          smsOptIn: contactFields.smsOptIn,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        message?: string;
        clientSecret?: string;
        order?: {
          orderId?: string;
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

      if (payload?.clientSecret) {
        setClientSecret(payload.clientSecret);
        setPendingOrderData({
          orderId: payload.order?.orderId || '',
          orderNumber: payload.order?.orderNumber || '',
          total: payload.order?.total ?? 0,
        });
      } else {
        navigateToSuccess(payload?.order?.orderNumber, payload?.order?.total);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isHydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  if (!items.length && !clientSecret && !isNavigatingToSuccess.current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
            <BagIcon className="h-7 w-7 text-stone-400" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
            Your cart is empty
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            Looks like you haven&apos;t added anything yet. Head back to the
            menu to start your order.
          </p>
          <Link
            href="/menu"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Browse menu
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
    ? 'Your custom discount is active. Please note that restaurant promotional offers cannot be combined with this discount.'
    : activeRestaurantOffer
      ? `${activeRestaurantOffer.headline} auto-applies, saving ${formatPrice(activeRestaurantOffer.discountAmount)}.`
      : restaurantOfferCount > 0
        ? `${restaurantOfferCount} restaurant offer${restaurantOfferCount === 1 ? '' : 's'} available.`
        : 'No restaurant offers available right now.';
  const effectiveTipAmount = tipsEnabled ? tipAmount : 0;
  const deliveryFeeAmount =
    fulfillmentMode === 'delivery' ? (deliveryQuote?.deliveryFee ?? 0) : 0;
  const discountAmount =
    appliedCoupon?.discountAmount || activeRestaurantOffer?.discountAmount || 0;
  const loyaltyDiscountAmount = loyaltyData?.enabled && loyaltyPointsToRedeem > 0
      && loyaltyPointsToRedeem >= (loyaltyData.min_redemption_points || 0)
    ? roundCurrency(
        Math.min(
          loyaltyPointsToRedeem * (loyaltyData.redemption_rate || 0.01),
          subtotal * ((loyaltyData.max_redemption_percentage || 50) / 100),
        ),
      )
    : 0;
  const taxAmount = taxRate > 0
    ? roundCurrency(Math.min(subtotal * (taxRate / 100), serviceFeeCap > 0 ? serviceFeeCap : Infinity))
    : 0;
  const preGiftCardTotal = roundCurrency(
    subtotal +
      deliveryFeeAmount +
      effectiveTipAmount +
      taxAmount -
      discountAmount -
      loyaltyDiscountAmount,
  );
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
  const loyaltyPointsPerDollar = loyaltyData?.points_per_dollar || data.loyaltyPointsPerDollar || 0;
  const loyaltyPointsEarned = loyaltyPointsPerDollar > 0 ? Math.floor(subtotal * loyaltyPointsPerDollar) : 0;
  const orderSummaryPanel = (
    <div className="p-4 sm:p-5 lg:sticky lg:top-0 lg:z-10 lg:flex lg:max-h-screen lg:flex-col lg:overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-950">
          Order summary
        </h2>
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </span>
      </div>
      <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
        <div className="space-y-0 divide-y divide-stone-100">
          {items.map((item) => {
            const addOnTotal = item.selectedAddOns.reduce(
              (sum, addOn) => sum + addOn.price,
              0,
            );
            return (
              <div
                key={item.key}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {item.parentName || item.name}
                      </p>
                      {item.parentName ? (
                        <p className="truncate text-xs text-slate-500">
                          {item.name}
                        </p>
                      ) : null}
                      {item.selectedAddOns.length ? (
                        <p className="mt-0.5 text-[11px] leading-4 text-stone-400">
                          {item.selectedAddOns
                            .map((addOn) => addOn.name)
                            .join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-slate-950">
                      {formatPrice(
                        getCartItemTotal(
                          item.basePrice,
                          addOnTotal,
                          item.quantity,
                        ),
                      )}
                    </p>
                  </div>
                  <div className="mt-2">
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

        {cartNote.trim() ? (
          <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
              Note
            </p>
            <p className="mt-1 leading-5">{cartNote.trim()}</p>
          </div>
        ) : null}
      </div>

      {/* Offers & gift cards */}
      <div className="mt-5 pt-4 lg:mt-auto">
        <button
          type="button"
          onClick={() => setIsOffersSectionOpen((current) => !current)}
          className="group flex w-full items-center gap-3 text-left"
          aria-expanded={isOffersSectionOpen}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50">
            <svg
              className="h-4 w-4 text-amber-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 12H16c-.7 2-2 3-4 3s-3.3-1-4-3H2.5" />
              <path d="M5.5 5.1L2 12v6c0 1.1.9 2 2 2h16a2 2 0 002-2v-6l-3.4-6.9A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.1z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Offers & gift cards
            </p>
            <p className="mt-0.5 truncate text-xs text-stone-400">
              {appliedCoupon
                ? `Coupon ${appliedCoupon.code} applied`
                : appliedGiftCard
                  ? `Gift card ${appliedGiftCard.code} redeemed`
                  : activeRestaurantOffer
                    ? activeRestaurantOffer.headline
                    : 'Have a promo code or gift card?'}
            </p>
          </div>
          {appliedCoupon || appliedGiftCard || activeRestaurantOffer ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Saving {formatPrice(discountAmount + giftCardAppliedAmount)}
            </span>
          ) : null}
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${isOffersSectionOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOffersSectionOpen ? (
          <div className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
            {/* Applied coupon card */}
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <svg
                      className="h-5 w-5 text-emerald-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs font-semibold text-emerald-800">
                        {appliedCoupon.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-emerald-700">
                      You save {formatPrice(appliedCoupon.discountAmount)} on
                      this order
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCoupon()}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
                >
                  Remove
                </button>
              </div>
            ) : null}

            {/* Applied gift card card */}
            {appliedGiftCard ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                    <svg
                      className="h-5 w-5 text-violet-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="8" width="18" height="4" rx="1" />
                      <path d="M12 8v13" />
                      <path d="M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
                      <path d="M7.5 8a2.5 2.5 0 010-5A4.8 8 0 0112 8a4.8 8 0 014.5-5 2.5 2.5 0 010 5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {appliedGiftCard.code}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-violet-700">
                      Balance {formatPrice(appliedGiftCard.currentBalance)}{' '}
                      &middot; Applying {formatPrice(giftCardAppliedAmount)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveGiftCard}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 active:scale-95"
                >
                  Remove
                </button>
              </div>
            ) : null}

            {/* Combined promo / gift card input */}
            {!appliedCoupon || !appliedGiftCard ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-stone-500">
                  Promo or gift card code
                </label>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleApplyPromoCode();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(event) => {
                      setPromoCodeInput(event.target.value.toUpperCase());
                      if (promoError) {
                        setPromoError(null);
                      }
                    }}
                    placeholder="Enter code"
                    className="h-10 flex-1 rounded-lg border border-stone-200 bg-stone-50/60 px-3.5 text-sm font-medium uppercase tracking-wider text-slate-900 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                    disabled={isApplyingPromo}
                  />
                  <button
                    type="submit"
                    disabled={isApplyingPromo || !promoCodeInput.trim()}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:bg-stone-200 disabled:text-stone-400 active:scale-[0.97]"
                  >
                    {isApplyingPromo ? 'Applying...' : 'Apply'}
                  </button>
                </form>
                {promoError ? (
                  <p className="mt-1.5 text-xs text-red-600">{promoError}</p>
                ) : null}
              </div>
            ) : null}

            {/* Restaurant offers */}
            {restaurantOfferCount > 0 ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-100" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                      <svg
                        className="h-4 w-4 text-orange-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        {restaurantOfferCount}{' '}
                        {restaurantOfferCount === 1 ? 'offer' : 'offers'}{' '}
                        available
                      </p>
                      <p
                        className={`truncate text-[11px] ${appliedCoupon ? 'text-amber-600' : activeRestaurantOffer ? 'text-emerald-600' : 'text-stone-400'}`}
                      >
                        {appliedCoupon
                          ? 'Cannot combine with coupon'
                          : activeRestaurantOffer
                            ? `${activeRestaurantOffer.headline} \u2013 saving ${formatPrice(activeRestaurantOffer.discountAmount)}`
                            : 'Check available restaurant promotions'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOffersModalOpen(true)}
                    className="shrink-0 rounded-lg border border-stone-200 px-3.5 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-stone-50 active:scale-[0.97]"
                  >
                    View
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-stone-200 pt-4">
        <div className="mb-3 space-y-2.5 text-sm text-stone-600">
          <div className="flex items-center justify-between gap-4">
            <span>Subtotal</span>
            <span className="font-medium">{formatPrice(subtotal)}</span>
          </div>
          {fulfillmentMode === 'delivery' ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="flex flex-col">
                  <span>Delivery</span>
                  {deliveryQuote && deliveryQuote.etaMinutes !== null ? (
                    <span className="text-[11px] text-slate-500">
                      {deliveryQuote.provider === 'doordash_drive'
                        ? 'DoorDash'
                        : 'Uber Direct'}{' '}
                      est. {deliveryQuote.etaMinutes} min
                    </span>
                  ) : null}
                </span>
                <span className="font-medium">
                  {isCheckingDeliveryQuote
                    ? 'Calculating...'
                    : deliveryQuoteError
                      ? '--'
                      : formatPrice(deliveryFeeAmount)}
                </span>
              </div>
              {deliveryQuoteError && !isCheckingDeliveryQuote ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {deliveryQuoteError} Please try again later.
                </div>
              ) : null}
            </>
          ) : null}
          {taxAmount > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span>Service Fee ({taxRate}%)</span>
              <span className="font-medium">{formatPrice(taxAmount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span>Tip</span>
            <span className="font-medium">
              {formatPrice(effectiveTipAmount)}
            </span>
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
          {loyaltyDiscountAmount > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <span>Loyalty points</span>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  {loyaltyPointsToRedeem} pts
                </span>
              </span>
              <span className="font-medium text-emerald-700">
                - {formatPrice(loyaltyDiscountAmount)}
              </span>
            </div>
          ) : null}
        </div>

        {/* Loyalty Points — balance + redeem */}
        {loyaltyData?.enabled && hasCustomerSession && !isGuestCustomer && (loyaltyData.points_balance > 0 || loyaltyData.lifetime_earned > 0) ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-orange-50/80 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                  <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.28l-4.77 2.51.91-5.33L2.27 6.69l5.34-.78L10 1z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-amber-900">Loyalty Points</span>
              </div>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-amber-700">
                {loyaltyData.points_balance} pts
              </span>
            </div>
            {loyaltyData.lifetime_earned > 0 ? (
              <p className="mt-1.5 text-[10px] font-medium tabular-nums text-amber-700/70">
                Total earned: {loyaltyData.lifetime_earned.toLocaleString()} pts
              </p>
            ) : null}
            {loyaltyData.points_balance >= loyaltyData.min_redemption_points ? (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={loyaltyData.points_balance}
                    step={1}
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => setLoyaltyPointsToRedeem(Math.round(Number(e.target.value)))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-amber-200 accent-amber-600 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <input
                    type="number"
                    min={0}
                    max={loyaltyData.points_balance}
                    step={1}
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => {
                      const v = Math.round(Number(e.target.value) || 0);
                      setLoyaltyPointsToRedeem(Math.max(0, Math.min(v, loyaltyData.points_balance)));
                    }}
                    className="w-16 rounded-lg border border-amber-300 bg-white/80 px-2 py-1 text-center text-xs font-bold tabular-nums text-amber-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                  />
                  <span className="text-xs font-medium text-amber-700">pts</span>
                </div>
                {loyaltyPointsToRedeem > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 ring-1 ring-amber-200/60">
                    <span className="text-[11px] font-medium text-amber-800">
                      Redeeming {loyaltyPointsToRedeem} points
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      - {formatPrice(loyaltyDiscountAmount)}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700/70">
                    Slide or type points to redeem for a discount
                  </p>
                )}
              </div>
            ) : loyaltyData.points_balance > 0 ? (
              <p className="mt-2 text-[11px] text-amber-700/70">
                You need {loyaltyData.min_redemption_points} pts to start redeeming (worth ${(loyaltyData.min_redemption_points * loyaltyData.redemption_rate).toFixed(2)})
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-lg font-bold">{formatPrice(total)}</span>
        </div>

        {/* Points earned with this order */}
        {loyaltyPointsEarned > 0 ? (
          <div className="mt-2.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.28l-4.77 2.51.91-5.33L2.27 6.69l5.34-.78L10 1z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                {hasCustomerSession && !isGuestCustomer ? (
                  <p className="text-[11px] font-semibold text-amber-900 sm:text-xs">
                    You&apos;ll earn <span className="text-amber-700">{loyaltyPointsEarned} points</span> with this order
                  </p>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-amber-900 sm:text-xs">
                      Earn <span className="text-amber-700">{loyaltyPointsEarned} points</span> on this order
                    </p>
                    <p className="mt-0.5 text-[10px] text-amber-700/80">
                      Sign in or create an account to start earning
                    </p>
                  </>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700">
                +{loyaltyPointsEarned}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-24 lg:h-screen lg:overflow-hidden lg:pb-0">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-slate-950"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Back to menu</span>
            <span className="sm:hidden">Menu</span>
          </Link>
          <h1 className="text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
            {brandName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Secure checkout</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6 sm:pt-6 lg:px-8 lg:pt-6">
        <div className="grid gap-6 lg:h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,660px)_420px] lg:justify-center lg:overflow-hidden lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,720px)_440px]">
          <div className="space-y-6 lg:h-full lg:overflow-y-auto lg:pr-5 lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.75rem]">
                Checkout
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Complete your order details below
              </p>
            </div>

            {customerProfile ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                      {(customerProfile.name?.[0] || 'G').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                        {isGuestCustomer ? 'Guest' : 'Signed in'}
                      </p>
                      <p className="text-sm font-semibold text-slate-950">
                        {customerProfile.name}
                      </p>
                      <p className="text-xs text-stone-500">
                        {customerProfile.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isGuestCustomer ? (
                      <button
                        type="button"
                        onClick={() => openAuthSidebar('signup')}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.97]"
                      >
                        Create account
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-4 text-xs font-semibold text-stone-600 transition hover:bg-stone-50 active:scale-[0.97]"
                      >
                        Log out
                      </button>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {!stripeOrderingEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
                <p className="font-semibold">Online ordering is unavailable</p>
                <p className="mt-1 leading-6 text-amber-800">
                  {orderingBlockedMessage}
                </p>
              </div>
            ) : null}

            {fulfillmentMode === 'pickup' ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Pickup details
                  </h2>
                </div>
                <div className="ml-3.5 border-l-2 border-stone-200 pl-3 sm:pl-6">
                  <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <MapPinIcon className="h-4 w-4 shrink-0 text-stone-400" />
                      <span className="font-medium">
                        {selectedLocation?.fullAddress ||
                          'Location unavailable'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-900">
                      <ClockIcon className="h-4 w-4 shrink-0 text-stone-400" />
                      <span className="font-medium">{scheduleLabel}</span>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section id="delivery-address-section" className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    1
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Delivery details
                  </h2>
                </div>
                <div className="ml-3.5 border-l-2 border-stone-200 pl-3 sm:pl-6">
                  <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setIsDeliveryDetailsSectionOpen((current) => !current)
                      }
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                      aria-expanded={isDeliveryDetailsSectionOpen}
                      aria-controls="delivery-details-panel"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100">
                          <BikeIcon className="h-4 w-4 text-stone-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {isDeliveryAddressValid
                              ? 'Delivery address'
                              : 'Add delivery address'}
                          </p>
                          <p className="mt-0.5 text-xs text-stone-500">
                            {isDeliveryAddressValid
                              ? deliveryAddressData.formattedAddress
                              : 'Enter your drop-off address and instructions'}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100">
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform duration-200 ${isDeliveryDetailsSectionOpen ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </button>

                    {isDeliveryDetailsSectionOpen ? (
                      <div
                        id="delivery-details-panel"
                        className="space-y-4 border-t border-stone-200 px-4 py-4 sm:px-5 sm:py-4"
                      >
                        {isDeliveryAddressValid &&
                        !isEditingDeliveryAddress &&
                        !showSavedAddressPicker ? (
                          <div className="rounded-[18px] border border-stone-200 bg-stone-50 p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Selected address
                                  {deliveryAddressData.label ? (
                                    <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-600">
                                      {deliveryAddressData.label}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-sm font-semibold leading-6 text-slate-950">
                                  {deliveryAddressData.formattedAddress}
                                </p>
                                {deliveryAddressData.houseFlatFloor ||
                                deliveryAddressData.landmark ? (
                                  <p className="text-sm leading-6 text-stone-600">
                                    {[
                                      deliveryAddressData.houseFlatFloor,
                                      deliveryAddressData.landmark,
                                    ]
                                      .filter(Boolean)
                                      .join(' | ')}
                                  </p>
                                ) : (
                                  <p className="text-sm leading-6 text-stone-500">
                                    Add flat, landmark, and instructions below.
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    hasCustomerSession &&
                                    !isGuestCustomer &&
                                    savedAddresses.length > 0
                                  ) {
                                    setShowSavedAddressPicker(true);
                                  } else {
                                    setIsEditingDeliveryAddress(true);
                                  }
                                }}
                                className="inline-flex h-10 shrink-0 items-center justify-center rounded-[12px] border border-stone-300 bg-white px-3.5 text-sm font-medium text-slate-900 transition hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                              >
                                Change address
                              </button>
                            </div>
                          </div>
                        ) : showSavedAddressPicker &&
                          savedAddresses.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                Saved addresses
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSavedAddressPicker(false);
                                  setIsEditingDeliveryAddress(true);
                                }}
                                className="text-xs font-semibold text-slate-900 underline underline-offset-2 transition hover:text-slate-700"
                              >
                                Enter new address
                              </button>
                            </div>
                            <div className="space-y-2">
                              {savedAddresses.map((addr) => {
                                const isSelected =
                                  trimDeliveryAddressText(
                                    deliveryAddressData.formattedAddress,
                                  ) === trimDeliveryAddressText(addr.address);
                                return (
                                  <button
                                    key={addr.id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectSavedAddress(addr)
                                    }
                                    className={`w-full rounded-[14px] border p-3.5 text-left transition ${
                                      isSelected
                                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900/10'
                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <span
                                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                          isSelected
                                            ? 'border-slate-900'
                                            : 'border-stone-300'
                                        }`}
                                      >
                                        {isSelected ? (
                                          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                                        ) : null}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-semibold text-slate-950 truncate">
                                            {addr.address}
                                          </p>
                                          {addr.is_default ? (
                                            <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                                              Default
                                            </span>
                                          ) : null}
                                        </div>
                                        {addr.saved_as ||
                                        addr.house_no ||
                                        addr.nearby_landmark ? (
                                          <p className="mt-0.5 text-xs text-stone-500">
                                            {[
                                              addr.saved_as
                                                ? addr.saved_as
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                  addr.saved_as.slice(1)
                                                : null,
                                              addr.house_no,
                                              addr.nearby_landmark,
                                            ]
                                              .filter(Boolean)
                                              .join(' - ')}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {isDeliveryAddressValid ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowSavedAddressPicker(false)
                                  }
                                  className="inline-flex h-10 items-center justify-center rounded-[12px] border border-stone-300 bg-stone-50 px-3.5 text-sm font-medium text-slate-900 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                                >
                                  Done
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {hasCustomerSession &&
                            !isGuestCustomer &&
                            savedAddresses.length > 0 ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingDeliveryAddress(false);
                                    setShowSavedAddressPicker(true);
                                  }}
                                  className="text-xs font-semibold text-slate-900 underline underline-offset-2 transition hover:text-slate-700"
                                >
                                  Choose from saved addresses
                                </button>
                              </div>
                            ) : null}
                            <DeliveryAddressInputField
                              value={deliveryAddressData.formattedAddress}
                              onChange={handleDeliveryAddressChange}
                              onPlaceSelected={
                                handleDeliveryAddressPlaceSelected
                              }
                            />
                            {isDeliveryAddressValid ? (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingDeliveryAddress(false);
                                    setShowSavedAddressPicker(false);
                                  }}
                                  className="inline-flex h-10 items-center justify-center rounded-[12px] border border-stone-300 bg-stone-50 px-3.5 text-sm font-medium text-slate-900 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                                >
                                  Use this address
                                </button>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {isDeliveryAddressValid ? (
                          <div className="rounded-[18px] border border-stone-200 bg-stone-50 p-4 sm:p-5">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-slate-950">
                                    Exact delivery details
                                  </p>
                                  <p className="mt-1 text-sm text-stone-600">
                                    Add the last-mile notes your courier will
                                    need.
                                  </p>
                                </div>
                                {deliveryAddressData.label ? (
                                  <span className="inline-flex h-9 items-center rounded-full border border-stone-300 bg-white px-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
                                    {deliveryAddressData.label
                                      .charAt(0)
                                      .toUpperCase() +
                                      deliveryAddressData.label.slice(1)}
                                  </span>
                                ) : null}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-slate-900 sm:col-span-2">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    Street address{' '}
                                    <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={
                                      deliveryAddressData.addressLine1 || ''
                                    }
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'addressLine1',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="House number, street, road"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900 sm:col-span-2">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    Address line 2
                                  </span>
                                  <input
                                    type="text"
                                    value={
                                      deliveryAddressData.addressLine2 || ''
                                    }
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'addressLine2',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Apartment, suite, area, or building"
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    City <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={deliveryAddressData.city || ''}
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'city',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="City"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    State{' '}
                                    <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={deliveryAddressData.state || ''}
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'state',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="State"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    Postal code{' '}
                                    <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={deliveryAddressData.postalCode || ''}
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'postalCode',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Postal code"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    Country{' '}
                                    <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={
                                      deliveryAddressData.countryCode || ''
                                    }
                                    onChange={(event) =>
                                      handleDeliveryAddressFieldChange(
                                        'countryCode',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Country"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    House / Flat / Floor{' '}
                                    <span className="text-red-500">*</span>
                                  </span>
                                  <input
                                    type="text"
                                    value={
                                      deliveryAddressData.houseFlatFloor || ''
                                    }
                                    onChange={(event) =>
                                      handleDeliveryAddressMetaChange(
                                        'houseFlatFloor',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g., Apt 4B, Floor 2"
                                    required
                                    className={fieldClassName}
                                  />
                                </label>
                                <label className="block text-sm font-medium text-slate-900">
                                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                    Nearby landmark
                                  </span>
                                  <input
                                    type="text"
                                    value={deliveryAddressData.landmark || ''}
                                    onChange={(event) =>
                                      handleDeliveryAddressMetaChange(
                                        'landmark',
                                        event.target.value,
                                      )
                                    }
                                    placeholder="e.g., Near City Mall"
                                    className={fieldClassName}
                                  />
                                </label>
                              </div>

                              <div>
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Save address as{' '}
                                  <span className="text-red-500">*</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {['home', 'work', 'other'].map(
                                    (labelOption) => {
                                      const isSelected =
                                        deliveryAddressData.label ===
                                        labelOption;
                                      return (
                                        <button
                                          key={labelOption}
                                          type="button"
                                          onClick={() =>
                                            handleDeliveryAddressMetaChange(
                                              'label',
                                              isSelected ? '' : labelOption,
                                            )
                                          }
                                          className={`h-10 rounded-[12px] border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                                            isSelected
                                              ? 'border-black/60 bg-black text-white'
                                              : 'border-stone-300 bg-white text-slate-900 hover:border-stone-400 hover:bg-stone-50'
                                          }`}
                                        >
                                          {labelOption.charAt(0).toUpperCase() +
                                            labelOption.slice(1)}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-[16px] border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                            Search your delivery address above, then add the
                            exact drop-off details.
                          </div>
                        )}

                        <div className="border-t border-stone-200 pt-4">
                          <p className="flex items-start gap-3 text-sm leading-6 text-slate-900">
                            <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{scheduleLabel}</span>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            )}

            {tipsEnabled ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {fulfillmentMode === 'delivery' ? '2' : '2'}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Add a tip
                  </h2>
                </div>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
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
                        className={`group relative rounded-xl border-2 px-3 py-3 text-center transition-all active:scale-[0.97] ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                            : 'border-stone-200 bg-white text-slate-700 hover:border-stone-300'
                        }`}
                      >
                        <div className="text-xs font-bold tracking-wide">
                          {preset.percent}
                        </div>
                        <div
                          className={`mt-0.5 text-sm font-semibold ${selected ? 'text-white' : 'text-slate-950'}`}
                        >
                          {formatPrice(preset.amount)}
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
                    className={`group relative rounded-xl border-2 px-3 py-3 text-center transition-all active:scale-[0.97] ${
                      tipPreset === 'custom'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-stone-200 bg-white text-slate-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="text-xs font-bold tracking-wide">Other</div>
                    <div
                      className={`mt-0.5 text-sm font-semibold ${tipPreset === 'custom' ? 'text-white' : 'text-slate-950'}`}
                    >
                      {tipPreset === 'custom' ? formatPrice(tipAmount) : '...'}
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

            <section id="checkout-contact-fields" className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {tipsEnabled ? '3' : '2'}
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Your information
                </h2>
              </div>

              {!hasCustomerSession ? (
                <div className="rounded-2xl border border-stone-200 bg-gradient-to-r from-slate-50 to-stone-50 p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/5">
                      <svg className="h-5 w-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Login to use your saved info and loyalty points
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        or continue as guest below
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAuthSidebar('login')}
                      className="mt-1 inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                    >
                      Sign In
                    </button>
                    <p className="text-xs text-stone-500">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => openAuthSidebar('signup')}
                        className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-stone-500">
                        First name
                      </span>
                      <input
                        type="text"
                        placeholder="John"
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
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-stone-500">
                        Last name
                      </span>
                      <input
                        type="text"
                        placeholder="Doe"
                        className={fieldClassName}
                        value={contactFields.lastName}
                        onChange={(event) =>
                          handleContactFieldChange(
                            'lastName',
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-stone-500">
                      Email address
                    </span>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      className={fieldClassName}
                      value={contactFields.email}
                      onChange={(event) =>
                        handleContactFieldChange('email', event.target.value)
                      }
                    />
                  </label>
                  <div className="block">
                    <span className="mb-1.5 block text-xs font-medium text-stone-500">
                      Mobile number
                    </span>
                    <div className="flex gap-2">
                      <select
                        value={contactFields.phoneCountryCode}
                        onChange={(event) =>
                          handleContactFieldChange(
                            'phoneCountryCode',
                            event.target.value,
                          )
                        }
                        className={fieldClassName}
                        style={{ width: '120px', flexShrink: 0 }}
                      >
                        {PHONE_COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        placeholder="(555) 555-5555"
                        className={fieldClassName}
                        value={contactFields.phone}
                        onChange={(event) =>
                          handleContactFieldChange('phone', event.target.value)
                        }
                      />
                    </div>
                  </div>
                  {!hasCustomerSession && (
                    <div className="space-y-2.5 pt-1">
                      <label className="flex items-center gap-3 text-sm text-stone-600">
                        <input
                          type="checkbox"
                          checked={contactFields.emailOptIn}
                          onChange={(e) =>
                            setContactFields((prev) => ({
                              ...prev,
                              emailOptIn: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-stone-300 accent-slate-900"
                        />
                        Get promotional emails from {data.restaurant.name}
                      </label>
                      <label className="flex items-center gap-3 text-sm text-stone-600">
                        <input
                          type="checkbox"
                          checked={contactFields.smsOptIn}
                          onChange={(e) =>
                            setContactFields((prev) => ({
                              ...prev,
                              smsOptIn: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-stone-300 accent-slate-900"
                        />
                        Get promotional texts from {data.restaurant.name}
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Loyalty redemption moved to order summary panel */}

            {fulfillmentMode === 'pickup' && allowCashPickup ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold tracking-tight text-slate-950">Payment method</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      paymentMethod === 'card'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                    Pay with card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      paymentMethod === 'cash'
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><line x1="2" y1="10" x2="4" y2="10" /><line x1="20" y1="10" x2="22" y2="10" /><line x1="2" y1="14" x2="4" y2="14" /><line x1="20" y1="14" x2="22" y2="14" /></svg>
                    Pay with cash
                  </button>
                </div>
                {paymentMethod === 'cash' ? (
                  <p className="mt-2.5 text-xs text-stone-500">
                    Pay with cash when you pick up your order.
                  </p>
                ) : null}
              </section>
            ) : null}

            {checkoutError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800">
                {checkoutError}
              </div>
            ) : null}

            <div className="space-y-4 pb-10">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  (paymentMethod !== 'cash' && !stripeOrderingEnabled) ||
                  isPlacingOrder ||
                  (fulfillmentMode === 'delivery' &&
                    (isCheckingDeliveryQuote ||
                      !deliveryQuote ||
                      !isDeliveryDetailsComplete))
                }
                className="relative flex h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none active:scale-[0.98] sm:max-w-xs"
              >
                <ShieldIcon className="h-4 w-4" />
                {isPlacingOrder
                  ? 'Preparing checkout...'
                  : paymentMethod !== 'cash' && !stripeOrderingEnabled
                    ? 'Ordering unavailable'
                    : fulfillmentMode === 'delivery' && isCheckingDeliveryQuote
                      ? 'Checking delivery...'
                      : fulfillmentMode === 'delivery' && deliveryQuoteError
                        ? 'Delivery unavailable'
                        : paymentMethod === 'cash'
                          ? `Place order \u00B7 ${formatPrice(total)}`
                          : `Continue to payment \u00B7 ${formatPrice(total)}`}
              </button>
              <p className="max-w-sm text-xs leading-5 text-stone-400">
                By placing your order you agree to receive transactional order
                updates and marketing communications.
              </p>
            </div>
          </div>

          <aside className="hidden lg:block lg:h-full lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-stone-200 lg:bg-white lg:shadow-sm lg:[-ms-overflow-style:none] lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
            {orderSummaryPanel}
          </aside>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-white/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setIsOrderSummaryDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-5 py-3.5 text-white shadow-lg shadow-slate-900/20 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/20 text-xs font-bold">
              {itemCount}
            </span>
            <span className="text-sm font-semibold">View order</span>
          </div>
          <span className="text-sm font-bold">{formatPrice(total)}</span>
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
          <div className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_48px_rgba(15,23,42,0.15)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-stone-200" />
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOrderSummaryDrawerOpen(false)}
                className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100"
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

      {/* Payment modal */}
      {clientSecret ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-stone-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-950">
                    Payment
                  </h3>
                  <p className="mt-0.5 text-sm text-stone-500">
                    Order{' '}
                    {pendingOrderData?.orderNumber
                      ? `#${pendingOrderData.orderNumber}`
                      : ''}{' '}
                    &middot; {formatPrice(pendingOrderData?.total ?? total)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClientSecret(null);
                    setPendingOrderData(null);
                  }}
                  disabled={isPaymentProcessing}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <StripePaymentProvider clientSecret={clientSecret}>
              <StripePaymentSection
                total={pendingOrderData?.total ?? total}
                onSuccess={async () => {
                  if (pendingOrderData?.orderId) {
                    try {
                      await fetch('/api/menu-orders/confirm-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: pendingOrderData.orderId }),
                      });
                    } catch {
                      // Webhook will handle as fallback
                    }
                  }
                  navigateToSuccess(
                    pendingOrderData?.orderNumber,
                    pendingOrderData?.total,
                  );
                }}
                onError={(message) => setCheckoutError(message)}
                onProcessingChange={setIsPaymentProcessing}
              />
            </StripePaymentProvider>
          </div>
        </div>
      ) : null}

      {/* Full-page processing overlay */}
      {isPlacingOrder || isPaymentProcessing ? (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-[3px] border-stone-200" />
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-black" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold tracking-tight text-slate-950">
                {isPaymentProcessing
                  ? 'Processing payment...'
                  : 'Preparing checkout...'}
              </p>
              <p className="mt-1.5 text-sm text-stone-500">
                Please do not close or refresh this page.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
