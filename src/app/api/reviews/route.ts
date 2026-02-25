/**
 * Reviews API Route
 *
 * Fetches reviews from the reviews table
 */

import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT || process.env.HASURA_GRAPHQL_URL;
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.HASURA_ADMIN_SECRET;

async function graphqlRequest(query: string, variables: Record<string, any> = {}) {
  if (!HASURA_ENDPOINT) {
    throw new Error('HASURA_GRAPHQL_ENDPOINT or HASURA_GRAPHQL_URL environment variable is not set');
  }

  if (!HASURA_ADMIN_SECRET) {
    throw new Error('HASURA_GRAPHQL_ADMIN_SECRET or HASURA_ADMIN_SECRET environment variable is not set');
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const limit = searchParams.get('limit');

    console.log('[Reviews API] Request params:', { restaurantId, limit });

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    const query = `
      query GetReviews($restaurantId: uuid!, $isDeleted: Boolean!, $isHidden: Boolean!${limit ? ', $limit: Int!' : ''}) {
        reviews(
          where: {
            restaurant_id: { _eq: $restaurantId }
            is_deleted: { _eq: $isDeleted }
            is_hidden: { _eq: $isHidden }
          }
          order_by: { published_at: desc_nulls_last, created_at: desc }
          ${limit ? 'limit: $limit' : ''}
        ) {
          review_id
          restaurant_id
          source
          external_review_id
          rating
          author_name
          review_text
          author_url
          review_url
          published_at
          is_hidden
          created_by_user_id
          created_at
          updated_at
          is_deleted
          avatar_url
          avatar_file_id
        }
      }
    `;

    const variables: any = {
      restaurantId,
      isDeleted: false,
      isHidden: false,
    };

    if (limit) {
      variables.limit = parseInt(limit, 10);
    }

    const result = await graphqlRequest(query, variables);

    if (result.errors) {
      console.error('[Reviews API] GraphQL errors:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reviews', details: result.errors },
        { status: 500 }
      );
    }

    const reviews = result.data?.reviews || [];
    console.log('[Reviews API] Found reviews:', reviews.length);

    return NextResponse.json({
      success: true,
      data: reviews,
    });

  } catch (error) {
    console.error('[Reviews API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
