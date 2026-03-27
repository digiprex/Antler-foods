import { NextRequest, NextResponse } from 'next/server';
import {
  attachMenuCustomerSession,
  getMenuCustomerPasswordResetContext,
  MenuCustomerAuthError,
  resetMenuCustomerPassword,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    const context = await getMenuCustomerPasswordResetContext(token);

    return NextResponse.json({
      success: true,
      email: context.email,
      restaurantId: context.restaurantId,
    });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Reset password validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to verify this reset link right now.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          token?: string;
          password?: string;
        }
      | null;

    const session = await resetMenuCustomerPassword({
      token: body?.token || '',
      password: body?.password || '',
    });

    const response = NextResponse.json({
      success: true,
      message: 'Password updated successfully. Signing you in now.',
      email: session.email,
      restaurantId: session.restaurantId,
    });
    attachMenuCustomerSession(response, session);
    return response;
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Reset password submit error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to reset your password right now.' },
      { status: 500 },
    );
  }
}
