import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const UPDATE_EMAIL_CLICKED = `
  mutation UpdateEmailClicked($email_log_id: uuid!, $now: timestamptz!) {
    update_email_logs_by_pk(
      pk_columns: { email_log_id: $email_log_id }
      _set: { clicked_at: $now }
    ) {
      email_log_id
    }
  }
`;

export async function GET(
  request: NextRequest,
  { params }: { params: { logId: string } },
) {
  const logId = params.logId;
  const url = request.nextUrl.searchParams.get('url');

  // Record click (fire-and-forget)
  if (logId) {
    adminGraphqlRequest(UPDATE_EMAIL_CLICKED, {
      email_log_id: logId,
      now: new Date().toISOString(),
    }).catch(() => {});
  }

  // Redirect to original URL
  if (url) {
    return NextResponse.redirect(url);
  }

  return new NextResponse('Redirecting...', { status: 400 });
}
