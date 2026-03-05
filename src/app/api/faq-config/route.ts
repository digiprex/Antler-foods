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
import { adminGraphqlRequest } from '@/lib/server/api-auth';

function pickSectionStyleConfig(source: Record<string, unknown>) {
  return {
    is_custom: source.is_custom === true,
    buttonStyleVariant: source.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary',
    titleFontFamily: source.titleFontFamily ?? 'Inter, system-ui, sans-serif',
    titleFontSize: source.titleFontSize ?? '2.25rem',
    titleFontWeight: source.titleFontWeight ?? 700,
    titleColor: source.titleColor ?? '#111827',
    subtitleFontFamily: source.subtitleFontFamily ?? 'Inter, system-ui, sans-serif',
    subtitleFontSize: source.subtitleFontSize ?? '1.5rem',
    subtitleFontWeight: source.subtitleFontWeight ?? 600,
    subtitleColor: source.subtitleColor ?? '#374151',
    bodyFontFamily: source.bodyFontFamily ?? 'Inter, system-ui, sans-serif',
    bodyFontSize: source.bodyFontSize ?? '1rem',
    bodyFontWeight: source.bodyFontWeight ?? 400,
    bodyColor: source.bodyColor ?? '#6b7280',
  } as const;
}

// Restaurant ID must be provided dynamically via query parameters or domain lookup

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

const GET_FAQ_CONFIG_BY_TEMPLATE = `
  query GetFAQConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "FAQ"},
        is_deleted: {_eq: false}
      },
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
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch FAQ configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params - required parameter
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    let pageId = searchParams.get('page_id') || null;
    let urlSlug = searchParams.get('url_slug') || null;
    let templateId = searchParams.get('template_id') || null;
    const domain = searchParams.get('domain') || request.headers.get('host');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        // Use local GraphQL request function to avoid nhost client issues
        console.log('[FAQ Config] Looking up domain:', domain);

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
            console.log('[FAQ Config] Found restaurant for domain:', domain, '->', restaurantId);
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

    // If url_slug not supplied, try to derive from referer header (useful when called from a page)
    if (!urlSlug) {
      try {
        const referer = request.headers.get('referer') || request.headers.get('referrer') || null;
        if (referer) {
          const parsedRef = new URL(referer);
          // prefer the last non-empty segment as slug
          const segments = parsedRef.pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            urlSlug = segments[segments.length - 1];
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    let finalPageId = pageId;

    // Debug logging
    // eslint-disable-next-line no-console
    console.log('FAQ GET params -> page_id:', pageId, 'url_slug:', urlSlug);

    // If url_slug is provided (either via query or referer), get the page_id from it
    if (urlSlug && !pageId) {
      const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
        restaurant_id: restaurantId,
        url_slug: urlSlug
      });

      if ((pageData as any).web_pages && (pageData as any).web_pages.length > 0) {
        finalPageId = (pageData as any).web_pages[0].page_id;
        // Log resolved page id
        // eslint-disable-next-line no-console
        console.log('Resolved page_id from url_slug', urlSlug, '->', finalPageId);
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

    // Determine which query to use based on available parameters
    let data;
    if (templateId) {
      // If template_id is provided, fetch that specific template
      data = await graphqlRequest(GET_FAQ_CONFIG_BY_TEMPLATE, {
        restaurant_id: restaurantId,
        template_id: templateId
      });
    } else if (finalPageId) {
      // If page_id is provided, fetch the most recent FAQ for that page
      data = await graphqlRequest(GET_FAQ_CONFIG_BY_PAGE, {
        restaurant_id: restaurantId,
        page_id: finalPageId
      });
    } else {
      // Fallback to restaurant-level FAQ
      data = await graphqlRequest(GET_FAQ_CONFIG, { restaurant_id: restaurantId });
    }

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return 404 if template doesn't exist (frontend will not render section)
      const response = {
        success: false,
        data: null,
        error: 'No FAQ configuration found'
      };

      return NextResponse.json(response, { status: 404 });
    }

    const template = (data as any).templates[0]; // Get most recent non-deleted template

    // Transform template structure to FAQ config
    const config = {
      layout: template.name, // name field contains layout type
      bgColor: template.config?.bgColor || '#ffffff',
      textColor: template.config?.textColor || '#111827',
      title: template.config?.title || 'Frequently Asked Questions',
      subtitle: template.config?.subtitle || 'Find answers to common questions',
      faqs: template.menu_items || [], // FAQ items stored in menu_items
      ...pickSectionStyleConfig((template.config || {}) as Record<string, unknown>),
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
 * POST endpoint to create or update FAQ configuration
 * Creates new template for new sections, updates existing template for edits
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }

    // Check if this is editing an existing template or creating a new one
    const templateId = body.template_id || null;
    const pageId = body.page_id || null;
    const urlSlug = body.url_slug || null;

    let finalPageId = pageId;

    // If url_slug is provided, get the page_id from it
    if (urlSlug && !pageId) {
      const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
        restaurant_id: restaurantId,
        url_slug: urlSlug
      });

      if ((pageData as any).web_pages && (pageData as any).web_pages.length > 0) {
        finalPageId = (pageData as any).web_pages[0].page_id;
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

    // Step 2: If template_id is provided, mark that specific template as deleted (editing existing section)
    if (templateId) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: templateId,
      });
    }
    // If no template_id, this is a new section - don't delete any existing templates

    // Transform FAQ config to template structure
    const name = body.layout || 'accordion'; // layout goes to name field
    const config = {
      bgColor: body.bgColor,
      textColor: body.textColor,
      title: body.title,
      subtitle: body.subtitle,
      ...pickSectionStyleConfig(body as Record<string, unknown>),
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

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;

    // Transform back to FAQ config
    const responseConfig = {
      layout: template.name,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      title: template.config?.title,
      subtitle: template.config?.subtitle,
      faqs: template.menu_items,
      ...pickSectionStyleConfig((template.config || {}) as Record<string, unknown>),
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
