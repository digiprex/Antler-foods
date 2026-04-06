import 'server-only';

import crypto from 'crypto';

interface UberDirectConfig {
  clientId: string;
  clientSecret: string;
  customerId: string | null;
  pickupPhoneNumber: string | null;
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

export interface UberPickupInput {
  address: string;
  name?: string | null;
  phoneNumber?: string | null;
}

export interface UberQuoteRequestInput extends UberDeliveryContext {
  orderValue: number;
  pickup: UberPickupInput;
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
  rawPayload: unknown;
}

export interface UberDispatchInput extends UberDeliveryContext {
  externalOrderId: string;
  orderValue: number;
  externalUserId?: string | null;
  pickup: UberPickupInput;
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

const UBER_API_BASE_URL =
  process.env.UBER_DIRECT_API_BASE_URL || 'https://api.uber.com';
const UBER_AUTH_URL =
  process.env.UBER_DIRECT_AUTH_URL || 'https://login.uber.com/oauth/v2/token';
const DEFAULT_CURRENCY_CODE = 'USD';
const DEFAULT_PHONE_COUNTRY_CODE = '+1';
const ASAP_PICKUP_AT = 0;

export function isUberDirectConfigured() {
  const config = readUberDirectConfig();
  return Boolean(config.clientId && config.clientSecret && config.customerId);
}

export function getUberDirectCustomerId() {
  return readUberDirectConfig().customerId;
}


export async function quoteUberDirectDelivery(
  input: UberQuoteRequestInput,
): Promise<UberQuoteResult> {
  const config = readUberDirectConfig();

  if (!config.customerId) {
    throw new Error('UBER_DIRECT_CUSTOMER_ID is required for Uber Direct API calls.');
  }

  const pickupAddress = normalizeText(input.pickup.address);
  if (!pickupAddress) {
    throw new Error('A pickup address is required for Uber Direct.');
  }

  const quoteUrl = `${UBER_API_BASE_URL}/v1/customers/${config.customerId}/delivery_quotes`;

  const dropoffAddress = normalizeText(input.dropoffAddress.formattedAddress);
  if (!dropoffAddress) {
    throw new Error('A formatted delivery address is required for Uber Direct.');
  }

  const body: Record<string, unknown> = {
    pickup_address: pickupAddress,
    dropoff_address: dropoffAddress,
  };

  if (typeof input.dropoffAddress.latitude === 'number' && typeof input.dropoffAddress.longitude === 'number') {
    body.dropoff_latitude = input.dropoffAddress.latitude;
    body.dropoff_longitude = input.dropoffAddress.longitude;
  }

  const { response, payload } = await uberApiFetch(quoteUrl, config, body);

  if (!response.ok) {
    console.error('[Uber Direct Quote] Estimate request failed:', {
      url: quoteUrl,
      customerId: config.customerId.slice(0, 8) + '...',
      status: response.status,
      body: JSON.stringify(payload),
    });
    throw new Error(readUberError(payload) || 'Uber Direct quote request failed.');
  }

  const quoteId = normalizeText(payload?.id);
  if (!quoteId) {
    throw new Error('Uber Direct quote did not return a quote id.');
  }

  const feeMinor = numberOrNull(payload?.fee) ?? 0;
  const etaMinutes = deriveEtaMinutes(payload);

  return {
    quoteId,
    fee: fromMinorUnits(feeMinor),
    feeMinor,
    currencyCode:
      normalizeText(payload?.currency_type) ||
      normalizeText(payload?.currency) ||
      config.currencyCode,
    etaMinutes,
    pickupAt: numberOrNull(payload?.pickup_duration) ?? ASAP_PICKUP_AT,
    expiresAt: payload?.expire_time ? Math.floor(new Date(payload.expire_time).getTime() / 1000) : null,
    rawPayload: payload,
  };
}

export async function createUberDirectDelivery(
  input: UberDispatchInput,
): Promise<UberDispatchResult> {
  const config = readUberDirectConfig();

  if (!config.customerId) {
    throw new Error('UBER_DIRECT_CUSTOMER_ID is required for Uber Direct API calls.');
  }

  const pickupAddress = normalizeText(input.pickup.address);
  if (!pickupAddress) {
    throw new Error('A pickup address is required for Uber Direct.');
  }

  const quote = await quoteUberDirectDelivery({
    restaurantId: input.restaurantId,
    locationId: input.locationId,
    orderValue: input.orderValue,
    pickup: input.pickup,
    dropoffAddress: input.dropoffAddress,
  });

  const deliveryUrl = `${UBER_API_BASE_URL}/v1/customers/${config.customerId}/deliveries`;

  const dropoffAddress = normalizeText(input.dropoffAddress.formattedAddress);
  if (!dropoffAddress) {
    throw new Error('A formatted delivery address is required for Uber Direct.');
  }

  const pickupPhone = normalizeText(input.pickup.phoneNumber) || config.pickupPhoneNumber;

  const body: Record<string, unknown> = {
    quote_id: quote.quoteId,
    pickup_name: normalizeText(input.pickup.name) || 'Restaurant',
    pickup_address: pickupAddress,
    pickup_phone_number: pickupPhone
      ? normalizePhoneForUber(pickupPhone, config.defaultPhoneCountryCode)
      : normalizePhoneForUber('0000000000', config.defaultPhoneCountryCode),
    dropoff_name: `${input.dropoffContact.firstName} ${input.dropoffContact.lastName}`.trim(),
    dropoff_address: dropoffAddress,
    dropoff_phone_number: normalizePhoneForUber(input.dropoffContact.phone, config.defaultPhoneCountryCode),
    manifest_items: input.orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      size: 'small',
    })),
    external_id: `${input.externalOrderId}-${Date.now()}`,
  };

  if (typeof input.dropoffAddress.latitude === 'number' && typeof input.dropoffAddress.longitude === 'number') {
    body.dropoff_latitude = input.dropoffAddress.latitude;
    body.dropoff_longitude = input.dropoffAddress.longitude;
  }

  if (process.env.UBER_DIRECT_TEST_MODE === 'true') {
    body.test_specifications = {
      robo_courier_specification: {
        mode: 'auto',
      },
    };
  }

  if (config.pickupInstructions) {
    body.pickup_notes = config.pickupInstructions;
  }
  if (normalizeText(input.dropoffAddress.instructions)) {
    body.dropoff_notes = normalizeText(input.dropoffAddress.instructions);
  }

  const { response, payload } = await uberApiFetch(deliveryUrl, config, body);

  if (!response.ok) {
    console.error('[Uber Direct Dispatch] Delivery creation failed:', {
      url: deliveryUrl,
      status: response.status,
      body: JSON.stringify(payload),
      requestBody: JSON.stringify({
        quote_id: body.quote_id,
        pickup_address: body.pickup_address,
        dropoff_address: body.dropoff_address,
        dropoff_latitude: body.dropoff_latitude,
        dropoff_longitude: body.dropoff_longitude,
        external_id: body.external_id,
      }),
    });
    throw new Error(readUberError(payload) || 'Uber Direct dispatch failed.');
  }

  const deliveryId = normalizeText(payload?.id);
  if (!deliveryId) {
    throw new Error('Uber Direct dispatch did not return a delivery id.');
  }

  const feeMinor = numberOrNull(payload?.fee);

  return {
    deliveryId,
    quoteId: quote.quoteId,
    trackingUrl: normalizeText(payload?.tracking_url) || null,
    fee: feeMinor === null ? null : fromMinorUnits(feeMinor),
    feeMinor,
    currencyCode:
      normalizeText(payload?.currency_type) ||
      normalizeText(payload?.currency) ||
      null,
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
    pickupPhoneNumber: normalizeText(process.env.UBER_DIRECT_PICKUP_PHONE),
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
    console.error('[Uber Direct Auth] Token request failed:', response.status, readUberError(payload));
    throw new Error(readUberError(payload) || 'Unable to obtain Uber Direct access token.');
  }

  accessTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 300, 60) * 1000,
  };

  return accessTokenCache.token;
}

async function uberApiFetch(
  url: string,
  config: UberDirectConfig,
  body: unknown,
): Promise<{ response: Response; payload: any }> {
  const attempt = async () => {
    const token = await getUberDirectAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    return { response: res, payload: await parseJson(res) };
  };

  const first = await attempt();
  if (first.response.status === 401 && accessTokenCache) {
    accessTokenCache = null;
    return attempt();
  }
  return first;
}


function deriveEtaMinutes(payload: any) {
  const pickupDuration = numberOrNull(payload?.pickup_duration);
  const durationMinutes = numberOrNull(payload?.duration);
  const dropoffDeadline = normalizeText(payload?.dropoff_deadline);
  const dropoffEta = normalizeText(payload?.dropoff_eta);

  if (durationMinutes !== null) {
    return Math.max(Math.round(durationMinutes), 0);
  }

  if (pickupDuration !== null) {
    return Math.max(Math.round(pickupDuration), 0);
  }

  const etaString = dropoffDeadline || dropoffEta;
  if (etaString) {
    const etaTime = new Date(etaString).getTime();
    if (Number.isFinite(etaTime)) {
      return Math.max(Math.round((etaTime - Date.now()) / 60000), 0);
    }
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
