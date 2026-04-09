import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * Menu Schedule Configuration API
 *
 * Stores per-menu time schedules in the templates table (category: "menu_schedule").
 * Config shape:
 * {
 *   enabled: boolean,
 *   schedules: {
 *     [menu_id]: { start_time: "HH:MM", end_time: "HH:MM", days: number[], specific_dates: string[] }
 *   },
 *   fallback_menu_id: string | null
 * }
 */

const GET_SCHEDULE_CONFIG = `
  query GetMenuScheduleConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id },
        category: { _eq: "menu_schedule" },
        is_deleted: { _eq: false }
      },
      order_by: { created_at: desc },
      limit: 1
    ) {
      template_id
      config
    }
  }
`;

const MARK_AS_DELETED = `
  mutation MarkScheduleDeleted($template_id: uuid!) {
    update_templates_by_pk(
      pk_columns: { template_id: $template_id },
      _set: { is_deleted: true, updated_at: "now()" }
    ) {
      template_id
    }
  }
`;

const INSERT_SCHEDULE_CONFIG = `
  mutation InsertMenuScheduleConfig($restaurant_id: uuid!, $config: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: "menu_schedule",
        category: "menu_schedule",
        config: $config,
        menu_items: "{}",
        is_deleted: false,
        is_published: true
      }
    ) {
      template_id
      config
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const data: any = await adminGraphqlRequest(GET_SCHEDULE_CONFIG, {
      restaurant_id: restaurantId,
    });

    const template = data.templates?.[0];

    return NextResponse.json({
      success: true,
      config: template?.config || { enabled: false, schedules: {}, fallback_menu_id: null },
    });
  } catch (error) {
    console.error('Error fetching menu schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch menu schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, config } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    // Mark existing schedule config as deleted
    const existing: any = await adminGraphqlRequest(GET_SCHEDULE_CONFIG, {
      restaurant_id,
    });
    const existingTemplate = existing.templates?.[0];
    if (existingTemplate) {
      await adminGraphqlRequest(MARK_AS_DELETED, {
        template_id: existingTemplate.template_id,
      });
    }

    // Insert new config
    const result: any = await adminGraphqlRequest(INSERT_SCHEDULE_CONFIG, {
      restaurant_id,
      config: config || { enabled: false, schedules: {}, fallback_menu_id: null },
    });

    return NextResponse.json({
      success: true,
      config: result.insert_templates_one?.config,
    });
  } catch (error) {
    console.error('Error saving menu schedules:', error);
    return NextResponse.json({ error: 'Failed to save menu schedules' }, { status: 500 });
  }
}
