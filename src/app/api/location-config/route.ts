/**
 * Location Configuration API Route
 *
 * Handles GET and POST requests for location configuration
 * Uses templates table with category "Location"
 * Fetches google_place_id from restaurant table
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import type { GlobalStyleConfig } from '@/types/global-style.types';
import { DEFAULT_GLOBAL_STYLE_CONFIG } from '@/types/global-style.types';
import { DEFAULT_LOCATION_CONFIG } from '@/types/location.types';

/**
 * GraphQL query to fetch location configuration from templates
 */
const GET_LOCATION_CONFIG = `
  query GetLocationConfig($restaurant_id: uuid!, $page_id: uuid) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Location"},
        is_deleted: {_eq: false},
        page_id: {_eq: $page_id}
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
      template_id
      page_id
      updated_at
    }
    restaurants(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false}
      }
    ) {
      google_place_id
      global_styles
      restaurant_id
    }
  }
`;

const GET_LOCATION_CONFIG_BY_TEMPLATE = `
  query GetLocationConfigByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        template_id: {_eq: $template_id},
        category: {_eq: "Location"},
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
      template_id
      page_id
      updated_at
    }
    restaurants(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        is_deleted: {_eq: false}
      }
    ) {
      google_place_id
      global_styles
      restaurant_id
    }
  }
`;

const GET_RESTAURANT_GLOBAL_STYLES = `
  query GetRestaurantGlobalStyles($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      global_styles
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $page_id: uuid) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        page_id: $page_id,
        menu_items: [],
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      page_id
      created_at
      updated_at
    }
  }
`;

/**
 * Helper function to make GraphQL requests
 */
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

function parseGlobalStyles(rawGlobalStyles: unknown): GlobalStyleConfig | null {
  if (!rawGlobalStyles) {
    return null;
  }

  if (typeof rawGlobalStyles === 'string') {
    try {
      return JSON.parse(rawGlobalStyles) as GlobalStyleConfig;
    } catch (error) {
      console.warn('[Location Config] Failed to parse global_styles JSON:', error);
      return null;
    }
  }

  if (typeof rawGlobalStyles === 'object') {
    return rawGlobalStyles as GlobalStyleConfig;
  }

  return null;
}

function toFontWeight(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function getTypographyDefaults(globalStyles: GlobalStyleConfig | null) {
  const mergedGlobalStyles: GlobalStyleConfig = {
    ...DEFAULT_GLOBAL_STYLE_CONFIG,
    ...(globalStyles || {}),
    title: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.title,
      ...(globalStyles?.title || {}),
    },
    subheading: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.subheading,
      ...(globalStyles?.subheading || {}),
    },
    paragraph: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.paragraph,
      ...(globalStyles?.paragraph || {}),
    },
  };

  return {
    titleFontFamily: mergedGlobalStyles.title?.fontFamily || 'Inter, system-ui, sans-serif',
    titleFontSize: mergedGlobalStyles.title?.fontSize || '2.25rem',
    titleFontWeight: mergedGlobalStyles.title?.fontWeight || 700,
    titleColor: mergedGlobalStyles.title?.color || '#111827',
    subtitleFontFamily: mergedGlobalStyles.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
    subtitleFontSize: mergedGlobalStyles.subheading?.fontSize || '1.5rem',
    subtitleFontWeight: mergedGlobalStyles.subheading?.fontWeight || 600,
    subtitleColor: mergedGlobalStyles.subheading?.color || '#374151',
    descriptionFontFamily: mergedGlobalStyles.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
    descriptionFontSize: mergedGlobalStyles.paragraph?.fontSize || '1rem',
    descriptionFontWeight: mergedGlobalStyles.paragraph?.fontWeight || 400,
    descriptionColor: mergedGlobalStyles.paragraph?.color || '#6b7280',
    bodyFontFamily: mergedGlobalStyles.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
    bodyFontSize: mergedGlobalStyles.paragraph?.fontSize || '1rem',
    bodyFontWeight: mergedGlobalStyles.paragraph?.fontWeight || 400,
    bodyColor: mergedGlobalStyles.paragraph?.color || '#6b7280',
  };
}

