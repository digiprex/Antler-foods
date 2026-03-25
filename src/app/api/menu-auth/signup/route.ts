import { NextRequest, NextResponse } from 'next/server';
import {
  MenuCustomerAuthError,
  signUpMenuCustomer,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          restaurantId?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          password?: string;
        }
      | null;

    await signUpMenuCustomer({
      restaurantId: body?.restaurantId || '',
      email: body?.email || '',
      firstName: body?.firstName || '',
      lastName: body?.lastName || '',
      phone: body?.phone || '',
      password: body?.password || '',
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in to continue.',
    });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to create the account right now.' },
      { status: 500 },
    );
  }
}
