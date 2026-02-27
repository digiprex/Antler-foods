/**
 * Page Templates API Route
 *
 * Fetches all templates associated with a page
 * GET /api/page-templates - Get all templates for a page
 * PATCH /api/page-templates - Update template order
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface Template {
  template_id: string;
  category: string;
  name: string;
  config: Record<string, unknown>;
  order_index: number | null;
  created_at: string;
  updated_at: string;
}

interface PageTemplatesResponse {
  templates: Template[];
}

interface UpdateTemplateOrderResponse {
  update_templates_by_pk: {
    template_id: string;
    order_index: number;
  };
}

interface SoftDeleteTemplateResponse {
  update_templates_by_pk: {
    template_id: string;
    is_deleted: boolean;
  };
}

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
      order_by: { order_index: asc_nulls_last, created_at: desc }
    ) {
      template_id
      category
      name
      config
      order_index
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
    const data = await adminGraphqlRequest<PageTemplatesResponse>(GET_PAGE_TEMPLATES, {
      restaurant_id: restaurantId,
      page_id: pageId
    });

    const templates = data.templates || [];

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

// PATCH - Update template order
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

    // Update template order
    const data = await adminGraphqlRequest<UpdateTemplateOrderResponse>(UPDATE_TEMPLATE_ORDER, {
      template_id,
      order_index
    });

    return NextResponse.json({
      success: true,
      data: data.update_templates_by_pk
    });

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
    const data = await adminGraphqlRequest<SoftDeleteTemplateResponse>(SOFT_DELETE_TEMPLATE, {
      template_id: templateId
    });

    return NextResponse.json({
      success: true,
      data: data.update_templates_by_pk
    });

  } catch (error) {
    console.error('Page Templates API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
