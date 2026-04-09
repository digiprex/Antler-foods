import { NextRequest, NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
} from '@/lib/server/api-auth';
import {
  createRestaurantPayoutBatchForRestaurant,
  getRestaurantPayoutDashboard,
} from '@/lib/server/restaurant-payouts';

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id')?.trim() || '';
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required.' },
        { status: 400 },
      );
    }

    const { user } = await requireRestaurantAccess(request, restaurantId);
    ensurePayoutAccess(user.role);

    const data = await getRestaurantPayoutDashboard(restaurantId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error, 'Failed to load payout batches.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { restaurant_id?: string | null }
      | null;
    const restaurantId = body?.restaurant_id?.trim() || '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required.' },
        { status: 400 },
      );
    }

    const { user } = await requireRestaurantAccess(request, restaurantId);
    ensurePayoutAccess(user.role);

    const result = await createRestaurantPayoutBatchForRestaurant(
      restaurantId,
      'manual',
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to create payout batch.');
  }
}

function ensurePayoutAccess(role: string) {
  if (role === 'admin' || role === 'manager') {
    return;
  }

  throw new RouteError(
    403,
    'Only admin and manager roles can access restaurant payouts.',
  );
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
  if (
    message.includes('restaurant_payout_batches') ||
    message.includes('restaurant_payout_batch_orders')
  ) {
    return 'Payout tables are not available in Hasura yet. Track the new payout tables first.';
  }

  return message;
}
