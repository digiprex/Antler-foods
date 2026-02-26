/**
 * Website Info API
 * 
 * Fetches website information including restaurant_id based on custom domain
 */

import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_WEBSITE_INFO = `
  query GetWebsiteInfo($custom_domain: String!) {
    websites_by_pk(custom_domain: $custom_domain) {
      created_at
      custom_domain
      favicon_url
      global_styles
      google_analytics_id
      id
      is_deleted
      is_published
      logo
      restaurant_id
      staging_domain
      updated_at
      vercel_project_id
    }
  }
`;

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

export async function GET(request: Request) {
  try {
    // Get the host from the request headers
    const host = request.headers.get('host') || 'localhost:3000';
    
    // Remove port if present for custom domain lookup
    const customDomain = host.split(':')[0];

    const data = await graphqlRequest(GET_WEBSITE_INFO, {
      custom_domain: customDomain,
    });

    if (!data.websites_by_pk) {
      return NextResponse.json({
        success: false,
        error: 'Website not found for this domain',
      }, { status: 404 });
    }

    const website = data.websites_by_pk;

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: website.restaurant_id,
        custom_domain: website.custom_domain,
        logo: website.logo,
        favicon_url: website.favicon_url,
        is_published: website.is_published,
        is_deleted: website.is_deleted,
      },
    });
  } catch (error) {
    console.error('Error fetching website info:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
