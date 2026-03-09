/**
 * Web Pages API Route
 *
 * Handles fetching and updating individual page settings
 * GET /api/web-pages/[page_id] - Fetch page details
 * PATCH /api/web-pages/[page_id] - Update page SEO settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { triggerVercelDeploy } from '@/lib/server/vercel-deploy';

interface WebPageRecord {
  page_id: string;
  name: string | null;
  url_slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  published: boolean | null;
  show_on_navbar: boolean | null;
  show_on_footer: boolean | null;
  restaurant_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface GetPageResponse {
  web_pages_by_pk: WebPageRecord | null;
}

interface UpdatePageResponse {
  update_web_pages_by_pk: WebPageRecord | null;
}

interface UpdatePageBody {
  name?: string | null;
  url_slug?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  published?: boolean;
  show_on_navbar?: boolean;
  show_on_footer?: boolean;
}

interface UpdatePageVariables extends Record<string, unknown> {
  page_id: string;
  name: string | null;
  url_slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  published: boolean | null;
  show_on_navbar: boolean | null;
  show_on_footer: boolean | null;
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
    $name: String
    $url_slug: String
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
        name: $name
        url_slug: $url_slug
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
      name
      url_slug
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

const DEPLOY_TRIGGER_FIELDS = [
  'published',
  'url_slug',
  'meta_title',
  'meta_description',
  'og_image',
] as const;

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
    const result = await adminGraphqlRequest<GetPageResponse>(GET_PAGE, {
      page_id: pageId,
    });

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
    const body = (await request.json()) as UpdatePageBody;
    const { name, url_slug, meta_title, meta_description, og_image, published, show_on_navbar, show_on_footer } = body;
    const pageId = params.page_id;

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Page ID is required' },
        { status: 400 }
      );
    }

    // Fetch current page to preserve existing values
    const currentPage = await adminGraphqlRequest<GetPageResponse>(GET_PAGE, {
      page_id: pageId,
    });
    const existingPage = currentPage.web_pages_by_pk;

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // Build variables object, using existing values for fields not being updated
    const variables: UpdatePageVariables = {
      page_id: pageId,
      name: name !== undefined && name !== null ? name : existingPage.name,
      url_slug: url_slug !== undefined && url_slug !== null ? url_slug : existingPage.url_slug,
      meta_title: meta_title !== undefined && meta_title !== null ? meta_title : existingPage.meta_title,
      meta_description: meta_description !== undefined && meta_description !== null ? meta_description : existingPage.meta_description,
      og_image: og_image !== undefined && og_image !== null ? og_image : existingPage.og_image,
      published: typeof published === 'boolean' ? published : existingPage.published,
      show_on_navbar: typeof show_on_navbar === 'boolean' ? show_on_navbar : existingPage.show_on_navbar,
      show_on_footer: typeof show_on_footer === 'boolean' ? show_on_footer : existingPage.show_on_footer,
    };

    const changedDeployFields = DEPLOY_TRIGGER_FIELDS.filter((field) => {
      const previousValue = toComparableValue(existingPage[field]);
      const nextValue = toComparableValue(variables[field]);
      return previousValue !== nextValue;
    });

    // Update page
    const result = await adminGraphqlRequest<UpdatePageResponse>(
      UPDATE_PAGE,
      variables,
    );

    if (!result.update_web_pages_by_pk) {
      throw new Error('Failed to update page');
    }

    const page = result.update_web_pages_by_pk;
    let deployResult: Awaited<ReturnType<typeof triggerVercelDeploy>> | null = null;

    if (changedDeployFields.length > 0) {
      deployResult = await triggerVercelDeploy({
        restaurantId: normalizeText(existingPage.restaurant_id),
        reason: `web-page-update:${pageId}`,
        source: 'web-pages-patch',
        metadata: {
          page_id: pageId,
          changed_fields: changedDeployFields,
          published: variables.published,
        },
      });

      if (!deployResult.triggered && !deployResult.skipped) {
        console.error('Vercel deploy trigger failed:', deployResult.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: page,
      deploy: deployResult
        ? {
            attempted: deployResult.attempted,
            triggered: deployResult.triggered,
            skipped: deployResult.skipped,
            reason: deployResult.reason,
            status_code: deployResult.statusCode ?? null,
            retry_after_ms: deployResult.retryAfterMs ?? null,
            message: deployResult.message,
          }
        : null,
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

function toComparableValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === undefined) {
    return null;
  }
  return value;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
