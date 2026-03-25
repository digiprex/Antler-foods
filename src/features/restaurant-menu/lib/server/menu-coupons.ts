import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GET_ACTIVE_COUPONS = `
  query GetActiveCoupons($restaurant_id: uuid!, $now: timestamptz!) {
    coupons(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        start_date: { _lte: $now }
        _or: [{ end_date: { _is_null: true } }, { end_date: { _gte: $now } }]
      }
    ) {
      coupon_id
      code
      discount_type
      value
      min_spend
      start_date
      end_date
    }
  }
`;


const GET_COUPON_BY_CODE = `
  query GetCouponByCode($restaurant_id: uuid!, $code: String!, $now: timestamptz!) {
    coupons(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _eq: false }
        code: { _ilike: $code }
        start_date: { _lte: $now }
        end_date: { _gte: $now }
      }
      limit: 1
    ) {
      coupon_id
      restaurant_id
      code
      discount_type
      value
      min_spend
      is_deleted
      start_date
      end_date
    }
  }
`;

interface CouponRecord {
  coupon_id?: string | null;
  restaurant_id?: string | null;
  code?: string | null;
  discount_type?: string | null;
  value?: number | string | null;
  min_spend?: number | string | null;
  is_deleted?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
}

interface GetActiveCouponsResponse {
  coupons?: CouponRecord[];
}


interface GetCouponByCodeResponse {
  coupons?: CouponRecord[];
}

export interface MenuCouponOffer {
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

interface ListMenuCouponsInput {
  restaurantId: string;
  subtotal: number;
}

export async function listMenuCoupons({ restaurantId, subtotal }: ListMenuCouponsInput) {
  const normalizedRestaurantId = requireUuid(restaurantId, 'A valid restaurant id is required.');
  const normalizedSubtotal = nonNegativeCurrency(subtotal);
  const now = new Date().toISOString();

  const data = await adminGraphqlRequest<GetActiveCouponsResponse>(GET_ACTIVE_COUPONS, {
    restaurant_id: normalizedRestaurantId,
    now,
  });

  const records = Array.isArray(data.coupons) ? data.coupons : [];
  const offers = records
    .map((record) => buildCouponOffer(record, normalizedSubtotal))
    .filter((offer): offer is MenuCouponOffer => Boolean(offer));

  offers.sort((left, right) => {
    if (left.isEligible !== right.isEligible) {
      return left.isEligible ? -1 : 1;
    }

    if (left.discountAmount !== right.discountAmount) {
      return right.discountAmount - left.discountAmount;
    }

    if (left.minSpend !== right.minSpend) {
      return left.minSpend - right.minSpend;
    }

    return left.code.localeCompare(right.code);
  });

  const bestEligibleIndex = offers.findIndex((offer) => offer.isEligible);
  return offers.map((offer, index) => ({
    ...offer,
    isBestOffer: bestEligibleIndex !== -1 && index == bestEligibleIndex,
  }));
}

export async function getCouponOfferByCode({ restaurantId, subtotal, code }: ListMenuCouponsInput & { code: string | null | undefined }) {
  try {
    return await validateMenuCouponCode({ restaurantId, subtotal, code });
  } catch {
    return null;
  }
}

export async function validateMenuCouponCode({
  restaurantId,
  subtotal,
  code,
}: ListMenuCouponsInput & { code: string | null | undefined }) {
  const normalizedRestaurantId = requireUuid(restaurantId, 'A valid restaurant id is required.');
  const normalizedSubtotal = nonNegativeCurrency(subtotal);
  const normalizedCode = normalizeCouponCode(code);

  if (!normalizedCode) {
    throw new Error('Enter a coupon code.');
  }

  const data = await adminGraphqlRequest<GetCouponByCodeResponse>(GET_COUPON_BY_CODE, {
    restaurant_id: normalizedRestaurantId,
    code: normalizedCode,
    now: new Date().toISOString(),
  });

  const record = Array.isArray(data.coupons) ? data.coupons[0] : null;
  if (!record) {
    throw new Error('Enter a valid coupon code.');
  }

  if (record.is_deleted) {
    throw new Error('Enter a valid coupon code.');
  }

  const recordRestaurantId = trimText(record.restaurant_id);
  if (!recordRestaurantId || recordRestaurantId !== normalizedRestaurantId) {
    throw new Error('This coupon does not belong to this restaurant.');
  }

  const now = new Date();
  const startDate = parseDate(record.start_date);
  const endDate = parseDate(record.end_date);

  if (startDate && startDate.getTime() > now.getTime()) {
    throw new Error('This coupon is not active yet.');
  }

  if (!endDate || endDate.getTime() < now.getTime()) {
    throw new Error('This coupon has expired.');
  }

  const offer = buildCouponOffer(record, normalizedSubtotal);
  if (!offer) {
    throw new Error('Enter a valid coupon code.');
  }

  if (!offer.isEligible) {
    throw new Error(offer.helperText);
  }

  return offer;
}

function buildCouponOffer(record: CouponRecord, subtotal: number): MenuCouponOffer | null {
  const couponId = trimText(record.coupon_id);
  const code = normalizeCouponCode(record.code);
  if (!couponId || !code) {
    return null;
  }

  const discountType = normalizeDiscountType(record.discount_type);
  const value = nonNegativeCurrency(record.value);
  const minSpend = nonNegativeCurrency(record.min_spend);
  const isEligible = subtotal >= minSpend && subtotal > 0;
  const rawDiscount = discountType === 'percent'
    ? subtotal * (value / 100)
    : value;
  const discountAmount = isEligible ? clampDiscount(roundCurrency(rawDiscount), subtotal) : 0;
  const shortfall = roundCurrency(Math.max(minSpend - subtotal, 0));

  return {
    couponId,
    code,
    discountType,
    value,
    minSpend,
    discountAmount,
    isEligible,
    title: discountType === 'percent' ? `${stripTrailingZeros(value)}% off` : `${formatPrice(value)} off`,
    description: minSpend > 0 ? `Min spend ${formatPrice(minSpend)}` : 'No minimum spend',
    helperText: isEligible
      ? `Save ${formatPrice(discountAmount)} on this order.`
      : shortfall > 0
        ? `Add ${formatPrice(shortfall)} more to use this offer.`
        : 'This offer is not available for the current subtotal.',
    savingsText: isEligible ? `Save ${formatPrice(discountAmount)}` : 'Locked',
    isBestOffer: false,
  };
}

function normalizeDiscountType(value: string | null | undefined): 'percent' | 'amount' {
  const normalized = trimText(value)?.toLowerCase() || 'amount';
  if (normalized.includes('percent')) {
    return 'percent';
  }
  return 'amount';
}

function normalizeCouponCode(value: string | null | undefined) {
  const normalized = trimText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function clampDiscount(discountAmount: number, subtotal: number) {
  return Math.min(discountAmount, subtotal);
}

function stripTrailingZeros(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function requireUuid(value: string, message: string) {
  const normalized = trimText(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    throw new Error(message);
  }
  return normalized;
}

function nonNegativeCurrency(value: unknown) {
  const normalized = currency(value);
  return normalized < 0 ? 0 : normalized;
}

function currency(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return roundCurrency(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return roundCurrency(parsed);
    }
  }

  return 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function trimText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}


function parseDate(value: string | null | undefined) {
  const normalized = trimText(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
