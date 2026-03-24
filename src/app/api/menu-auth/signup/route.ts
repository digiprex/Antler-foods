import { NextRequest, NextResponse } from 'next/server';
import {
  attachMenuCustomerSession,
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

    const customer = await signUpMenuCustomer({
      restaurantId: body?.restaurantId || '',
      email: body?.email || '',
      firstName: body?.firstName || '',
      lastName: body?.lastName || '',
      phone: body?.phone || '',
      password: body?.password || '',
    });

    const response = NextResponse.json({ success: true, customer });
    attachMenuCustomerSession(response, customer);
    return response;
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
