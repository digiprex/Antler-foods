import 'server-only';

import crypto from 'crypto';

type UberStoreMap = Record<string, string>;

interface UberDirectConfig {
  clientId: string;
  clientSecret: string;
  customerId: string | null;
  defaultStoreId: string | null;
  storeMap: UberStoreMap;
  currencyCode: string;
  pickupInstructions: string | null;
  defaultPhoneCountryCode: string;
  webhookSigningKey: string | null;
}

interface UberAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface UberDeliveryContext {
  restaurantId: string;
  locationId: string | null;
}

export interface UberDropoffAddressInput {
  formattedAddress: string;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  houseFlatFloor?: string | null;
  instructions?: string | null;
}

export interface UberQuoteRequestInput extends UberDeliveryContext {
  orderValue: number;
  dropoffAddress: UberDropoffAddressInput;
}

export interface UberQuoteResult {
  quoteId: string;
  fee: number;
  feeMinor: number;
  currencyCode: string;
  etaMinutes: number | null;
  pickupAt: number;
  expiresAt: number | null;
}

export interface UberDispatchInput extends UberDeliveryContext {
  externalOrderId: string;
  orderValue: number;
  externalUserId?: string | null;
  orderItems: Array<{
    name: string;
    quantity: number;
    lineTotal: number;
    description?: string | null;
  }>;
  pickupAt?: number;
  dropoffAddress: UberDropoffAddressInput;
  dropoffContact: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
  };
}

export interface UberDispatchResult {
  deliveryId: string;
  quoteId: string;
  trackingUrl: string | null;
  fee: number | null;
  feeMinor: number | null;
  currencyCode: string | null;
}

export interface UberWebhookPayload {
  id?: string;
  kind?: string;
  created?: string;
  delivery_id?: string;
  status?: string;
  live_mode?: boolean;
  data?: {
    id?: string;
    status?: string;
    order_tracking_url?: string;
    tracking_url?: string;
    pickup?: {
      status?: string;
    };
    dropoff?: {
      status?: string;
    };
  };
}

interface UberResolvedWebhookEvent {
  deliveryId: string;
  status: string | null;
  trackingUrl: string | null;
  createdAt: string | null;
  kind: string | null;
  raw: UberWebhookPayload;
}

let accessTokenCache:
  | {
      token: string;
      expiresAt: number;
    }
  | null = null;

const UBER_API_BASE_URL = 'https://api.uber.com';
const UBER_AUTH_URL = 'https://auth.uber.com/oauth/v2/token';
const DEFAULT_CURRENCY_CODE = 'USD';
const DEFAULT_PHONE_COUNTRY_CODE = '+1';
const ASAP_PICKUP_AT = 0;

export function isUberDirectConfigured() {
  const config = readUberDirectConfig();
  return Boolean(config.clientId && config.clientSecret);
}

export function getUberDirectCustomerId() {
  return readUberDirectConfig().customerId;
}

export function resolveUberStoreId(context: UberDeliveryContext) {
  const config = readUberDirectConfig();
  const locationId = normalizeText(context.locationId);
  const restaurantId = normalizeText(context.restaurantId);

  const candidates = [
    locationId && restaurantId ? `${restaurantId}:${locationId}` : null,
    locationId,
    restaurantId,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const mapped = normalizeText(config.storeMap[candidate]);
    if (mapped) {
      return mapped;
    }
  }

  return config.defaultStoreId;
}

