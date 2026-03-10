/**
 * Page Templates API Route
 *
 * Fetches all templates associated with a page
 * GET /api/page-templates - Get all templates for a page
 * PATCH /api/page-templates - Update template order
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to get restaurant domain configuration
 */
const GET_RESTAURANT_DOMAINS = `
  query GetRestaurantDomains($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      staging_domain
      custom_domain
    }
  }
`;

/**
 * GraphQL query to fetch all templates for a page (staging - all sections)
 * This query shows all sections but prioritizes drafts over their referenced originals
 */
const GET_PAGE_TEMPLATES_ALL = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        page_id: { _eq: $page_id }
        is_deleted: { _eq: false }
      }
      order_by: { order_index: asc_nulls_last, created_at: desc }
    ) {
      template_id
      category
      name
      config
      menu_items
      order_index
      is_deleted
      is_published
      ref_template_id
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL query to fetch only published templates for a page (production)
 */
const GET_PAGE_TEMPLATES_PUBLISHED = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        page_id: { _eq: $page_id }
        is_deleted: { _eq: false }
        is_published: { _eq: true }
      }
      order_by: { order_index: asc_nulls_last, created_at: desc }
    ) {
      template_id
      category
      name
      config
      menu_items
      order_index
      is_deleted
      is_published
      ref_template_id
      created_at
      updated_at
    }
  }
