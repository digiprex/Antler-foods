import { NextRequest, NextResponse } from 'next/server';
import {
  RouteError,
  adminGraphqlRequest,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import { getRestaurantStripeAccountByRestaurantId } from '@/lib/server/restaurant-stripe-accounts';
import {
  buildStripeConnectAuthorizeUrl,
  createStripeConnectOAuthState,
  getStripeConnectClientId,
} from '@/lib/server/stripe-connect-oauth';

interface RestaurantConnectPrefillResponse {
  restaurants_by_pk?: {
    name?: string | null;
    email?: string | null;
    poc_email?: string | null;
    country?: string | null;
  } | null;
}

const GET_RESTAURANT_CONNECT_PREFILL = `
  query GetRestaurantConnectPrefill($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      name
      email
      poc_email
      country
    }
  }
`;

export async function POST(
  request: NextRequest,
  context: { params: { restaurantId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId is required.' },
        { status: 400 },
      );
    }

    const { user } = await requireRestaurantAccess(request, restaurantId);
    const payload = (await safeParseJson(request)) as
      | {
          returnPath?: unknown;
        }
      | null;

    const returnPath = normalizeReturnPath(payload?.returnPath);
    if (!returnPath) {
      return NextResponse.json(
        {
          success: false,
          error: 'A valid dashboard return path is required to connect an existing Stripe account.',
        },
        { status: 400 },
      );
    }

    const existing = await getRestaurantStripeAccountByRestaurantId(restaurantId);
    if (existing?.stripeAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe is already connected for this restaurant.',
        },
        { status: 400 },
      );
    }

    const prefill = await loadRestaurantConnectPrefill(restaurantId);
    const origin = resolveRequestOrigin(request);
    const callbackUrl = `${origin}/api/stripe/connect/callback`;
    const state = createStripeConnectOAuthState({
      restaurantId,
      userId: user.userId,
      returnPath,
    });

    const url = buildStripeConnectAuthorizeUrl({
      clientId: getStripeConnectClientId(),
      redirectUri: callbackUrl,
      state,
      businessName: prefill.name,
      email: prefill.email,
      country: prefill.country,
    });

    return NextResponse.json({
      success: true,
      data: {
        url,
      },
    });
  } catch (caughtError) {
    return handleRouteError(
      caughtError,
      'Failed to start the existing Stripe account connection flow.',
    );
  }
}

async function loadRestaurantConnectPrefill(restaurantId: string) {
  const data = await adminGraphqlRequest<RestaurantConnectPrefillResponse>(
    GET_RESTAURANT_CONNECT_PREFILL,
    {
      restaurant_id: restaurantId,
    },
  );

  const row = data.restaurants_by_pk;
  const rawCountry =
    normalizeText(row?.country) || normalizeText(process.env.STRIPE_CONNECT_DEFAULT_COUNTRY);

  return {
    name: normalizeText(row?.name),
    email: normalizeText(row?.email) || normalizeText(row?.poc_email),
    country: normalizeCountry(rawCountry),
  };
}

function normalizeReturnPath(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith('/dashboard/')) {
    return null;
  }

  return trimmed;
}

function resolveRequestOrigin(request: NextRequest) {
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL,
  );
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    'localhost:1000';
  const protocol =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https');

  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host;
  }

  return `${protocol}://${host}`;
}

function normalizeOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

function normalizeCountry(value: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const normalized = trimmed.toLowerCase();
  const known = COUNTRY_ALIASES[normalized];
  return known || undefined;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function handleRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof RouteError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }

  const message =
    error instanceof Error ? mapSchemaErrorMessage(error.message) : fallbackMessage;

  return NextResponse.json(
    { success: false, error: message || fallbackMessage },
    { status: 500 },
  );
}

function mapSchemaErrorMessage(message: string) {
  if (message.includes('restaurant_payment_accounts')) {
    return 'Stripe Connect schema is not available yet. Apply the Bank Accounts SQL script and track the table in Hasura first.';
  }

  return message;
}

const COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'US',
  usa: 'US',
  us: 'US',
  india: 'IN',
  in: 'IN',
  canada: 'CA',
};
