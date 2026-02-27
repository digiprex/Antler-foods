/**
 * Page Templates API Route
 *
 * Fetches all templates associated with a page
 * GET /api/page-templates - Get all templates for a page
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to fetch all templates for a page
 */
const GET_PAGE_TEMPLATES = `
  query GetPageTemplates($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        page_id: { _eq: $page_id }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
    ) {
      template_id
      category
      name
      config
      created_at
      updated_at
    }
  }
`;

// GET - Fetch all templates for a page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');

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

    // Query templates
    const data = await adminGraphqlRequest(GET_PAGE_TEMPLATES, {
      restaurant_id: restaurantId,
      page_id: pageId
    });

    const templates = (data as any).templates || [];

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
