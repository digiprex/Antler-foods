import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

type UpdateRestaurantResponse = {
  update_restaurants_by_pk: {
    restaurant_id: string;
  } | null;
};

type GetRestaurantFaviconResponse = {
  restaurants_by_pk: Record<string, unknown> | null;
};

const UPDATE_RESTAURANT_FAVICON = `
  mutation UpdateRestaurantFavicon(
    $restaurant_id: uuid!
    $changes: restaurants_set_input!
  ) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: $changes
    ) {
      restaurant_id
    }
  }
`;

const GET_RESTAURANT_FAVICON = `
  query GetRestaurantFavicon($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      favicon_url
    }
  }
`;

function normalizeOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim() ?? '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<GetRestaurantFaviconResponse>(
      GET_RESTAURANT_FAVICON,
      { restaurant_id: restaurantId },
    );
    const row = data.restaurants_by_pk;

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        favicon_url: row ? normalizeOptionalText(row.favicon_url) : null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load favicon';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurantId =
      typeof body?.restaurant_id === 'string' ? body.restaurant_id.trim() : '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const faviconUrl =
      typeof body?.favicon_url === 'string' ? body.favicon_url.trim() : '';

    const data = await adminGraphqlRequest<UpdateRestaurantResponse>(
      UPDATE_RESTAURANT_FAVICON,
      {
        restaurant_id: restaurantId,
        changes: { favicon_url: faviconUrl || null },
      },
    );

    if (!data.update_restaurants_by_pk) {
      throw new Error('Hasura returned no row for favicon update.');
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        favicon_url: faviconUrl || null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update favicon';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
