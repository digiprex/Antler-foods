/**
 * Timeline Configuration API Route
 *
 * Handles GET and POST requests for timeline settings
 * - GET: Fetch timeline config for a specific page
 * - POST: Save/update timeline config
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

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
      template_id
      restaurant_id
      page_id
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
  return {
    is_custom: source.is_custom === true,
    buttonStyleVariant: source.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary',
    titleFontFamily:
      typeof source.titleFontFamily === 'string'
        ? source.titleFontFamily
        : 'Inter, system-ui, sans-serif',
    titleFontSize:
      typeof source.titleFontSize === 'string' ? source.titleFontSize : '2.25rem',
    titleFontWeight:
      typeof source.titleFontWeight === 'number'
        ? source.titleFontWeight
        : 700,
    titleColor: typeof source.titleColor === 'string' ? source.titleColor : '#111827',
    subtitleFontFamily:
      typeof source.subtitleFontFamily === 'string'
        ? source.subtitleFontFamily
        : 'Inter, system-ui, sans-serif',
    subtitleFontSize:
      typeof source.subtitleFontSize === 'string'
        ? source.subtitleFontSize
        : '1.5rem',
    subtitleFontWeight:
      typeof source.subtitleFontWeight === 'number'
        ? source.subtitleFontWeight
        : 600,
    subtitleColor:
      typeof source.subtitleColor === 'string' ? source.subtitleColor : '#374151',
    bodyFontFamily:
      typeof source.bodyFontFamily === 'string'
        ? source.bodyFontFamily
        : 'Inter, system-ui, sans-serif',
    bodyFontSize:
      typeof source.bodyFontSize === 'string' ? source.bodyFontSize : '1rem',
    bodyFontWeight:
      typeof source.bodyFontWeight === 'number' ? source.bodyFontWeight : 400,
    bodyColor: typeof source.bodyColor === 'string' ? source.bodyColor : '#6b7280',
  } as const;
}

function getDefaultTimelineConfig(restaurant_id: string, page_id?: string | null) {
  return {
    restaurant_id,
    page_id: page_id || undefined,
    isEnabled: false,
    layout: 'alternating',
    title: 'Our Journey',
    subtitle: 'Key milestones in our story',
    items: [],
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#10b981',
    lineColor: '#d1d5db',
    ...pickSectionStyleConfig({}),
  };
}

/**
 * GET: Fetch timeline configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurant_id = searchParams.get('restaurant_id');
    const page_id = searchParams.get('page_id');
    const template_id = searchParams.get('template_id') || null;

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // page_id is only required if template_id is not provided
    if (!template_id && !page_id) {
      return NextResponse.json(
        { success: false, error: 'Either Page ID or Template ID is required' },
        { status: 400 }
      );
    }

    // Fetch timeline configuration from templates table
    let query: string;
    let variables: any;

    if (template_id) {
      // Fetch by template_id
      query = `
        query GetTimelineConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
          templates(
            where: {
              restaurant_id: { _eq: $restaurant_id }
              template_id: { _eq: $template_id }
              category: { _eq: "timeline" }
              is_deleted: { _eq: false }
            }
            limit: 1
          ) {
            template_id
            restaurant_id
            page_id
            config
          }
        }
      `;
      variables = { restaurant_id, template_id };
    } else {
      // Fetch by page_id
      query = `
        query GetTimelineConfig($restaurant_id: uuid!, $page_id: uuid!) {
          templates(
            where: {
              restaurant_id: { _eq: $restaurant_id }
              page_id: { _eq: $page_id }
              category: { _eq: "timeline" }
              is_deleted: { _eq: false }
            }
            order_by: { created_at: desc }
            limit: 1
          ) {
            template_id
            restaurant_id
            page_id
            config
          }
        }
      `;
      variables = { restaurant_id, page_id };
    }

    const result = await graphqlRequest(query, variables);

    const template = (result as any)?.templates?.[0];

    if (!template) {
      // Return default configuration
      return NextResponse.json({
        success: true,
        data: getDefaultTimelineConfig(restaurant_id, page_id),
      });
    }

    // Extract config from JSONB field
    const config = (template.config || {}) as Record<string, unknown>;

    // Map database fields to frontend format
    const timelineConfig = {
      ...getDefaultTimelineConfig(template.restaurant_id, template.page_id),
      restaurant_id: template.restaurant_id,
      page_id: template.page_id,
      isEnabled: config.isEnabled ?? false,
      layout: config.layout || 'alternating',
      title: config.title || 'Our Journey',
      subtitle: config.subtitle || 'Key milestones in our story',
      items: config.items || [],
      backgroundColor: config.backgroundColor || '#ffffff',
      textColor: config.textColor || '#111827',
      accentColor: config.accentColor || '#10b981',
      lineColor: config.lineColor || '#d1d5db',
      ...pickSectionStyleConfig(config),
    };

    return NextResponse.json({ success: true, data: timelineConfig });
  } catch (error) {
    console.error('Error fetching timeline config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Save timeline configuration
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      page_id,
      template_id,
      isEnabled,
      layout,
      title,
      subtitle,
      items,
      backgroundColor,
      textColor,
      accentColor,
      lineColor,
    } = body;
    const isNewSection = body.new_section === true;

    if (!restaurant_id || !page_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and Page ID are required' },
        { status: 400 }
      );
    }

    // Step 0: Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurant_id,
      });

      if ((domainData as any)?.restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[Timeline Config POST] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[Timeline Config POST] Error checking custom domain:', error);
      hasCustomDomain = false;
    }

    // Step 1 & 2: Handle template updates based on current status
    let existingOrderIndex: number | null = null;
    let shouldMarkAsDeletedAndCreateNew = false;
    let shouldKeepOldRecordAndCreateDraft = false;
    let refTemplateId: string | null = null;

    if (!isNewSection) {
      if (template_id) {
        // Check the existing template status first
        const templateStatus = await graphqlRequest(CHECK_TEMPLATE_STATUS, {
          template_id: template_id,
        });

        if ((templateStatus as any)?.templates_by_pk) {
          const template = (templateStatus as any).templates_by_pk;
          existingOrderIndex = template.order_index;

          if (!template.is_deleted && !template.is_published) {
            // Case 1: is_deleted: false & is_published: false
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Timeline Config POST] Section is draft - will mark as deleted and create new record');
          } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
            // Case 2: is_deleted: false & is_published: true AND custom domain exists
            shouldKeepOldRecordAndCreateDraft = true;
            refTemplateId = template_id;
            console.log('[Timeline Config POST] Section is published with custom domain (PRODUCTION) - will keep published record and create draft');
          } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
            // Case 3: is_deleted: false & is_published: true but NO custom domain
            shouldMarkAsDeletedAndCreateNew = true;
            console.log('[Timeline Config POST] Section is published without custom domain (STAGING) - will mark as deleted and create new record');
          }
        }

        // Only mark the current template as deleted for Cases 1 & 3
        if (shouldMarkAsDeletedAndCreateNew) {
          await graphqlRequest(MARK_AS_DELETED, {
            template_id: template_id,
          });
        }
      } else {
        const currentQuery = `
          query GetTimelineConfig($restaurant_id: uuid!, $page_id: uuid!) {
            templates(
              where: {
                restaurant_id: { _eq: $restaurant_id }
                page_id: { _eq: $page_id }
                category: { _eq: "timeline" }
                is_deleted: { _eq: false }
              }
              order_by: { created_at: desc }
              limit: 1
            ) {
              template_id
              order_index
            }
          }
        `;

        const currentData = await graphqlRequest(currentQuery, {
          restaurant_id: restaurant_id,
          page_id: page_id,
        });

        if ((currentData as any)?.templates && (currentData as any).templates.length > 0) {
          const currentTemplate = (currentData as any).templates[0];
          existingOrderIndex = currentTemplate.order_index;

          await graphqlRequest(MARK_AS_DELETED, {
            template_id: currentTemplate.template_id,
          });
        }
      }
    }

    console.log('[Timeline Config POST] Saving timeline with page_id:', page_id);

    // Step 3: Calculate order_index - always set a valid number
    let orderIndex: number = 0; // Default to 0

    // If updating an existing section, preserve its original order_index
    if (!isNewSection && existingOrderIndex !== null && existingOrderIndex !== undefined) {
      orderIndex = existingOrderIndex;
      console.log('[Timeline Config POST] Preserving existing order_index:', orderIndex);
    } else if (page_id) {
      try {
        const maxOrderData = await graphqlRequest(GET_MAX_ORDER_INDEX, {
          restaurant_id: restaurant_id,
          page_id: page_id,
        });

        const maxOrder = (maxOrderData as any)?.templates_aggregate?.aggregate?.max?.order_index;

        if (isNewSection) {
          // For new sections, add 1 to max order (or start at 0)
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder + 1 : 0;
          console.log('[Timeline Config POST] New section order_index:', orderIndex, '(max was:', maxOrder, ')');
        } else {
          // For updates to existing sections, use max order or 0
          orderIndex = maxOrder !== null && maxOrder !== undefined ? maxOrder : 0;
          console.log('[Timeline Config POST] Update section order_index:', orderIndex);
        }
      } catch (error) {
        console.error('[Timeline Config POST] Error fetching max order_index:', error);
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

    console.log('[Timeline Config POST] Creating new template with is_published:', isPublished, 'ref_template_id:', refTemplateIdToUse,
      isNewSection ? '(new section - always draft)' : '(updating existing section)');

    // Prepare config object
    const config = {
      isEnabled: isEnabled ?? false,
      layout: layout || 'alternating',
      title: title || 'Our Journey',
      subtitle: subtitle || 'Key milestones in our story',
      items: items || [],
      backgroundColor: backgroundColor || '#ffffff',
      textColor: textColor || '#111827',
      accentColor: accentColor || '#10b981',
      lineColor: lineColor || '#d1d5db',
      ...pickSectionStyleConfig(body as Record<string, unknown>),
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurant_id,
      page_id: page_id,
      name: 'Timeline Configuration',
      category: 'timeline',
      config: config,
      order_index: orderIndex,
      is_published: isPublished,
      ref_template_id: refTemplateIdToUse,
    });

    if (!(insertedData as any).insert_templates_one) {
      return NextResponse.json(
        { success: false, error: 'Failed to save timeline configuration' },
        { status: 500 }
      );
    }

    const savedTemplate = (insertedData as any).insert_templates_one;

    // Map back to frontend format
    const savedConfig = savedTemplate.config || {};
    const timelineConfig = {
      ...getDefaultTimelineConfig(savedTemplate.restaurant_id, savedTemplate.page_id),
      restaurant_id: savedTemplate.restaurant_id,
      page_id: savedTemplate.page_id,
      isEnabled: savedConfig.isEnabled,
      layout: savedConfig.layout,
      title: savedConfig.title,
      subtitle: savedConfig.subtitle,
      items: savedConfig.items,
      backgroundColor: savedConfig.backgroundColor,
      textColor: savedConfig.textColor,
      accentColor: savedConfig.accentColor,
      lineColor: savedConfig.lineColor,
      ...pickSectionStyleConfig(savedConfig as Record<string, unknown>),
    };

    return NextResponse.json({ success: true, data: timelineConfig });
  } catch (error) {
    console.error('Error saving timeline config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
