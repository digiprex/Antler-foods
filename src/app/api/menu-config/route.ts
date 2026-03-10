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
 * GraphQL query to check restaurant's custom domain
 * Used to determine if we're in production environment
 */
const CHECK_CUSTOM_DOMAIN = `
  query CheckCustomDomain($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      custom_domain
    }
  }
`;

/**
 * GraphQL query to check existing template status
 * Used to determine if we need to mark as deleted and create new record
 */
const CHECK_TEMPLATE_STATUS = `
  query CheckTemplateStatus($template_id: uuid!) {
    templates_by_pk(template_id: $template_id) {
      template_id
      is_deleted
      is_published
      order_index
    }
  }
`;

/**
 * GraphQL mutation to insert new template
 */
const INSERT_TEMPLATE = `
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!, $page_id: uuid, $order_index: numeric, $is_published: Boolean, $ref_template_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        page_id: $page_id,
        order_index: $order_index,
        is_deleted: false,
        is_published: $is_published,
        ref_template_id: $ref_template_id
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
      is_published
      ref_template_id
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

    // Step 0: Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurantId,
      });

      if ((domainData as any).restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[Menu Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[Menu Config POST] Error checking custom domain:', error);
      hasCustomDomain = false;
    }

    // Step 1 & 2: Handle template updates based on current status
    let existingOrderIndex: number | null = null;
    let shouldMarkAsDeletedAndCreateNew = false;
    let shouldKeepOldRecordAndCreateDraft = false;
    let refTemplateId: string | null = null;

    if (!isNewSection) {
      if (templateId) {
        // Check the existing template status first
        const templateStatus = await graphqlRequest(CHECK_TEMPLATE_STATUS, {
          template_id: templateId,
        });

        if ((templateStatus as any).templates_by_pk) {
          const template = (templateStatus as any).templates_by_pk;
          existingOrderIndex = template.order_index;

          if (!template.is_deleted && !template.is_published) {
            // Case 1: is_deleted: false & is_published: false
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Menu Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = templateId;
            console.log('[Menu Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Menu Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
          }
        }

        // Only mark the current template as deleted for Cases 1 & 3
        if (shouldMarkAsDeletedAndCreateNew) {
          await graphqlRequest(MARK_AS_DELETED, {
            template_id: templateId,
          });
        }
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
                  order_index
                }
              }
            `, {
              restaurant_id: restaurantId,
              page_id: pageId,
            })
          : await graphqlRequest(GET_MENU_CONFIG, {
              restaurant_id: restaurantId,
            });

        if ((currentData as any).templates && (currentData as any).templates.length > 0) {
          const currentTemplate = (currentData as any).templates[0];
          existingOrderIndex = currentTemplate.order_index;

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

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[Menu Config POST] Preserving existing order_index:', orderIndex);
    } else if (pageId) {
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

    // Step 4: Insert new template with appropriate publication status
    let isPublished: boolean;
    let refTemplateIdToUse: string | null = null;

    if (shouldMarkAsDeletedAndCreateNew) {
      // Case 1 & 3: Create new record with is_published: false (draft state)
      isPublished = false;
    } else if (shouldKeepOldRecordAndCreateDraft) {
      // Case 2: Create new record as draft with reference to old record
      isPublished = false;
      refTemplateIdToUse = refTemplateId;
    } else {
      // All new sections should be created as drafts by default
      // This ensures they need to be explicitly published
      isPublished = false;
    }

    console.log('[Menu Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    const result = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name,
      category: 'Menu',
      config,
      menu_items: menuItems,
      page_id: pageId,
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
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
