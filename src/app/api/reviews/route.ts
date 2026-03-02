/**
 * Reviews API Route
 *
 * Fetches reviews from the reviews table
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data: T; errors?: any }> {
  const data = await adminGraphqlRequest<T>(query, variables);
  return { data };
}

interface Review {
  review_id: string;
  restaurant_id: string;
  source: string;
  external_review_id?: string;
  rating: number;
  author_name: string | null;
  review_text: string | null;
  author_url?: string;
  review_url?: string;
  published_at: string;
  is_hidden: boolean;
  created_by_user_id?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  avatar_url: string | null;
  avatar_file_id?: string;
}

interface GetReviewsResponse {
  reviews: Review[];
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

    const variables: Record<string, string | boolean | number> = {
      restaurantId,
      isDeleted: false,
      isHidden: false,
    };

    if (limit) {
      variables.limit = parseInt(limit, 10);
    }

    const result = await graphqlRequest<GetReviewsResponse>(query, variables);

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
