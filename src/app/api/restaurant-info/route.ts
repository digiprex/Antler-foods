/**
 * Restaurant Info API
 *
 * Fetches restaurant information including favicon from restaurants table
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface RestaurantData {
  restaurant_id: string;
  name: string | null;
  favicon_url: string | null;
  logo: string | null;
  custom_domain: string | null;
  staging_domain: string | null;
  is_published: boolean | null;
  is_deleted: boolean;
}

interface GetRestaurantResponse {
  restaurants_by_pk: RestaurantData | null;
}

const GET_RESTAURANT_INFO = `
  query GetRestaurantInfo($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
      favicon_url
      logo
      custom_domain
      staging_domain
      is_published
      is_deleted
    }
  }
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'restaurant_id is required',
      }, { status: 400 });
    }

    const data = await adminGraphqlRequest<GetRestaurantResponse>(GET_RESTAURANT_INFO, {
      restaurant_id: restaurantId,
    });

    if (!data.restaurants_by_pk) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant not found',
      }, { status: 404 });
    }

    const restaurant = data.restaurants_by_pk;

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurant.restaurant_id,
        name: restaurant.name,
        favicon_url: restaurant.favicon_url,
        logo: restaurant.logo,
        custom_domain: restaurant.custom_domain,
        staging_domain: restaurant.staging_domain,
        is_published: restaurant.is_published,
        is_deleted: restaurant.is_deleted,
      },
    });
  } catch (error) {
    console.error('Error fetching restaurant info:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
