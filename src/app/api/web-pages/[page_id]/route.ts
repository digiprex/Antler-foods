/**
 * Web Pages Update API Route
 *
 * Handles updating individual page settings
 * PATCH /api/web-pages/[page_id] - Update page SEO settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL mutation to update page
 */
const UPDATE_PAGE = `
  mutation UpdatePage(
    $page_id: uuid!
    $meta_title: String
    $meta_description: String
    $og_image: String
  ) {
    update_web_pages_by_pk(
      pk_columns: { page_id: $page_id }
      _set: {
        meta_title: $meta_title
        meta_description: $meta_description
        og_image: $og_image
        updated_at: "now()"
      }
    ) {
      page_id
      meta_title
      meta_description
      og_image
      updated_at
    }
  }
`;

// PATCH - Update page settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { page_id: string } }
) {
  try {
    const body = await request.json();
    const { meta_title, meta_description, og_image } = body;
    const pageId = params.page_id;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Update page
    const result = await adminGraphqlRequest(UPDATE_PAGE, {
      page_id: pageId,
      meta_title,
      meta_description,
      og_image,
    });

    if (!(result as any).update_web_pages_by_pk) {
      throw new Error('Failed to update page');
    }

    const page = (result as any).update_web_pages_by_pk;

    return NextResponse.json({
      success: true,
      data: page
    });

  } catch (error) {
    console.error('Web Pages API PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
