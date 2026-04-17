import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  verifyOtpAndUpdateContact,
  attachMenuCustomerSession,
  getMenuCustomerSessionCookieName,
  MenuCustomerAuthError,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
    const session = await readMenuCustomerSession(sessionCookie);

    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in.' },
        { status: 401 },
      );
    }

    if (session.isGuest) {
      return NextResponse.json(
        { error: 'Guest accounts cannot change contact details.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400 },
      );
    }

    const { otpToken, code } = body as Record<string, unknown>;

    if (typeof otpToken !== 'string' || !otpToken.trim()) {
      return NextResponse.json(
        { error: 'Verification session is missing. Please request a new code.' },
        { status: 400 },
      );
    }

    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'Enter the 6-digit verification code.' },
        { status: 400 },
      );
    }

    const updatedSession = await verifyOtpAndUpdateContact({
      customerId: session.customerId,
      restaurantId: session.restaurantId,
      otpToken: otpToken.trim(),
      code: code.trim(),
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        customerId: updatedSession.customerId,
        name: updatedSession.name,
        email: updatedSession.email,
        phone: updatedSession.phone,
        initials: updatedSession.initials,
        isGuest: updatedSession.isGuest,
      },
    });

    attachMenuCustomerSession(response, updatedSession);

    return response;
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[Menu Auth] Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.' },
      { status: 500 },
    );
  }
}
