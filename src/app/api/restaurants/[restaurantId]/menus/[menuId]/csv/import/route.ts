import { NextResponse } from 'next/server';
import {
  RouteError,
  requireRestaurantAccess,
  safeParseJson,
} from '@/lib/server/api-auth';
import { applyMenuCsvImport } from '@/lib/server/menu-csv';

export async function POST(
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
    const body = (await safeParseJson(request)) as
      | { csvText?: unknown; fileName?: unknown }
      | null;
    const csvText =
      typeof body?.csvText === 'string' ? body.csvText : '';
    const fileName =
      typeof body?.fileName === 'string' ? body.fileName : undefined;

    if (!csvText.trim()) {
      return NextResponse.json(
        { success: false, error: 'csvText is required.' },
        { status: 400 },
      );
    }

    const result = await applyMenuCsvImport({
      restaurantId,
      menuId,
      csvText,
      fileName,
    });

    return NextResponse.json({
      success: true,
      data: result,
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
        error: resolveMenuCsvErrorMessage(error, 'Failed to import menu CSV.'),
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
