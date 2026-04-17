import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  readMenuCustomerSession,
  getMenuCustomerOptIn,
  updateMenuCustomerOptIn,
  getMenuCustomerSessionCookieName,
  MenuCustomerAuthError,
} from '@/features/restaurant-menu/lib/server/customer-auth';

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
    const session = await readMenuCustomerSession(sessionCookie);

    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    if (session.isGuest) {
      return NextResponse.json({ error: 'Guest accounts do not have preferences.' }, { status: 403 });
    }

    const prefs = await getMenuCustomerOptIn(session.customerId);

    return NextResponse.json({ success: true, ...prefs });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Get opt-in error:', error);
    return NextResponse.json({ error: 'Unable to load preferences.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
    const session = await readMenuCustomerSession(sessionCookie);

    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    if (session.isGuest) {
      return NextResponse.json({ error: 'Guest accounts cannot update preferences.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { emailOptIn, smsOptIn } = body as Record<string, unknown>;

    if (typeof emailOptIn !== 'boolean' || typeof smsOptIn !== 'boolean') {
      return NextResponse.json(
        { error: 'emailOptIn and smsOptIn must be booleans.' },
        { status: 400 },
      );
    }

    await updateMenuCustomerOptIn(session.customerId, { emailOptIn, smsOptIn });

    return NextResponse.json({ success: true, emailOptIn, smsOptIn });
  } catch (error) {
    if (error instanceof MenuCustomerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Menu Auth] Update opt-in error:', error);
    return NextResponse.json({ error: 'Unable to update preferences.' }, { status: 500 });
  }
}
