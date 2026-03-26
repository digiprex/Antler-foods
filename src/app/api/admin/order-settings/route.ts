import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_ORDER_SETTINGS = `
  query GetOrderSettings($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      allow_tips
    }
  }
`;

const UPDATE_ORDER_SETTINGS = `
  mutation UpdateOrderSettings($restaurant_id: uuid!, $allow_tips: Boolean!) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: { allow_tips: $allow_tips }
    ) {
      restaurant_id
      allow_tips
    }
  }
`;

interface OrderSettingsResponse {
  restaurants_by_pk?: {
    restaurant_id?: string | null;
    allow_tips?: boolean | null;
  } | null;
}

interface UpdateOrderSettingsResponse {
  update_restaurants_by_pk?: {
    restaurant_id?: string | null;
    allow_tips?: boolean | null;
  } | null;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = new URL(request.url).searchParams.get('restaurant_id');
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<OrderSettingsResponse>(
      GET_ORDER_SETTINGS,
      { restaurant_id: restaurantId },
    );

    if (!data.restaurants_by_pk?.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: data.restaurants_by_pk.restaurant_id,
        allow_tips: data.restaurants_by_pk.allow_tips ?? true,
      },
    });
  } catch (error) {
    console.error('[Order Settings] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { restaurant_id?: string; allow_tips?: boolean }
      | null;

    const restaurantId = body?.restaurant_id;
    const allowTips = body?.allow_tips;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    if (typeof allowTips !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'allow_tips must be a boolean' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<UpdateOrderSettingsResponse>(
      UPDATE_ORDER_SETTINGS,
      {
        restaurant_id: restaurantId,
        allow_tips: allowTips,
      },
    );

    if (!data.update_restaurants_by_pk?.restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order settings' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: data.update_restaurants_by_pk.restaurant_id,
        allow_tips: data.update_restaurants_by_pk.allow_tips ?? true,
      },
    });
  } catch (error) {
    console.error('[Order Settings] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order settings' },
      { status: 500 },
    );
  }
}
