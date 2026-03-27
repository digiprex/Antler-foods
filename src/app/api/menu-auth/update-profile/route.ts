import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  updateMenuCustomerProfile,
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
        { error: 'You must be signed in to update your profile.' },
        { status: 401 },
      );
    }

    if (session.isGuest) {
      return NextResponse.json(
        { error: 'Guest accounts cannot update their profile.' },
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

    const { firstName, lastName, phone, address, city, state, country, postalCode } = body as Record<string, unknown>;

    if (typeof firstName !== 'string' || !firstName.trim()) {
      return NextResponse.json(
        { error: 'First name is required.' },
        { status: 400 },
      );
    }

    if (typeof lastName !== 'string' || !lastName.trim()) {
      return NextResponse.json(
        { error: 'Last name is required.' },
        { status: 400 },
      );
    }

    if (typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required.' },
        { status: 400 },
      );
    }

    const optionalString = (val: unknown) => (typeof val === 'string' ? val.trim() || null : null);

    const updatedSession = await updateMenuCustomerProfile({
      customerId: session.customerId,
      restaurantId: session.restaurantId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: optionalString(address),
      city: optionalString(city),
      state: optionalString(state),
      country: optionalString(country),
      postalCode: optionalString(postalCode),
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

    console.error('[Menu Auth] Update profile error:', error);
    return NextResponse.json(
      { error: 'Unable to update profile. Please try again.' },
      { status: 500 },
    );
  }
}
