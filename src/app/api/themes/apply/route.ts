/**
 * Apply Theme to Restaurant API
 *
 * POST /api/themes/apply - Apply a theme to a restaurant and optionally set global_styles
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface ApplyThemeRequest {
  restaurant_id: string;
  theme_id: string;
  global_styles?: any;
}

interface UpdateRestaurantResponse {
  update_restaurants_by_pk: {
    restaurant_id: string;
    theme_id: string;
    global_styles: any;
    updated_at: string;
  } | null;
}

const UPDATE_RESTAURANT_THEME = `
  mutation UpdateRestaurantTheme($restaurant_id: uuid!, $theme_id: uuid!, $global_styles: jsonb) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: {
        theme_id: $theme_id
        global_styles: $global_styles
        updated_at: "now()"
      }
    ) {
      restaurant_id
      theme_id
      global_styles
      updated_at
    }
  }
`;

export async function POST(request: Request) {
  try {
    const body: ApplyThemeRequest = await request.json();
    const { restaurant_id, theme_id, global_styles } = body;

    if (!restaurant_id || !theme_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'restaurant_id and theme_id are required',
        },
        { status: 400 }
      );
    }

    const data = await adminGraphqlRequest<UpdateRestaurantResponse>(UPDATE_RESTAURANT_THEME, {
      restaurant_id,
      theme_id,
      global_styles: global_styles || null,
    });

    if (!data.update_restaurants_by_pk) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update restaurant theme',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.update_restaurants_by_pk,
    });
  } catch (error) {
    console.error('Error applying theme:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
