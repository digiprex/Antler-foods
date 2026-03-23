import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { aromaBarAndGrillMenuMock } from '@/features/restaurant-menu/data/aroma-bar-and-grill.mock';
import { RestaurantMenuPage } from '@/features/restaurant-menu';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface RestaurantInfo {
  restaurant_id: string;
  name: string;
  favicon_url?: string;
  logo?: string;
}

async function getRestaurantByDomain(domain: string): Promise<RestaurantInfo | null> {
  try {
    console.log('[Menu Page] Looking up domain:', domain);

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
          name
          favicon_url
          logo
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
          name
          favicon_url
          logo
          custom_domain
        }
      }
    `;

    try {
      const stagingResult = await adminGraphqlRequest(GET_BY_STAGING, { domain });
      if ((stagingResult as any).restaurants && (stagingResult as any).restaurants.length > 0) {
        const restaurant = (stagingResult as any).restaurants[0];
        console.log('[Menu Page] Found restaurant via staging_domain:', restaurant.name);
        return restaurant;
      }
    } catch (stagingError) {
      console.error('[Menu Page] Error querying staging_domain:', stagingError);
    }

    try {
      const customResult = await adminGraphqlRequest(GET_BY_CUSTOM, { domain });
      if ((customResult as any).restaurants && (customResult as any).restaurants.length > 0) {
        const restaurant = (customResult as any).restaurants[0];
        console.log('[Menu Page] Found restaurant via custom_domain:', restaurant.name);
        return restaurant;
      }
    } catch (customError) {
      console.error('[Menu Page] Error querying custom_domain:', customError);
    }

    return null;
  } catch (error) {
    console.error('[Menu Page] Error fetching restaurant by domain:', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const requestHeaders = headers();
    const domain = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
    
    const restaurant = await getRestaurantByDomain(domain);
    
    if (restaurant) {
      return {
        title: `${restaurant.name} | Online Ordering`,
        description: `Order pickup or delivery from ${restaurant.name}. Fresh food delivered fast.`,
      };
    }
  } catch (error) {
    console.error('[Menu Page] Error generating metadata:', error);
  }

  // Fallback to mock data
  return {
    title: `${aromaBarAndGrillMenuMock.restaurant.name} | Online Ordering`,
    description: `Order pickup or delivery from ${aromaBarAndGrillMenuMock.restaurant.name}. Mock ordering flow ready for API and database integration.`,
  };
}

export default async function MenuPageRoute() {
  try {
    const requestHeaders = headers();
    const domain = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'localhost:3000';
    
    const restaurant = await getRestaurantByDomain(domain);
    
    if (restaurant) {
      // Create menu data with real restaurant information
      const menuData = {
        ...aromaBarAndGrillMenuMock,
        restaurant: {
          ...aromaBarAndGrillMenuMock.restaurant,
          name: restaurant.name,
        },
        brand: {
          ...aromaBarAndGrillMenuMock.brand,
          name: restaurant.name.toUpperCase(),
        },
      };
      
      console.log('[Menu Page] Using real restaurant data:', restaurant.name);
      return <RestaurantMenuPage data={menuData} />;
    }
  } catch (error) {
    console.error('[Menu Page] Error fetching restaurant data:', error);
  }

  // Fallback to mock data
  console.log('[Menu Page] Using mock data as fallback');
  return <RestaurantMenuPage data={aromaBarAndGrillMenuMock} />;
}
