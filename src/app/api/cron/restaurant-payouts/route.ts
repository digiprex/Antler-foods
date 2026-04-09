import { NextRequest, NextResponse } from 'next/server';
import { processRestaurantPayouts } from '@/lib/server/restaurant-payouts';

export async function GET(request: NextRequest) {
  try {
    const restaurantId =
      request.nextUrl.searchParams.get('restaurant_id')?.trim() || undefined;
    const result = await processRestaurantPayouts(restaurantId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Restaurant Payout Cron] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Restaurant payout cron failed.',
      },
      { status: 500 },
    );
  }
}
