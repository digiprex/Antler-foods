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
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';

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
      global_styles
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
 * Lightweight query for update flow (POST)
 * Fetches only the latest navbar template record.
 */
const GET_NAVBAR_TEMPLATE_ONLY = `
  query GetNavbarTemplateOnly($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Navbar"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      template_id
      name
      config
      menu_items
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
    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        restaurantId = await resolveRestaurantIdByDomain(domain);
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
    const data = await graphqlRequest(GET_NAVBAR_CONFIG, {
      restaurant_id: restaurantId,
    });

    // Get restaurant data from database
    const restaurantData = (data as any).restaurants?.[0];
    const restaurantName = restaurantData?.name || 'Restaurant';
    const logoUrl = restaurantData?.logo || undefined;
    const globalStyles = restaurantData?.global_styles || null;

    // Transform web_pages to nav items
    const navItems = ((data as any).web_pages || []).map((page: any) => ({
      label: page.name,
      href: `/${page.url_slug}`,
    }));

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return default navbar configuration for new restaurants
      // Apply global_styles if available
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
        showCtaButton: true,
        position: 'absolute',
        bgColor: (globalStyles as any)?.primaryColor || '#ffffff',
        textColor: (globalStyles as any)?.navbarTextColor || globalStyles?.title?.color || '#000000',
        buttonBgColor: (globalStyles as any)?.accentColor || globalStyles?.primaryButton?.backgroundColor || '#000000',
        buttonTextColor: globalStyles?.primaryButton?.color || '#ffffff',
        buttonBorderRadius: globalStyles?.primaryButton?.borderRadius || '0.5rem',
        fontFamily: 'Poppins, sans-serif',
        fontSize: globalStyles?.title?.fontSize || '0.875rem',
        fontWeight: globalStyles?.title?.fontWeight || 500,
        textTransform: 'uppercase',
      };

      const response: NavbarConfigResponse = {
        success: true,
        data: defaultConfig,
      };
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=10, stale-while-revalidate=120',
        },
      });
    }

    const template = (data as any).templates[0]; // Get most recent non-deleted template

    // Transform template structure to NavbarConfig
    // Priority: template.config > global_styles > defaults
    const config: NavbarConfig = {
      restaurantName: restaurantName, // Get from restaurant table
      logoUrl: logoUrl, // Get logo from restaurant table
      logoSize: template.config?.logoSize || 40, // Get logo size from config
      layout: template.name, // name field contains layout type
      leftNavItems: navItems, // Use pages with show_on_navbar=true
      rightNavItems: [],
      ctaButton: template.config?.ctaButton,
      showCtaButton: template.config?.showCtaButton !== undefined ? template.config.showCtaButton : true,
      position: template.config?.position || 'absolute',
      bgColor: template.config?.bgColor || (globalStyles as any)?.primaryColor || '#ffffff',
      textColor: template.config?.textColor || (globalStyles as any)?.navbarTextColor || globalStyles?.title?.color || '#000000',
      buttonBgColor: template.config?.buttonBgColor || (globalStyles as any)?.accentColor || globalStyles?.primaryButton?.backgroundColor || '#000000',
      buttonTextColor: template.config?.buttonTextColor || globalStyles?.primaryButton?.color || '#ffffff',
      buttonBorderRadius: template.config?.buttonBorderRadius || globalStyles?.primaryButton?.borderRadius || '0.5rem',
      fontFamily: template.config?.fontFamily || 'Poppins, sans-serif',
      fontSize: template.config?.fontSize || globalStyles?.title?.fontSize || '1rem',
      fontWeight: template.config?.fontWeight || globalStyles?.title?.fontWeight || 400,
      textTransform: template.config?.textTransform || 'uppercase',
    };

    const response: NavbarConfigResponse = {
      success: true,
      data: config,
    };
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=120',
      },
    });
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
    
    // Step 1: Get current template to mark as deleted and preserve menu_items and config
    const currentData = await graphqlRequest(GET_NAVBAR_TEMPLATE_ONLY, {
      restaurant_id: restaurantId,
    });

    let menu_items = [];
    let existingConfig: any = {};

    // Step 2: Mark current template as deleted (if exists) and get menu_items & config
    if ((currentData as any).templates && (currentData as any).templates.length > 0) {
      const currentTemplate = (currentData as any).templates[0];

      // Preserve menu_items from old record
      menu_items = currentTemplate.menu_items || [];

      // Preserve existing config to merge with updates
      existingConfig = currentTemplate.config || {};

      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }

    // Transform NavbarConfig to template structure
    // Merge new values with existing config - only update properties that are provided
    const name = body.layout !== undefined ? body.layout : (existingConfig.layout || 'bordered-centered'); // layout goes to name field
    const config = {
      bgColor: body.bgColor !== undefined ? body.bgColor : existingConfig.bgColor,
      textColor: body.navbarTextColor !== undefined ? body.navbarTextColor : (body.textColor !== undefined ? body.textColor : existingConfig.textColor),
      position: body.position !== undefined ? body.position : existingConfig.position,
      logoSize: body.logoSize !== undefined ? body.logoSize : existingConfig.logoSize,
      fontFamily: body.fontFamily !== undefined ? body.fontFamily : existingConfig.fontFamily,
      fontSize: body.fontSize !== undefined ? body.fontSize : existingConfig.fontSize,
      fontWeight: body.fontWeight !== undefined ? body.fontWeight : existingConfig.fontWeight,
      textTransform: body.textTransform !== undefined ? body.textTransform : existingConfig.textTransform,
      ctaButton: body.ctaButton !== undefined ? body.ctaButton : existingConfig.ctaButton,
      showCtaButton: body.showCtaButton !== undefined ? body.showCtaButton : existingConfig.showCtaButton,
      buttonBgColor: body.buttonBgColor !== undefined ? body.buttonBgColor : existingConfig.buttonBgColor,
      buttonTextColor: body.buttonTextColor !== undefined ? body.buttonTextColor : existingConfig.buttonTextColor,
      buttonBorderRadius: body.buttonBorderRadius !== undefined ? body.buttonBorderRadius : existingConfig.buttonBorderRadius,
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
      showCtaButton: template.config?.showCtaButton !== undefined ? template.config.showCtaButton : true,
      position: template.config?.position,
      logoSize: template.config?.logoSize,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      buttonBgColor: template.config?.buttonBgColor,
      buttonTextColor: template.config?.buttonTextColor,
      buttonBorderRadius: template.config?.buttonBorderRadius,
      fontFamily: template.config?.fontFamily,
      fontSize: template.config?.fontSize,
      fontWeight: template.config?.fontWeight,
      textTransform: template.config?.textTransform,
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
