/**
 * Gallery Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates gallery configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "grid", "masonry")
 * - category: "Gallery"
 * - config: complete gallery configuration object
 * - menu_items: not used for gallery (empty array)
 */

import { NextResponse } from 'next/server';
import type { GalleryConfig, GalleryConfigResponse } from '@/types/gallery.types';
import { DEFAULT_GALLERY_CONFIG } from '@/types/gallery.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch gallery configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_GALLERY_CONFIG = `
  query GetGalleryConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Gallery"},
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!, $page_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        page_id: $page_id,
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      menu_items
      page_id
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
 * GET endpoint to fetch gallery configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');
    const urlSlug = searchParams.get('url_slug');
    let pageId = searchParams.get('page_id');

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

        if ((domainData as any).restaurants && (domainData as any).restaurants.length > 0) {
          restaurantId = (domainData as any).restaurants[0].restaurant_id;
        }
      } catch (error) {
        console.error('[Gallery Config] Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      const errorResponse: GalleryConfigResponse = {
        success: false,
        data: DEFAULT_GALLERY_CONFIG,
        error: 'restaurant_id is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // If url_slug is provided, fetch page_id from web_pages table
    if (urlSlug && !pageId) {
      try {
        const GET_PAGE_BY_SLUG = `
          query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
            web_pages(
              where: {
                restaurant_id: { _eq: $restaurant_id },
                url_slug: { _eq: $url_slug },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              page_id
            }
          }
        `;

        const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug,
        });

        if ((pageData as any).web_pages && (pageData as any).web_pages.length > 0) {
          pageId = (pageData as any).web_pages[0].page_id;
        }
      } catch (error) {
        console.error('[Gallery Config] Error fetching page_id:', error);
      }
    }

    // Use page-specific query if page_id is available
    const data = pageId
      ? await graphqlRequest(`
          query GetGalleryConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Gallery"},
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
        `, {
          restaurant_id: restaurantId,
          page_id: pageId,
        })
      : await graphqlRequest(GET_GALLERY_CONFIG, { restaurant_id: restaurantId });

    if (!(data as any).templates || (data as any).templates.length === 0) {
      const response: GalleryConfigResponse = {
        success: true,
        data: DEFAULT_GALLERY_CONFIG,
      };
      return NextResponse.json(response);
    }

    const template = (data as any).templates[0];
    const config: GalleryConfig = {
      ...DEFAULT_GALLERY_CONFIG,
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
    };

    const response: GalleryConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Gallery Config] Error:', error);

    const errorResponse: GalleryConfigResponse = {
      success: false,
      data: DEFAULT_GALLERY_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update gallery configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required');
    }

    const pageId = body.page_id || null;

    // Get current template to mark as deleted
    const currentData = pageId
      ? await graphqlRequest(`
          query GetGalleryConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Gallery"},
                is_deleted: {_eq: false}
              },
              order_by: {created_at: desc},
              limit: 1
            ) {
              template_id
            }
          }
        `, {
          restaurant_id: restaurantId,
          page_id: pageId,
        })
      : await graphqlRequest(GET_GALLERY_CONFIG, { restaurant_id: restaurantId });

    // Mark current template as deleted (if exists)
    if ((currentData as any).templates && (currentData as any).templates.length > 0) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: (currentData as any).templates[0].template_id,
      });
    }

    // Prepare gallery configuration
    const { restaurant_id, layout, page_id: _pageId, ...configData } = body;
    const name = layout || 'grid';
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Gallery',
      config: config,
      menu_items: [],
      page_id: pageId,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert template');
    }

    const template = (insertedData as any).insert_templates_one;
    const responseConfig: GalleryConfig = {
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
    };

    const response: GalleryConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Gallery Config] Error updating:', error);

    const errorResponse: GalleryConfigResponse = {
      success: false,
      data: DEFAULT_GALLERY_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
