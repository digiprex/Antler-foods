import 'server-only';

import crypto from 'crypto';

interface DoorDashDriveConfig {
  developerId: string;
  keyId: string;
  signingSecret: string;
  webhookSigningSecret: string | null;
  apiBaseUrl: string;
}

export interface DoorDashDeliveryContext {
  restaurantId: string;
  locationId: string | null;
}

export interface DoorDashDropoffAddressInput {
  formattedAddress: string;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  houseFlatFloor?: string | null;
  instructions?: string | null;
}

export interface DoorDashPickupInput {
  address: string;
  name?: string | null;
  phoneNumber?: string | null;
  instructions?: string | null;
}

export interface DoorDashQuoteRequestInput extends DoorDashDeliveryContext {
  orderValue: number;
  pickup: DoorDashPickupInput;
  dropoffAddress: DoorDashDropoffAddressInput;
}

export interface DoorDashQuoteResult {
  quoteId: string;
  fee: number;
  feeMinor: number;
  currencyCode: string;
  etaMinutes: number | null;
  expiresAt: number | null;
  rawPayload: unknown;
}

export interface DoorDashDispatchInput extends DoorDashDeliveryContext {
  externalOrderId: string;
  orderValue: number;
  externalUserId?: string | null;
  pickup: DoorDashPickupInput;
  orderItems: Array<{
    name: string;
    quantity: number;
    lineTotal: number;
    description?: string | null;
  }>;
  dropoffAddress: DoorDashDropoffAddressInput;
  dropoffContact: {
    firstName: string;
    lastName: string;
    email?: string | null;
    phone: string;
  };
}

export interface DoorDashDispatchResult {
  deliveryId: string;
  trackingUrl: string | null;
  fee: number | null;
  feeMinor: number | null;
  currencyCode: string | null;
}

export interface DoorDashWebhookPayload {
  external_delivery_id?: string;
  delivery_status?: string;
  tracking_url?: string;
  updated_at?: string;
  created_at?: string;
  fee?: number;
  currency?: string;
  dasher_id?: number | null;
  dasher_name?: string | null;
  dasher_phone_number?: string | null;
  cancellation_reason?: string | null;
}

export interface DoorDashResolvedWebhookEvent {
  deliveryId: string;
  status: string | null;
  trackingUrl: string | null;
  updatedAt: string | null;
  raw: DoorDashWebhookPayload;
}

const DOORDASH_API_BASE_URL =
  process.env.DOORDASH_DRIVE_API_BASE_URL || 'https://openapi.doordash.com';
const DEFAULT_CURRENCY_CODE = 'USD';
const JWT_ALGORITHM = 'HS256';
const JWT_EXPIRY_SECONDS = 300;

export function isDoorDashDriveConfigured() {
  try {
    const config = readDoorDashDriveConfig();
    return Boolean(config.developerId && config.keyId && config.signingSecret);
  } catch {
    return false;
  }
}

