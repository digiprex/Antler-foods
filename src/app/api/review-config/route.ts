/**
 * Review Config API Route
 *
 * Handles CRUD operations for review section configuration
 * Uses templates table with category "Reviews"
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ReviewConfig, ReviewConfigResponse } from '@/types/review.types';
import { DEFAULT_REVIEW_CONFIG } from '@/types/review.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch review configuration from templates
 */
const GET_REVIEW_CONFIG = `
  query GetReviewConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Reviews"},
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
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch review configuration
 */
export async function GET(request: NextRequest) {
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

        if (domainData.restaurants && domainData.restaurants.length > 0) {
          restaurantId = domainData.restaurants[0].restaurant_id;
        }
      } catch (error) {
        console.error('[Review Config] Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      const errorResponse: ReviewConfigResponse = {
        success: false,
        data: DEFAULT_REVIEW_CONFIG,
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

        if (pageData.web_pages && pageData.web_pages.length > 0) {
          pageId = pageData.web_pages[0].page_id;
        }
      } catch (error) {
        console.error('[Review Config] Error fetching page_id:', error);
      }
    }

    // Use page-specific query if page_id is available
    const data = pageId
      ? await graphqlRequest(`
          query GetReviewConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Reviews"},
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
      : await graphqlRequest(GET_REVIEW_CONFIG, { restaurant_id: restaurantId });

    if (!data.templates || data.templates.length === 0) {
      const response: ReviewConfigResponse = {
        success: true,
        data: DEFAULT_REVIEW_CONFIG,
      };
      return NextResponse.json(response);
    }

    const template = data.templates[0];
    const config: ReviewConfig = {
      ...DEFAULT_REVIEW_CONFIG,
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
    };

    const response: ReviewConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Review Config] Error:', error);

    const errorResponse: ReviewConfigResponse = {
      success: false,
      data: DEFAULT_REVIEW_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update review configuration
 */
export async function POST(request: NextRequest) {
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
          query GetReviewConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "Reviews"},
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
      : await graphqlRequest(GET_REVIEW_CONFIG, { restaurant_id: restaurantId });

    // Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentData.templates[0].template_id,
      });
    }

    // Prepare review configuration
    const { restaurant_id: _restaurantId, layout, page_id: _pageId, ...configData } = body;
    const name = layout || 'grid';
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Reviews',
      config: config,
      menu_items: [],
      page_id: pageId,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert template');
    }

    const template = insertedData.insert_templates_one;
    const responseConfig: ReviewConfig = {
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
    };

    const response: ReviewConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Review Config] Error updating:', error);

    const errorResponse: ReviewConfigResponse = {
      success: false,
      data: DEFAULT_REVIEW_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