export async function quoteUberDirectDelivery(
  input: UberQuoteRequestInput,
): Promise<UberQuoteResult> {
  const storeId = resolveRequiredStoreId(input);
  const config = readUberDirectConfig();
  const token = await getUberDirectAccessToken();

  const body = {
    pickup: {
      store_id: storeId,
    },
    dropoff_address: buildUberAddress(input.dropoffAddress),
    order_summary: {
      order_value: toMinorUnits(input.orderValue, config.currencyCode),
      currency_code: config.currencyCode,
    },
    pickup_times: [ASAP_PICKUP_AT],
  };

  const response = await fetch(`${UBER_API_BASE_URL}/v1/eats/deliveries/estimates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(readUberError(payload) || 'Uber Direct quote request failed.');
  }

  const estimateId = normalizeText(payload?.estimate_id);
  if (!estimateId) {
    throw new Error('Uber Direct quote did not return an estimate id.');
  }

  const estimate = Array.isArray(payload?.estimates) ? payload.estimates[0] : null;
  const deliveryFee = estimate?.delivery_fee;
  const totalMinor = numberOrNull(deliveryFee?.total) ?? 0;
  const etaMinutes = deriveEtaMinutes(payload, estimate);

  return {
    quoteId: estimateId,
    fee: fromMinorUnits(totalMinor),
    feeMinor: totalMinor,
    currencyCode:
      normalizeText(deliveryFee?.currency_code) ||
      config.currencyCode,
    etaMinutes,
    pickupAt: numberOrNull(estimate?.pickup_at) ?? ASAP_PICKUP_AT,
    expiresAt: numberOrNull(payload?.expires_at),
  };
}

export async function createUberDirectDelivery(
  input: UberDispatchInput,
): Promise<UberDispatchResult> {
  const config = readUberDirectConfig();
  const storeId = resolveRequiredStoreId(input);
  const quote = await quoteUberDirectDelivery({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    orderValue: input.orderValue,
    dropoffAddress: input.dropoffAddress,
  });
  const token = await getUberDirectAccessToken();

  const body = {
    estimate_id: quote.quoteId,
    pickup_at: input.pickupAt ?? quote.pickupAt,
    external_order_id: input.externalOrderId,
    pickup: {
      store_id: storeId,
      instructions: config.pickupInstructions,
    },
    dropoff: {
      address: buildUberAddress(input.dropoffAddress),
      instructions: normalizeText(input.dropoffAddress.instructions),
      contact: {
        first_name: input.dropoffContact.firstName,
        last_name: input.dropoffContact.lastName,
        email: normalizeText(input.dropoffContact.email) || undefined,
        phone: normalizePhoneForUber(input.dropoffContact.phone, config.defaultPhoneCountryCode),
      },
    },
    order_items: input.orderItems.map((item) => ({
      name: item.name,
      description: normalizeText(item.description) || undefined,
      quantity: item.quantity,
      price: toMinorUnits(item.lineTotal / Math.max(item.quantity, 1), config.currencyCode),
      currency_code: config.currencyCode,
      item_type: 'food',
    })),
    order_summary: {
      order_value: toMinorUnits(input.orderValue, config.currencyCode),
      currency_code: config.currencyCode,
    },
    external_user_id:
      normalizeText(input.externalUserId) ||
      normalizeText(input.dropoffContact.email) ||
      normalizePhoneForUber(input.dropoffContact.phone, config.defaultPhoneCountryCode),
  };

  const response = await fetch(`${UBER_API_BASE_URL}/v1/eats/deliveries/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw new Error(readUberError(payload) || 'Uber Direct dispatch failed.');
  }

  const deliveryId = normalizeText(payload?.order_id);
  if (!deliveryId) {
    throw new Error('Uber Direct dispatch did not return a delivery id.');
  }

  const feeMinor = numberOrNull(payload?.full_fee?.total);

  return {
    deliveryId,
    quoteId: quote.quoteId,
    trackingUrl:
      normalizeText(payload?.order_tracking_url) ||
      normalizeText(payload?.tracking_url) ||
      null,
    fee: feeMinor === null ? null : fromMinorUnits(feeMinor),
    feeMinor,
    currencyCode: normalizeText(payload?.full_fee?.currency_code) || null,
  };
}

export function verifyUberDirectWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  const config = readUberDirectConfig();
  const signingKey = config.webhookSigningKey;

  if (!signingKey) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const digest = crypto
    .createHmac('sha256', signingKey)
    .update(rawBody, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(digest, 'utf8'),
    Buffer.from(signature, 'utf8'),
  );
}

export function parseUberDirectWebhookPayload(
  payload: UberWebhookPayload,
): UberResolvedWebhookEvent | null {
  const deliveryId =
    normalizeText(payload.delivery_id) ||
    normalizeText(payload.data?.id) ||
    normalizeText(payload.id);

  if (!deliveryId) {
    return null;
  }

  return {
    deliveryId,
    status:
      normalizeText(payload.status) ||
      normalizeText(payload.data?.status) ||
      normalizeText(payload.data?.pickup?.status) ||
      normalizeText(payload.data?.dropoff?.status) ||
      null,
    trackingUrl:
      normalizeText(payload.data?.order_tracking_url) ||
      normalizeText(payload.data?.tracking_url) ||
      null,
    createdAt: normalizeText(payload.created),
    kind: normalizeText(payload.kind),
    raw: payload,
  };
}

