/**
 * Global Style Configuration API Route
 *
 * Handles CRUD operations for global website styling configuration.
 * Supports GET, POST, PUT, and DELETE methods.
 * Stores data in restaurants table under global_styles column.
 *
 * Query Parameters:
 * - restaurant_id: Required for all operations
 *
 * Request Body (POST/PUT):
 * - GlobalStyleConfig object with title, subheading, paragraph, and button styling
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import type { GlobalStyleConfig, GlobalStyleConfigResponse } from '@/types/global-style.types';

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: T; errors?: any[] }> {
  try {
    const data = await adminGraphqlRequest<T>(query, variables);
    return { data };
  } catch (error) {
    console.error('GraphQL request error:', error);
    return { errors: [error] };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Fetch restaurant data from database
    const query = `
      query GetRestaurant($restaurant_id: uuid!) {
        restaurants_by_pk(restaurant_id: $restaurant_id) {
          restaurant_id
          global_styles
        }
      }
    `;

    const result = await graphqlRequest<{
      restaurants_by_pk: {
        restaurant_id: string;
        global_styles: string | object | null;
      } | null;
    }>(query, { restaurant_id: restaurantId });

    if (result.errors) {
      console.error('Database error:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    const restaurant = result.data?.restaurants_by_pk;

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Parse global_styles JSON or return default configuration
    let globalStyles: GlobalStyleConfig;

    if (restaurant.global_styles) {
      try {
        // Check if it's already an object (parsed by GraphQL) or a string
        if (typeof restaurant.global_styles === 'string') {
          globalStyles = JSON.parse(restaurant.global_styles);
        } else if (typeof restaurant.global_styles === 'object') {
          // Already an object, use it directly
          globalStyles = restaurant.global_styles as GlobalStyleConfig;
        } else {
          console.warn('Unexpected global_styles type:', typeof restaurant.global_styles);
          globalStyles = getDefaultConfig(restaurantId);
        }
      } catch (parseError) {
        console.error('Error parsing global_styles JSON:', parseError);
        globalStyles = getDefaultConfig(restaurantId);
      }
    } else {
      globalStyles = getDefaultConfig(restaurantId);
    }

    const response: GlobalStyleConfigResponse = {
      success: true,
      data: globalStyles,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching global style config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const config: GlobalStyleConfig = {
      ...body,
      id: `global-style-${restaurantId}`,
      restaurant_id: restaurantId,
      updatedAt: new Date().toISOString(),
    };

    // Update restaurant's global_styles column in database
    const mutation = `
      mutation UpdateRestaurantGlobalStyles($restaurant_id: uuid!, $global_styles: jsonb!) {
        update_restaurants_by_pk(
          pk_columns: { restaurant_id: $restaurant_id }
          _set: { global_styles: $global_styles }
        ) {
          restaurant_id
          global_styles
        }
      }
    `;

    const result = await graphqlRequest<{
      update_restaurants_by_pk: {
        restaurant_id: string;
        global_styles: any;
      } | null;
    }>(mutation, {
      restaurant_id: restaurantId,
      global_styles: config
    });

    if (result.errors) {
      console.error('Database error:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to update global styles' },
        { status: 500 }
      );
    }

    const response: GlobalStyleConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating global style config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // PUT method uses the same logic as POST for updating
  return POST(request);
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Clear the global_styles column in database
    const mutation = `
      mutation ClearRestaurantGlobalStyles($restaurant_id: uuid!) {
        update_restaurants_by_pk(
          pk_columns: { restaurant_id: $restaurant_id }
          _set: { global_styles: null }
        ) {
          restaurant_id
          global_styles
        }
      }
    `;

    const result = await graphqlRequest<{
      update_restaurants_by_pk: {
        restaurant_id: string;
        global_styles: any;
      } | null;
    }>(mutation, { restaurant_id: restaurantId });

    if (result.errors) {
      console.error('Database error:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to clear global styles' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting global style config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getDefaultConfig(restaurantId: string): GlobalStyleConfig {
  return {
    id: `global-style-${restaurantId}`,
    restaurant_id: restaurantId,
    title: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '2.25rem',
      fontWeight: 700,
      color: '#111827',
      lineHeight: '1.2',
      letterSpacing: '-0.025em',
      textTransform: 'none',
    },
    subheading: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '1.5rem',
      fontWeight: 600,
      color: '#374151',
      lineHeight: '1.3',
      letterSpacing: '-0.015em',
      textTransform: 'none',
    },
    paragraph: {
      fontFamily: 'Poppins, sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      color: '#6b7280',
      lineHeight: '1.6',
      letterSpacing: '0',
      textTransform: 'none',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}