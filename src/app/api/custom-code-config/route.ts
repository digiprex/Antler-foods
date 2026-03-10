/**
 * Custom Code Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates custom code configuration from Hasura GraphQL API
 * using the templates table with restaurant_id and page_id
 *
 * Structure:
 * - name: "custom-code"
 * - category: "CustomCode"
 * - config: { isEnabled, codeType, htmlCode, cssCode, jsCode, iframeUrl, iframeHeight, iframeWidth }
 */

import { NextResponse } from 'next/server';
import type { CustomCodeConfig, CustomCodeConfigResponse } from '@/types/custom-code.types';
import { DEFAULT_CUSTOM_CODE_CONFIG } from '@/types/custom-code.types';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch custom code configuration from templates
 */
const GET_CUSTOM_CODE_CONFIG = `
  query GetCustomCodeConfig($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        category: {_eq: "CustomCode"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      name
      restaurant_id
      page_id
      template_id
      updated_at
    }
  }
`;

const GET_CUSTOM_CODE_CONFIG_BY_TEMPLATE = `
  query GetCustomCodeConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "CustomCode"},
        is_deleted: {_eq: false}
      },
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      name
      restaurant_id
      page_id
      template_id
      updated_at
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
  mutation InsertTemplate($restaurant_id: uuid!, $page_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $order_index: numeric, $is_published: Boolean, $ref_template_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        page_id: $page_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: [],
        order_index: $order_index,
        is_deleted: false,
        is_published: $is_published,
        ref_template_id: $ref_template_id
      }
    ) {
      restaurant_id
      page_id
      template_id
      name
      category
      config
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

function pickSectionStyleConfig(source: Record<string, unknown>) {
  const asString = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value : fallback;
  const asNumber = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  return {
    is_custom: source.is_custom === true,
    buttonStyleVariant: source.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary',
    titleFontFamily: asString(source.titleFontFamily, 'Inter, system-ui, sans-serif'),
    titleFontSize: asString(source.titleFontSize, '2.25rem'),
    titleFontWeight: asNumber(source.titleFontWeight, 700),
    titleColor: asString(source.titleColor, '#111827'),
    subtitleFontFamily: asString(source.subtitleFontFamily, 'Inter, system-ui, sans-serif'),
    subtitleFontSize: asString(source.subtitleFontSize, '1.5rem'),
    subtitleFontWeight: asNumber(source.subtitleFontWeight, 600),
    subtitleColor: asString(source.subtitleColor, '#374151'),
    bodyFontFamily: asString(source.bodyFontFamily, 'Inter, system-ui, sans-serif'),
    bodyFontSize: asString(source.bodyFontSize, '1rem'),
    bodyFontWeight: asNumber(source.bodyFontWeight, 400),
    bodyColor: asString(source.bodyColor, '#6b7280'),
  } as const;
}

/**
 * GET endpoint to fetch custom code configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id') || null;

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'restaurant_id is required'
      } as CustomCodeConfigResponse, { status: 400 });
    }

    // page_id is only required if template_id is not provided
    if (!templateId && !pageId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'Either page_id or template_id is required'
      } as CustomCodeConfigResponse, { status: 400 });
    }

    // Determine which query to use based on available parameters
    const data = templateId
      ? await graphqlRequest(GET_CUSTOM_CODE_CONFIG_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : await graphqlRequest(GET_CUSTOM_CODE_CONFIG, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

    if (!(data as any).templates || (data as any).templates.length === 0) {
      // Return default disabled configuration
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_CUSTOM_CODE_CONFIG,
          restaurant_id: restaurantId,
          page_id: pageId || undefined,
        } as CustomCodeConfig,
      } as CustomCodeConfigResponse);
    }

    const template = (data as any).templates[0];
    const templateConfig = (template.config || {}) as Record<string, unknown>;

    const config: CustomCodeConfig = {
      ...DEFAULT_CUSTOM_CODE_CONFIG,
      restaurant_id: restaurantId,
      page_id: template.page_id || pageId || undefined,
      isEnabled: templateConfig.isEnabled === true,
      codeType: templateConfig.codeType === 'iframe' ? 'iframe' : 'html',
      htmlCode:
        typeof templateConfig.htmlCode === 'string'
          ? templateConfig.htmlCode
          : DEFAULT_CUSTOM_CODE_CONFIG.htmlCode,
      cssCode:
        typeof templateConfig.cssCode === 'string'
          ? templateConfig.cssCode
          : DEFAULT_CUSTOM_CODE_CONFIG.cssCode,
      jsCode:
        typeof templateConfig.jsCode === 'string'
          ? templateConfig.jsCode
          : DEFAULT_CUSTOM_CODE_CONFIG.jsCode,
      iframeUrl:
        typeof templateConfig.iframeUrl === 'string'
          ? templateConfig.iframeUrl
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeUrl,
      iframeHeight:
        typeof templateConfig.iframeHeight === 'string'
          ? templateConfig.iframeHeight
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeHeight,
      iframeWidth:
        typeof templateConfig.iframeWidth === 'string'
          ? templateConfig.iframeWidth
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeWidth,
      ...pickSectionStyleConfig(templateConfig),
    };

    return NextResponse.json({
      success: true,
      data: config,
    } as CustomCodeConfigResponse);
  } catch (error) {
    console.error('Error fetching custom code config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CustomCodeConfigResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update custom code configuration
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
    const pageId = body.page_id;
    const templateId = body.template_id || null;
    const isNewSection = body.new_section === true;

    if (!restaurantId || !pageId) {
      throw new Error('restaurant_id and page_id are required in request body');
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
        console.log('[Custom Code Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[Custom Code Config POST] Error checking custom domain:', error);
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
            console.log('[Custom Code Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = templateId;
            console.log('[Custom Code Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Custom Code Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
          }
        }

        // Only mark the current template as deleted for Cases 1 & 3
        if (shouldMarkAsDeletedAndCreateNew) {
          await graphqlRequest(MARK_AS_DELETED, {
            template_id: templateId,
          });
        }
      } else {
        const currentData = await graphqlRequest(GET_CUSTOM_CODE_CONFIG, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

        if ((currentData as any)?.templates && (currentData as any).templates.length > 0) {
          const currentTemplate = (currentData as any).templates[0];
          existingOrderIndex = currentTemplate.order_index ?? null;

          await graphqlRequest(MARK_AS_DELETED, {
            template_id: currentTemplate.template_id,
          });
        }
      }
    }

    console.log('[Custom Code Config POST] Saving custom code with page_id:', pageId);

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[Custom Code Config POST] Preserving existing order_index:', orderIndex);
    } else if (pageId) {
      try {
        const maxOrderData = await graphqlRequest(GET_MAX_ORDER_INDEX, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

        const maxOrder = (maxOrderData as any)?.templates_aggregate?.aggregate?.max?.order_index;

        if (isNewSection) {
          // For new sections, add 1 to max order (or start at 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 0;
          console.log('[Custom Code Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, use max order or 0
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[Custom Code Config POST] Update section order_index:', orderIndex);
        }
      } catch (error) {
        console.error('[Custom Code Config POST] Error fetching max order_index:', error);
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

    console.log('[Custom Code Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    const config = {
      isEnabled: body.isEnabled,
      codeType: body.codeType,
      htmlCode: body.htmlCode,
      cssCode: body.cssCode,
      jsCode: body.jsCode,
      iframeUrl: body.iframeUrl,
      iframeHeight: body.iframeHeight,
      iframeWidth: body.iframeWidth,
      ...pickSectionStyleConfig(body as Record<string, unknown>),
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      page_id: pageId,
      name: 'custom-code',
      category: 'CustomCode',
      config: config,
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;
    const insertedConfig = (template.config || {}) as Record<string, unknown>;

    const responseConfig: CustomCodeConfig = {
      ...DEFAULT_CUSTOM_CODE_CONFIG,
      restaurant_id: restaurantId,
      page_id: pageId,
      isEnabled: insertedConfig.isEnabled === true,
      codeType: insertedConfig.codeType === 'iframe' ? 'iframe' : 'html',
      htmlCode:
        typeof insertedConfig.htmlCode === 'string'
          ? insertedConfig.htmlCode
          : DEFAULT_CUSTOM_CODE_CONFIG.htmlCode,
      cssCode:
        typeof insertedConfig.cssCode === 'string'
          ? insertedConfig.cssCode
          : DEFAULT_CUSTOM_CODE_CONFIG.cssCode,
      jsCode:
        typeof insertedConfig.jsCode === 'string'
          ? insertedConfig.jsCode
          : DEFAULT_CUSTOM_CODE_CONFIG.jsCode,
      iframeUrl:
        typeof insertedConfig.iframeUrl === 'string'
          ? insertedConfig.iframeUrl
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeUrl,
      iframeHeight:
        typeof insertedConfig.iframeHeight === 'string'
          ? insertedConfig.iframeHeight
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeHeight,
      iframeWidth:
        typeof insertedConfig.iframeWidth === 'string'
          ? insertedConfig.iframeWidth
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeWidth,
      ...pickSectionStyleConfig(insertedConfig),
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    } as CustomCodeConfigResponse);
  } catch (error) {
    console.error('Error updating custom code config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CustomCodeConfigResponse, { status: 500 });
  }
}
