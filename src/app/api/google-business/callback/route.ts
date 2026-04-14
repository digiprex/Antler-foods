import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleBusinessOAuthCode,
  parseGoogleBusinessOAuthState,
} from '@/lib/server/google-business-oauth';
import {
  getRestaurantGoogleBusinessConnectionByRestaurantId,
  upsertRestaurantGoogleBusinessOAuthConnection,
} from '@/lib/server/restaurant-google-business';
import { decryptGoogleBusinessSecret } from '@/lib/server/google-business-crypto';
import { resolveRequestOrigin } from '@/lib/server/google-business-route-utils';

export async function GET(request: NextRequest) {
  const rawState = request.nextUrl.searchParams.get('state')?.trim() ?? '';
  if (!rawState) {
    return NextResponse.json(
      { success: false, error: 'Missing Google Business OAuth state.' },
      { status: 400 },
    );
  }

  let state;
  try {
    state = parseGoogleBusinessOAuthState(rawState);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Invalid Google Business OAuth state.',
      },
      { status: 400 },
    );
  }

  const errorCode = request.nextUrl.searchParams.get('error')?.trim() ?? '';
  const errorDescription =
    request.nextUrl.searchParams.get('error_description')?.trim() ?? '';

  if (errorCode) {
    return redirectToDashboard(request, state.returnPath, {
      google_business: 'oauth_error',
      google_notice: errorDescription || errorCode,
    });
  }

  const code = request.nextUrl.searchParams.get('code')?.trim() ?? '';
  if (!code) {
    return redirectToDashboard(request, state.returnPath, {
      google_business: 'oauth_error',
      google_notice: 'Google did not return an authorization code.',
    });
  }

  try {
    const redirectUri = `${resolveRequestOrigin(request)}/api/google-business/callback`;
    const existing = await getRestaurantGoogleBusinessConnectionByRestaurantId(
      state.restaurantId,
    );
    const exchange = await exchangeGoogleBusinessOAuthCode({
      code,
      redirectUri,
    });

    const refreshToken = exchange.refreshToken || decryptExistingRefreshToken(existing);
    if (!refreshToken) {
      throw new Error(
        'Google did not return a refresh token. Remove the app from your Google account permissions and reconnect once so offline access can be granted.',
      );
    }

    await upsertRestaurantGoogleBusinessOAuthConnection({
      restaurantId: state.restaurantId,
      refreshToken,
      scopes: exchange.scopes,
      createdByUserId: state.userId,
    });

    return redirectToDashboard(request, state.returnPath, {
      google_business: 'connected',
    });
  } catch (error) {
    return redirectToDashboard(request, state.returnPath, {
      google_business: 'oauth_error',
      google_notice:
        error instanceof Error
          ? mapCallbackErrorMessage(error.message)
          : 'Failed to connect Google Business Profile.',
    });
  }
}

function redirectToDashboard(
  request: NextRequest,
  returnPath: string,
  params: Record<string, string>,
) {
  const target = new URL(returnPath, resolveRequestOrigin(request));
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim()) {
      target.searchParams.set(key, value);
    }
  });

  return NextResponse.redirect(target);
}

function decryptExistingRefreshToken(
  existing: Awaited<
    ReturnType<typeof getRestaurantGoogleBusinessConnectionByRestaurantId>
  >,
) {
  if (!existing?.refreshTokenEncrypted) {
    return null;
  }

  return decryptGoogleBusinessSecret(existing.refreshTokenEncrypted);
}

function mapCallbackErrorMessage(message: string) {
  if (
    message.includes('restaurant_google_business_connections') ||
    message.includes('google_business_connections')
  ) {
    return 'Google Business schema is not available yet. Apply the Google Business SQL updates in Hasura first.';
  }

  return message;
}
