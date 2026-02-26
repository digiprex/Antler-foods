/**
 * Location Configuration API Route
 *
 * Handles GET and POST requests for location configuration
 * Uses templates table with category "Location"
 * Fetches google_place_id from restaurant table
 */

import { NextRequest, NextResponse } from 'next/server';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GraphQL query to fetch location configuration from templates
 */
const GET_LOCATION_CONFIG = `
  query GetLocationConfig($restaurant_id: uuid!, $page_id: uuid) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Location"},
        is_deleted: {_eq: false},
        page_id: {_eq: $page_id}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      name
      restaurant_id
      template_id
      page_id
      updated_at
    }
    restaurants(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false}
      }
    ) {
      google_place_id
      restaurant_id
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $page_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        page_id: $page_id,
        menu_items: [],
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      page_id
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    console.log('[Location Config] Using restaurant_id:', restaurantId, 'page_id:', pageId);

    const data = await graphqlRequest(GET_LOCATION_CONFIG, {
      restaurant_id: restaurantId,
      page_id: pageId,
    });

    console.log('[Location Config] Template query result:', JSON.stringify(data, null, 2));

    // Get google_place_id from restaurant table
    const googlePlaceId = data.restaurants?.[0]?.google_place_id || '';
    
    console.log('[Location Config] Restaurant data:', data.restaurants);
    console.log('[Location Config] Google Place ID:', googlePlaceId);

    if (!data.templates || data.templates.length === 0) {
      // Return default config if no template exists
      const defaultConfig = {
        enabled: false,
        layout: 'default',
        title: 'Our Location',
        description: 'Visit us at our location',
        bgColor: '#ffffff',
        textColor: '#000000',
        maxWidth: '1200px',
        google_place_id: googlePlaceId,
      };

      return NextResponse.json({
        success: true,
        data: defaultConfig,
      });
    }

    const template = data.templates[0];

    // Transform template structure to LocationConfig
    const config = {
      layout: template.name,
      ...template.config,
      google_place_id: googlePlaceId,
    };

    console.log('[Location Config] Final config being returned:', config);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching location config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, page_id, layout, ...configData } = body;

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    console.log('[Location Config] Saving config for restaurant:', restaurant_id, 'page_id:', page_id);

    // Step 1: Get current template to mark as deleted
    const currentData = await graphqlRequest(GET_LOCATION_CONFIG, {
      restaurant_id: restaurant_id,
      page_id: page_id,
    });

    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
      console.log('[Location Config] Marked old template as deleted:', currentTemplate.template_id);
    }

    // Transform LocationConfig to template structure
    const name = layout || 'default'; // layout goes to name field
    const config = {
      enabled: configData.enabled,
      title: configData.title,
      description: configData.description,
      bgColor: configData.bgColor,
      textColor: configData.textColor,
      maxWidth: configData.maxWidth,
    };

    // Step 3: Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurant_id,
      name: name,
      category: 'Location',
      config: config,
      page_id: page_id,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    console.log('[Location Config] Created new template:', template.template_id);

    // Transform back to LocationConfig
    const responseConfig = {
      layout: template.name,
      ...template.config,
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    });
  } catch (error) {
    console.error('Error updating location config:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}