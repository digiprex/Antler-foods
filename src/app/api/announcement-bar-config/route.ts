/**
 * Announcement Bar Configuration API with GraphQL (Hasura)
 * 
 * This API route fetches and updates announcement bar configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 * 
 * Structure:
 * - name: layout type (e.g., "text-only", "contact-info", "social-only", "full")
 * - category: "AnnouncementBar"
 * - menu_items: array of social media icons
 * - config: { bgColor, textColor, linkColor, text, address, phone, isEnabled, etc. }
 */

import { NextResponse } from 'next/server';
import type { AnnouncementBarConfig, AnnouncementBarConfigResponse } from '@/types/announcement-bar.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GraphQL query to fetch announcement bar configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_ANNOUNCEMENT_BAR_CONFIG = `
  query GetAnnouncementBarConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "AnnouncementBar"},
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
      address
      phone_number
      email
      fb_link
      insta_link
      yt_link
      tiktok_link
      gmb_link
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: [],
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
 * GET endpoint to fetch announcement bar configuration
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
        console.log('[Announcement Bar Config] Looking up domain:', domain);

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
            console.log('[Announcement Bar Config] Found restaurant for domain:', domain, '->', restaurantId);
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
        data: null,
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log('[Announcement Bar Config] Using restaurant_id:', restaurantId);

    const data = await graphqlRequest(GET_ANNOUNCEMENT_BAR_CONFIG, {
      restaurant_id: restaurantId,
    });

    console.log('[Announcement Bar Config] Template query result:', JSON.stringify(data, null, 2));

    // Get restaurant data for social media links and contact info
    const restaurant = data.restaurants?.[0];
    
    // Build social media icons from restaurant data
    const socialMediaIcons: AnnouncementBarConfig['socialMediaIcons'] = [];
    if (restaurant?.fb_link) {
      socialMediaIcons.push({ platform: 'facebook' as const, url: restaurant.fb_link, order: 0 });
    }
    if (restaurant?.insta_link) {
      socialMediaIcons.push({ platform: 'instagram' as const, url: restaurant.insta_link, order: 1 });
    }
    if (restaurant?.yt_link) {
      socialMediaIcons.push({ platform: 'youtube' as const, url: restaurant.yt_link, order: 2 });
    }
    if (restaurant?.tiktok_link) {
      socialMediaIcons.push({ platform: 'tiktok' as const, url: restaurant.tiktok_link, order: 3 });
    }
    if (restaurant?.gmb_link) {
      socialMediaIcons.push({ platform: 'gmb' as const, url: restaurant.gmb_link, order: 4 });
    }

    if (!data.templates || data.templates.length === 0) {
      // Return default disabled configuration if no template exists
      const response = {
        success: true,
        data: {
          isEnabled: false,
          text: '',
          address: restaurant?.address || '',
          phone: restaurant?.phone_number || '',
          email: restaurant?.email || '',
          showAddress: true,
          showPhone: true,
          showEmail: true,
          showSocialMedia: true,
          socialMediaIcons: socialMediaIcons,
          layout: 'text-only',
          position: 'top',
          bgColor: '#000000',
          textColor: '#ffffff',
          linkColor: '#ffffff',
          fontSize: '14px',
          fontWeight: 'normal',
          padding: '8px 16px',
          height: 'auto',
          isScrolling: false,
          scrollSpeed: 50,
        } as AnnouncementBarConfig,
      };
      return NextResponse.json(response);
    }

    const template = data.templates[0]; // Get most recent non-deleted template
    
    // Transform template structure to AnnouncementBarConfig
    const config: AnnouncementBarConfig = {
      restaurant_id: restaurantId,
      layout: template.name as any, // name field contains layout type
      socialMediaIcons: socialMediaIcons, // Get from restaurant data instead of template
      isEnabled: template.config?.isEnabled ?? false,
      text: template.config?.text || '',
      address: restaurant?.address || '', // Always use restaurant data
      phone: restaurant?.phone_number || '', // Always use restaurant data
      email: restaurant?.email || '', // Always use restaurant data
      showAddress: template.config?.showAddress ?? true,
      showPhone: template.config?.showPhone ?? true,
      showEmail: template.config?.showEmail ?? true,
      showSocialMedia: template.config?.showSocialMedia ?? true,
      position: template.config?.position || 'top',
      bgColor: template.config?.bgColor || '#000000',
      textColor: template.config?.textColor || '#ffffff',
      linkColor: template.config?.linkColor || '#ffffff',
      fontSize: template.config?.fontSize || '14px',
      fontWeight: template.config?.fontWeight || 'normal',
      padding: template.config?.padding || '8px 16px',
      height: template.config?.height || 'auto',
      isScrolling: template.config?.isScrolling ?? false,
      scrollSpeed: template.config?.scrollSpeed || 50,
    };

    const response: AnnouncementBarConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching announcement bar config:', error);

    const errorResponse: AnnouncementBarConfigResponse = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update announcement bar configuration
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
    const currentData = await graphqlRequest(GET_ANNOUNCEMENT_BAR_CONFIG, {
      restaurant_id: restaurantId,
    });
    
    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];
      
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }
    
    // Transform AnnouncementBarConfig to template structure
    const name = body.layout || 'text-only'; // layout goes to name field
    const config = {
      isEnabled: body.isEnabled,
      text: body.text,
      address: body.address,
      phone: body.phone,
      showAddress: body.showAddress,
      showPhone: body.showPhone,
      showEmail: body.showEmail,
      showSocialMedia: body.showSocialMedia,
      position: body.position,
      bgColor: body.bgColor,
      textColor: body.textColor,
      linkColor: body.linkColor,
      fontSize: body.fontSize,
      fontWeight: body.fontWeight,
      padding: body.padding,
      height: body.height,
      isScrolling: body.isScrolling,
      scrollSpeed: body.scrollSpeed,
    };

    // Step 3: Insert new template (without social media icons)
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'AnnouncementBar',
      config: config,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    
    // Step 4: Get restaurant data for social media icons
    const restaurantData = await graphqlRequest(GET_ANNOUNCEMENT_BAR_CONFIG, {
      restaurant_id: restaurantId,
    });
    
    const restaurant = restaurantData.restaurants?.[0];
    
    // Build social media icons from restaurant data
    const socialMediaIcons: AnnouncementBarConfig['socialMediaIcons'] = [];
    if (restaurant?.fb_link) {
      socialMediaIcons.push({ platform: 'facebook' as const, url: restaurant.fb_link, order: 0 });
    }
    if (restaurant?.insta_link) {
      socialMediaIcons.push({ platform: 'instagram' as const, url: restaurant.insta_link, order: 1 });
    }
    if (restaurant?.yt_link) {
      socialMediaIcons.push({ platform: 'youtube' as const, url: restaurant.yt_link, order: 2 });
    }
    if (restaurant?.tiktok_link) {
      socialMediaIcons.push({ platform: 'tiktok' as const, url: restaurant.tiktok_link, order: 3 });
    }
    if (restaurant?.gmb_link) {
      socialMediaIcons.push({ platform: 'gmb' as const, url: restaurant.gmb_link, order: 4 });
    }
    
    // Transform back to AnnouncementBarConfig
    const responseConfig: AnnouncementBarConfig = {
      restaurant_id: restaurantId,
      layout: template.name,
      socialMediaIcons: socialMediaIcons, // Get from restaurant data
      isEnabled: template.config?.isEnabled,
      text: template.config?.text,
      address: restaurant?.address || '', // Always use restaurant data
      phone: restaurant?.phone_number || '', // Always use restaurant data
      email: restaurant?.email || '', // Always use restaurant data
      showAddress: template.config?.showAddress ?? true,
      showPhone: template.config?.showPhone ?? true,
      showEmail: template.config?.showEmail ?? true,
      showSocialMedia: template.config?.showSocialMedia ?? true,
      position: template.config?.position,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      linkColor: template.config?.linkColor,
      fontSize: template.config?.fontSize,
      fontWeight: template.config?.fontWeight,
      padding: template.config?.padding,
      height: template.config?.height,
      isScrolling: template.config?.isScrolling,
      scrollSpeed: template.config?.scrollSpeed,
    };

    const response: AnnouncementBarConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating announcement bar config:', error);

    const errorResponse: AnnouncementBarConfigResponse = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}