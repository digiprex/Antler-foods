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

// Restaurant ID must be provided dynamically via query parameters or domain lookup

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
    restaurants(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false}
      }
    ) {
      name
      restaurant_id
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
    // Get restaurant_id from query params - required parameter
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');
    const urlSlug = searchParams.get('url_slug');
    let pageId = searchParams.get('page_id');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        console.log('[Navbar Config] Looking up domain:', domain);

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
              custom_domain
              staging_domain
              is_deleted
            }
          }
        `;

        const domainData = await graphqlRequest(GET_RESTAURANT_BY_DOMAIN, {
          domain: domain,
        });

        if (domainData.restaurants && domainData.restaurants.length > 0) {
          const restaurant = domainData.restaurants[0];
          if (!restaurant.is_deleted) {
            restaurantId = restaurant.restaurant_id;
            console.log('[Navbar Config] Found restaurant for domain:', domain, '->', restaurantId);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
        // Continue without restaurant ID - will be validated below
      }
    }

    // Validate that restaurant_id is provided
    if (!restaurantId) {
      const errorResponse = {
        success: false,
        data: {
          restaurantName: 'Restaurant',
          leftNavItems: [],
          rightNavItems: [],
          ctaButton: {
            label: 'Order Online',
            href: '/order',
          },
        },
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Navbar is global for the restaurant - always use general template (no page_id)
    console.log('[Navbar Config] Using restaurant_id:', restaurantId);

    const data = await graphqlRequest(GET_NAVBAR_CONFIG, {
      restaurant_id: restaurantId,
    });

    console.log('[Navbar Config] Template query result (restaurant-wide):', JSON.stringify(data, null, 2));

    // Get restaurant name from database
    const restaurantName = data.restaurants?.[0]?.name || 'Restaurant';

    if (!data.templates || data.templates.length === 0) {
      // Return 404 if no navbar template exists - don't show navbar
      const response = {
        success: false,
        data: null,
        error: 'No navbar configuration found'
      };
      return NextResponse.json(response, { status: 404 });
    }

    const template = data.templates[0]; // Get most recent non-deleted template
    
    // Transform template structure to NavbarConfig
    const config: NavbarConfig = {
      restaurantName: restaurantName, // Get from restaurant table
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
        restaurantName: 'Restaurant',
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
      restaurantName: 'Restaurant', // Note: POST doesn't fetch restaurant name, should be handled by GET
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
