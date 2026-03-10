/**
 * YouTube Configuration API
 *
 * Handles fetching and updating YouTube configuration from/to templates table
 * Uses category "YouTube" and is universal for the restaurant
 */

import { NextResponse } from 'next/server';
import type { YouTubeConfig, YouTubeConfigResponse } from '@/types/youtube.types';
import { DEFAULT_YOUTUBE_CONFIG } from '@/types/youtube.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface YouTubeTemplate {
  category: string;
  config: any;
  created_at: string;
  is_deleted: boolean;
  menu_items: any;
  name: string;
  restaurant_id: string;
  template_id: string;
  updated_at: string;
  page_id?: string;
  order_index?: number;
}

interface GetYouTubeConfigResponse {
  templates: YouTubeTemplate[];
}

interface GetRestaurantByDomainResponse {
  restaurants: Array<{
    restaurant_id: string;
  }>;
}

interface GetPageBySlugResponse {
  pages: Array<{
    page_id: string;
  }>;
}

interface MarkAsDeletedResponse {
  update_templates_by_pk: {
    template_id: string;
    is_deleted: boolean;
  };
}

interface InsertTemplateResponse {
  insert_templates_one: {
    restaurant_id: string;
    template_id: string;
    name: string;
    category: string;
    config: any;
    menu_items: any;
    page_id?: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * GraphQL query to fetch YouTube configuration
 */
const GET_YOUTUBE_CONFIG = `
  query GetYouTubeConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "YouTube"},
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
 * GraphQL query to fetch YouTube configuration by page_id
 */
const GET_YOUTUBE_CONFIG_BY_PAGE = `
  query GetYouTubeConfigByPage($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        category: {_eq: "YouTube"},
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
 * GraphQL query to fetch YouTube configuration by template_id
 */
const GET_YOUTUBE_CONFIG_BY_TEMPLATE = `
  query GetYouTubeConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "YouTube"},
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
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return adminGraphqlRequest<T>(query, variables);
}

/**
 * GET endpoint to fetch YouTube configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    let pageId = searchParams.get('page_id') || null;
    let urlSlug = searchParams.get('url_slug') || null;
    let templateId = searchParams.get('template_id') || null;
    const domain = searchParams.get('domain') || request.headers.get('host');

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

        const domainData = await graphqlRequest<GetRestaurantByDomainResponse>(GET_RESTAURANT_BY_DOMAIN, { domain });

        if (domainData.restaurants && domainData.restaurants.length > 0) {
          restaurantId = domainData.restaurants[0].restaurant_id;
        }
      } catch (error) {
        console.error('[YouTube Config] Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      const errorResponse: YouTubeConfigResponse = {
        success: false,
        data: DEFAULT_YOUTUBE_CONFIG,
        error: 'restaurant_id is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // If url_slug is provided but page_id is not, fetch page_id from url_slug
    let finalPageId = pageId;
    if (!finalPageId && urlSlug) {
      try {
        const GET_PAGE_BY_SLUG = `
          query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
            pages(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                url_slug: {_eq: $url_slug},
                is_deleted: {_eq: false}
              },
              limit: 1
            ) {
              page_id
            }
          }
        `;

        const pageData = await graphqlRequest<GetPageBySlugResponse>(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug
        });

        if (pageData.pages && pageData.pages.length > 0) {
          finalPageId = pageData.pages[0].page_id;
        }
      } catch (error) {
        console.error('[YouTube Config] Error fetching page_id by url_slug:', error);
      }
    }

    // Determine which query to use based on available parameters
    let data: GetYouTubeConfigResponse;
    if (templateId) {
      // If template_id is provided, fetch that specific template
      data = await graphqlRequest<GetYouTubeConfigResponse>(GET_YOUTUBE_CONFIG_BY_TEMPLATE, {
        restaurant_id: restaurantId,
        template_id: templateId
      });
    } else if (finalPageId) {
      // If page_id is provided, fetch the most recent YouTube for that page
      data = await graphqlRequest<GetYouTubeConfigResponse>(GET_YOUTUBE_CONFIG_BY_PAGE, {
        restaurant_id: restaurantId,
        page_id: finalPageId
      });
    } else {
      // Fallback to restaurant-level YouTube
      data = await graphqlRequest<GetYouTubeConfigResponse>(GET_YOUTUBE_CONFIG, { restaurant_id: restaurantId });
    }

    if (!data.templates || data.templates.length === 0) {
      const response: YouTubeConfigResponse = {
        success: true,
        data: DEFAULT_YOUTUBE_CONFIG,
      };
      return NextResponse.json(response);
    }

    const template = data.templates[0];
    const config: YouTubeConfig = {
      ...DEFAULT_YOUTUBE_CONFIG,
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: YouTubeConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube Config] Error:', error);

    const errorResponse: YouTubeConfigResponse = {
      success: false,
      data: DEFAULT_YOUTUBE_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to create or update YouTube configuration
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
      throw new Error('restaurant_id is required');
    }

    // Get page_id and new_section flag directly from request body
    const pageId = body.page_id || null;
    const templateId = body.template_id || null;
    const urlSlug = body.url_slug || null;
    const isNewSection = body.new_section === true;

    // If url_slug is provided but page_id is not, fetch page_id from url_slug
    let finalPageId = pageId;
    if (!finalPageId && urlSlug) {
      try {
        const GET_PAGE_BY_SLUG = `
          query GetPageBySlug($restaurant_id: uuid!, $url_slug: String!) {
            pages(
              where: {
                restaurant_id: {_eq: $restaurant_id},
                url_slug: {_eq: $url_slug},
                is_deleted: {_eq: false}
              },
              limit: 1
            ) {
              page_id
            }
          }
        `;

        const pageData = await graphqlRequest<GetPageBySlugResponse>(GET_PAGE_BY_SLUG, {
          restaurant_id: restaurantId,
          url_slug: urlSlug
        });

        if (pageData.pages && pageData.pages.length > 0) {
          finalPageId = pageData.pages[0].page_id;
        }
      } catch (error) {
        console.error('[YouTube Config] Error fetching page_id by url_slug:', error);
      }
    }

    // Step 0: Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurantId,
      });

      if ((domainData as any)?.restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[YouTube Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[YouTube Config POST] Error checking custom domain:', error);
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
            console.log('[YouTube Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = templateId;
            console.log('[YouTube Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[YouTube Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
          }
        }

        // Only mark the current template as deleted for Cases 1 & 3
        if (shouldMarkAsDeletedAndCreateNew) {
          await graphqlRequest<MarkAsDeletedResponse>(MARK_AS_DELETED, {
            template_id: templateId,
          });
        }
      } else {
        const currentData = finalPageId
          ? await graphqlRequest<GetYouTubeConfigResponse>(GET_YOUTUBE_CONFIG_BY_PAGE, {
              restaurant_id: restaurantId,
              page_id: finalPageId,
            })
          : await graphqlRequest<GetYouTubeConfigResponse>(GET_YOUTUBE_CONFIG, {
              restaurant_id: restaurantId,
            });

        if (currentData?.templates && currentData.templates.length > 0) {
          const currentTemplate = currentData.templates[0];
          existingOrderIndex = currentTemplate.order_index ?? null;

          await graphqlRequest<MarkAsDeletedResponse>(MARK_AS_DELETED, {
            template_id: currentTemplate.template_id,
          });
        }
      }
    }

    console.log('[YouTube Config POST] Saving YouTube with page_id:', finalPageId);

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[YouTube Config POST] Preserving existing order_index:', orderIndex);
    } else if (finalPageId) {
      try {
        const maxOrderData = await graphqlRequest(GET_MAX_ORDER_INDEX, {
          restaurant_id: restaurantId,
          page_id: finalPageId,
        });

        const maxOrder = (maxOrderData as any)?.templates_aggregate?.aggregate?.max?.order_index;

        if (isNewSection) {
          // For new sections, add 1 to max order (or start at 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 0;
          console.log('[YouTube Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, use max order or 0
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[YouTube Config POST] Update section order_index:', orderIndex);
        }
      } catch (error) {
        console.error('[YouTube Config POST] Error fetching max order_index:', error);
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

    console.log('[YouTube Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    // Prepare YouTube configuration
    const { restaurant_id, template_id, page_id: bodyPageId, url_slug, new_section, ...configData } = body;
    const name = 'youtube';
    const config = {
      ...configData,
      restaurant_id: restaurantId,
    };

    // Insert new template
    const insertedData = await graphqlRequest<InsertTemplateResponse>(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'YouTube',
      config: config,
      menu_items: [],
      page_id: finalPageId,
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert template');
    }

    const template = insertedData.insert_templates_one;
    const responseConfig: YouTubeConfig = {
      ...template.config,
      restaurant_id: restaurantId,
    };

    const response: YouTubeConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[YouTube Config] Error updating:', error);

    const errorResponse: YouTubeConfigResponse = {
      success: false,
      data: DEFAULT_YOUTUBE_CONFIG,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
