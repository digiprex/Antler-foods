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
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        console.log('[Restaurant Info] Looking up domain:', domain);

        const GET_BY_STAGING = `
          query GetByStaging($domain: String!) {
            restaurants(
              where: {
                staging_domain: { _eq: $domain },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
              staging_domain
            }
          }
        `;

        const GET_BY_CUSTOM = `
          query GetByCustom($domain: String!) {
            restaurants(
              where: {
                custom_domain: { _eq: $domain },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
              custom_domain
            }
          }
        `;

        try {
          const stagingResult = await adminGraphqlRequest(GET_BY_STAGING, { domain });
          console.log('[Restaurant Info] Staging domain query result:', JSON.stringify(stagingResult, null, 2));

          if ((stagingResult as any).restaurants && (stagingResult as any).restaurants.length > 0) {
            restaurantId = (stagingResult as any).restaurants[0].restaurant_id;
            console.log('[Restaurant Info] Found restaurant via staging_domain:', restaurantId);
          }
        } catch (stagingError) {
          console.error('[Restaurant Info] Error querying staging_domain:', stagingError);
        }

        if (!restaurantId) {
          try {
            const customResult = await adminGraphqlRequest(GET_BY_CUSTOM, { domain });
            console.log('[Restaurant Info] Custom domain query result:', JSON.stringify(customResult, null, 2));

            if ((customResult as any).restaurants && (customResult as any).restaurants.length > 0) {
              restaurantId = (customResult as any).restaurants[0].restaurant_id;
              console.log('[Restaurant Info] Found restaurant via custom_domain:', restaurantId);
            }
          } catch (customError) {
            console.error('[Restaurant Info] Error querying custom_domain:', customError);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.',
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
