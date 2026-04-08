import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_PRINTER_SETTINGS = `
  query GetPrinterSettings($restaurant_id: uuid!) {
    printer_settings(where: { restaurant_id: { _eq: $restaurant_id } }, limit: 1) {
      id
      restaurant_id
      printer_name
      paper_size
      auto_print_kot
      print_method
      poll_interval_seconds
      created_at
      updated_at
    }
  }
`;

const UPSERT_PRINTER_SETTINGS = `
  mutation UpsertPrinterSettings(
    $restaurant_id: uuid!
    $printer_name: String!
    $paper_size: String!
    $auto_print_kot: Boolean!
    $print_method: String!
    $poll_interval_seconds: Int!
  ) {
    insert_printer_settings_one(
      object: {
        restaurant_id: $restaurant_id
        printer_name: $printer_name
        paper_size: $paper_size
        auto_print_kot: $auto_print_kot
        print_method: $print_method
        poll_interval_seconds: $poll_interval_seconds
      }
      on_conflict: {
        constraint: printer_settings_restaurant_id_key
        update_columns: [printer_name, paper_size, auto_print_kot, print_method, poll_interval_seconds, updated_at]
      }
    ) {
      id
      restaurant_id
      printer_name
      paper_size
      auto_print_kot
      print_method
      poll_interval_seconds
      updated_at
    }
  }
`;

interface PrinterSettingsRow {
  id?: string;
  restaurant_id?: string;
  printer_name?: string;
  paper_size?: string;
  auto_print_kot?: boolean;
  print_method?: string;
  poll_interval_seconds?: number;
  created_at?: string;
  updated_at?: string;
}

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
  if (!restaurantId) {
    return NextResponse.json(
      { success: false, error: 'restaurant_id is required' },
      { status: 400 },
    );
  }

  try {
    const data = await adminGraphqlRequest<{
      printer_settings: PrinterSettingsRow[];
    }>(GET_PRINTER_SETTINGS, { restaurant_id: restaurantId });

    const row = data.printer_settings?.[0] || null;

    return NextResponse.json({
      success: true,
      data: row
        ? {
            printerName: row.printer_name || '',
            paperSize: row.paper_size || '80mm',
            autoPrintKot: row.auto_print_kot ?? false,
            printMethod: row.print_method || 'escpos',
            pollIntervalSeconds: row.poll_interval_seconds ?? 15,
          }
        : null,
    });
  } catch (error) {
    console.error('[Printer Settings] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch printer settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, printer_name, paper_size, auto_print_kot, print_method, poll_interval_seconds } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<{
      insert_printer_settings_one: PrinterSettingsRow;
    }>(UPSERT_PRINTER_SETTINGS, {
      restaurant_id,
      printer_name: printer_name || '',
      paper_size: paper_size || '80mm',
      auto_print_kot: auto_print_kot ?? false,
      print_method: print_method || 'escpos',
      poll_interval_seconds: typeof poll_interval_seconds === 'number' ? poll_interval_seconds : 15,
    });

    return NextResponse.json({
      success: true,
      data: data.insert_printer_settings_one,
    });
  } catch (error) {
    console.error('[Printer Settings] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save printer settings' },
      { status: 500 },
    );
  }
}
