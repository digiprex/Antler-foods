/**
 * Menu Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates menu configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "grid")
 * - category: "Menu"
 * - config: complete menu configuration object
 * - menu_items: actual menu items data
 */

import { NextResponse } from 'next/server';
import type { MenuConfig, MenuConfigResponse } from '@/types/menu.types';
import { DEFAULT_MENU_CONFIG } from '@/types/menu.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch menu configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_MENU_CONFIG = `
  query GetMenuConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Menu"},
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

const GET_MENU_CONFIG_BY_TEMPLATE = `
  query GetMenuConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "Menu"},
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!, $page_id: uuid, $order_index: numeric) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        page_id: $page_id,
        order_index: $order_index,
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
      order_index
      created_at
      updated_at
    }
  }
`;

const GET_MAX_ORDER_INDEX = `
  query GetMaxOrderIndex($restaurant_id: uuid!, $page_id: uuid!) {
    templates_aggregate(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        page_id: { _eq: $page_id }
        is_deleted: { _eq: false }
      }
    ) {
      aggregate {
        max {
          order_index
        }
      }
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
 * GET endpoint to fetch menu configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params - required parameter
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const domain = searchParams.get('domain') || request.headers.get('host');
    const urlSlug = searchParams.get('url_slug');
    let pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id');

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !searchParams.get('restaurant_id')) {
      try {
        console.log('[Menu Config] Looking up domain:', domain);

        const GET_BY_STAGING = `
          query GetByStaging($domain: String!) {
            restaurants(
              where: {
                staging_domain: { _eq: $domain },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
              staging_domain
            }
          }
        `;

        const GET_BY_CUSTOM = `
          query GetByCustom($domain: String!) {
            restaurants(
              where: {
                custom_domain: { _eq: $domain },
                is_deleted: { _eq: false }
              },
              limit: 1
            ) {
              restaurant_id
              custom_domain
            }
          }
        `;

        try {
          const stagingResult = await graphqlRequest(GET_BY_STAGING, { domain });
          console.log('[Menu Config] Staging domain query result:', JSON.stringify(stagingResult, null, 2));

          if ((stagingResult as any).restaurants && (stagingResult as any).restaurants.length > 0) {
            restaurantId = (stagingResult as any).restaurants[0].restaurant_id;
            console.log('[Menu Config] Found restaurant via staging_domain:', restaurantId);
          }
        } catch (stagingError) {
          console.error('[Menu Config] Error querying staging_domain:', stagingError);
        }

        if (!restaurantId) {
          try {
            const customResult = await graphqlRequest(GET_BY_CUSTOM, { domain });
            console.log('[Menu Config] Custom domain query result:', JSON.stringify(customResult, null, 2));

            if ((customResult as any).restaurants && (customResult as any).restaurants.length > 0) {
              restaurantId = (customResult as any).restaurants[0].restaurant_id;
              console.log('[Menu Config] Found restaurant via custom_domain:', restaurantId);
            }
          } catch (customError) {
            console.error('[Menu Config] Error querying custom_domain:', customError);
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
      }
    }

    // Validate that restaurant_id is provided
    if (!restaurantId) {
      const errorResponse = {
        success: false,
        data: DEFAULT_MENU_CONFIG,
        error: 'restaurant_id is required. Provide it as a query parameter or ensure the domain is properly configured.'
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
              url_slug
              name
              restaurant_id
            }
          }
        `;

        console.log('[Menu Config] Looking up page for url_slug:', urlSlug, 'restaurant_id:', restaurantId);

        const pageData = await graphqlRequest(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug,
        });

        console.log('[Menu Config] Page lookup result:', JSON.stringify(pageData, null, 2));

        if ((pageData as any).web_pages && (pageData as any).web_pages.length > 0) {
          pageId = (pageData as any).web_pages[0].page_id;
          console.log('[Menu Config] Found page_id:', pageId);
        } else {
          console.log('[Menu Config] No page found for url_slug:', urlSlug);
        }
      } catch (error) {
        console.error('[Menu Config] Error looking up page by url_slug:', error);
      }
    }

    // Query for template - template_id has highest priority, then page_id
    const data = templateId
      ? await graphqlRequest(GET_MENU_CONFIG_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : pageId
        ? await graphqlRequest(`
            query GetMenuConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
              templates(
                where: {
                  restaurant_id: {_eq: $restaurant_id},
                  page_id: {_eq: $page_id},
                  category: {_eq: "Menu"},
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
        : await graphqlRequest(GET_MENU_CONFIG, {
            restaurant_id: restaurantId,
          });

    console.log('[Menu Config] Template query result:', JSON.stringify(data, null, 2));

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return default config if template doesn't exist
      const response: MenuConfigResponse = {
        success: true,
        data: {
          ...DEFAULT_MENU_CONFIG,
          restaurant_id: restaurantId,
        },
      };

      return NextResponse.json(response);
    }

    const template = (data as any).templates[0];
    const menuItems = template.menu_items || {};

    // The config field contains the complete menu configuration.
    // Categories and featured items are stored separately in menu_items.
    const config: MenuConfig = {
      ...DEFAULT_MENU_CONFIG,
      ...template.config,
      layout: template.name, // name field contains layout type
      restaurant_id: restaurantId,
      categories: menuItems.categories || template.config?.categories || [],
      featuredItems: menuItems.featuredItems || template.config?.featuredItems || [],
    };

    const response: MenuConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching menu config:', error);

    const errorResponse: MenuConfigResponse = {
      success: false,
      data: DEFAULT_MENU_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update menu configuration
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

    // Get page_id and new_section flag directly from request body
    const pageId = body.page_id || null;
    const templateId = body.template_id || null;
    const isNewSection = body.new_section === true;

    // Mark current template as deleted (ONLY if not adding a new section)
    if (!isNewSection) {
      if (templateId) {
        await graphqlRequest(MARK_AS_DELETED, {
          template_id: templateId,
        });
      } else {
        const currentData = pageId
          ? await graphqlRequest(`
              query GetMenuConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
                templates(
                  where: {
                    restaurant_id: {_eq: $restaurant_id},
                    page_id: {_eq: $page_id},
                    category: {_eq: "Menu"},
                    is_deleted: {_eq: false}
                  },
                  order_by: {created_at: desc},
                  limit: 1
                ) {
                  template_id
                  category
                  page_id
                }
              }
            `, {
              restaurant_id: restaurantId,
              page_id: pageId,
            })
          : await graphqlRequest(GET_MENU_CONFIG, {
              restaurant_id: restaurantId,
            });

        // Mark current template as deleted (if exists)
        if ((currentData as any).templates && (currentData as any).templates.length > 0) {
          const currentTemplate = (currentData as any).templates[0];

          await graphqlRequest(MARK_AS_DELETED, {
            template_id: currentTemplate.template_id,
          });
        }
      }
    }

    // Prepare menu configuration
    const {
      restaurant_id,
      layout,
      page_id: _pageId,
      new_section,
      template_id: _templateId,
      categories,
      featuredItems,
      ...configData
    } = body;
    const name = layout || 'grid'; // layout goes to name field

    // The entire menu config (except layout, page_id, new_section) goes into the config field
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Menu items (categories and featured items) go into menu_items field
    const menuItems = {
      categories: categories || [],
      featuredItems: featuredItems || [],
    };

    console.log('[Menu Config POST] Saving menu with page_id:', pageId);

    // Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0
    if (pageId) {
      try {
        const maxOrderData = await graphqlRequest(GET_MAX_ORDER_INDEX, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

        const maxOrder = (maxOrderData as any).templates_aggregate?.aggregate?.max?.order_index;

        if (isNewSection) {
          // For new sections, add 1 to max order (or start at 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 0;
          console.log('[Menu Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, keep the same order (use max order or 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[Menu Config POST] Update section order_index:', orderIndex);
        }
      } catch (error) {
        console.error('[Menu Config POST] Error fetching max order_index:', error);
        // Keep default orderIndex = 0
      }
    }

    // Insert new template with calculated order_index
    const result = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name,
      category: 'Menu',
      config,
      menu_items: menuItems,
      page_id: pageId,
      order_index: orderIndex,
    });

    console.log('[Menu Config POST] Insert result:', JSON.stringify(result, null, 2));

    const newTemplate = (result as any).insert_templates_one;

    // Return the new configuration
    const responseConfig: MenuConfig = {
      ...DEFAULT_MENU_CONFIG,
      ...newTemplate.config,
      layout: newTemplate.name,
      restaurant_id: restaurantId,
      categories: menuItems.categories,
      featuredItems: menuItems.featuredItems,
    };

    const response: MenuConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating menu config:', error);

    const errorResponse: MenuConfigResponse = {
      success: false,
      data: DEFAULT_MENU_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
