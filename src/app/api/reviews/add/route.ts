/**
 * Add Review API Route
 *
 * Creates a new review in the reviews table
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
) {
  const data = await adminGraphqlRequest<T>(query, variables);
  return { data };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurant_id,
      rating,
      author_name,
      review_text,
      source,
      avatar_url,
      published_at,
    } = body;

    console.log('[Add Review API] Request:', {
      restaurant_id,
      rating,
      author_name,
      source,
    });

    if (!restaurant_id) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const mutation = `
      mutation InsertReview($review: reviews_insert_input!) {
        insert_reviews_one(object: $review) {
          review_id
          restaurant_id
          source
          rating
          author_name
          review_text
          avatar_url
          published_at
          created_at
        }
      }
    `;

    const result = await graphqlRequest(mutation, {
      review: {
        restaurant_id,
        source: source || 'manual',
        rating: parseInt(rating, 10),
        author_name: author_name || null,
        review_text: review_text || null,
        avatar_url: avatar_url || null,
        published_at: published_at || new Date().toISOString(),
        is_hidden: false,
        is_deleted: false,
      },
    });

    if (result.errors) {
      console.error('[Add Review API] GraphQL errors:', result.errors);
      return NextResponse.json(
        { success: false, error: 'Failed to add review', details: result.errors },
        { status: 500 }
      );
    }

    const review = result.data?.insert_reviews_one;
    console.log('[Add Review API] Review created:', review.review_id);

    return NextResponse.json({
      success: true,
      data: review,
    });

  } catch (error) {
    console.error('[Add Review API] Error:', error);
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
