import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

interface StripeConnectOAuthStateInput {
  restaurantId: string;
  userId: string;
  returnPath: string;
}

export interface StripeConnectOAuthStatePayload
  extends StripeConnectOAuthStateInput {
  nonce: string;
  issuedAt: number;
}

interface StripeConnectOAuthExchangeResponse {
  stripe_user_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

const STRIPE_CONNECT_OAUTH_AUTHORIZE_URL =
  'https://connect.stripe.com/oauth/authorize';
const STRIPE_CONNECT_OAUTH_TOKEN_URL =
  'https://connect.stripe.com/oauth/token';
const STRIPE_CONNECT_STATE_TTL_MS = 15 * 60 * 1000;

export function createStripeConnectOAuthState(
  input: StripeConnectOAuthStateInput,
) {
  const payload: StripeConnectOAuthStatePayload = {
    ...input,
    nonce: randomUUID(),
    issuedAt: Date.now(),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString(
    'base64url',
  );
  const signature = signState(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseStripeConnectOAuthState(value: string) {
  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid Stripe Connect state.');
  }

  const expectedSignature = signState(encodedPayload);
  const receivedBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid Stripe Connect state signature.');
  }

  let payload: StripeConnectOAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as StripeConnectOAuthStatePayload;
  } catch {
    throw new Error('Stripe Connect state payload is invalid.');
  }

  if (
    !payload.restaurantId ||
    !payload.userId ||
    !payload.returnPath ||
    !payload.nonce ||
    !Number.isFinite(payload.issuedAt)
  ) {
    throw new Error('Stripe Connect state payload is incomplete.');
  }

  if (Date.now() - payload.issuedAt > STRIPE_CONNECT_STATE_TTL_MS) {
    throw new Error('Stripe Connect state has expired.');
  }

  return payload;
}

export function buildStripeConnectAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  email?: string | null;
  country?: string | null;
  businessName?: string | null;
}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    scope: 'read_write',
    redirect_uri: input.redirectUri,
    state: input.state,
  });

  if (input.email) {
    params.set('stripe_user[email]', input.email);
  }

  if (input.country) {
    params.set('stripe_user[country]', input.country);
  }

  if (input.businessName) {
    params.set('stripe_user[business_name]', input.businessName);
  }

  return `${STRIPE_CONNECT_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeStripeConnectOAuthCode(input: {
  code: string;
  redirectUri: string;
}) {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    client_secret: secretKey,
    redirect_uri: input.redirectUri,
  });

  const response = await fetch(STRIPE_CONNECT_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload = (await response.json()) as StripeConnectOAuthExchangeResponse;
  if (!response.ok) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        'Failed to exchange Stripe authorization code.',
    );
  }

  const stripeAccountId =
    typeof payload.stripe_user_id === 'string'
      ? payload.stripe_user_id.trim()
      : '';
  if (!stripeAccountId) {
    throw new Error('Stripe did not return a connected account id.');
  }

  return {
    stripeAccountId,
    scope: typeof payload.scope === 'string' ? payload.scope.trim() : null,
  };
}

export function getStripeConnectClientId() {
  const value = (process.env.STRIPE_CONNECT_CLIENT_ID || '').trim();
  if (!value) {
    throw new Error('STRIPE_CONNECT_CLIENT_ID is not configured.');
  }

  return value;
}

function resolveStateSecret() {
  const secret =
    (process.env.STRIPE_CONNECT_STATE_SECRET || '').trim() ||
    (process.env.HASURA_ADMIN_SECRET || '').trim() ||
    (process.env.HASURA_GRAPHQL_ADMIN_SECRET || '').trim();

  if (!secret) {
    throw new Error(
      'STRIPE_CONNECT_STATE_SECRET (or HASURA admin secret fallback) is not configured.',
    );
  }

  return secret;
}

function signState(encodedPayload: string) {
  return createHmac('sha256', resolveStateSecret())
    .update(encodedPayload)
    .digest('base64url');
}
