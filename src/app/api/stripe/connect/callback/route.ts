import { NextRequest, NextResponse } from 'next/server';
import { syncRestaurantStripeAccount } from '@/lib/server/restaurant-stripe-accounts';
import {
  exchangeStripeConnectOAuthCode,
  parseStripeConnectOAuthState,
} from '@/lib/server/stripe-connect-oauth';

export async function GET(request: NextRequest) {
  const rawState = request.nextUrl.searchParams.get('state')?.trim() ?? '';
  if (!rawState) {
    return NextResponse.json(
      { success: false, error: 'Missing Stripe Connect state.' },
      { status: 400 },
    );
  }

  let state;
  try {
    state = parseStripeConnectOAuthState(rawState);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Invalid Stripe Connect state.',
      },
      { status: 400 },
    );
  }

  const errorCode = request.nextUrl.searchParams.get('error')?.trim() ?? '';
  const errorDescription =
    request.nextUrl.searchParams.get('error_description')?.trim() ?? '';

  if (errorCode) {
    return redirectToDashboard(state.returnPath, {
      stripe_connect: 'oauth_error',
      stripe_notice: errorDescription || errorCode,
    });
  }

  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!code) {
    return redirectToDashboard(state.returnPath, {
      stripe_connect: 'oauth_error',
      stripe_notice: 'Stripe did not return an authorization code.',
    });
  }

  try {
    const callbackUrl = resolveRequestOrigin(request) + '/api/stripe/connect/callback';
    const exchange = await exchangeStripeConnectOAuthCode({
      code,
      redirectUri: callbackUrl,
    });

    await syncRestaurantStripeAccount({
      restaurantId: state.restaurantId,
      stripeAccountId: exchange.stripeAccountId,
      connectionMode: 'existing_account_oauth',
      createdByUserId: state.userId,
    });

    return redirectToDashboard(state.returnPath, {
      stripe_connect: 'return',
      stripe_flow: 'existing_account',
    });
  } catch (error) {
    return redirectToDashboard(state.returnPath, {
      stripe_connect: 'oauth_error',
      stripe_notice:
        error instanceof Error
          ? error.message
          : 'Failed to connect the existing Stripe account.',
    });
  }
}

function redirectToDashboard(
  returnPath: string,
  params: Record<string, string>,
) {
  const target = new URL(returnPath, 'http://dashboard.local');
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim()) {
      target.searchParams.set(key, value);
    }
  });

  return NextResponse.redirect(
    `${target.pathname}${target.search}${target.hash}`,
  );
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
