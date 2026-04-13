import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
} from '@/lib/server/api-auth';
import {
  listGoogleBusinessAccounts,
  listGoogleBusinessLocationsForAccount,
} from '@/lib/server/google-business-api';
import {
  getRestaurantGoogleBusinessAccessTokenByRestaurantId,
  getRestaurantGoogleBusinessConnectionByRestaurantId,
} from '@/lib/server/restaurant-google-business';
import { handleGoogleBusinessRouteError } from '@/lib/server/google-business-route-utils';

export async function GET(
  request: Request,
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

    const { restaurant } = await requireRestaurantAccess(request, restaurantId);
    const existing = await getRestaurantGoogleBusinessConnectionByRestaurantId(
      restaurantId,
    );

    if (!existing?.refreshTokenEncrypted) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          hasSelectedLocation: false,
          connection: null,
          accountLocations: [],
          fallbackPlaceId: restaurant.googlePlaceId,
        },
      });
    }

    const token =
      await getRestaurantGoogleBusinessAccessTokenByRestaurantId(restaurantId);
    const accounts = await listGoogleBusinessAccounts(token.accessToken);
    const accountLocations = await Promise.all(
      accounts.map(async (account) => ({
        account,
        locations: await listGoogleBusinessLocationsForAccount(
          token.accessToken,
          account,
        ),
      })),
    );

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        hasSelectedLocation: Boolean(existing.googleLocationName),
        connection: {
          googleAccountName: existing.googleAccountName,
          googleAccountDisplayName: existing.googleAccountDisplayName,
          googleLocationName: existing.googleLocationName,
          googleLocationTitle: existing.googleLocationTitle,
          googlePlaceId: existing.googlePlaceId,
          scopes: existing.scopes,
          connectedEmail: existing.connectedEmail,
          lastSyncedAt: existing.lastSyncedAt,
        },
        accountLocations,
        fallbackPlaceId: restaurant.googlePlaceId,
      },
    });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    const resolved = handleGoogleBusinessRouteError(
      error,
      'Failed to load Google Business connection details.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}
