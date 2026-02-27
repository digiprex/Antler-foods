/**
 * YouTube Configuration API
 *
 * Handles fetching and updating YouTube configuration from/to templates table
 * Uses category "YouTube" and is universal for the restaurant
 */

import { NextResponse } from 'next/server';
import type { YouTubeConfig, YouTubeConfigResponse } from '@/types/youtube.types';
import { DEFAULT_YOUTUBE_CONFIG } from '@/types/youtube.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch YouTube configuration
 */
const GET_YOUTUBE_CONFIG = `
  query GetYouTubeConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "YouTube"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      menu_items
      name
      restaurant_id
      template_id
      updated_at
      page_id
    }
  }
`;

/**
 * GraphQL mutation to mark current template as deleted
 */
const MARK_AS_DELETED = `
  mutation MarkAsDeleted($template_id: uuid!) {
    update_templates_by_pk(
      pk_columns: {template_id: $template_id},
      _set: {is_deleted: true, updated_at: "now()"}
    ) {
      template_id
      is_deleted
    }
  }
`;

/**
 * GraphQL mutation to insert new template
 */
const INSERT_TEMPLATE = `
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      menu_items
      created_at
      updated_at
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch YouTube configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        const GET_RESTAURANT_BY_DOMAIN = `
          query GetRestaurantByDomain($domain: String!) {
            restaurants(
              where: {
                _or: [
                  { custom_domain: { _eq: $domain } },
                  { staging_domain: { _eq: $domain } }
                ],
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
            }
          }
        `;

        const domainData = await graphqlRequest(GET_RESTAURANT_BY_DOMAIN, { domain });

        if (domainData.restaurants && domainData.restaurants.length > 0) {
          restaurantId = domainData.restaurants[0].restaurant_id;
        }
      } catch (error) {
        console.error('[YouTube Config] Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      const errorResponse: YouTubeConfigResponse = {
        success: false,
        data: DEFAULT_YOUTUBE_CONFIG,
        error: 'restaurant_id is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const data = await graphqlRequest(GET_YOUTUBE_CONFIG, { restaurant_id: restaurantId });

    if (!data.templates || data.templates.length === 0) {
      const response: YouTubeConfigResponse = {
        success: true,
        data: DEFAULT_YOUTUBE_CONFIG,
      };
      return NextResponse.json(response);
    }

    const template = data.templates[0];
    const config: YouTubeConfig = {
      ...DEFAULT_YOUTUBE_CONFIG,
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: YouTubeConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube Config] Error:', error);

    const errorResponse: YouTubeConfigResponse = {
      success: false,
      data: DEFAULT_YOUTUBE_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update YouTube configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required');
    }

    // Get current template to mark as deleted
    const currentData = await graphqlRequest(GET_YOUTUBE_CONFIG, { restaurant_id: restaurantId });

    // Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentData.templates[0].template_id,
      });
    }

    // Prepare YouTube configuration
    const { restaurant_id: _restaurantId, ...configData } = body;
    const name = 'youtube';
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'YouTube',
      config: config,
      menu_items: [],
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert template');
    }

    const template = insertedData.insert_templates_one;
    const responseConfig: YouTubeConfig = {
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: YouTubeConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube Config] Error updating:', error);

    const errorResponse: YouTubeConfigResponse = {
      success: false,
      data: DEFAULT_YOUTUBE_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
