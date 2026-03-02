/**
 * Web Pages API Route
 *
 * Handles fetching and updating individual page settings
 * GET /api/web-pages/[page_id] - Fetch page details
 * PATCH /api/web-pages/[page_id] - Update page SEO settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

/**
 * GraphQL query to get page by ID
 */
const GET_PAGE = `
  query GetPage($page_id: uuid!) {
    web_pages_by_pk(page_id: $page_id) {
      page_id
      name
      url_slug
      meta_title
      meta_description
      og_image
      published
      show_on_navbar
      show_on_footer
      restaurant_id
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL mutation to update page
 */
const UPDATE_PAGE = `
  mutation UpdatePage(
    $page_id: uuid!
    $meta_title: String
    $meta_description: String
    $og_image: String
    $published: Boolean
    $show_on_navbar: Boolean
    $show_on_footer: Boolean
  ) {
    update_web_pages_by_pk(
      pk_columns: { page_id: $page_id }
      _set: {
        meta_title: $meta_title
        meta_description: $meta_description
        og_image: $og_image
        published: $published
        show_on_navbar: $show_on_navbar
        show_on_footer: $show_on_footer
        updated_at: "now()"
      }
    ) {
      page_id
      meta_title
      meta_description
      og_image
      published
      show_on_navbar
      show_on_footer
      updated_at
    }
  }
`;

// GET - Fetch page details
export async function GET(
  _request: NextRequest,
  { params }: { params: { page_id: string } }
) {
  try {
    const pageId = params.page_id;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Fetch page
    const result = await adminGraphqlRequest(GET_PAGE, {
      page_id: pageId,
    });

    if (!(result as any).web_pages_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    const page = (result as any).web_pages_by_pk;

    return NextResponse.json({
      success: true,
      data: page
    });

  } catch (error) {
    console.error('Web Pages API GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update page settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: { page_id: string } }
) {
  try {
    const body = await request.json();
    const { meta_title, meta_description, og_image, published, show_on_navbar, show_on_footer } = body;
    const pageId = params.page_id;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Fetch current page to preserve existing values
    const currentPage = await adminGraphqlRequest(GET_PAGE, { page_id: pageId });
    const existingPage = (currentPage as any).web_pages_by_pk;

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Build variables object, using existing values for fields not being updated
    const variables: any = {
      page_id: pageId,
      meta_title: meta_title !== undefined && meta_title !== null ? meta_title : existingPage.meta_title,
      meta_description: meta_description !== undefined && meta_description !== null ? meta_description : existingPage.meta_description,
      og_image: og_image !== undefined && og_image !== null ? og_image : existingPage.og_image,
      published: typeof published === 'boolean' ? published : existingPage.published,
      show_on_navbar: typeof show_on_navbar === 'boolean' ? show_on_navbar : existingPage.show_on_navbar,
      show_on_footer: typeof show_on_footer === 'boolean' ? show_on_footer : existingPage.show_on_footer,
    };

    // Update page
    const result = await adminGraphqlRequest(UPDATE_PAGE, variables);

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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
