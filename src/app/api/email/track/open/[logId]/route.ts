import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const UPDATE_EMAIL_OPENED = `
  mutation UpdateEmailOpened($email_log_id: uuid!, $now: timestamptz!) {
    update_email_logs_by_pk(
      pk_columns: { email_log_id: $email_log_id }
      _set: { opened_at: $now }
    ) {
      email_log_id
    }
  }
`;

// 1x1 transparent PNG pixel
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { logId: string } },
) {
  const logId = params.logId;

  // Fire-and-forget: don't block the pixel response
  if (logId) {
    adminGraphqlRequest(UPDATE_EMAIL_OPENED, {
      email_log_id: logId,
      now: new Date().toISOString(),
    }).catch(() => {});
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
