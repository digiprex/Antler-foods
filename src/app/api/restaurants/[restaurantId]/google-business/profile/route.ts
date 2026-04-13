import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import {
  getGoogleBusinessLocationProfile,
  patchGoogleBusinessLocationProfile,
  upsertGoogleBusinessActionLinks,
} from '@/lib/server/google-business-api';
import {
  getRestaurantGoogleBusinessAccessTokenByRestaurantId,
  getRestaurantGoogleBusinessConnectionByRestaurantId,
  syncRestaurantGooglePlaceId,
  updateRestaurantGoogleBusinessConnectionMetadata,
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

    await requireRestaurantAccess(request, restaurantId);
    const token =
      await getRestaurantGoogleBusinessAccessTokenByRestaurantId(restaurantId);
    const locationName = token.connection.googleLocationName;
    if (!locationName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Business location has not been selected for this restaurant.',
        },
        { status: 400 },
      );
    }

    const profile = await getGoogleBusinessLocationProfile(
      token.accessToken,
      locationName,
    );

    if (profile.placeId) {
      await syncRestaurantGooglePlaceId(restaurantId, profile.placeId);
    }

    await updateRestaurantGoogleBusinessConnectionMetadata({
      restaurantId,
      metadata: {
        primary_category: profile.primaryCategory,
        last_profile_sync_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      data: profile,
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
      'Failed to load Google Business profile.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}

export async function PATCH(
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
    const connection = await getRestaurantGoogleBusinessConnectionByRestaurantId(
      restaurantId,
    );
    if (!connection?.googleLocationName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Business location has not been selected for this restaurant.',
        },
        { status: 400 },
      );
    }

    const payload = (await safeParseJson(request)) as
      | {
          title?: unknown;
          primaryPhone?: unknown;
          websiteUri?: unknown;
          description?: unknown;
          address?: {
            addressLines?: unknown;
            locality?: unknown;
            administrativeArea?: unknown;
            postalCode?: unknown;
            regionCode?: unknown;
          } | null;
          links?: {
            menuUrl?: unknown;
            takeoutUrl?: unknown;
            deliveryUrl?: unknown;
          } | null;
        }
      | null;

    const token =
      await getRestaurantGoogleBusinessAccessTokenByRestaurantId(restaurantId);

    await patchGoogleBusinessLocationProfile({
      accessToken: token.accessToken,
      locationName: connection.googleLocationName,
      title: normalizeNullableString(payload?.title),
      primaryPhone: normalizeNullableString(payload?.primaryPhone),
      websiteUri: normalizeNullableString(payload?.websiteUri),
      description: normalizeNullableString(payload?.description),
      address: payload?.address
        ? {
            addressLines: normalizeStringArray(payload.address.addressLines),
            locality: normalizeNullableString(payload.address.locality),
            administrativeArea: normalizeNullableString(
              payload.address.administrativeArea,
            ),
            postalCode: normalizeNullableString(payload.address.postalCode),
            regionCode: normalizeNullableString(payload.address.regionCode),
          }
        : null,
    });

    if (payload?.links) {
      await upsertGoogleBusinessActionLinks({
        accessToken: token.accessToken,
        locationName: connection.googleLocationName,
        menuUrl: normalizeNullableString(payload.links.menuUrl),
        takeoutUrl: normalizeNullableString(payload.links.takeoutUrl),
        deliveryUrl: normalizeNullableString(payload.links.deliveryUrl),
      });
    }

    const profile = await getGoogleBusinessLocationProfile(
      token.accessToken,
      connection.googleLocationName,
    );

    if (profile.placeId) {
      await syncRestaurantGooglePlaceId(restaurantId, profile.placeId);
    }

    return NextResponse.json({
      success: true,
      data: profile,
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
      'Failed to publish the Google Business profile update.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}

function normalizeNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}
