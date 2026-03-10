/**
 * Publish Status API
 * 
 * Checks if there are unpublished sections and if a custom domain exists
 * Used to determine whether to show the "Publish Changes" button
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to check for unpublished sections
 */
const CHECK_UNPUBLISHED_SECTIONS = `
  query CheckUnpublishedSections($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false},
        is_published: {_eq: false}
      },
      limit: 1
    ) {
      template_id
    }
  }
`;

/**
 * GraphQL query to check for custom domain
 */
const CHECK_CUSTOM_DOMAIN = `
  query CheckCustomDomain($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      custom_domain
      is_deleted
    }
  }
`;

/**
 * GraphQL mutation to publish all unpublished sections (v2 becomes live)
 */
const PUBLISH_ALL_SECTIONS = `
  mutation PublishAllSections($restaurant_id: uuid!) {
    update_templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false},
        is_published: {_eq: false}
      },
      _set: {is_published: true, updated_at: "now()"}
    ) {
      affected_rows
      returning {
        template_id
        ref_template_id
      }
    }
  }
`;

/**
 * GraphQL mutation to mark old live versions as deleted (v1 archived)
 */
const MARK_OLD_VERSIONS_DELETED = `
  mutation MarkOldVersionsDeleted($template_ids: [uuid!]!) {
    update_templates(
      where: {
        template_id: {_in: $template_ids}
      },
      _set: {is_deleted: true, updated_at: "now()"}
    ) {
      affected_rows
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
 * GET endpoint to check publish status
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'restaurant_id is required'
      }, { status: 400 });
    }

    // Check for unpublished sections
    const unpublishedData = await graphqlRequest(CHECK_UNPUBLISHED_SECTIONS, {
      restaurant_id: restaurantId,
    });

    const hasUnpublishedSections = (unpublishedData as any).templates && 
      (unpublishedData as any).templates.length > 0;

    // Check for custom domain
    const domainData = await graphqlRequest(CHECK_CUSTOM_DOMAIN, {
      restaurant_id: restaurantId,
    });

    const restaurant = (domainData as any).restaurants_by_pk;
    const hasCustomDomain = restaurant && 
      !restaurant.is_deleted && 
      restaurant.custom_domain && 
      restaurant.custom_domain.trim() !== '';

    return NextResponse.json({
      success: true,
      data: {
        hasUnpublishedSections,
        hasCustomDomain,
        showPublishButton: hasUnpublishedSections && hasCustomDomain
      }
    });
  } catch (error) {
    console.error('Error checking publish status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST endpoint to publish all unpublished sections
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        error: 'restaurant_id is required'
      }, { status: 400 });
    }

    // Publish all unpublished sections
    const result = await graphqlRequest(PUBLISH_ALL_SECTIONS, {
      restaurant_id: restaurantId,
    });

    const affectedRows = (result as any).update_templates?.affected_rows || 0;
    const publishedTemplates = (result as any).update_templates?.returning || [];

    // Collect all ref_template_ids from the published templates
    const referencedTemplateIds = publishedTemplates
      .filter((template: any) => template.ref_template_id)
      .map((template: any) => template.ref_template_id);

    let deletedReferencedRows = 0;
    
    // Mark old live versions (v1) as deleted if any exist
    if (referencedTemplateIds.length > 0) {
      const deleteResult = await graphqlRequest(MARK_OLD_VERSIONS_DELETED, {
        template_ids: referencedTemplateIds,
      });
      
      deletedReferencedRows = (deleteResult as any).update_templates?.affected_rows || 0;
      console.log(`[Publish Status] Marked ${deletedReferencedRows} old live versions as deleted (archived)`);
    }

    return NextResponse.json({
      success: true,
      data: {
        publishedSections: affectedRows,
        deletedReferencedSections: deletedReferencedRows,
        message: `Successfully published ${affectedRows} section${affectedRows !== 1 ? 's' : ''}${deletedReferencedRows > 0 ? ` and archived ${deletedReferencedRows} previous version${deletedReferencedRows !== 1 ? 's' : ''}` : ''}`
      }
    });
  } catch (error) {
    console.error('Error publishing sections:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}