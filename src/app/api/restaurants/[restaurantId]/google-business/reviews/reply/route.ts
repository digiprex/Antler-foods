import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import { upsertGoogleBusinessReviewReply } from '@/lib/server/google-business-api';
import { getRestaurantGoogleBusinessAccessTokenByRestaurantId } from '@/lib/server/restaurant-google-business';
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
          reviewName?: unknown;
          comment?: unknown;
        }
      | null;

    const reviewName =
      typeof payload?.reviewName === 'string' ? payload.reviewName.trim() : '';
    const comment =
      typeof payload?.comment === 'string' ? payload.comment.trim() : '';

    if (!reviewName || !comment) {
      return NextResponse.json(
        {
          success: false,
          error: 'reviewName and comment are required to publish a Google review reply.',
        },
        { status: 400 },
      );
    }

    const token =
      await getRestaurantGoogleBusinessAccessTokenByRestaurantId(restaurantId);

    await upsertGoogleBusinessReviewReply({
      accessToken: token.accessToken,
      reviewName,
      comment,
    });

    return NextResponse.json({
      success: true,
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
      'Failed to publish the Google review reply.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}
