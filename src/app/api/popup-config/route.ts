/**
 * Popup Configuration API
 *
 * Handles fetching and updating popup configuration from/to templates table
 * Uses category "Popup" and is universal for the restaurant
 */

import { NextResponse } from 'next/server';
import type { PopupConfig, PopupConfigResponse } from '@/types/popup.types';
import { DEFAULT_POPUP_CONFIG } from '@/types/popup.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';

interface PopupTemplate {
  category: string;
  config: any;
  created_at: string;
  is_deleted: boolean;
  menu_items: any;
  name: string;
  restaurant_id: string;
  template_id: string;
  updated_at: string;
  page_id?: string;
}

interface GetPopupConfigResponse {
  templates: PopupTemplate[];
}

interface GetPopupTemplateOnlyResponse {
  templates: Array<{
    template_id: string;
  }>;
}

interface MarkAsDeletedResponse {
  update_templates_by_pk: {
    template_id: string;
    is_deleted: boolean;
  };
}

interface InsertTemplateResponse {
  insert_templates_one: {
    restaurant_id: string;
    template_id: string;
    name: string;
    category: string;
    config: any;
    menu_items: any;
    created_at: string;
    updated_at: string;
  };
}

/**
 * GraphQL query to fetch popup configuration
 */
const GET_POPUP_CONFIG = `
  query GetPopupConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Popup"},
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
 * Lightweight query for update flow (POST)
 * Fetches only current popup template id for soft-delete.
 */
const GET_POPUP_TEMPLATE_ONLY = `
  query GetPopupTemplateOnly($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Popup"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      template_id
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
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch popup configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        restaurantId = await resolveRestaurantIdByDomain(domain);
      } catch (error) {
        console.error('[Popup Config] Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      const errorResponse: PopupConfigResponse = {
        success: false,
        data: DEFAULT_POPUP_CONFIG,
        error: 'restaurant_id is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const data = await graphqlRequest<GetPopupConfigResponse>(GET_POPUP_CONFIG, { restaurant_id: restaurantId });

    if (!data.templates || data.templates.length === 0) {
      const response: PopupConfigResponse = {
        success: true,
        data: DEFAULT_POPUP_CONFIG,
      };
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=120',
        },
      });
    }

    const template = data.templates[0];
    const config: PopupConfig = {
      ...DEFAULT_POPUP_CONFIG,
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: PopupConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('[Popup Config] Error:', error);

    const errorResponse: PopupConfigResponse = {
      success: false,
      data: DEFAULT_POPUP_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update popup configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required');
    }

    // Get current template to mark as deleted
    const currentData = await graphqlRequest<GetPopupTemplateOnlyResponse>(GET_POPUP_TEMPLATE_ONLY, {
      restaurant_id: restaurantId,
    });

    // Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      await graphqlRequest<MarkAsDeletedResponse>(MARK_AS_DELETED, {
        template_id: currentData.templates[0].template_id,
      });
    }

    // Prepare popup configuration
    const { restaurant_id, ...configData } = body;
    const name = 'popup';
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Insert new template
    const insertedData = await graphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Popup',
      config: config,
      menu_items: [],
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert template');
    }

    const template = insertedData.insert_templates_one;
    const responseConfig: PopupConfig = {
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: PopupConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Popup Config] Error updating:', error);

    const errorResponse: PopupConfigResponse = {
      success: false,
      data: DEFAULT_POPUP_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
