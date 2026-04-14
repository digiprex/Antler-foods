import { NextRequest, NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import {
  buildGoogleBusinessAuthorizeUrl,
  createGoogleBusinessOAuthState,
  getGoogleBusinessOAuthClientId,
} from '@/lib/server/google-business-oauth';
import {
  handleGoogleBusinessRouteError,
  normalizeDashboardReturnPath,
  resolveRequestOrigin,
} from '@/lib/server/google-business-route-utils';

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

    const returnPath = normalizeDashboardReturnPath(payload?.returnPath);
    if (!returnPath) {
      return NextResponse.json(
        {
          success: false,
          error: 'A valid dashboard return path is required to connect Google Business Profile.',
        },
        { status: 400 },
      );
    }

    const origin = resolveRequestOrigin(request);
    const redirectUri = `${origin}/api/google-business/callback`;
    const state = createGoogleBusinessOAuthState({
      restaurantId,
      userId: user.userId,
      returnPath,
    });

    const url = buildGoogleBusinessAuthorizeUrl({
      clientId: getGoogleBusinessOAuthClientId(),
      redirectUri,
      state,
    });

    return NextResponse.json({
      success: true,
      data: {
        url,
      },
    });
  } catch (error) {
    const resolved = handleGoogleBusinessRouteError(
      error,
      'Failed to start Google Business Profile connection.',
    );

    return NextResponse.json(
      { success: false, error: resolved.message },
      { status: resolved.status },
    );
  }
}
