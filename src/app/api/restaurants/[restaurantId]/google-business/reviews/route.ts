import { NextResponse } from 'next/server';
import { RouteError, requireRestaurantAccess } from '@/lib/server/api-auth';
import { listGoogleBusinessReviews } from '@/lib/server/google-business-api';
import { getRestaurantGoogleBusinessAccessTokenByRestaurantId } from '@/lib/server/restaurant-google-business';
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

    if (!token.connection.googleAccountName || !token.connection.googleLocationName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Business account and location must be connected before reviews can be loaded.',
        },
        { status: 400 },
      );
    }

    const reviews = await listGoogleBusinessReviews({
      accessToken: token.accessToken,
      accountName: token.connection.googleAccountName,
      locationName: token.connection.googleLocationName,
    });

    return NextResponse.json({
      success: true,
      data: {
        reviews,
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
      'Failed to load Google Business reviews.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}
