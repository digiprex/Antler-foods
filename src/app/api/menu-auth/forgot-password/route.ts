import { NextRequest, NextResponse } from 'next/server';
import {
  MenuCustomerAuthError,
  requestMenuCustomerPasswordReset,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          restaurantId?: string;
          email?: string;
          nextPath?: string | null;
        }
      | null;

    await requestMenuCustomerPasswordReset({
      restaurantId: body?.restaurantId || '',
      email: body?.email || '',
      nextPath: body?.nextPath || null,
      appOrigin: request.nextUrl.origin,
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists for this restaurant, we sent a password reset link to that email address.',
    });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to send reset instructions right now.' },
      { status: 500 },
    );
  }
}
