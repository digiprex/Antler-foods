import { NextResponse } from 'next/server';
import { RouteError, requireRestaurantAccess } from '@/lib/server/api-auth';
import { exportMenuCsv } from '@/lib/server/menu-csv';

export async function GET(
  request: Request,
  context: { params: { restaurantId: string; menuId: string } },
) {
  try {
    const restaurantId = context.params.restaurantId?.trim() || '';
    const menuId = context.params.menuId?.trim() || '';

    if (!restaurantId || !menuId) {
      return NextResponse.json(
        { success: false, error: 'restaurantId and menuId are required.' },
        { status: 400 },
      );
    }

    await requireRestaurantAccess(request, restaurantId);
    const result = await exportMenuCsv({
      restaurantId,
      menuId,
    });

    return new Response(result.csvText, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
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
        error: resolveMenuCsvErrorMessage(error, 'Failed to export menu CSV.'),
      },
      { status: 500 },
    );
  }
}

function resolveMenuCsvErrorMessage(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  if (message.includes('field') && message.includes('csv_key')) {
    return 'Menu CSV schema is not available yet. Apply the menu CSV SQL script in Hasura first.';
  }
  return message || fallbackMessage;
}
