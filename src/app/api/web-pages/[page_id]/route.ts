/**
 * Web Pages API Route
 *
 * Handles fetching and updating individual page settings
 * GET /api/web-pages/[page_id] - Fetch page details
 * PATCH /api/web-pages/[page_id] - Update page SEO settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface PageData {
  page_id: string;
  name: string;
  url_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  published: boolean;
  show_on_navbar: boolean;
  show_on_footer: boolean;
  restaurant_id: string;
  created_at: string;
  updated_at: string;
}

interface GetPageResponse {
  web_pages_by_pk: PageData | null;
}

interface UpdatePageResponse {
  update_web_pages_by_pk: {
    page_id: string;
    meta_title: string | null;
    meta_description: string | null;
    og_image: string | null;
    published: boolean;
    show_on_navbar: boolean;
    show_on_footer: boolean;
    updated_at: string;
  } | null;
}

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
    }) as GetPageResponse;

    if (!result.web_pages_by_pk) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    const page = result.web_pages_by_pk;

    return NextResponse.json({
      success: true,
      data: page
    });

  } catch (error) {
    console.error('Web Pages API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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

    // Build variables object, only including defined values
    const variables: Record<string, string | boolean> = {
      page_id: pageId,
    };

    if (meta_title !== undefined) variables.meta_title = meta_title;
    if (meta_description !== undefined) variables.meta_description = meta_description;
    if (og_image !== undefined) variables.og_image = og_image;
    if (published !== undefined) variables.published = published;
    if (show_on_navbar !== undefined) variables.show_on_navbar = show_on_navbar;
    if (show_on_footer !== undefined) variables.show_on_footer = show_on_footer;

    // Update page
    const result = await adminGraphqlRequest(UPDATE_PAGE, variables) as UpdatePageResponse;

    if (!result.update_web_pages_by_pk) {
      throw new Error('Failed to update page');
    }

    const page = result.update_web_pages_by_pk;

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
