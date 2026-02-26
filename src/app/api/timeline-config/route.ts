/**
 * Timeline Configuration API Route
 *
 * Handles GET and POST requests for timeline settings
 * - GET: Fetch timeline config for a specific page
 * - POST: Save/update timeline config
 */

import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_URL;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

/**
 * GET: Fetch timeline configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Validate environment variables
    if (!HASURA_ENDPOINT || !HASURA_ADMIN_SECRET) {
      console.error('Missing environment variables:', {
        hasEndpoint: !!HASURA_ENDPOINT,
        hasSecret: !!HASURA_ADMIN_SECRET
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const restaurant_id = searchParams.get('restaurant_id');
    const page_id = searchParams.get('page_id');

    if (!restaurant_id || !page_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and Page ID are required' },
        { status: 400 }
      );
    }

    // Fetch timeline configuration from templates table
    const query = `
      query GetTimelineConfig($restaurant_id: uuid!, $page_id: uuid!) {
        templates(
          where: {
            restaurant_id: { _eq: $restaurant_id }
            page_id: { _eq: $page_id }
            category: { _eq: "timeline" }
            is_deleted: { _eq: false }
          }
          order_by: { created_at: desc }
          limit: 1
        ) {
          template_id
          restaurant_id
          page_id
          config
        }
      }
    `;

    const response = await fetch(HASURA_ENDPOINT as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET as string,
      },
      body: JSON.stringify({
        query,
        variables: { restaurant_id, page_id },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch timeline configuration' },
        { status: 500 }
      );
    }

    const template = result.data?.templates?.[0];

    if (!template) {
      // Return default configuration
      return NextResponse.json({
        success: true,
        data: {
          restaurant_id,
          page_id,
          isEnabled: false,
          layout: 'alternating',
          title: 'Our Journey',
          subtitle: 'Key milestones in our story',
          items: [],
          backgroundColor: '#ffffff',
          textColor: '#111827',
          accentColor: '#10b981',
          lineColor: '#d1d5db',
        },
      });
    }

    // Extract config from JSONB field
    const config = template.config || {};

    // Map database fields to frontend format
    const timelineConfig = {
      restaurant_id: template.restaurant_id,
      page_id: template.page_id,
      isEnabled: config.isEnabled ?? false,
      layout: config.layout || 'alternating',
      title: config.title || 'Our Journey',
      subtitle: config.subtitle || 'Key milestones in our story',
      items: config.items || [],
      backgroundColor: config.backgroundColor || '#ffffff',
      textColor: config.textColor || '#111827',
      accentColor: config.accentColor || '#10b981',
      lineColor: config.lineColor || '#d1d5db',
    };

    return NextResponse.json({ success: true, data: timelineConfig });
  } catch (error) {
    console.error('Error fetching timeline config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST: Save timeline configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!HASURA_ENDPOINT || !HASURA_ADMIN_SECRET) {
      console.error('Missing environment variables:', {
        hasEndpoint: !!HASURA_ENDPOINT,
        hasSecret: !!HASURA_ADMIN_SECRET
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      restaurant_id,
      page_id,
      isEnabled,
      layout,
      title,
      subtitle,
      items,
      backgroundColor,
      textColor,
      accentColor,
      lineColor,
    } = body;

    if (!restaurant_id || !page_id) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and Page ID are required' },
        { status: 400 }
      );
    }

    // Prepare config object
    const config = {
      isEnabled: isEnabled ?? false,
      layout: layout || 'alternating',
      title: title || 'Our Journey',
      subtitle: subtitle || 'Key milestones in our story',
      items: items || [],
      backgroundColor: backgroundColor || '#ffffff',
      textColor: textColor || '#111827',
      accentColor: accentColor || '#10b981',
      lineColor: lineColor || '#d1d5db',
    };

    // Soft delete existing templates
    const deleteMutation = `
      mutation SoftDeleteTimeline($restaurant_id: uuid!, $page_id: uuid!) {
        update_templates(
          where: {
            restaurant_id: { _eq: $restaurant_id }
            page_id: { _eq: $page_id }
            category: { _eq: "timeline" }
            is_deleted: { _eq: false }
          }
          _set: { is_deleted: true }
        ) {
          affected_rows
        }
      }
    `;

    await fetch(HASURA_ENDPOINT as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET as string,
      },
      body: JSON.stringify({
        query: deleteMutation,
        variables: { restaurant_id, page_id },
      }),
    });

    // Insert new template
    const insertMutation = `
      mutation InsertTimeline($object: templates_insert_input!) {
        insert_templates_one(object: $object) {
          template_id
          restaurant_id
          page_id
          category
          config
        }
      }
    `;

    const insertResponse = await fetch(HASURA_ENDPOINT as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET as string,
      },
      body: JSON.stringify({
        query: insertMutation,
        variables: {
          object: {
            restaurant_id,
            page_id,
            category: 'timeline',
            name: 'Timeline Configuration',
            config,
          },
        },
      }),
    });

    const insertResult = await insertResponse.json();

    if (insertResult.errors) {
      console.error('GraphQL errors:', insertResult.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to save timeline configuration' },
        { status: 500 }
      );
    }

    const savedTemplate = insertResult.data?.insert_templates_one;

    if (!savedTemplate) {
      return NextResponse.json(
        { success: false, error: 'Failed to save timeline configuration' },
        { status: 500 }
      );
    }

    // Map back to frontend format
    const savedConfig = savedTemplate.config || {};
    const timelineConfig = {
      restaurant_id: savedTemplate.restaurant_id,
      page_id: savedTemplate.page_id,
      isEnabled: savedConfig.isEnabled,
      layout: savedConfig.layout,
      title: savedConfig.title,
      subtitle: savedConfig.subtitle,
      items: savedConfig.items,
      backgroundColor: savedConfig.backgroundColor,
      textColor: savedConfig.textColor,
      accentColor: savedConfig.accentColor,
      lineColor: savedConfig.lineColor,
    };

    return NextResponse.json({ success: true, data: timelineConfig });
  } catch (error) {
    console.error('Error saving timeline config:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
