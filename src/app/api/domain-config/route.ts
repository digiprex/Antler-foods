/**
 * Domain Configuration API
 *
 * Handles custom domain configuration for restaurants
 * Integrates with Vercel API for domain management
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface DomainConfig {
  customDomain?: string;
  isVerified: boolean;
  sslEnabled: boolean;
  wwwRedirect: boolean;
  httpsRedirect: boolean;
  verificationToken?: string;
  status?: 'pending' | 'active' | 'error';
}

/**
 * GraphQL query to get restaurant domain configuration
 */
const GET_RESTAURANT_DOMAIN = `
  query GetRestaurantDomain($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      custom_domain
    }
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "DomainConfig"},
        is_deleted: {_eq: false}
      },
      limit: 1
    ) {
      config
    }
  }
`;

/**
 * GraphQL mutation to update restaurant domain configuration
 */
const UPDATE_RESTAURANT_DOMAIN = `
  mutation UpdateRestaurantDomain(
    $restaurant_id: uuid!
    $custom_domain: String
  ) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: {
        custom_domain: $custom_domain
        updated_at: "now()"
      }
    ) {
      restaurant_id
      custom_domain
    }
  }
`;

const UPSERT_DOMAIN_CONFIG = `
  mutation UpsertDomainConfig(
    $restaurant_id: uuid!
    $config: jsonb!
  ) {
    insert_templates(
      objects: {
        restaurant_id: $restaurant_id
        category: "DomainConfig"
        name: "domain_status"
        config: $config
        menu_items: []
        is_deleted: false
      }
      on_conflict: {
        constraint: templates_restaurant_id_category_name_key
        update_columns: [config, updated_at]
      }
    ) {
      returning {
        template_id
        config
      }
    }
  }
`;

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch domain configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const data = await graphqlRequest(GET_RESTAURANT_DOMAIN, {
      restaurant_id: restaurantId,
    });

    const restaurant = (data as any).restaurants_by_pk;

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Check for domain configuration in templates table
    const domainTemplate = (data as any).templates?.[0];
    const domainConfig = domainTemplate?.config || {};
    
    const config: DomainConfig = {
      customDomain: restaurant.custom_domain || '',
      isVerified: domainConfig.published || false,
      sslEnabled: domainConfig.sslEnabled !== false, // Default to true
      wwwRedirect: domainConfig.wwwRedirect !== false, // Default to true
      httpsRedirect: domainConfig.httpsRedirect !== false, // Default to true
      verificationToken: domainConfig.verificationToken || '',
      status: domainConfig.published ? 'active' : 'pending',
    };

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching domain config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to update domain configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurant_id, ...config } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    // Update restaurant table with custom domain
    const updateData = {
      restaurant_id,
      custom_domain: config.customDomain || null,
    };

    const result = await graphqlRequest(UPDATE_RESTAURANT_DOMAIN, updateData);

    const updatedRestaurant = (result as any).update_restaurants_by_pk;

    if (!updatedRestaurant) {
      return NextResponse.json(
        { success: false, error: 'Failed to update domain configuration' },
        { status: 500 }
      );
    }

    // Save domain configuration in templates table
    const domainConfigData = {
      published: config.isVerified || false,
      sslEnabled: config.sslEnabled !== false,
      wwwRedirect: config.wwwRedirect !== false,
      httpsRedirect: config.httpsRedirect !== false,
      verificationToken: config.verificationToken || '',
      lastVerified: config.isVerified ? new Date().toISOString() : null,
    };

    await graphqlRequest(UPSERT_DOMAIN_CONFIG, {
      restaurant_id,
      config: domainConfigData,
    });

    const responseConfig: DomainConfig = {
      customDomain: updatedRestaurant.custom_domain || '',
      isVerified: config.isVerified || false,
      sslEnabled: config.sslEnabled !== false,
      wwwRedirect: config.wwwRedirect !== false,
      httpsRedirect: config.httpsRedirect !== false,
      verificationToken: config.verificationToken || '',
      status: config.isVerified ? 'active' : 'pending',
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    });
  } catch (error) {
    console.error('Error updating domain config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}