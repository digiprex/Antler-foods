/**
 * Footer Configuration API with GraphQL (Hasura)
 *
 * This API route fetches and updates footer configuration from Hasura GraphQL API
 * using the templates table with restaurant_id
 *
 * Structure:
 * - name: layout type (e.g., "columns-3")
 * - category: "Footer"
 * - menu_items: array of footer links/columns
 * - config: { bgColor, textColor, linkColor, contact info, social links }
 */

import { NextResponse } from 'next/server';
import type { FooterConfig, FooterConfigResponse } from '@/types/footer.types';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

// Static restaurant ID for testing
const RESTAURANT_ID = '92e9160e-0afa-4f78-824f-b28e32885353';

/**
 * GraphQL query to fetch footer configuration from templates
 * Searches by restaurant_id and category, excludes deleted templates
 */
const GET_FOOTER_CONFIG = `
  query GetFooterConfig($restaurant_id: uuid!) {
    templates(
      where: {
        restaurant_id: {_eq: $restaurant_id},
        category: {_eq: "Footer"},
        is_deleted: {_eq: false}
      },
      order_by: {created_at: desc},
      limit: 1
    ) {
      category
      config
      created_at
      is_deleted
      menu_items
      name
      restaurant_id
      template_id
      updated_at
    }
  }
`;

/**
 * GraphQL mutation to mark current template as deleted
 * Uses template_id as primary key
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
  mutation InsertTemplate($restaurant_id: uuid!, $name: String!, $category: String!, $config: jsonb!, $menu_items: jsonb!) {
    insert_templates_one(
      object: {
        restaurant_id: $restaurant_id,
        name: $name,
        category: $category,
        config: $config,
        menu_items: $menu_items,
        is_deleted: false
      }
    ) {
      restaurant_id
      template_id
      name
      category
      config
      menu_items
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
 * GET endpoint to fetch footer configuration
 */
