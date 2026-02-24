/**
 * FAQ Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates FAQ configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "accordion", "list", "grid")
 * - category: "FAQ"
 * - menu_items: array of FAQ items
 * - config: { bgColor, textColor, title, subtitle }
 *
 * Parameters:
 * - restaurant_id: UUID of the restaurant (required)
 * - page_id: UUID of the page (optional)
 * - url_slug: URL slug of the page (optional, will be converted to page_id)
 *
 * Note: If both page_id and url_slug are provided, page_id takes precedence.
 * If url_slug is provided, it will be used to lookup the page_id from web_pages table.
 */

import { NextResponse } from 'next/server';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

// Static restaurant ID for testing
const RESTAURANT_ID = '92e9160e-0afa-4f78-824f-b28e32885353';

/**
 * GraphQL query to fetch FAQ configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_FAQ_CONFIG = `
  query GetFAQConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "FAQ"},
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
 * GraphQL query to get page_id from url_slug
 */
const GET_PAGE_BY_SLUG = `
  query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        url_slug: {_eq: $url_slug},
        is_deleted: {_eq: false}
      },
      limit: 1
    ) {
      page_id
      url_slug
      name
    }
  }
`;

const GET_FAQ_CONFIG_BY_PAGE = `
  query GetFAQConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        category: {_eq: "FAQ"},
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
 * GET endpoint to fetch FAQ configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params or use default
      const { searchParams } = new URL(request.url);
      const restaurantId = searchParams.get('restaurant_id') || RESTAURANT_ID;
      const pageId = searchParams.get('page_id') || null;
      const urlSlug = searchParams.get('url_slug') || null;

      let finalPageId = pageId;

      // If url_slug is provided, get the page_id from it
      if (urlSlug && !pageId) {
        const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug
        });
        
        if (pageData.web_pages && pageData.web_pages.length > 0) {
          finalPageId = pageData.web_pages[0].page_id;
        } else {
          // Return error if page not found for the given url_slug
          const response = {
            success: false,
            data: null,
            error: `No page found with url_slug: ${urlSlug}`
          };
          return NextResponse.json(response, { status: 404 });
        }
      }

      const data = finalPageId
        ? await graphqlRequest(GET_FAQ_CONFIG_BY_PAGE, { restaurant_id: restaurantId, page_id: finalPageId })
        : await graphqlRequest(GET_FAQ_CONFIG, { restaurant_id: restaurantId });

    if (!data.templates || data.templates.length === 0) {
      // Return 404 if template doesn't exist (frontend will not render section)
      const response = {
        success: false,
        data: null,
        error: 'No FAQ configuration found'
      };

      return NextResponse.json(response, { status: 404 });
    }

    const template = data.templates[0]; // Get most recent non-deleted template

    // Transform template structure to FAQ config
    const config = {
      layout: template.name, // name field contains layout type
      bgColor: template.config?.bgColor || '#ffffff',
      textColor: template.config?.textColor || '#111827',
      title: template.config?.title || 'Frequently Asked Questions',
      subtitle: template.config?.subtitle || 'Find answers to common questions',
      faqs: template.menu_items || [], // FAQ items stored in menu_items
    };

    const response = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching FAQ config:', error);

    const errorResponse = {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update FAQ configuration
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
    
    // Step 1: Get current template to mark as deleted (consider optional page_id or url_slug)
    const pageId = body.page_id || null;
    const urlSlug = body.url_slug || null;
    
    let finalPageId = pageId;

    // If url_slug is provided, get the page_id from it
    if (urlSlug && !pageId) {
      const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
        restaurant_id: restaurantId,
        url_slug: urlSlug
      });
      
      if (pageData.web_pages && pageData.web_pages.length > 0) {
        finalPageId = pageData.web_pages[0].page_id;
      } else {
        // Return error if page not found for the given url_slug
        const errorResponse = {
          success: false,
          data: {},
          error: `No page found with url_slug: ${urlSlug}`,
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }
    }
    
    const currentData = finalPageId
      ? await graphqlRequest(GET_FAQ_CONFIG_BY_PAGE, { restaurant_id: restaurantId, page_id: finalPageId })
      : await graphqlRequest(GET_FAQ_CONFIG, { restaurant_id: restaurantId });
    
    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];
      
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }
    
    // Transform FAQ config to template structure
    const name = body.layout || 'accordion'; // layout goes to name field
    const config = {
      bgColor: body.bgColor,
      textColor: body.textColor,
      title: body.title,
      subtitle: body.subtitle,
    };

    // FAQ items go to menu_items field
    const menu_items = body.faqs || [];

    // Step 3: Insert new template (include page_id if provided)
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'FAQ',
      config: config,
      menu_items: menu_items,
      page_id: finalPageId || null,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    
    // Transform back to FAQ config
    const responseConfig = {
      layout: template.name,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      title: template.config?.title,
      subtitle: template.config?.subtitle,
      faqs: template.menu_items,
    };

    const response = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating FAQ config:', error);

    const errorResponse = {
      success: false,
      data: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}