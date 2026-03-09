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
import { adminGraphqlRequest } from '@/lib/server/api-auth';

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
      logo
    }
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        show_on_navbar: {_eq: true},
        published: {_eq: true},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: asc}
    ) {
      page_id
      name
      url_slug
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
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
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

        if ((domainData as any).restaurants && (domainData as any).restaurants.length > 0) {
          const restaurant = (domainData as any).restaurants[0];
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
            href: '/menu',
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

    // Get restaurant data from database
    const restaurantData = (data as any).restaurants?.[0];
    const restaurantName = restaurantData?.name || 'Restaurant';
    const logoUrl = restaurantData?.logo || undefined;

    console.log('[Navbar Config] 🏪 Restaurant data:', {
      name: restaurantName,
      logo: logoUrl,
      hasLogo: !!logoUrl,
    });

    // Transform web_pages to nav items
    const navItems = ((data as any).web_pages || []).map((page: any) => ({
      label: page.name,
      href: `/${page.url_slug}`,
    }));

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return default navbar configuration for new restaurants
      const defaultConfig: NavbarConfig = {
        restaurantName: restaurantName,
        logoUrl: logoUrl,
        logoSize: 40,
        layout: 'bordered-centered',
        leftNavItems: navItems,
        rightNavItems: [],
        ctaButton: {
          label: 'Order Online',
          href: '/menu',
        },
        position: 'absolute',
        bgColor: '#ffffff',
        textColor: '#000000',
        buttonBgColor: '#000000',
        buttonTextColor: '#ffffff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '1rem',
        fontWeight: 400,
        textTransform: 'uppercase',
      };

      console.log('[Navbar Config] ✅ Returning default config for new restaurant');

      const response: NavbarConfigResponse = {
        success: true,
        data: defaultConfig,
      };

      return NextResponse.json(response);
    }

    const template = (data as any).templates[0]; // Get most recent non-deleted template

    // Transform template structure to NavbarConfig
    const config: NavbarConfig = {
      restaurantName: restaurantName, // Get from restaurant table
      logoUrl: logoUrl, // Get logo from restaurant table
      logoSize: template.config?.logoSize || 40, // Get logo size from config
      layout: template.name, // name field contains layout type
      leftNavItems: navItems, // Use pages with show_on_navbar=true
      rightNavItems: [],
      ctaButton: template.config?.ctaButton,
      position: template.config?.position || 'absolute',
      bgColor: template.config?.bgColor || '#ffffff',
      textColor: template.config?.textColor || '#000000',
      buttonBgColor: '#000000',
      buttonTextColor: '#ffffff',
      fontFamily: template.config?.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: template.config?.fontSize || '1rem',
      fontWeight: template.config?.fontWeight || 400,
      textTransform: template.config?.textTransform || 'uppercase',
    };

    console.log('[Navbar Config] ✅ Final config being sent:', {
      restaurantName: config.restaurantName,
      logoUrl: config.logoUrl,
      hasLogo: !!config.logoUrl,
      leftNavItems: config.leftNavItems?.length,
    });

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
          href: '/menu',
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
    if ((currentData as any).templates && (currentData as any).templates.length > 0) {
      const currentTemplate = (currentData as any).templates[0];

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
      logoSize: body.logoSize,
      fontFamily: body.fontFamily,
      fontSize: body.fontSize,
      fontWeight: body.fontWeight,
      textTransform: body.textTransform,
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

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;
    
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