function buildTypographyConfig(
  sourceConfig: Record<string, unknown>,
  typographyDefaults: ReturnType<typeof getTypographyDefaults>,
  isCustom: boolean,
) {
  if (!isCustom) {
    return typographyDefaults;
  }

  return {
    titleFontFamily: toStringValue(sourceConfig.titleFontFamily, typographyDefaults.titleFontFamily),
    titleFontSize: toStringValue(sourceConfig.titleFontSize, typographyDefaults.titleFontSize),
    titleFontWeight: toFontWeight(sourceConfig.titleFontWeight, typographyDefaults.titleFontWeight),
    titleColor: toStringValue(sourceConfig.titleColor, typographyDefaults.titleColor),
    subtitleFontFamily: toStringValue(sourceConfig.subtitleFontFamily, typographyDefaults.subtitleFontFamily),
    subtitleFontSize: toStringValue(sourceConfig.subtitleFontSize, typographyDefaults.subtitleFontSize),
    subtitleFontWeight: toFontWeight(sourceConfig.subtitleFontWeight, typographyDefaults.subtitleFontWeight),
    subtitleColor: toStringValue(sourceConfig.subtitleColor, typographyDefaults.subtitleColor),
    descriptionFontFamily: toStringValue(sourceConfig.descriptionFontFamily, typographyDefaults.descriptionFontFamily),
    descriptionFontSize: toStringValue(sourceConfig.descriptionFontSize, typographyDefaults.descriptionFontSize),
    descriptionFontWeight: toFontWeight(sourceConfig.descriptionFontWeight, typographyDefaults.descriptionFontWeight),
    descriptionColor: toStringValue(sourceConfig.descriptionColor, typographyDefaults.descriptionColor),
    bodyFontFamily: toStringValue(sourceConfig.bodyFontFamily, typographyDefaults.bodyFontFamily),
    bodyFontSize: toStringValue(sourceConfig.bodyFontSize, typographyDefaults.bodyFontSize),
    bodyFontWeight: toFontWeight(sourceConfig.bodyFontWeight, typographyDefaults.bodyFontWeight),
    bodyColor: toStringValue(sourceConfig.bodyColor, typographyDefaults.bodyColor),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id') || null;
    const isNewSection = searchParams.get('new_section') === 'true';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    console.log('[Location Config] Using restaurant_id:', restaurantId, 'page_id:', pageId);

    // Determine which query to use based on available parameters
    const data = templateId
      ? await graphqlRequest(GET_LOCATION_CONFIG_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : await graphqlRequest(GET_LOCATION_CONFIG, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

    console.log('[Location Config] Template query result:', JSON.stringify(data, null, 2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restaurantData = (data as any).restaurants?.[0] || null;
    const googlePlaceId = restaurantData?.google_place_id || '';
    const globalStyles = parseGlobalStyles(restaurantData?.global_styles);
    const typographyDefaults = getTypographyDefaults(globalStyles);
    
    console.log('[Location Config] Restaurant data:', (data as any).restaurants);
    console.log('[Location Config] Google Place ID:', googlePlaceId);

    if (isNewSection && !templateId) {
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_LOCATION_CONFIG,
          ...typographyDefaults,
          is_custom: false,
          page_id: pageId || undefined,
          google_place_id: googlePlaceId,
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(data as any).templates || (data as any).templates.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_LOCATION_CONFIG,
          ...typographyDefaults,
          is_custom: false,
          page_id: pageId || undefined,
          google_place_id: googlePlaceId,
        },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = (data as any).templates[0];
    const templateConfig = (template.config || {}) as Record<string, unknown>;
    const isCustom = templateConfig.is_custom === true;
    const typographyConfig = buildTypographyConfig(templateConfig, typographyDefaults, isCustom);

    // Transform template structure to LocationConfig
    const config = {
      ...DEFAULT_LOCATION_CONFIG,
      layout: template.name,
      ...(templateConfig as Record<string, unknown>),
      ...typographyConfig,
      is_custom: isCustom,
      template_id: template.template_id,
      page_id: template.page_id ?? pageId ?? undefined,
      google_place_id: googlePlaceId,
    };

    console.log('[Location Config] Final config being returned:', config);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching location config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, page_id, template_id, layout, ...configData } = body as Record<string, unknown>;

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    const globalStylesResult = await graphqlRequest<{
      restaurants_by_pk: { global_styles: unknown } | null;
    }>(GET_RESTAURANT_GLOBAL_STYLES, { restaurant_id });
    const globalStyles = parseGlobalStyles(globalStylesResult?.restaurants_by_pk?.global_styles);
    const typographyDefaults = getTypographyDefaults(globalStyles);
    const isCustom = configData.is_custom === true;
    const typographyConfig = buildTypographyConfig(configData, typographyDefaults, isCustom);

    console.log('[Location Config] Saving config for restaurant:', restaurant_id, 'page_id:', page_id, 'template_id:', template_id);

    // Step 2: If template_id is provided, mark that specific template as deleted (editing existing section)
    if (template_id) {
      await graphqlRequest(MARK_AS_DELETED, {
        template_id: template_id,
      });
      console.log('[Location Config] Marked specific template as deleted:', template_id);
    }
    // If no template_id, this is a new section - don't delete any existing templates

    // Transform LocationConfig to template structure
    const name = layout || 'default'; // layout goes to name field
    const config = {
      ...configData,
      buttonStyleVariant: configData.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary',
      is_custom: isCustom,
      ...typographyConfig,
    };

    // Step 3: Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurant_id,
      name: name,
      category: 'Location',
      config: config,
      page_id: page_id,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const template = (insertedData as any).insert_templates_one;
    console.log('[Location Config] Created new template:', template.template_id);

    const insertedTemplateConfig = (template.config || {}) as Record<string, unknown>;
    const insertedIsCustom = insertedTemplateConfig.is_custom === true;
    const insertedTypographyConfig = buildTypographyConfig(insertedTemplateConfig, typographyDefaults, insertedIsCustom);

    // Transform back to LocationConfig
    const responseConfig = {
      ...DEFAULT_LOCATION_CONFIG,
      layout: template.name,
      ...insertedTemplateConfig,
      ...insertedTypographyConfig,
      is_custom: insertedIsCustom,
      template_id: template.template_id,
      page_id: template.page_id ?? page_id ?? undefined,
    };

    return NextResponse.json({
      success: true,
      data: responseConfig,
    });
  } catch (error) {
    console.error('Error updating location config:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
