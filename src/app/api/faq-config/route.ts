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

function pickFaqStyleConfig(source: Record<string, unknown>) {
  return {
    faqCardBgColor:
      typeof source.faqCardBgColor === 'string'
        ? source.faqCardBgColor
        : '#ffffff',
    questionTextColor:
      typeof source.questionTextColor === 'string'
        ? source.questionTextColor
        : '#1f2937',
    answerTextColor:
      typeof source.answerTextColor === 'string'
        ? source.answerTextColor
        : '#6b7280',
    cardBorderRadius:
      typeof source.cardBorderRadius === 'string'
        ? source.cardBorderRadius
        : '18px',
    cardShadow:
      source.cardShadow === 'none'
      || source.cardShadow === 'sm'
      || source.cardShadow === 'md'
      || source.cardShadow === 'lg'
        ? source.cardShadow
        : 'sm',
    accentColor:
      typeof source.accentColor === 'string'
        ? source.accentColor
        : '#8b5cf6',
    hoverColor:
      typeof source.hoverColor === 'string'
        ? source.hoverColor
        : '#f8fafc',
    enableScrollAnimation: source.enableScrollAnimation === true,
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
      template_id: template.template_id,
      page_id: template.page_id ?? finalPageId ?? null,
      layout: template.name, // name field contains layout type
      bgColor: template.config?.bgColor || '#ffffff',
      textColor: template.config?.textColor || '#111827',
      title: template.config?.title || 'Frequently Asked Questions',
      subtitle: template.config?.subtitle || 'Find answers to common questions',
      faqs: template.menu_items || [], // FAQ items stored in menu_items
      ...pickSectionStyleConfig((template.config || {}) as Record<string, unknown>),
      ...pickFaqStyleConfig((template.config || {}) as Record<string, unknown>),
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

    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }

    // Check if this is editing an existing template or creating a new one
    const templateId = body.template_id || null;
    const pageId = body.page_id || null;
    const urlSlug = body.url_slug || null;
    const isNewSection = body.new_section === true;

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

    // Step 0: Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurantId,
      });

      if ((domainData as any)?.restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[FAQ Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[FAQ Config POST] Error checking custom domain:', error);
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
            console.log('[FAQ Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = templateId;
            console.log('[FAQ Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[FAQ Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
          }
        }

        // Only mark the current template as deleted for Cases 1 & 3
        if (shouldMarkAsDeletedAndCreateNew) {
          await graphqlRequest(MARK_AS_DELETED, {
            template_id: templateId,
          });
        }
      } else {
        const currentData = finalPageId
          ? await graphqlRequest(GET_FAQ_CONFIG_BY_PAGE, {
              restaurant_id: restaurantId,
              page_id: finalPageId,
            })
          : await graphqlRequest(GET_FAQ_CONFIG, {
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

    console.log('[FAQ Config POST] Saving FAQ with page_id:', finalPageId);

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[FAQ Config POST] Preserving existing order_index:', orderIndex);
    } else if (finalPageId) {
      try {
        const maxOrderData = await graphqlRequest(GET_MAX_ORDER_INDEX, {
          restaurant_id: restaurantId,
          page_id: finalPageId,
        });

        const maxOrder = (maxOrderData as any).templates_aggregate?.aggregate?.max?.order_index;

        if (isNewSection) {
          // For new sections, add 1 to max order (or start at 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 0;
          console.log('[FAQ Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, use max order or 0
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[FAQ Config POST] Update section order_index:', orderIndex);
        }
      } catch (error) {
        console.error('[FAQ Config POST] Error fetching max order_index:', error);
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

    console.log('[FAQ Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    // Transform FAQ config to template structure
    const name = body.layout || 'accordion'; // layout goes to name field
    const config = {
      bgColor: body.bgColor,
      textColor: body.textColor,
      title: body.title,
      subtitle: body.subtitle,
      ...pickSectionStyleConfig(body as Record<string, unknown>),
      ...pickFaqStyleConfig(body as Record<string, unknown>),
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
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;

    // Transform back to FAQ config
    const responseConfig = {
      template_id: template.template_id,
      page_id: template.page_id ?? finalPageId ?? null,
      layout: template.name,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      title: template.config?.title,
      subtitle: template.config?.subtitle,
      faqs: template.menu_items,
      ...pickSectionStyleConfig((template.config || {}) as Record<string, unknown>),
      ...pickFaqStyleConfig((template.config || {}) as Record<string, unknown>),
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
