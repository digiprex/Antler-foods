export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function GET(request: NextRequest) {
  try {
    const restaurantId =
      request.nextUrl.searchParams.get('restaurantId') ||
      request.nextUrl.searchParams.get('restaurant_id');
    const cookieValue = request.cookies.get(getMenuCustomerSessionCookieName())?.value;
    const customer = await readMenuCustomerSession(cookieValue, restaurantId);

    return NextResponse.json({
      success: true,
      authenticated: Boolean(customer),
      customer,
    });
  } catch (error) {
    console.error('[Menu Auth] Session error:', error);
    return NextResponse.json(
      { success: false, authenticated: false, customer: null },
      { status: 500 },
    );
  }
}
