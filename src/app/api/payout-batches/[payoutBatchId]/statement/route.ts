import { NextRequest, NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
} from '@/lib/server/api-auth';
import {
  getRestaurantPayoutStatement,
} from '@/lib/server/restaurant-payouts';
import { generatePayoutStatementPDF } from '@/lib/generate-payout-statement-pdf';

export async function GET(
  request: NextRequest,
  { params }: { params: { payoutBatchId: string } },
) {
  try {
    const payoutBatchId = params.payoutBatchId?.trim() || '';
    if (!payoutBatchId) {
      return NextResponse.json(
        { success: false, error: 'payoutBatchId is required.' },
        { status: 400 },
      );
    }

    const statement = await getRestaurantPayoutStatement(payoutBatchId);
    const { user } = await requireRestaurantAccess(
      request,
      statement.batch.restaurantId,
    );
    ensurePayoutAccess(user.role);

    const doc = generatePayoutStatementPDF(statement);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = buildFilename(statement.restaurant.name, statement.batch.periodStart, statement.batch.periodEnd);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate payout statement.',
      },
      { status: 500 },
    );
  }
}

function ensurePayoutAccess(role: string) {
  if (role === 'admin' || role === 'manager') {
    return;
  }

  throw new RouteError(
    403,
    'Only admin and manager roles can access restaurant payout statements.',
  );
}

function buildFilename(
  restaurantName: string,
  periodStart: string | null,
  periodEnd: string | null,
) {
  const slug = restaurantName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'restaurant';

  return `${slug}-${formatDateForFile(periodStart)}-${formatDateForFile(periodEnd)}.pdf`;
}

function formatDateForFile(value: string | null) {
  if (!value) {
    return 'statement';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'statement';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}
