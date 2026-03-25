import { NextRequest, NextResponse } from 'next/server';
import { validateMenuCouponCode } from '@/features/restaurant-menu/lib/server/menu-coupons';

interface ValidateCouponRequestBody {
  restaurantId?: string;
  subtotal?: number;
  couponCode?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as ValidateCouponRequestBody | null;
    const restaurantId = body?.restaurantId || '';
    const subtotal = typeof body?.subtotal === 'number' ? body.subtotal : 0;
    const couponCode = body?.couponCode ?? null;
    const coupon = await validateMenuCouponCode({
      restaurantId,
      subtotal,
      code: couponCode,
    });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    console.error('[Menu Orders] Validate coupon error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to validate this coupon right now.' },
      { status: 500 },
    );
  }
}
