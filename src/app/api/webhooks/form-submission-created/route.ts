/**
 * Hasura Event Trigger - Form Submission Created
 *
 * This webhook is called by Hasura when a new form submission is inserted
 */

import { NextResponse } from 'next/server';

// Email sending is now handled by the API route (/api/form-submissions).
// This webhook is kept as a no-op so Hasura doesn't report delivery failures.
export async function POST() {
  return NextResponse.json({ success: true, message: 'No-op: emails handled by API route' });
}
