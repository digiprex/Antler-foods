import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  changeMenuCustomerPassword,
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
        { error: 'You must be signed in to change your password.' },
        { status: 401 },
      );
    }

    if (session.isGuest) {
      return NextResponse.json(
        { error: 'Guest accounts cannot change their password.' },
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

    const { currentPassword, newPassword } = body as Record<string, unknown>;

    if (typeof currentPassword !== 'string' || !currentPassword.trim()) {
      return NextResponse.json(
        { error: 'Current password is required.' },
        { status: 400 },
      );
    }

    if (typeof newPassword !== 'string' || !newPassword.trim()) {
      return NextResponse.json(
        { error: 'New password is required.' },
        { status: 400 },
      );
    }

    const updatedSession = await changeMenuCustomerPassword({
      customerId: session.customerId,
      restaurantId: session.restaurantId,
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
    });

    const response = NextResponse.json({ success: true });
    attachMenuCustomerSession(response, updatedSession);

    return response;
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[Menu Auth] Change password error:', error);
    return NextResponse.json(
      { error: 'Unable to change password. Please try again.' },
      { status: 500 },
    );
  }
}