function readUberDirectConfig(): UberDirectConfig {
  return {
    clientId: requireEnv('UBER_DIRECT_CLIENT_ID'),
    clientSecret: requireEnv('UBER_DIRECT_CLIENT_SECRET'),
    customerId: normalizeText(process.env.UBER_DIRECT_CUSTOMER_ID),
    defaultStoreId: normalizeText(process.env.UBER_DIRECT_STORE_ID),
    storeMap: parseStoreMap(process.env.UBER_DIRECT_STORE_MAP),
    currencyCode:
      normalizeText(process.env.UBER_DIRECT_CURRENCY_CODE)?.toUpperCase() ||
      DEFAULT_CURRENCY_CODE,
    pickupInstructions: normalizeText(process.env.UBER_DIRECT_PICKUP_INSTRUCTIONS),
    defaultPhoneCountryCode:
      normalizePhoneCountryCode(process.env.UBER_DIRECT_DEFAULT_PHONE_COUNTRY_CODE) ||
      DEFAULT_PHONE_COUNTRY_CODE,
    webhookSigningKey: normalizeText(process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY),
  };
}

async function getUberDirectAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const config = readUberDirectConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.deliveries',
  });

  const response = await fetch(UBER_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
  });

  const payload = (await parseJson(response)) as UberAccessTokenResponse | null;
  if (!response.ok || !payload?.access_token || !payload.expires_in) {
    throw new Error(readUberError(payload) || 'Unable to obtain Uber Direct access token.');
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 300, 60) * 1000,
  };

  return accessTokenCache.token;
}

function buildUberAddress(input: UberDropoffAddressInput) {
  const formattedAddress = normalizeText(input.formattedAddress);
  if (!formattedAddress) {
    throw new Error('A formatted delivery address is required for Uber Direct.');
  }

  return {
    formatted_address: formattedAddress,
    apt_floor_suite: normalizeText(input.houseFlatFloor) || undefined,
    place: normalizeText(input.placeId)
      ? {
          id: normalizeText(input.placeId),
          provider: 'google_places',
        }
      : undefined,
    location:
      typeof input.latitude === 'number' && typeof input.longitude === 'number'
        ? {
            latitude: input.latitude,
            longitude: input.longitude,
          }
        : undefined,
  };
}

function resolveRequiredStoreId(context: UberDeliveryContext) {
  const storeId = resolveUberStoreId(context);
  if (!storeId) {
    throw new Error(
      'Uber Direct store mapping is missing for this restaurant location. Set UBER_DIRECT_STORE_ID or UBER_DIRECT_STORE_MAP.',
    );
  }

  return storeId;
}

function parseStoreMap(rawValue: string | undefined): UberStoreMap {
  if (!rawValue?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<UberStoreMap>((acc, [key, value]) => {
      const normalizedKey = normalizeText(key);
      const normalizedValue = normalizeText(value);
      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function deriveEtaMinutes(payload: any, estimateOverride?: any) {
  const estimate = estimateOverride ?? (Array.isArray(payload?.estimates) ? payload.estimates[0] : null);
  const estimatedAt = numberOrNull(payload?.estimated_at);
  const estimateEtd = numberOrNull(estimate?.etd);
  const pickupDuration = numberOrNull(payload?.pickup_duration);
  const durationSeconds = numberOrNull(payload?.duration);
  const dropoffEta = numberOrNull(payload?.dropoff_eta);

  if (estimateEtd !== null) {
    const referenceTime = estimatedAt ?? Date.now();
    return Math.max(Math.round((estimateEtd - referenceTime) / 60000), 0);
  }

  if (pickupDuration !== null) {
    return Math.max(Math.round(pickupDuration / 60), 0);
  }

  if (durationSeconds !== null) {
    return Math.max(Math.round(durationSeconds / 60), 0);
  }

  if (dropoffEta !== null) {
    const now = Date.now();
    return dropoffEta > now
      ? Math.max(Math.round((dropoffEta - now) / 60000), 0)
      : Math.max(Math.round(dropoffEta / 60), 0);
  }

  return null;
}

async function parseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readUberError(payload: any) {
  return (
    normalizeText(payload?.message) ||
    normalizeText(payload?.error_description) ||
    normalizeText(payload?.error) ||
    normalizeText(payload?.details?.message) ||
    null
  );
}

function requireEnv(name: string) {
  const value = normalizeText(process.env[name]);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMinorUnits(value: number, _currencyCode: string) {
  return Math.round(value * 100);
}

function fromMinorUnits(value: number) {
  return Math.round(value) / 100;
}

function normalizePhoneCountryCode(value: string | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function normalizePhoneForUber(value: string, defaultPhoneCountryCode: string) {
  const digits = value.replace(/[^\d+]/g, '');
  if (!digits) {
    throw new Error('A valid delivery phone number is required for Uber Direct.');
  }

  if (digits.startsWith('+')) {
    return `+${digits.replace(/[^\d]/g, '')}`;
  }

  const localDigits = digits.replace(/[^\d]/g, '');
  const countryPrefix = defaultPhoneCountryCode.replace(/[^\d+]/g, '');
  return `${countryPrefix}${localDigits}`;
}

