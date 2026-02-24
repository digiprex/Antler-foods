/**
 * Hero Configuration API with GraphQL (Hasura)
 * 
 * This API route fetches and updates hero configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 * 
 * Structure:
 * - name: layout type (e.g., "centered-large")
 * - category: "Hero"
 * - config: complete hero configuration object
 * - menu_items: not used for hero (empty array)
 */

import { NextResponse } from 'next/server';
import type { HeroConfig, HeroConfigResponse } from '@/types/hero.types';
import { DEFAULT_HERO_CONFIG } from '@/types/hero.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

// Static restaurant ID for testing
const RESTAURANT_ID = '92e9160e-0afa-4f78-824f-b28e32885353';

/**
 * GraphQL query to fetch hero configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_HERO_CONFIG = `
  query GetHeroConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Hero"},
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
    }
  }
`;

/**
 * GraphQL mutation to mark current template as deleted
 * Uses template_id as primary key
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
async function graphqlRequest(query: string, variables?: any) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * GET endpoint to fetch hero configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params or use default
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') || RESTAURANT_ID;

    const data = await graphqlRequest(GET_HERO_CONFIG, {
      restaurant_id: restaurantId,
    });

    if (!data.templates || data.templates.length === 0) {
      // Return default config if template doesn't exist
      const response: HeroConfigResponse = {
        success: true,
        data: DEFAULT_HERO_CONFIG,
      };

      return NextResponse.json(response);
    }

    const template = data.templates[0]; // Get most recent non-deleted template
    
    // The config field contains the complete hero configuration
    const config: HeroConfig = {
      ...DEFAULT_HERO_CONFIG,
      ...template.config,
      layout: template.name, // name field contains layout type
      restaurant_id: restaurantId,
    };

    const response: HeroConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching hero config:', error);

    const errorResponse: HeroConfigResponse = {
      success: false,
      data: DEFAULT_HERO_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update hero configuration
 * Marks current template as deleted and inserts new one
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;
    
    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }
    
    // Step 1: Get current template to mark as deleted
    const currentData = await graphqlRequest(GET_HERO_CONFIG, {
      restaurant_id: restaurantId,
    });
    
    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];
      
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }
    
    // Prepare hero configuration
    const { restaurant_id, layout, ...configData } = body;
    const name = layout || 'centered-large'; // layout goes to name field
    
    // The entire hero config (except layout) goes into the config field
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Step 3: Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Hero',
      config: config,
      menu_items: [], // Hero doesn't use menu_items
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    
    // Transform back to HeroConfig
    const responseConfig: HeroConfig = {
      ...template.config,
      layout: template.name,
      restaurant_id: restaurantId,
    };

    const response: HeroConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating hero config:', error);

    const errorResponse: HeroConfigResponse = {
      success: false,
      data: DEFAULT_HERO_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}