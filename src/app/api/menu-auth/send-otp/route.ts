import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  generateContactOtp,
  getMenuCustomerSessionCookieName,
  MenuCustomerAuthError,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { sendOtpVerificationEmail } from '@/lib/server/email';
import { sendSms, isTwilioConfigured } from '@/lib/server/twilio';

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

    const { kind, newValue } = body as Record<string, unknown>;

    if (kind !== 'email' && kind !== 'phone') {
      return NextResponse.json(
        { error: 'Invalid kind. Must be "email" or "phone".' },
        { status: 400 },
      );
    }

    if (typeof newValue !== 'string' || !newValue.trim()) {
      return NextResponse.json(
        { error: `Enter a valid ${kind === 'email' ? 'email address' : 'phone number'}.` },
        { status: 400 },
      );
    }

    const { code, otpToken } = await generateContactOtp({
      customerId: session.customerId,
      restaurantId: session.restaurantId,
      kind,
      newValue: newValue.trim(),
    });

    // Send the code via email or SMS
    if (kind === 'email') {
      await sendOtpVerificationEmail(newValue.trim(), {
        code,
        kind,
        newValue: newValue.trim(),
        customerName: session.name,
        restaurantName: null,
        expiresInMinutes: 10,
      });
    } else {
      // For phone, send via SMS if Twilio is configured, otherwise via email as fallback
      if (isTwilioConfigured()) {
        await sendSms(
          newValue.trim(),
          `Your verification code is: ${code}. It expires in 10 minutes.`,
        );
      } else {
        // Fallback: send code to the customer's current email
        await sendOtpVerificationEmail(session.email, {
          code,
          kind,
          newValue: newValue.trim(),
          customerName: session.name,
          restaurantName: null,
          expiresInMinutes: 10,
        });
      }
    }

    return NextResponse.json({
      success: true,
      otpToken,
      sentVia: kind === 'phone' && !isTwilioConfigured() ? 'email' : kind,
    });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[Menu Auth] Send OTP error:', error);
    return NextResponse.json(
      { error: 'Unable to send verification code. Please try again.' },
      { status: 500 },
    );
  }
}
