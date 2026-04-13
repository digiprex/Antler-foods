import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

interface GoogleBusinessOAuthStateInput {
  restaurantId: string;
  userId: string;
  returnPath: string;
}

export interface GoogleBusinessOAuthStatePayload
  extends GoogleBusinessOAuthStateInput {
  nonce: string;
  issuedAt: number;
}

interface GoogleBusinessOAuthExchangeResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleBusinessOAuthTokenSnapshot {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number | null;
  scopes: string[];
  tokenType: string | null;
}

const GOOGLE_OAUTH_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_BUSINESS_STATE_TTL_MS = 15 * 60 * 1000;
const GOOGLE_BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';

export function createGoogleBusinessOAuthState(
  input: GoogleBusinessOAuthStateInput,
) {
  const payload: GoogleBusinessOAuthStatePayload = {
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

export function parseGoogleBusinessOAuthState(value: string) {
  const [encodedPayload, signature] = value.split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid Google Business OAuth state.');
  }

  const expectedSignature = signState(encodedPayload);
  const receivedBuffer = Buffer.from(signature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid Google Business OAuth state signature.');
  }

  let payload: GoogleBusinessOAuthStatePayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8'),
    ) as GoogleBusinessOAuthStatePayload;
  } catch {
    throw new Error('Google Business OAuth state payload is invalid.');
  }

  if (
    !payload.restaurantId ||
    !payload.userId ||
    !payload.returnPath ||
    !payload.nonce ||
    !Number.isFinite(payload.issuedAt)
  ) {
    throw new Error('Google Business OAuth state payload is incomplete.');
  }

  if (Date.now() - payload.issuedAt > GOOGLE_BUSINESS_STATE_TTL_MS) {
    throw new Error('Google Business OAuth state has expired.');
  }

  return payload;
}

export function buildGoogleBusinessAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: GOOGLE_BUSINESS_SCOPE,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent select_account',
    state: input.state,
  });

  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeGoogleBusinessOAuthCode(input: {
  code: string;
  redirectUri: string;
}) {
  return requestGoogleOAuthToken({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
  });
}

export async function refreshGoogleBusinessAccessToken(refreshToken: string) {
  return requestGoogleOAuthToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

export function getGoogleBusinessOAuthClientId() {
  const value = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  if (!value) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured.');
  }

  return value;
}

export function getGoogleBusinessScope() {
  return GOOGLE_BUSINESS_SCOPE;
}

async function requestGoogleOAuthToken(bodyParams: Record<string, string>) {
  const clientId = getGoogleBusinessOAuthClientId();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  if (!clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not configured.');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    ...bodyParams,
  });

  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    cache: 'no-store',
  });

  const payload =
    (await response.json()) as GoogleBusinessOAuthExchangeResponse | null;

  if (!response.ok) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        'Failed to exchange Google authorization code.',
    );
  }

  const accessToken =
    typeof payload?.access_token === 'string' ? payload.access_token.trim() : '';
  if (!accessToken) {
    throw new Error('Google did not return an access token.');
  }

  return {
    accessToken,
    refreshToken:
      typeof payload?.refresh_token === 'string' && payload.refresh_token.trim()
        ? payload.refresh_token.trim()
        : null,
    expiresInSeconds:
      typeof payload?.expires_in === 'number' && Number.isFinite(payload.expires_in)
        ? payload.expires_in
        : null,
    scopes:
      typeof payload?.scope === 'string'
        ? payload.scope
            .split(/\s+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [],
    tokenType:
      typeof payload?.token_type === 'string' && payload.token_type.trim()
        ? payload.token_type.trim()
        : null,
  } satisfies GoogleBusinessOAuthTokenSnapshot;
}

function resolveStateSecret() {
  const secret =
    (process.env.GOOGLE_BUSINESS_STATE_SECRET || '').trim() ||
    (process.env.HASURA_ADMIN_SECRET || '').trim() ||
    (process.env.HASURA_GRAPHQL_ADMIN_SECRET || '').trim();

  if (!secret) {
    throw new Error(
      'GOOGLE_BUSINESS_STATE_SECRET (or HASURA admin secret fallback) is not configured.',
    );
  }

  return secret;
}

function signState(encodedPayload: string) {
  return createHmac('sha256', resolveStateSecret())
    .update(encodedPayload)
    .digest('base64url');
}
