/**
 * Page Details API Route
 * 
 * This API route fetches page details from web_pages table using URL slug and domain,
 * then fetches associated template configurations from templates table
 * 
 * Query Parameters:
 * - restaurant_id: UUID of the restaurant (required)
 * - url_slug: URL slug of the page (required)
 * - domain: Domain name (optional, for future multi-domain support)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
// Restaurant ID should be provided dynamically via query parameters - no static fallback

/**
 * GraphQL request helper
 */
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GraphQL query to get page details by URL slug
 */
const GET_PAGE_BY_SLUG = `
  query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        url_slug: {_eq: $url_slug},
        is_deleted: {_eq: false},
        published: {_eq: true}
      }
      limit: 1
    ) {
      page_id
      url_slug
      name
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL query to get all templates for a specific page
 */
const GET_PAGE_TEMPLATES = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        is_deleted: {_eq: false}
      }
      order_by: {order_index: asc_nulls_last, created_at: desc}
    ) {
      template_id
      name
      category
      config
      menu_items
      page_id
      restaurant_id
      order_index
      is_deleted
      created_at
      updated_at
    }
  }
`;

/**
 * GET /api/page-details
 * 
 * Fetches page details and associated templates by URL slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required as a query parameter' },
        { status: 400 }
      );
    }
    const urlSlug = searchParams.get('url_slug');
    const domain = searchParams.get('domain') || request.headers.get('host');

    if (!urlSlug) {
      return NextResponse.json(
        {
          success: false,
          error: 'url_slug parameter is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        // Import the function dynamically to avoid circular dependencies
        const { getRestaurantIdByDomain } = await import('@/lib/graphql/queries');
        const domainRestaurantId = await getRestaurantIdByDomain(domain);
        if (domainRestaurantId) {
          restaurantId = domainRestaurantId;
        }
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
        // Continue with default restaurant ID
      }
    }

    // Step 1: Get page details by URL slug
    const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
      restaurant_id: restaurantId,
      url_slug: urlSlug,
    });


    if (!(pageData as any).web_pages || (pageData as any).web_pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No published page found with url_slug: ${urlSlug}`,
          data: null,
        },
        { status: 404 }
      );
    }

    const page = (pageData as any).web_pages[0];

    // Step 2: Get all templates for this page
    const templatesData = await graphqlRequest(GET_PAGE_TEMPLATES, {
      restaurant_id: restaurantId,
      page_id: page.page_id,
    });


    // Return templates as an array instead of organizing by category
    // This allows multiple templates of the same category and preserves order
    const templates = (templatesData as any).templates || [];

    const response = {
      success: true,
      data: {
        page: {
          page_id: page.page_id,
          url_slug: page.url_slug,
          name: page.name,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          restaurant_id: page.restaurant_id,
          is_system_page: page.is_system_page,
          show_on_navbar: page.show_on_navbar,
          show_on_footer: page.show_on_footer,
          keywords: page.keywords,
          og_image: page.og_image,
          published: page.published,
          created_at: page.created_at,
          updated_at: page.updated_at,
        },
        templates: templates,
        template_count: templates.length,
      },
      error: null,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Page details API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}
