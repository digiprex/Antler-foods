/**
 * Form Settings API Routes
 *
 * Handles CRUD operations for form display settings using the templates table
 * GET /api/form-settings - Get form settings for a restaurant/page
 * POST /api/form-settings - Create or update form settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { extractSectionStyleConfig } from '@/lib/section-style-config';

/**
 * GraphQL query to fetch form settings from templates by page_id
 */
const GET_FORM_SETTINGS = `
  query GetFormSettings($restaurant_id: uuid!, $page_id: uuid) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        page_id: { _eq: $page_id }
        category: { _eq: "Form" }
        is_deleted: { _eq: false }
      }
      order_by: { created_at: desc }
      limit: 1
    ) {
      template_id
      category
      name
      config
      restaurant_id
      page_id
      created_at
      updated_at
    }
  }
`;

/**
 * GraphQL query to fetch form settings from templates by template_id
 */
const GET_FORM_SETTINGS_BY_TEMPLATE = `
  query GetFormSettingsByTemplate($restaurant_id: uuid!, $template_id: uuid!) {
    templates(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        template_id: { _eq: $template_id }
        category: { _eq: "Form" }
        is_deleted: { _eq: false }
      }
      limit: 1
    ) {
      template_id
      category
      name
      config
      restaurant_id
      page_id
      created_at
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
      pk_columns: { template_id: $template_id }
      _set: { is_deleted: true, updated_at: "now()" }
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
  mutation InsertTemplate($restaurant_id: uuid!, $page_id: uuid, $name: String!, $category: String!, $config: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id
        page_id: $page_id
        name: $name
        category: $category
        config: $config
        menu_items: []
        is_deleted: false
      }
    ) {
      template_id
      restaurant_id
      page_id
      name
      category
      config
      created_at
      updated_at
    }
  }
`;

// GET - Fetch form settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const pageId = searchParams.get('page_id');
    const templateId = searchParams.get('template_id');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // page_id is only required if template_id is not provided
    if (!templateId && !pageId) {
      return NextResponse.json(
        { success: false, error: 'Either Page ID or Template ID is required' },
        { status: 400 }
      );
    }

    // Query form settings from templates table
    const data = templateId
      ? await adminGraphqlRequest(GET_FORM_SETTINGS_BY_TEMPLATE, {
          restaurant_id: restaurantId,
          template_id: templateId,
        })
      : await adminGraphqlRequest(GET_FORM_SETTINGS, {
          restaurant_id: restaurantId,
          page_id: pageId,
        });

    const template = (data as any).templates?.[0] || null;

    if (!template) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    // Extract config from template
    const config = template.config || {};

    return NextResponse.json({
      success: true,
      data: {
        form_id: config.form_id,
        layout: template.name || config.layout,
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        backgroundColor: config.backgroundColor,
        textColor: config.textColor,
        imageUrl: config.imageUrl,
        showImage: config.showImage,
        imagePosition: config.imagePosition,
        buttonColor: config.buttonColor,
        buttonText: config.buttonText,
        accentColor: config.accentColor,
        mobileBackgroundColor: config.mobileBackgroundColor,
        mobileTextColor: config.mobileTextColor,
        mobileAccentColor: config.mobileAccentColor,
        isEnabled: config.enabled ?? config.isEnabled ?? true,
        is_custom: config.is_custom ?? false,
        ...extractSectionStyleConfig(config),
      }
    });

  } catch (error) {
    console.error('Form Settings API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or update form settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      form_id,
      layout,
      title,
      subtitle,
      description,
      backgroundColor,
      textColor,
      buttonText,
      imageUrl,
      showImage,
      imagePosition,
      isEnabled,
      enabled, // For backwards compatibility
      restaurant_id,
      page_id,
      template_id,
      is_custom,
      buttonStyleVariant,
      accentColor,
      mobileBackgroundColor,
      mobileTextColor,
      mobileAccentColor,
    } = body;

    // Validate required fields
    if (!form_id || !layout || !restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'Form ID, layout, and restaurant ID are required' },
        { status: 400 }
      );
    }

    if (!page_id && !template_id) {
      return NextResponse.json(
        { success: false, error: 'Either Page ID or Template ID is required' },
        { status: 400 }
      );
    }

    // Step 2: If template_id is provided, mark that specific template as deleted (editing existing section)
    if (template_id) {
      await adminGraphqlRequest(MARK_AS_DELETED, {
        template_id: template_id,
      });
    }
    // If no template_id, this is a new section - don't delete any existing templates

    // Step 3: Prepare configuration to store in templates table
    const config = {
      form_id,
      title,
      subtitle,
      description,
      backgroundColor,
      textColor,
      buttonText,
      imageUrl,
      showImage,
      imagePosition,
      accentColor,
      mobileBackgroundColor,
      mobileTextColor,
      mobileAccentColor,
      isEnabled: isEnabled !== undefined ? isEnabled : (enabled !== undefined ? enabled : true),
      ...extractSectionStyleConfig({
        ...body,
        is_custom,
        buttonStyleVariant,
      } as Record<string, unknown>),
    };

    // Step 4: Insert new template
    const insertedData = await adminGraphqlRequest(INSERT_TEMPLATE, {
      restaurant_id,
      page_id,
      name: layout, // Layout goes in the name field
      category: 'Form',
      config,
    });

    if (!(insertedData as any).insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = (insertedData as any).insert_templates_one;

    return NextResponse.json({
      success: true,
      data: {
        template_id: template.template_id,
        form_id: template.config.form_id,
        layout: template.name,
        ...template.config,
      }
    });

  } catch (error) {
    console.error('Form Settings API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
