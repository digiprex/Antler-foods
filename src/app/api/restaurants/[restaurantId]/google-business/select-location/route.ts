import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import {
  getGoogleBusinessLocationProfile,
  listGoogleBusinessAccounts,
  listGoogleBusinessLocationsForAccount,
} from '@/lib/server/google-business-api';
import {
  getRestaurantGoogleBusinessAccessTokenByRestaurantId,
  updateRestaurantGoogleBusinessLocationSelection,
} from '@/lib/server/restaurant-google-business';
import { handleGoogleBusinessRouteError } from '@/lib/server/google-business-route-utils';

export async function POST(
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

    await requireRestaurantAccess(request, restaurantId);
    const payload = (await safeParseJson(request)) as
      | {
          accountName?: unknown;
          locationName?: unknown;
        }
      | null;

    const accountName =
      typeof payload?.accountName === 'string' ? payload.accountName.trim() : '';
    const locationName =
      typeof payload?.locationName === 'string' ? payload.locationName.trim() : '';

    if (!accountName || !locationName) {
      return NextResponse.json(
        {
          success: false,
          error: 'accountName and locationName are required.',
        },
        { status: 400 },
      );
    }

    const token =
      await getRestaurantGoogleBusinessAccessTokenByRestaurantId(restaurantId);
    const accounts = await listGoogleBusinessAccounts(token.accessToken);
    const account = accounts.find((entry) => entry.name === accountName);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Selected Google Business account is not accessible.' },
        { status: 404 },
      );
    }

    const locations = await listGoogleBusinessLocationsForAccount(
      token.accessToken,
      account,
    );
    const location = locations.find((entry) => entry.name === locationName);

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Selected Google Business location was not found.' },
        { status: 404 },
      );
    }

    const liveProfile = await getGoogleBusinessLocationProfile(
      token.accessToken,
      location.name,
    );

    const updated = await updateRestaurantGoogleBusinessLocationSelection({
      restaurantId,
      googleAccountName: account.name,
      googleAccountDisplayName: account.accountName,
      googleLocationName: location.name,
      googleLocationTitle: location.title || liveProfile.title,
      googleLocationStoreCode: location.storeCode,
      googleLocationLanguageCode: location.languageCode,
      googlePlaceId: location.placeId || liveProfile.placeId,
      metadata: {
        primary_category: liveProfile.primaryCategory,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        connection: updated,
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
      'Failed to save the Google Business location selection.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}
