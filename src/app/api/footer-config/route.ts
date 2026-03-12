/**
 * Footer Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates footer configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "columns-3")
 * - category: "Footer"
 * - menu_items: array of footer links/columns
 * - config: { bgColor, textColor, linkColor, contact info, social links }
 */

import { NextResponse } from 'next/server';
import type { FooterConfig, FooterConfigResponse } from '@/types/footer.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

// Restaurant ID must be provided dynamically via query parameters or domain lookup

/**
 * GraphQL query to fetch footer configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 * Also fetches email and phone_number from the restaurant table
 */
const GET_FOOTER_CONFIG = `
  query GetFooterConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Footer"},
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
      email
      phone_number
      address
      city
      state
      country
      postal_code
      insta_link
      fb_link
      yt_link
      tiktok_link
      gmb_link
      doordash_link
      grubhub_link
      ubereats_link
      yelp_link
      global_styles
    }
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        show_on_footer: {_eq: true},
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
 * GET endpoint to fetch footer configuration
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
        console.log('[Footer Config] Looking up domain:', domain);

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
            console.log('[Footer Config] Found restaurant for domain:', domain, '->', restaurantId);
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
          restaurantName: 'Antler Foods',
          columns: [],
          socialLinks: [],
        } as FooterConfig,
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Footer is global for the restaurant - always use general template (no page_id)
    console.log('[Footer Config] Using restaurant_id:', restaurantId);

    const data = await graphqlRequest(GET_FOOTER_CONFIG, {
      restaurant_id: restaurantId,
    });

    console.log('[Footer Config] Template query result (restaurant-wide):', JSON.stringify(data, null, 2));

    // Extract name, email, phone, address and social links from restaurant table
    const restaurantData = (data as any).restaurants?.[0];
    const restaurantName = restaurantData?.name || '';
    const restaurantEmail = restaurantData?.email || '';
    const restaurantPhone = restaurantData?.phone_number || '';
    const globalStyles = restaurantData?.global_styles || null;
    
    // Build complete address from restaurant table fields, avoiding duplication
    const addressParts = [];
    if (restaurantData?.address) addressParts.push(restaurantData.address);
    if (restaurantData?.city && restaurantData.city !== restaurantData?.address) addressParts.push(restaurantData.city);
    if (restaurantData?.state && restaurantData.state !== restaurantData?.city) addressParts.push(restaurantData.state);
    if (restaurantData?.postal_code) addressParts.push(restaurantData.postal_code);
    if (restaurantData?.country && restaurantData.country !== restaurantData?.state) addressParts.push(restaurantData.country);
    const restaurantAddress = addressParts.join(', ');
    
    // Build social links from restaurant table
    const socialLinks = [];
    let order = 1;
    if (restaurantData?.fb_link) {
      socialLinks.push({ platform: 'facebook' as const, url: restaurantData.fb_link, order: order++ });
    }
    if (restaurantData?.insta_link) {
      socialLinks.push({ platform: 'instagram' as const, url: restaurantData.insta_link, order: order++ });
    }
    if (restaurantData?.yt_link) {
      socialLinks.push({ platform: 'youtube' as const, url: restaurantData.yt_link, order: order++ });
    }
    if (restaurantData?.tiktok_link) {
      socialLinks.push({ platform: 'tiktok' as const, url: restaurantData.tiktok_link, order: order++ });
    }
    if (restaurantData?.gmb_link) {
      socialLinks.push({ platform: 'gmb' as const, url: restaurantData.gmb_link, order: order++ });
    }
    if (restaurantData?.doordash_link) {
      socialLinks.push({ platform: 'doordash' as const, url: restaurantData.doordash_link, order: order++ });
    }
    if (restaurantData?.grubhub_link) {
      socialLinks.push({ platform: 'grubhub' as const, url: restaurantData.grubhub_link, order: order++ });
    }
    if (restaurantData?.ubereats_link) {
      socialLinks.push({ platform: 'ubereats' as const, url: restaurantData.ubereats_link, order: order++ });
    }
    if (restaurantData?.yelp_link) {
      socialLinks.push({ platform: 'yelp' as const, url: restaurantData.yelp_link, order: order++ });
    }

    // Transform web_pages to footer links
    const pageLinks = ((data as any).web_pages || []).map((page: any) => ({
      label: page.name,
      href: `/${page.url_slug}`,
    }));

    // Create a "Pages" column with dynamic page links if there are any pages
    const pagesColumn = pageLinks.length > 0 ? [{
      title: 'Pages',
      links: pageLinks,
    }] : [];

    // Use only dynamic pages from database, ignore template menu_items to avoid duplication
    // The pages are already filtered for show_on_footer=true and published=true
    const allColumns = pagesColumn;

    let config: FooterConfig;

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return default configuration if no footer template exists - allows users to create their first footer
      // Apply global_styles if available
      config = {
        restaurant_id: restaurantId,
        restaurantName: restaurantName || 'Restaurant',
        aboutContent: '',
        email: restaurantEmail || '',
        phone: restaurantPhone || '',
        address: restaurantAddress || '',
        columns: allColumns, // Use pages with show_on_footer=true
        socialLinks: socialLinks.length > 0 ? socialLinks : [],
        copyrightText: `© ${new Date().getFullYear()} ${restaurantName || 'Restaurant'}. All rights reserved.`,
        showPoweredBy: true,
        layout: 'columns-4', // Default layout
        bgColor: (globalStyles as any)?.primaryColor || '#1f2937',
        textColor: globalStyles?.paragraph?.color || '#f9fafb',
        linkColor: globalStyles?.secondaryColor || globalStyles?.paragraph?.color || '#9ca3af',
        copyrightBgColor: globalStyles?.accentColor || '#000000',
        copyrightTextColor: '#ffffff',
        showNewsletter: false,
        showSocialMedia: true,
        showLocations: true,
        fontFamily: globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: globalStyles?.paragraph?.fontSize || '0.9375rem',
        fontWeight: globalStyles?.paragraph?.fontWeight || 400,
        textTransform: 'none',
        headingFontFamily: globalStyles?.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
        headingFontSize: globalStyles?.subheading?.fontSize || '1.125rem',
        headingFontWeight: globalStyles?.subheading?.fontWeight || 600,
        headingTextTransform: 'uppercase',
        copyrightFontFamily: globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
        copyrightFontSize: '0.875rem',
        copyrightFontWeight: 400,
      };
    } else {
      const template = (data as any).templates[0];

      // Transform template structure to FooterConfig
      // Priority: template.config > global_styles > defaults
      // Use name, email, phone, address and social links from restaurant table, fallback to template config
      config = {
        restaurant_id: restaurantId,
        restaurantName: restaurantName || template.config?.restaurantName || 'Restaurant',
        aboutContent: template.config?.aboutContent || '',
        email: restaurantEmail || template.config?.email || '',
        phone: restaurantPhone || template.config?.phone || '',
        address: restaurantAddress || template.config?.address || '',
        columns: allColumns, // Use pages with show_on_footer=true + any additional columns
        socialLinks: socialLinks.length > 0 ? socialLinks : (template.config?.socialLinks || []),
        copyrightText: template.config?.copyrightText || `© ${new Date().getFullYear()} ${restaurantName || 'Restaurant'}. All rights reserved.`,
        showPoweredBy: template.config?.showPoweredBy !== false,
        layout: template.name,
        bgColor: template.config?.bgColor || (globalStyles as any)?.primaryColor || '#1f2937',
        textColor: template.config?.textColor || globalStyles?.paragraph?.color || '#f9fafb',
        linkColor: template.config?.linkColor || globalStyles?.secondaryColor || globalStyles?.paragraph?.color || '#9ca3af',
        copyrightBgColor: template.config?.copyrightBgColor || globalStyles?.accentColor || '#000000',
        copyrightTextColor: template.config?.copyrightTextColor || '#ffffff',
        showNewsletter: template.config?.showNewsletter || false,
        showSocialMedia: template.config?.showSocialMedia !== false,
        showLocations: template.config?.showLocations !== false,
        fontFamily: template.config?.fontFamily || globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
        fontSize: template.config?.fontSize || globalStyles?.paragraph?.fontSize || '0.9375rem',
        fontWeight: template.config?.fontWeight || globalStyles?.paragraph?.fontWeight || 400,
        textTransform: template.config?.textTransform || 'none',
        headingFontFamily: template.config?.headingFontFamily || globalStyles?.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
        headingFontSize: template.config?.headingFontSize || globalStyles?.subheading?.fontSize || '1.125rem',
        headingFontWeight: template.config?.headingFontWeight || globalStyles?.subheading?.fontWeight || 600,
        headingTextTransform: template.config?.headingTextTransform || 'uppercase',
        copyrightFontFamily: template.config?.copyrightFontFamily || globalStyles?.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
        copyrightFontSize: template.config?.copyrightFontSize || '0.875rem',
        copyrightFontWeight: template.config?.copyrightFontWeight || 400,
      };
    }

    const response: FooterConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching footer config:', error);

    const errorResponse: FooterConfigResponse = {
      success: false,
      data: {
        restaurantName: 'Restaurant',
        columns: [],
        socialLinks: [],
      } as FooterConfig,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update footer configuration
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
    const currentData = await graphqlRequest(GET_FOOTER_CONFIG, {
      restaurant_id: restaurantId,
    });

    // Step 2: Mark current template as deleted (if exists)
    if ((currentData as any).templates && (currentData as any).templates.length > 0) {
      const currentTemplate = (currentData as any).templates[0];

      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }

    // Transform FooterConfig to template structure
    // Note: restaurantName, email, phone, address and socialLinks are not saved in config - they come from restaurant table
    const name = body.layout || 'columns-3';
    const config = {
      aboutContent: body.aboutContent,
      bgColor: body.bgColor,
      textColor: body.textColor,
      linkColor: body.linkColor,
      copyrightBgColor: body.copyrightBgColor,
      copyrightTextColor: body.copyrightTextColor,
      copyrightText: body.copyrightText,
      showPoweredBy: body.showPoweredBy,
      showNewsletter: body.showNewsletter,
      showSocialMedia: body.showSocialMedia,
      showLocations: body.showLocations,
      fontFamily: body.fontFamily,
      fontSize: body.fontSize,
      fontWeight: body.fontWeight,
      textTransform: body.textTransform,
      headingFontFamily: body.headingFontFamily,
      headingFontSize: body.headingFontSize,
      headingFontWeight: body.headingFontWeight,
      headingTextTransform: body.headingTextTransform,
      copyrightFontFamily: body.copyrightFontFamily,
      copyrightFontSize: body.copyrightFontSize,
      copyrightFontWeight: body.copyrightFontWeight,
    };

    const menu_items = body.columns || [];

    // Step 3: Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Footer',
      config: config,
      menu_items: menu_items,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;

    // Transform back to FooterConfig
    // Note: restaurantName, email, phone, address and socialLinks will be fetched from restaurant table on next GET request
    const responseConfig: FooterConfig = {
      restaurantName: '', // Will be fetched from restaurant table
      aboutContent: template.config?.aboutContent,
      layout: template.name,
      columns: template.menu_items,
      socialLinks: [], // Will be fetched from restaurant table
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      linkColor: template.config?.linkColor,
      copyrightBgColor: template.config?.copyrightBgColor,
      copyrightTextColor: template.config?.copyrightTextColor,
      copyrightText: template.config?.copyrightText,
      showPoweredBy: template.config?.showPoweredBy,
      showNewsletter: template.config?.showNewsletter,
      showSocialMedia: template.config?.showSocialMedia,
      showLocations: template.config?.showLocations,
      fontFamily: template.config?.fontFamily,
      fontSize: template.config?.fontSize,
      fontWeight: template.config?.fontWeight,
      textTransform: template.config?.textTransform,
      headingFontFamily: template.config?.headingFontFamily,
      headingFontSize: template.config?.headingFontSize,
      headingFontWeight: template.config?.headingFontWeight,
      headingTextTransform: template.config?.headingTextTransform,
      copyrightFontFamily: template.config?.copyrightFontFamily,
      copyrightFontSize: template.config?.copyrightFontSize,
      copyrightFontWeight: template.config?.copyrightFontWeight,
    };

    const response: FooterConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating footer config:', error);

    const errorResponse: FooterConfigResponse = {
      success: false,
      data: {} as FooterConfig,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
