import { NextRequest, NextResponse } from 'next/server';
import {
  attachMenuCustomerSession,
  MenuCustomerAuthError,
  signInMenuCustomer,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { restaurantId?: string; email?: string; phone?: string; password?: string }
      | null;

    const customer = await signInMenuCustomer({
      restaurantId: body?.restaurantId || '',
      email: body?.email || undefined,
      phone: body?.phone || undefined,
      password: body?.password || '',
    });

    const response = NextResponse.json({ success: true, customer });
    attachMenuCustomerSession(response, customer);
    return response;
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }

    console.error('[Menu Auth] Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in right now.' },
      { status: 500 },
    );
  }
}
