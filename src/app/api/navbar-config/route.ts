/**
 * Navbar Configuration API with GraphQL (Hasura)
 * 
 * This API route fetches and updates navbar configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 * 
 * Structure:
 * - name: layout type (e.g., "bordered-centered")
 * - category: "Navbar"
 * - menu_items: array of menu items
 * - config: { bgColor, textColor, position, ctaButton }
 */

import { NextResponse } from 'next/server';
import type { NavbarConfig, NavbarConfigResponse } from '@/types/navbar.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

// Static restaurant ID for testing
const RESTAURANT_ID = '92e9160e-0afa-4f78-824f-b28e32885353';

/**
 * GraphQL query to fetch navbar configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_NAVBAR_CONFIG = `
  query GetNavbarConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Navbar"},
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
 * GET endpoint to fetch navbar configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params or use default
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') || RESTAURANT_ID;

    const data = await graphqlRequest(GET_NAVBAR_CONFIG, {
      restaurant_id: restaurantId,
    });

    if (!data.templates || data.templates.length === 0) {
      // Return default config if template doesn't exist
      const defaultConfig: NavbarConfig = {
        restaurantName: 'Antler Foods',
        leftNavItems: [
          { label: 'Menu', href: '/menu', order: 1 },
          { label: 'About', href: '/about', order: 2 },
          { label: 'Contact', href: '/contact', order: 3 },
        ],
        rightNavItems: [],
        ctaButton: {
          label: 'Order Online',
          href: '/order',
        },
        layout: 'bordered-centered',
        position: 'absolute',
        bgColor: '#ffffff',
        textColor: '#000000',
        buttonBgColor: '#000000',
        buttonTextColor: '#ffffff',
      };

      const response: NavbarConfigResponse = {
        success: true,
        data: defaultConfig,
      };

      return NextResponse.json(response);
    }

    const template = data.templates[0]; // Get most recent non-deleted template
    
    // Transform template structure to NavbarConfig
    const config: NavbarConfig = {
      restaurantName: 'Antler Foods', // TODO: Get from restaurant table
      layout: template.name, // name field contains layout type
      leftNavItems: template.menu_items || [],
      rightNavItems: [],
      ctaButton: template.config?.ctaButton,
      position: template.config?.position || 'absolute',
      bgColor: template.config?.bgColor || '#ffffff',
      textColor: template.config?.textColor || '#000000',
      buttonBgColor: '#000000',
      buttonTextColor: '#ffffff',
    };

    const response: NavbarConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching navbar config:', error);

    const errorResponse: NavbarConfigResponse = {
      success: false,
      data: {
        restaurantName: 'Antler Foods',
        leftNavItems: [],
        rightNavItems: [],
        ctaButton: {
          label: 'Order Online',
          href: '/order',
        },
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update navbar configuration
 * Marks current template as deleted and inserts new one
 * Preserves menu_items from the old record
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;
    
    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }
    
    // Step 1: Get current template to mark as deleted and preserve menu_items
    const currentData = await graphqlRequest(GET_NAVBAR_CONFIG, {
      restaurant_id: restaurantId,
    });

    let menu_items = [];
    
    // Step 2: Mark current template as deleted (if exists) and get menu_items
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];
      
      // Preserve menu_items from old record
      menu_items = currentTemplate.menu_items || [];
      
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }
    
    // Transform NavbarConfig to template structure
    const name = body.layout || 'bordered-centered'; // layout goes to name field
    const config = {
      bgColor: body.bgColor,
      textColor: body.textColor,
      position: body.position,
      ctaButton: body.ctaButton,
    };

    // Step 3: Insert new template with preserved menu_items
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Navbar',
      config: config,
      menu_items: menu_items, // Use menu_items from old record
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    
    // Transform back to NavbarConfig
    const responseConfig: NavbarConfig = {
      restaurantName: 'Antler Foods',
      layout: template.name,
      leftNavItems: template.menu_items,
      rightNavItems: [],
      ctaButton: template.config?.ctaButton,
      position: template.config?.position,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
    };

    const response: NavbarConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating navbar config:', error);

    const errorResponse: NavbarConfigResponse = {
      success: false,
      data: {} as NavbarConfig,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
