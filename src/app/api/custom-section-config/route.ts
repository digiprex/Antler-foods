/**
 * Custom Section Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates custom section configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "layout-1")
 * - category: "CustomSection"
 * - config: complete custom section configuration object
 * - menu_items: not used for custom sections (empty array)
 */

import { NextResponse } from 'next/server';
import type { CustomSectionConfig } from '@/types/custom-section.types';
import { DEFAULT_CUSTOM_SECTION_CONFIG } from '@/types/custom-section.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface CustomSectionConfigResponse {
  success: boolean;
  data: CustomSectionConfig;
  error?: string;
}

/**
 * GraphQL query to fetch custom section configuration from templates
 */
const GET_CUSTOM_SECTION_CONFIG = `
  query GetCustomSectionConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "CustomSection"},
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
 * GET endpoint to fetch custom section configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id');

    if (!restaurantId) {
      const errorResponse: CustomSectionConfigResponse = {
        success: false,
        data: DEFAULT_CUSTOM_SECTION_CONFIG,
        error: 'restaurant_id is required'
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const data = templateId
      ? await graphqlRequest(`
          query GetCustomSectionConfigByTemplate($template_id: uuid!) {
            templates(
              where: {
                template_id: {_eq: $template_id},
                category: {_eq: "CustomSection"},
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
        `, {
          template_id: templateId,
        })
      : pageId
        ? await graphqlRequest(`
          query GetCustomSectionConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                page_id: {_eq: $page_id},
                category: {_eq: "CustomSection"},
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
        : await graphqlRequest(GET_CUSTOM_SECTION_CONFIG, {
            restaurant_id: restaurantId,
          });

    if (!(data as any).templates || (data as any).templates.length === 0) {
      const response: CustomSectionConfigResponse = {
        success: true,
        data: {
          ...DEFAULT_CUSTOM_SECTION_CONFIG,
          restaurant_id: restaurantId,
        },
      };
      return NextResponse.json(response);
    }

    const template = (data as any).templates[0];

    const config: CustomSectionConfig = {
      ...DEFAULT_CUSTOM_SECTION_CONFIG,
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
      page_id: template.page_id || null,
      template_id: template.template_id || null,
    };

    const response: CustomSectionConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching custom section config:', error);

    const errorResponse: CustomSectionConfigResponse = {
      success: false,
      data: DEFAULT_CUSTOM_SECTION_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update custom section configuration
 *
 * Behavior:
 * - For new sections (new_section: true): Creates a new template without deleting existing ones
 * - For existing sections being updated:
 *   - If existing section has is_deleted: false AND is_published: false:
 *     Marks current record as deleted and creates new record with is_published: false (draft state)
 *   - If existing section has is_deleted: false AND is_published: true AND has custom domain:
 *     Keeps old record unchanged and creates new record with is_published: false and ref_template_id pointing to old record
 *   - Otherwise: Marks current template as deleted and creates new one with is_published: true
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const restaurantId = body.restaurant_id;
    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }

    const pageId = body.page_id || null;
    const templateId = body.template_id || null;
    const isNewSection = body.new_section === true;

    // Step 0: Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurantId,
      });

      if ((domainData as any)?.restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[Custom Section Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[Custom Section Config POST] Error checking custom domain:', error);
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

        if ((templateStatus as any)?.templates_by_pk) {
          const template = (templateStatus as any).templates_by_pk;
          existingOrderIndex = template.order_index;

          if (!template.is_deleted && !template.is_published) {
            // Case 1: is_deleted: false & is_published: false
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Custom Section Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = templateId;
            console.log('[Custom Section Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Custom Section Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
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
              query GetCustomSectionConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
                templates(
                  where: {
                    restaurant_id: {_eq: $restaurant_id},
                    page_id: {_eq: $page_id},
                    category: {_eq: "CustomSection"},
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
          : await graphqlRequest(GET_CUSTOM_SECTION_CONFIG, {
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

    // Prepare configuration
    const { restaurant_id, layout, page_id: _pageId, new_section, template_id: _templateId, ...configData } = body;
    const name = layout || 'layout-1';

    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    console.log('[Custom Section Config POST] Saving with page_id:', pageId);

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[Custom Section Config POST] Preserving existing order_index:', orderIndex);
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
          console.log('[Custom Section Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, use max order or 0
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[Custom Section Config POST] Update section order_index:', orderIndex);
        }
      } catch (err) {
        console.error('[Custom Section Config POST] Error getting max order_index:', err);
        orderIndex = 0;
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

    console.log('[Custom Section Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'CustomSection',
      config: config,
      menu_items: [],
      page_id: pageId,
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;

    const responseConfig: CustomSectionConfig = {
      ...template.config,
      layout: template.name as any,
      restaurant_id: restaurantId,
      page_id: template.page_id || null,
      template_id: template.template_id || null,
    };

    const response: CustomSectionConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating custom section config:', error);

    const errorResponse: CustomSectionConfigResponse = {
      success: false,
      data: DEFAULT_CUSTOM_SECTION_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
