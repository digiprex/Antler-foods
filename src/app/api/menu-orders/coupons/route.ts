import { NextRequest, NextResponse } from 'next/server';
import { listMenuCoupons } from '@/features/restaurant-menu/lib/server/menu-coupons';

interface CouponsRequestBody {
  restaurantId?: string;
  subtotal?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as CouponsRequestBody | null;
    const restaurantId = body?.restaurantId || '';
    const subtotal = typeof body?.subtotal === 'number' ? body.subtotal : 0;
    const coupons = await listMenuCoupons({ restaurantId, subtotal });

    return NextResponse.json({
      success: true,
      coupons,
    });
  } catch (error) {
    console.error('[Menu Orders] Coupons error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load offers right now.' },
      { status: 500 },
    );
  }
}
