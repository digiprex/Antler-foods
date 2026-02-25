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

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET;
const RESTAURANT_ID = process.env.RESTAURANT_ID || '92e9160e-0afa-4f78-824f-b28e32885353';

/**
 * GraphQL request helper
 */
async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
  const response = await fetch(HASURA_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET!,
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
      order_by: {updated_at: desc}
    ) {
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
 * GET /api/page-details
 * 
 * Fetches page details and associated templates by URL slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') || RESTAURANT_ID;
    const urlSlug = searchParams.get('url_slug');
    const domain = searchParams.get('domain'); // For future use

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

    // Step 1: Get page details by URL slug
    const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
      restaurant_id: restaurantId,
      url_slug: urlSlug,
    });

    if (!pageData.web_pages || pageData.web_pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No published page found with url_slug: ${urlSlug}`,
          data: null,
        },
        { status: 404 }
      );
    }

    const page = pageData.web_pages[0];

    // Step 2: Get all templates for this page
    const templatesData = await graphqlRequest(GET_PAGE_TEMPLATES, {
      restaurant_id: restaurantId,
      page_id: page.page_id,
    });

    // Organize templates by category for easier access
    const templatesByCategory: Record<string, any> = {};
    if (templatesData.templates) {
      templatesData.templates.forEach((template: any) => {
        templatesByCategory[template.category] = {
          template_id: template.template_id,
          name: template.name,
          config: template.config,
          menu_items: template.menu_items,
          created_at: template.created_at,
          updated_at: template.updated_at,
        };
      });
    }

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
        templates: templatesByCategory,
        template_count: templatesData.templates?.length || 0,
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