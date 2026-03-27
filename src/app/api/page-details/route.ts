export const dynamic = 'force-dynamic';

/**
 * Page Details API Route
 * 
 * This API route fetches page details from web_pages table using URL slug and domain,
 * then fetches associated template configurations from templates table
 * 
 * Query Parameters:
 * - restaurant_id: UUID of the restaurant (optional if domain is provided)
 * - url_slug: URL slug of the page (required)
 * - domain: Domain name (optional, for future multi-domain support)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';
// Restaurant ID should be provided dynamically via query parameters - no static fallback

/**
 * GraphQL request helper
 */
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
) {
  return adminGraphqlRequest<T>(query, variables);
}

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
 * GraphQL query to get page details by URL slug (for production - only published pages)
 */
const GET_PAGE_BY_SLUG_PUBLISHED = `
  query GetPageBySlugPublished($restaurant_id: uuid!, $url_slug: String!) {
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        url_slug: {_eq: $url_slug},
        is_deleted: {_eq: false},
        published: {_eq: true}
      }
      limit: 1
    ) {
      page_id
      url_slug
      name
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL query to get page details by URL slug (for staging - all pages)
 */
const GET_PAGE_BY_SLUG_ALL = `
  query GetPageBySlugAll($restaurant_id: uuid!, $url_slug: String!) {
    web_pages(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        url_slug: {_eq: $url_slug},
        is_deleted: {_eq: false}
      }
      limit: 1
    ) {
      page_id
      url_slug
      name
      meta_title
      meta_description
      restaurant_id
      is_system_page
      show_on_navbar
      show_on_footer
      keywords
      og_image
      published
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL query to get all templates for a specific page (staging - all sections)
 * This query shows all sections but prioritizes drafts over their referenced originals
 */
const GET_PAGE_TEMPLATES_ALL = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        is_deleted: {_eq: false}
      }
      order_by: {order_index: asc_nulls_last, created_at: desc}
    ) {
      template_id
      name
      category
      config
      menu_items
      page_id
      restaurant_id
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
 * GraphQL query to get only published templates for a specific page (production)
 */
const GET_PAGE_TEMPLATES_PUBLISHED = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        is_deleted: {_eq: false},
        is_published: {_eq: true}
      }
      order_by: {order_index: asc_nulls_last, created_at: desc}
    ) {
      template_id
      name
      category
      config
      menu_items
      page_id
      restaurant_id
      order_index
      is_deleted
      is_published
      created_at
      updated_at
    }
  }
`;

/**
 * GET /api/page-details
 * 
 * Fetches page details and associated templates by URL slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let restaurantId = searchParams.get('restaurant_id');
    const urlSlug = searchParams.get('url_slug');
    const domain = searchParams.get('domain') || request.headers.get('host');

    if (!urlSlug) {
      return NextResponse.json(
        {
          success: false,
          error: 'url_slug parameter is required',
          data: null,
        },
        { status: 400 }
      );
    }

    if (!restaurantId && !domain) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either restaurant_id or domain is required',
          data: null,
        },
        { status: 400 }
      );
    }

    // If domain is provided but no restaurantId, fetch restaurantId from domain
    if (domain && !restaurantId) {
      try {
        restaurantId = await resolveRestaurantIdByDomain(domain);
      } catch (error) {
        console.error('Error fetching restaurant ID by domain:', error);
      }
    }

    if (!restaurantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No restaurant found for this domain',
          data: null,
        },
        { status: 404 }
      );
    }

    // Step 1: Determine if we're on staging or production domain first
    let isStaging = false;
    try {
      const restaurantDomainsData = await graphqlRequest(GET_RESTAURANT_DOMAINS, {
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

        console.log('[Page Details API] Domain check:', {
          currentDomain,
          stagingDomain,
          customDomain,
          isStaging,
          isAdminInterface,
          referer,
        });
      }
    } catch (error) {
      console.error('[Page Details API] Error checking domain configuration:', error);
      // Default to production behavior if we can't determine
      isStaging = false;
    }

    // Step 2: Get page details by URL slug based on environment
    // Staging: show all pages (published and unpublished)
    // Production: show only published pages
    const pageQuery = isStaging ? GET_PAGE_BY_SLUG_ALL : GET_PAGE_BY_SLUG_PUBLISHED;
    const pageData = await graphqlRequest(pageQuery, {
      restaurant_id: restaurantId,
      url_slug: urlSlug,
    });

    if (!(pageData as any).web_pages || (pageData as any).web_pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No ${isStaging ? '' : 'published '}page found with url_slug: ${urlSlug}`,
          data: null,
        },
        { status: 404 }
      );
    }

    const page = (pageData as any).web_pages[0];

    // Step 3: Get templates for this page based on environment
    // Staging: show all sections (published and unpublished)
    // Production: show only published sections
    const templatesQuery = isStaging ? GET_PAGE_TEMPLATES_ALL : GET_PAGE_TEMPLATES_PUBLISHED;
    const templatesData = await graphqlRequest(templatesQuery, {
      restaurant_id: restaurantId,
      page_id: page.page_id,
    });

    // Return templates as an array instead of organizing by category
    // This allows multiple templates of the same category and preserves order
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
      
      console.log(`[Page Details API] Filtered out ${referencedTemplateIds.size} referenced templates on staging`);
    }

    console.log(`[Page Details API] Loaded ${templates.length} sections for page '${page.name}' (${isStaging ? 'staging' : 'production'})`);

    const response = {
      success: true,
      data: {
        page: {
          page_id: page.page_id,
          url_slug: page.url_slug,
          name: page.name,
          meta_title: page.meta_title,
          meta_description: page.meta_description,
          restaurant_id: page.restaurant_id,
          is_system_page: page.is_system_page,
          show_on_navbar: page.show_on_navbar,
          show_on_footer: page.show_on_footer,
          keywords: page.keywords,
          og_image: page.og_image,
          published: page.published,
          created_at: page.created_at,
          updated_at: page.updated_at,
        },
        templates: templates,
        template_count: templates.length,
      },
      error: null,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Page details API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
        data: null,
      },
      { status: 500 }
    );
  }
}
