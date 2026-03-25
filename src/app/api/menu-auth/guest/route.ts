import { NextRequest, NextResponse } from 'next/server';
import {
  attachMenuCustomerSession,
  continueAsGuestMenuCustomer,
  MenuCustomerAuthError,
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
        }
      | null;

    const customer = await continueAsGuestMenuCustomer({
      restaurantId: body?.restaurantId || '',
      email: body?.email || '',
      firstName: body?.firstName || '',
      lastName: body?.lastName || '',
      phone: body?.phone || '',
    });

    const response = NextResponse.json({ success: true, customer });
    attachMenuCustomerSession(response, customer);
    return response;
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Guest error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to continue as guest right now.' },
      { status: 500 },
    );
  }
}