`;

const UPDATE_TEMPLATE_ORDER = `
  mutation UpdateTemplateOrder($template_id: uuid!, $order_index: numeric!) {
    update_templates_by_pk(
      pk_columns: { template_id: $template_id }
      _set: { order_index: $order_index }
    ) {
      template_id
      order_index
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
 * Used to determine versioning behavior
 */
const CHECK_TEMPLATE_STATUS = `
  query CheckTemplateStatus($template_id: uuid!) {
    templates_by_pk(template_id: $template_id) {
      template_id
      restaurant_id
      is_deleted
      is_published
      order_index
      category
      config
      menu_items
      page_id
      name
      ref_template_id
    }
  }
`;

/**
 * GraphQL mutation to mark template as deleted
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
      template_id
      order_index
      is_published
      ref_template_id
    }
  }
`;

const SOFT_DELETE_TEMPLATE = `
  mutation SoftDeleteTemplate($template_id: uuid!) {
    update_templates_by_pk(
      pk_columns: { template_id: $template_id }
      _set: { is_deleted: true }
    ) {
      template_id
      is_deleted
    }
  }
`;

// GET - Fetch all templates for a page with staging domain filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const domain = searchParams.get('domain') || request.headers.get('host');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Determine if we're on staging or production domain
    let isStaging = false;
    try {
      const restaurantDomainsData = await adminGraphqlRequest(GET_RESTAURANT_DOMAINS, {
        restaurant_id: restaurantId,
      });

      const restaurantData = (restaurantDomainsData as any).restaurants_by_pk;
      if (restaurantData) {
        const stagingDomain = restaurantData.staging_domain?.toLowerCase().trim();
        const customDomain = restaurantData.custom_domain?.toLowerCase().trim();
        const currentDomain = domain?.toLowerCase().trim();

        // Check if URL includes admin path (admin interfaces should load staging content)
        const referer = request.headers.get('referer') || '';
        const isAdminInterface = referer.includes('/admin/');
        
        // If admin interface OR current domain matches staging_domain, it's staging
        // Otherwise, if it matches custom_domain (production domain), it's production
        isStaging = isAdminInterface || currentDomain === stagingDomain;

        console.log('[Page Templates API] Domain check:', {
          currentDomain,
          stagingDomain,
          customDomain,
          isStaging,
          isAdminInterface,
          referer,
        });
      }
    } catch (error) {
      console.error('[Page Templates API] Error checking domain configuration:', error);
      // Default to production behavior if we can't determine
      isStaging = false;
    }

    // Step 2: Get templates based on environment
    // Staging: show all sections but prioritize drafts over referenced originals
    // Production: show only published sections
    const templatesQuery = isStaging ? GET_PAGE_TEMPLATES_ALL : GET_PAGE_TEMPLATES_PUBLISHED;
    const templatesData = await adminGraphqlRequest(templatesQuery, {
      restaurant_id: restaurantId,
      page_id: pageId,
    });

    let templates = (templatesData as any).templates || [];

    // For staging environment, filter out templates that have draft versions referencing them
    // This ensures we show only the latest version (draft takes priority over published)
    if (isStaging && templates.length > 0) {
      const referencedTemplateIds = new Set(
        templates
          .filter((t: any) => t.ref_template_id) // Find templates with references
          .map((t: any) => t.ref_template_id)    // Get the IDs they reference
      );

      // Filter out templates that are referenced by drafts
      templates = templates.filter((template: any) => !referencedTemplateIds.has(template.template_id));
      
      console.log(`[Page Templates API] Filtered out ${referencedTemplateIds.size} referenced templates on staging`);
    }

    console.log(`[Page Templates API] Loaded ${templates.length} sections for page (${isStaging ? 'staging' : 'production'})`);

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Page Templates API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update template order with versioning support
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { template_id, order_index } = body;

    if (!template_id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (typeof order_index !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Order index must be a number' },
        { status: 400 }
      );
    }

    // Get template details first
    const templateData = await adminGraphqlRequest(CHECK_TEMPLATE_STATUS, {
      template_id: template_id,
    });

    const template = (templateData as any).templates_by_pk;
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const restaurantId = template.restaurant_id;

    // Check if custom domain exists (production environment)
    let hasCustomDomain = false;
    try {
      const domainData = await adminGraphqlRequest(CHECK_CUSTOM_DOMAIN, {
        restaurant_id: restaurantId,
      });

      if ((domainData as any).restaurants_by_pk) {
        const customDomain = (domainData as any).restaurants_by_pk.custom_domain;
        hasCustomDomain = Boolean(customDomain && customDomain.trim());
        console.log('[Page Templates PATCH] Custom domain check:', hasCustomDomain ? 'EXISTS (production mode)' : 'NOT EXISTS (staging mode)');
      }
    } catch (error) {
      console.error('[Page Templates PATCH] Error checking custom domain:', error);
      hasCustomDomain = false;
    }

    // Apply versioning logic based on template status (same as content edits)
    if (!template.is_deleted && !template.is_published) {
      // Case 1: Draft template (is_deleted: false & is_published: false)
      // Mark current record as deleted and create new record
      console.log('[Page Templates PATCH] Template is draft - will mark as deleted and create new record');
      
      await adminGraphqlRequest(MARK_AS_DELETED, {
        template_id: template_id,
      });
      
      // Create new template with updated order_index as draft
      const insertResult = await adminGraphqlRequest(INSERT_TEMPLATE, {
        restaurant_id: restaurantId,
        name: template.name,
        category: template.category,
        config: template.config,
        menu_items: template.menu_items,
        page_id: template.page_id,
        order_index: order_index,
        is_published: false,
        ref_template_id: null,
      });

      return NextResponse.json({
        success: true,
        data: (insertResult as any).insert_templates_one,
        message: 'Draft order updated.'
      });
    } else if (!template.is_deleted && template.is_published && hasCustomDomain) {
      // Case 2: Published template in production (is_deleted: false & is_published: true & has custom domain)
      // Keep original unchanged and create new record as draft with reference
      console.log('[Page Templates PATCH] Published template in production - will keep original and create draft with new order');
      
      // Create new template with updated order_index as draft
      const insertResult = await adminGraphqlRequest(INSERT_TEMPLATE, {
        restaurant_id: restaurantId,
        name: template.name,
        category: template.category,
        config: template.config,
        menu_items: template.menu_items,
        page_id: template.page_id,
        order_index: order_index,
        is_published: false,
        ref_template_id: template_id,
      });

      return NextResponse.json({
        success: true,
        data: (insertResult as any).insert_templates_one,
        message: 'Draft version created with new order. Publish changes to make it live.'
      });
    } else if (!template.is_deleted && template.is_published && !hasCustomDomain) {
      // Case 3: Published template in staging (is_deleted: false & is_published: true & no custom domain)
      // Mark as deleted and create new record
      console.log('[Page Templates PATCH] Published template in staging - will mark as deleted and create new record');
      
      await adminGraphqlRequest(MARK_AS_DELETED, {
        template_id: template_id,
      });
      
      // Create new template with updated order_index as draft
      const insertResult = await adminGraphqlRequest(INSERT_TEMPLATE, {
        restaurant_id: restaurantId,
        name: template.name,
        category: template.category,
        config: template.config,
        menu_items: template.menu_items,
        page_id: template.page_id,
        order_index: order_index,
        is_published: false,
        ref_template_id: null,
      });

      return NextResponse.json({
        success: true,
        data: (insertResult as any).insert_templates_one,
        message: 'Order updated in staging.'
      });
    } else {
      // Fallback: direct update for any other cases
      console.log('[Page Templates PATCH] Direct order update for other cases');
      
      const data = await adminGraphqlRequest(UPDATE_TEMPLATE_ORDER, {
        template_id,
        order_index
      });

      return NextResponse.json({
        success: true,
        data: (data as any).update_templates_by_pk
      });
    }

  } catch (error) {
    console.error('Page Templates API PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('template_id');

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Soft delete template
    const data = await adminGraphqlRequest(SOFT_DELETE_TEMPLATE, {
      template_id: templateId
    });

    return NextResponse.json({
      success: true,
      data: (data as any).update_templates_by_pk
    });

  } catch (error) {
    console.error('Page Templates API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
