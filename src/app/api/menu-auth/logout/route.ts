import { NextResponse } from 'next/server';
import { clearMenuCustomerSession } from '@/features/restaurant-menu/lib/server/customer-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearMenuCustomerSession(response);
  return response;
}