export async function GET(request: Request) {
  try {
    // Get restaurant_id from query params or use default
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') || RESTAURANT_ID;

    const data = await graphqlRequest(GET_FOOTER_CONFIG, {
      restaurant_id: restaurantId,
    });

    if (!data.templates || data.templates.length === 0) {
      // Return default config if template doesn't exist
      const defaultConfig: FooterConfig = {
        restaurantName: 'Antler Foods',
        aboutContent: 'Experience fine dining at its best',
        email: 'hello@antlerfoods.com',
        phone: '+1 (555) 123-4567',
        address: '123 Main Street, City, State 12345',
        columns: [
          {
            title: 'Quick Links',
            links: [
              { label: 'Menu', href: '/menu', order: 1 },
              { label: 'About', href: '/about', order: 2 },
              { label: 'Contact', href: '/contact', order: 3 },
            ],
            order: 1,
          },
        ],
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com', order: 1 },
          { platform: 'instagram', url: 'https://instagram.com', order: 2 },
        ],
        copyrightText: `© ${new Date().getFullYear()} Antler Foods. All rights reserved.`,
        showPoweredBy: true,
        layout: 'columns-3',
        bgColor: '#1f2937',
        textColor: '#f9fafb',
        linkColor: '#9ca3af',
        copyrightBgColor: '#000000',
        copyrightTextColor: '#ffffff',
        showNewsletter: false,
        showSocialMedia: true,
        showLocations: true,
      };

      const response: FooterConfigResponse = {
        success: true,
        data: defaultConfig,
      };

      return NextResponse.json(response);
    }

    const template = data.templates[0];

    // Transform template structure to FooterConfig
    const config: FooterConfig = {
      restaurantName: template.config?.restaurantName || 'Antler Foods',
      aboutContent: template.config?.aboutContent || '',
      email: template.config?.email || '',
      phone: template.config?.phone || '',
      address: template.config?.address || '',
      columns: template.menu_items || [],
      socialLinks: template.config?.socialLinks || [],
      copyrightText: template.config?.copyrightText || `© ${new Date().getFullYear()} Antler Foods. All rights reserved.`,
      showPoweredBy: template.config?.showPoweredBy !== false,
      layout: template.name,
      bgColor: template.config?.bgColor || '#1f2937',
      textColor: template.config?.textColor || '#f9fafb',
      linkColor: template.config?.linkColor || '#9ca3af',
      copyrightBgColor: template.config?.copyrightBgColor || '#000000',
      copyrightTextColor: template.config?.copyrightTextColor || '#ffffff',
      showNewsletter: template.config?.showNewsletter || false,
      showSocialMedia: template.config?.showSocialMedia !== false,
      showLocations: template.config?.showLocations !== false,
    };

    const response: FooterConfigResponse = {
      success: true,
      data: config,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching footer config:', error);

    const errorResponse: FooterConfigResponse = {
      success: false,
      data: {
        restaurantName: 'Antler Foods',
        columns: [],
        socialLinks: [],
      } as FooterConfig,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * POST endpoint to update footer configuration
 * Marks current template as deleted and inserts new one
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Get restaurant_id - must be provided in request body
    const restaurantId = body.restaurant_id;

    if (!restaurantId) {
      throw new Error('restaurant_id is required in request body');
    }

    // Step 1: Get current template to mark as deleted
    const currentData = await graphqlRequest(GET_FOOTER_CONFIG, {
      restaurant_id: restaurantId,
    });

    // Step 2: Mark current template as deleted (if exists)
    if (currentData.templates && currentData.templates.length > 0) {
      const currentTemplate = currentData.templates[0];

      await graphqlRequest(MARK_AS_DELETED, {
        template_id: currentTemplate.template_id,
      });
    }

    // Transform FooterConfig to template structure
    const name = body.layout || 'columns-3';
    const config = {
      restaurantName: body.restaurantName,
      aboutContent: body.aboutContent,
      email: body.email,
      phone: body.phone,
      address: body.address,
      bgColor: body.bgColor,
      textColor: body.textColor,
      linkColor: body.linkColor,
      copyrightBgColor: body.copyrightBgColor,
      copyrightTextColor: body.copyrightTextColor,
      socialLinks: body.socialLinks || [],
      copyrightText: body.copyrightText,
      showPoweredBy: body.showPoweredBy,
      showNewsletter: body.showNewsletter,
      showSocialMedia: body.showSocialMedia,
      showLocations: body.showLocations,
    };

    const menu_items = body.columns || [];

    // Step 3: Insert new template
    const insertedData = await graphqlRequest(INSERT_TEMPLATE, {
      restaurant_id: restaurantId,
      name: name,
      category: 'Footer',
      config: config,
      menu_items: menu_items,
    });

    if (!insertedData.insert_templates_one) {
      throw new Error('Failed to insert new template');
    }

    const template = insertedData.insert_templates_one;

    // Transform back to FooterConfig
    const responseConfig: FooterConfig = {
      restaurantName: template.config?.restaurantName || 'Antler Foods',
      aboutContent: template.config?.aboutContent,
      email: template.config?.email,
      phone: template.config?.phone,
      address: template.config?.address,
      layout: template.name,
      columns: template.menu_items,
      socialLinks: template.config?.socialLinks || [],
      bgColor: template.config?.bgColor,
      textColor: template.config?.textColor,
      linkColor: template.config?.linkColor,
      copyrightBgColor: template.config?.copyrightBgColor,
      copyrightTextColor: template.config?.copyrightTextColor,
      copyrightText: template.config?.copyrightText,
      showPoweredBy: template.config?.showPoweredBy,
      showNewsletter: template.config?.showNewsletter,
      showSocialMedia: template.config?.showSocialMedia,
      showLocations: template.config?.showLocations,
    };

    const response: FooterConfigResponse = {
      success: true,
      data: responseConfig,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating footer config:', error);

    const errorResponse: FooterConfigResponse = {
      success: false,
      data: {} as FooterConfig,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