export async function quoteDoorDashDriveDelivery(
  input: DoorDashQuoteRequestInput,
): Promise<DoorDashQuoteResult> {
  const config = readDoorDashDriveConfig();

  const pickupAddress = normalizeText(input.pickup.address);
  if (!pickupAddress) {
    throw new Error('A pickup address is required for DoorDash Drive.');
  }

  const dropoffAddress = normalizeText(input.dropoffAddress.formattedAddress);
  if (!dropoffAddress) {
    throw new Error('A delivery address is required for DoorDash Drive.');
  }

  const pickupPhone = normalizeText(input.pickup.phoneNumber)
    ? normalizePhoneForDoorDash(input.pickup.phoneNumber!)
    : null;

  const externalDeliveryId = `quote_${input.restaurantId}_${Date.now()}`;

  const body: Record<string, unknown> = {
    external_delivery_id: externalDeliveryId,
    pickup_address: pickupAddress,
    pickup_phone_number: pickupPhone || '+10000000000',
    dropoff_address: dropoffAddress,
    dropoff_phone_number: pickupPhone || '+10000000000',
    order_value: Math.round(input.orderValue * 100),
  };

  if (normalizeText(input.pickup.name)) {
    body.pickup_business_name = normalizeText(input.pickup.name);
  }

  const url = `${config.apiBaseUrl}/drive/v2/deliveries`;
  const { response, payload } = await doorDashApiFetch(url, config, body);

  if (!response.ok) {
    console.error('[DoorDash Drive Quote] Request failed:', {
      status: response.status,
      body: JSON.stringify(payload),
    });
    throw new Error(
      readDoorDashError(payload) || 'DoorDash Drive quote request failed.',
    );
  }

  const feeMinor = numberOrNull(payload?.fee) ?? 0;
  const etaMinutes = deriveEtaMinutes(payload);

  // DoorDash creates a real delivery for quotes — cancel it immediately
  const deliveryId = normalizeText(payload?.external_delivery_id) || externalDeliveryId;
  try {
    const cancelUrl = `${config.apiBaseUrl}/drive/v2/deliveries/${encodeURIComponent(deliveryId)}`;
    await doorDashApiFetch(cancelUrl, config, null, 'PUT', {
      status: 'cancelled',
    });
  } catch {
    // Best-effort cancel
  }

  return {
    quoteId: deliveryId,
    fee: fromMinorUnits(feeMinor),
    feeMinor,
    currencyCode:
      normalizeText(payload?.currency) || DEFAULT_CURRENCY_CODE,
    etaMinutes,
    expiresAt: null,
    rawPayload: payload,
  };
}

export async function createDoorDashDriveDelivery(
  input: DoorDashDispatchInput,
): Promise<DoorDashDispatchResult> {
  const config = readDoorDashDriveConfig();

  const pickupAddress = normalizeText(input.pickup.address);
  if (!pickupAddress) {
    throw new Error('A pickup address is required for DoorDash Drive.');
  }

  const dropoffAddress = normalizeText(input.dropoffAddress.formattedAddress);
  if (!dropoffAddress) {
    throw new Error('A delivery address is required for DoorDash Drive.');
  }

  const externalDeliveryId = `${input.externalOrderId}_${Date.now()}`;
  const dropoffName = `${input.dropoffContact.firstName} ${input.dropoffContact.lastName}`.trim();

  const body: Record<string, unknown> = {
    external_delivery_id: externalDeliveryId,
    pickup_address: pickupAddress,
    pickup_business_name: normalizeText(input.pickup.name) || 'Restaurant',
    pickup_phone_number: normalizeText(input.pickup.phoneNumber) || '+10000000000',
    dropoff_address: dropoffAddress,
    dropoff_contact_given_name: input.dropoffContact.firstName,
    dropoff_contact_family_name: input.dropoffContact.lastName,
    dropoff_contact_send_notifications: true,
    dropoff_phone_number: normalizePhoneForDoorDash(input.dropoffContact.phone),
    order_value: Math.round(input.orderValue * 100),
  };

  if (dropoffName) {
    body.dropoff_business_name = dropoffName;
  }
  if (normalizeText(input.pickup.instructions)) {
    body.pickup_instructions = normalizeText(input.pickup.instructions);
  }
  if (normalizeText(input.dropoffAddress.instructions)) {
    body.dropoff_instructions = normalizeText(input.dropoffAddress.instructions);
  }
  if (normalizeText(input.dropoffAddress.houseFlatFloor)) {
    body.dropoff_instructions = [
      normalizeText(input.dropoffAddress.houseFlatFloor),
      normalizeText(input.dropoffAddress.instructions),
    ]
      .filter(Boolean)
      .join('. ');
  }

  if (input.orderItems.length > 0) {
    body.items = input.orderItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      external_id: item.name.replace(/\s+/g, '_').toLowerCase(),
    }));
  }

  if (process.env.DOORDASH_DRIVE_TEST_MODE === 'true') {
    body.is_test_mode = true;
  }

  const url = `${config.apiBaseUrl}/drive/v2/deliveries`;
  const { response, payload } = await doorDashApiFetch(url, config, body);

  if (!response.ok) {
    console.error('[DoorDash Drive Dispatch] Delivery creation failed:', {
      status: response.status,
      body: JSON.stringify(payload),
      requestBody: JSON.stringify({
        external_delivery_id: body.external_delivery_id,
        pickup_address: body.pickup_address,
        dropoff_address: body.dropoff_address,
      }),
    });
    throw new Error(
      readDoorDashError(payload) || 'DoorDash Drive dispatch failed.',
    );
  }

  const deliveryId =
    normalizeText(payload?.external_delivery_id) || externalDeliveryId;
  const feeMinor = numberOrNull(payload?.fee);

  return {
    deliveryId,
    trackingUrl: normalizeText(payload?.tracking_url) || null,
    fee: feeMinor === null ? null : fromMinorUnits(feeMinor),
    feeMinor,
    currencyCode: normalizeText(payload?.currency) || null,
  };
}

