import 'server-only';

import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const GET_GIFT_CARD_BY_CODE = `
  query GetGiftCardByCode($code: String!) {
    gift_cards(
      where: { code: { _ilike: $code } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      gift_card_id
      restaurant_id
      code
      is_active
      is_deleted
      expiry_date
      email
      current_balance
    }
  }
`;

interface GiftCardRecord {
  gift_card_id?: string | null;
  restaurant_id?: string | null;
  code?: string | null;
  is_active?: boolean | null;
  is_deleted?: boolean | null;
  expiry_date?: string | null;
  email?: string | null;
  current_balance?: number | string | null;
}

interface GetGiftCardByCodeResponse {
  gift_cards?: GiftCardRecord[];
}

export interface MenuGiftCardOffer {
  giftCardId: string;
  code: string;
  email: string;
  currentBalance: number;
  expiryDate: string;
}

export async function validateMenuGiftCardCode({
  restaurantId,
  email,
  code,
}: {
  restaurantId: string;
  email: string;
  code: string | null | undefined;
}) {
  const normalizedRestaurantId = requireUuid(restaurantId, 'A valid restaurant id is required.');
  const normalizedEmail = requireEmail(email);
  const normalizedCode = normalizeGiftCardCode(code);

  if (!normalizedCode) {
    throw new Error('Enter a gift card code.');
  }

  const data = await adminGraphqlRequest<GetGiftCardByCodeResponse>(GET_GIFT_CARD_BY_CODE, {
    code: normalizedCode,
  });

  const record = Array.isArray(data.gift_cards) ? data.gift_cards[0] : null;
  if (!record) {
    throw new Error('Enter a valid gift card code.');
  }

  if (record.is_deleted) {
    throw new Error('This gift card is no longer available.');
  }

  const recordRestaurantId = trimText(record.restaurant_id);
  if (!recordRestaurantId || recordRestaurantId !== normalizedRestaurantId) {
    throw new Error('This gift card does not belong to this restaurant.');
  }

  if (!record.is_active) {
    throw new Error('This gift card is inactive.');
  }

  const expiryDate = parseDate(record.expiry_date);
  if (!expiryDate || expiryDate.getTime() <= Date.now()) {
    throw new Error('This gift card has expired.');
  }

  const recordEmail = normalizeEmail(record.email);
  if (!recordEmail || recordEmail !== normalizedEmail) {
    throw new Error('Gift card email must match checkout email.');
  }

  const currentBalance = currency(record.current_balance);
  if (currentBalance <= 0) {
    throw new Error('This gift card has no remaining balance.');
  }

  const giftCardId = trimText(record.gift_card_id);
  const resolvedCode = normalizeGiftCardCode(record.code);
  if (!giftCardId || !resolvedCode) {
    throw new Error('Enter a valid gift card code.');
  }

  return {
    giftCardId,
    code: resolvedCode,
    email: recordEmail,
    currentBalance,
    expiryDate: expiryDate.toISOString(),
  } satisfies MenuGiftCardOffer;
}

function normalizeGiftCardCode(value: string | null | undefined) {
  const normalized = trimText(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeEmail(value: unknown) {
  const normalized = trimText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function requireUuid(value: string, message: string) {
  const normalized = trimText(value);
  if (!normalized || !UUID_REGEX.test(normalized)) {
    throw new Error(message);
  }
  return normalized;
}

function requireEmail(value: string) {
  const normalized = normalizeEmail(value);
  if (!normalized || !EMAIL_REGEX.test(normalized)) {
    throw new Error('Enter a valid checkout email before redeeming a gift card.');
  }
  return normalized;
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

export function formatGiftCardBalance(value: number) {
  return formatPrice(roundCurrency(value));
}
