/**
 * Custom Code Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates custom code configuration from Hasura GraphQL API
 * using the templates table with restaurant_id and page_id
 *
 * Structure:
 * - name: "custom-code"
 * - category: "CustomCode"
 * - config: { isEnabled, codeType, htmlCode, cssCode, jsCode, iframeUrl, iframeHeight, iframeWidth }
 */

import { NextResponse } from 'next/server';
import type { CustomCodeConfig, CustomCodeConfigResponse } from '@/types/custom-code.types';
import { DEFAULT_CUSTOM_CODE_CONFIG } from '@/types/custom-code.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

/**
 * GraphQL query to fetch custom code configuration from templates
 */
const GET_CUSTOM_CODE_CONFIG = `
  query GetCustomCodeConfig($restaurant_id: uuid!, $page_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        page_id: {_eq: $page_id},
        category: {_eq: "CustomCode"},
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

const GET_CUSTOM_CODE_CONFIG_BY_TEMPLATE = `
  query GetCustomCodeConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "CustomCode"},
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

function pickSectionStyleConfig(source: Record<string, unknown>) {
  const asString = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value : fallback;
  const asNumber = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  return {
    is_custom: source.is_custom === true,
    buttonStyleVariant: source.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary',
    titleFontFamily: asString(source.titleFontFamily, 'Inter, system-ui, sans-serif'),
    titleFontSize: asString(source.titleFontSize, '2.25rem'),
    titleFontWeight: asNumber(source.titleFontWeight, 700),
    titleColor: asString(source.titleColor, '#111827'),
    subtitleFontFamily: asString(source.subtitleFontFamily, 'Inter, system-ui, sans-serif'),
    subtitleFontSize: asString(source.subtitleFontSize, '1.5rem'),
    subtitleFontWeight: asNumber(source.subtitleFontWeight, 600),
    subtitleColor: asString(source.subtitleColor, '#374151'),
    bodyFontFamily: asString(source.bodyFontFamily, 'Inter, system-ui, sans-serif'),
    bodyFontSize: asString(source.bodyFontSize, '1rem'),
    bodyFontWeight: asNumber(source.bodyFontWeight, 400),
    bodyColor: asString(source.bodyColor, '#6b7280'),
  } as const;
}

/**
 * GET endpoint to fetch custom code configuration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id') || null;

    if (!restaurantId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'restaurant_id is required'
      } as CustomCodeConfigResponse, { status: 400 });
    }

    // page_id is only required if template_id is not provided
    if (!templateId && !pageId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'Either page_id or template_id is required'
      } as CustomCodeConfigResponse, { status: 400 });
    }

    // Determine which query to use based on available parameters
    const data = templateId
      ? await graphqlRequest(GET_CUSTOM_CODE_CONFIG_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : await graphqlRequest(GET_CUSTOM_CODE_CONFIG, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

    if (!data.templates || data.templates.length === 0) {
      // Return default disabled configuration
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_CUSTOM_CODE_CONFIG,
          restaurant_id: restaurantId,
          page_id: pageId || undefined,
        } as CustomCodeConfig,
      } as CustomCodeConfigResponse);
    }

    const template = data.templates[0];
    const templateConfig = (template.config || {}) as Record<string, unknown>;

    const config: CustomCodeConfig = {
      ...DEFAULT_CUSTOM_CODE_CONFIG,
      restaurant_id: restaurantId,
      page_id: template.page_id || pageId || undefined,
      isEnabled: templateConfig.isEnabled === true,
      codeType: templateConfig.codeType === 'iframe' ? 'iframe' : 'html',
      htmlCode:
        typeof templateConfig.htmlCode === 'string'
          ? templateConfig.htmlCode
          : DEFAULT_CUSTOM_CODE_CONFIG.htmlCode,
      cssCode:
        typeof templateConfig.cssCode === 'string'
          ? templateConfig.cssCode
          : DEFAULT_CUSTOM_CODE_CONFIG.cssCode,
      jsCode:
        typeof templateConfig.jsCode === 'string'
          ? templateConfig.jsCode
          : DEFAULT_CUSTOM_CODE_CONFIG.jsCode,
      iframeUrl:
        typeof templateConfig.iframeUrl === 'string'
          ? templateConfig.iframeUrl
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeUrl,
      iframeHeight:
        typeof templateConfig.iframeHeight === 'string'
          ? templateConfig.iframeHeight
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeHeight,
      iframeWidth:
        typeof templateConfig.iframeWidth === 'string'
          ? templateConfig.iframeWidth
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeWidth,
      ...pickSectionStyleConfig(templateConfig),
    };

    return NextResponse.json({
      success: true,
      data: config,
    } as CustomCodeConfigResponse);
  } catch (error) {
    console.error('Error fetching custom code config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CustomCodeConfigResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update custom code configuration
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
      codeType: body.codeType,
      htmlCode: body.htmlCode,
      cssCode: body.cssCode,
      jsCode: body.jsCode,
      iframeUrl: body.iframeUrl,
      iframeHeight: body.iframeHeight,
      iframeWidth: body.iframeWidth,
      ...pickSectionStyleConfig(body as Record<string, unknown>),
    };

    // Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      page_id: pageId,
      name: 'custom-code',
      category: 'CustomCode',
      config: config,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;
    const insertedConfig = (template.config || {}) as Record<string, unknown>;

    const responseConfig: CustomCodeConfig = {
      ...DEFAULT_CUSTOM_CODE_CONFIG,
      restaurant_id: restaurantId,
      page_id: pageId,
      isEnabled: insertedConfig.isEnabled === true,
      codeType: insertedConfig.codeType === 'iframe' ? 'iframe' : 'html',
      htmlCode:
        typeof insertedConfig.htmlCode === 'string'
          ? insertedConfig.htmlCode
          : DEFAULT_CUSTOM_CODE_CONFIG.htmlCode,
      cssCode:
        typeof insertedConfig.cssCode === 'string'
          ? insertedConfig.cssCode
          : DEFAULT_CUSTOM_CODE_CONFIG.cssCode,
      jsCode:
        typeof insertedConfig.jsCode === 'string'
          ? insertedConfig.jsCode
          : DEFAULT_CUSTOM_CODE_CONFIG.jsCode,
      iframeUrl:
        typeof insertedConfig.iframeUrl === 'string'
          ? insertedConfig.iframeUrl
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeUrl,
      iframeHeight:
        typeof insertedConfig.iframeHeight === 'string'
          ? insertedConfig.iframeHeight
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeHeight,
      iframeWidth:
        typeof insertedConfig.iframeWidth === 'string'
          ? insertedConfig.iframeWidth
          : DEFAULT_CUSTOM_CODE_CONFIG.iframeWidth,
      ...pickSectionStyleConfig(insertedConfig),
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    } as CustomCodeConfigResponse);
  } catch (error) {
    console.error('Error updating custom code config:', error);
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as CustomCodeConfigResponse, { status: 500 });
  }
}
