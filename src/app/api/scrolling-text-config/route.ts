/**
 * Scrolling Text Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates scrolling text configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: "scrolling-text"
 * - category: "ScrollingText"
 * - config: { bgColor, textColor, text, scrollSpeed, isEnabled, fontSize }
 */

import { NextResponse } from 'next/server';
import type { ScrollingTextConfig, ScrollingTextConfigResponse } from '@/types/scrolling-text.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GraphQL query to fetch scrolling text configuration from templates
 */
const GET_SCROLLING_TEXT_CONFIG = `
  query GetScrollingTextConfig($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        category: {_eq: "ScrollingText"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      name
      restaurant_id
      page_id
      template_id
      updated_at
    }
  }
`;

const GET_SCROLLING_TEXT_CONFIG_BY_TEMPLATE = `
  query GetScrollingTextConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "ScrollingText"},
        is_deleted: {_eq: false}
      },
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      name
      restaurant_id
      page_id
      template_id
      updated_at
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
  mutation InsertTemplate($restaurant_id: uuid!, $page_id: uuid!, $name: String!, $category: String!, $config: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        page_id: $page_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: [],
        is_deleted: false
      }
    ) {
      restaurant_id
      page_id
      template_id
      name
      category
      config
      created_at
      updated_at
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest(query: string, variables?: any) {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

/**
 * GET endpoint to fetch scrolling text configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id') || null;

    if (!restaurantId || !pageId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'restaurant_id and page_id are required'
      } as ScrollingTextConfigResponse, { status: 400 });
    }

    // Determine which query to use based on available parameters
    const data = templateId
      ? await graphqlRequest(GET_SCROLLING_TEXT_CONFIG_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : await graphqlRequest(GET_SCROLLING_TEXT_CONFIG, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

    if (!data.templates || data.templates.length === 0) {
      // Return default disabled configuration
      return NextResponse.json({
        success: true,
        data: {
          isEnabled: false,
          text: '',
          bgColor: '#000000',
          textColor: '#ffffff',
          fontSize: '16px',
          scrollSpeed: 'medium',
        } as ScrollingTextConfig,
      } as ScrollingTextConfigResponse);
    }

    const template = data.templates[0];

    const config: ScrollingTextConfig = {
      restaurant_id: restaurantId,
      isEnabled: template.config?.isEnabled ?? false,
      text: template.config?.text || '',
      bgColor: template.config?.bgColor || '#000000',
      textColor: template.config?.textColor || '#ffffff',
      fontSize: template.config?.fontSize || '16px',
      scrollSpeed: template.config?.scrollSpeed || 'medium',
    };

    return NextResponse.json({
      success: true,
      data: config,
    } as ScrollingTextConfigResponse);
  } catch (error) {
    console.error('Error fetching scrolling text config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ScrollingTextConfigResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update scrolling text configuration
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const restaurantId = body.restaurant_id;
    const pageId = body.page_id;
    const templateId = body.template_id || null;

    if (!restaurantId || !pageId) {
      throw new Error('restaurant_id and page_id are required in request body');
    }

    // Step 2: If template_id is provided, mark that specific template as deleted (editing existing section)
    if (templateId) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: templateId,
      });
    }
    // If no template_id, this is a new section - don't delete any existing templates

    const config = {
      isEnabled: body.isEnabled,
      text: body.text,
      bgColor: body.bgColor,
      textColor: body.textColor,
      fontSize: body.fontSize,
      scrollSpeed: body.scrollSpeed,
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      page_id: pageId,
      name: 'scrolling-text',
      category: 'ScrollingText',
      config: config,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;

    const responseConfig: ScrollingTextConfig = {
      restaurant_id: restaurantId,
      page_id: pageId,
      isEnabled: template.config?.isEnabled,
      text: template.config?.text,
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      fontSize: template.config?.fontSize,
      scrollSpeed: template.config?.scrollSpeed,
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    } as ScrollingTextConfigResponse);
  } catch (error) {
    console.error('Error updating scrolling text config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ScrollingTextConfigResponse, { status: 500 });
  }
}