export function verifyDoorDashDriveWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  const config = readDoorDashDriveConfig();
  const signingSecret = config.webhookSigningSecret;

  if (!signingSecret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const digest = crypto
    .createHmac('sha256', signingSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'utf8'),
      Buffer.from(signature, 'utf8'),
    );
  } catch {
    return false;
  }
}

export function parseDoorDashDriveWebhookPayload(
  payload: DoorDashWebhookPayload,
): DoorDashResolvedWebhookEvent | null {
  const deliveryId = normalizeText(payload.external_delivery_id);
  if (!deliveryId) {
    return null;
  }

  return {
    deliveryId,
    status: normalizeText(payload.delivery_status),
    trackingUrl: normalizeText(payload.tracking_url),
    updatedAt: normalizeText(payload.updated_at) || normalizeText(payload.created_at),
    raw: payload,
  };
}


function readDoorDashDriveConfig(): DoorDashDriveConfig {
  return {
    developerId: requireEnv('DOORDASH_DRIVE_DEVELOPER_ID'),
    keyId: requireEnv('DOORDASH_DRIVE_KEY_ID'),
    signingSecret: requireEnv('DOORDASH_DRIVE_SIGNING_SECRET'),
    webhookSigningSecret: normalizeText(
      process.env.DOORDASH_DRIVE_WEBHOOK_SIGNING_SECRET,
    ),
    apiBaseUrl:
      normalizeText(process.env.DOORDASH_DRIVE_API_BASE_URL) ||
      DOORDASH_API_BASE_URL,
  };
}

function createDoorDashJwt(config: DoorDashDriveConfig): string {
  const header = {
    alg: JWT_ALGORITHM,
    typ: 'JWT',
    'dd-ver': 'DD-JWT-V1',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'doordash',
    iss: config.developerId,
    kid: config.keyId,
    exp: now + JWT_EXPIRY_SECONDS,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const decodedSecret = Buffer.from(config.signingSecret, 'base64');
  const signature = crypto
    .createHmac('sha256', decodedSecret)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncodeBuffer(signature);

  return `${signingInput}.${encodedSignature}`;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeBuffer(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function doorDashApiFetch(
  url: string,
  config: DoorDashDriveConfig,
  body: unknown,
  method: string = 'POST',
  overrideBody?: unknown,
): Promise<{ response: Response; payload: any }> {
  const jwt = createDoorDashJwt(config);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(overrideBody ?? body),
    cache: 'no-store',
  });

  return { response: res, payload: await parseJson(res) };
}

function deriveEtaMinutes(payload: any): number | null {
  const pickupTimeEstimated = normalizeText(payload?.pickup_time_estimated);
  const dropoffTimeEstimated = normalizeText(payload?.dropoff_time_estimated);

  const etaString = dropoffTimeEstimated || pickupTimeEstimated;
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

function readDoorDashError(payload: any) {
  return (
    normalizeText(payload?.message) ||
    normalizeText(payload?.field_errors?.[0]?.error) ||
    normalizeText(payload?.code) ||
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

function normalizePhoneForDoorDash(value: string) {
  const digits = value.replace(/[^\d+]/g, '');
  if (!digits) {
    return '+10000000000';
  }

  if (digits.startsWith('+')) {
    return `+${digits.replace(/[^\d]/g, '')}`;
  }

  const localDigits = digits.replace(/[^\d]/g, '');
  return `+1${localDigits}`;
}
