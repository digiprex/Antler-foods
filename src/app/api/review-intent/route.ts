import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

interface RestaurantReviewTargetRow {
  restaurant_id?: string | null;
  gmb_link?: string | null;
  google_place_id?: string | null;
}

interface RestaurantReviewTargetResponse {
  restaurants?: RestaurantReviewTargetRow[];
}

interface InsertReviewResponse {
  insert_reviews_one?: {
    review_id?: string | null;
  } | null;
}

const GET_RESTAURANT_REVIEW_TARGET = `
  query GetRestaurantReviewTarget($restaurant_id: uuid!) {
    restaurants(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _neq: true }
      }
      limit: 1
    ) {
      restaurant_id
      gmb_link
      google_place_id
    }
  }
`;

const INSERT_MANUAL_REVIEW = `
  mutation InsertManualReview($object: reviews_insert_input!) {
    insert_reviews_one(object: $object) {
      review_id
    }
  }
`;

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function buildGoogleReviewUrl(gmbLink: string | null, placeId: string | null) {
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  if (gmbLink) {
    return gmbLink;
  }
  return null;
}

async function resolveRestaurantTarget(restaurantId: string) {
  const data = await adminGraphqlRequest<RestaurantReviewTargetResponse>(
    GET_RESTAURANT_REVIEW_TARGET,
    {
      restaurant_id: restaurantId,
    },
  );

  const row = Array.isArray(data.restaurants) ? data.restaurants[0] : null;
  if (!row?.restaurant_id) {
    return null;
  }

  const gmbLink = normalizeText(row.gmb_link);
  const placeId = normalizeText(row.google_place_id);

  return {
    restaurantId: row.restaurant_id.trim(),
    gmbLink,
    placeId,
    googleReviewUrl: buildGoogleReviewUrl(gmbLink, placeId),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = normalizeText(searchParams.get('restaurant_id'));

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }
    if (!isUuid(restaurantId)) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id must be a valid uuid' },
        { status: 400 },
      );
    }

    const target = await resolveRestaurantTarget(restaurantId);
    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: target.restaurantId,
        google_review_url: target.googleReviewUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to resolve review target.',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const restaurantId = normalizeText(body.restaurant_id);
    const authorName = normalizeText(body.author_name);
    const reviewText = normalizeText(body.review_text);
    const avatarUrl = normalizeText(body.avatar_url);
    const publishedAtInput = normalizeText(body.published_at);
    const rawRating = Number.parseInt(String(body.rating ?? ''), 10);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }
    if (!isUuid(restaurantId)) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id must be a valid uuid' },
        { status: 400 },
      );
    }

    if (Number.isNaN(rawRating) || rawRating < 1 || rawRating > 4) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 4' },
        { status: 400 },
      );
    }

    if (!authorName) {
      return NextResponse.json(
        { success: false, error: 'author_name is required' },
        { status: 400 },
      );
    }

    if (!reviewText) {
      return NextResponse.json(
        { success: false, error: 'review_text is required' },
        { status: 400 },
      );
    }

    const target = await resolveRestaurantTarget(restaurantId);
    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 },
      );
    }

    const nowIso = new Date().toISOString();
    let publishedAtIso = nowIso;
    if (publishedAtInput) {
      const parsedDate = new Date(publishedAtInput);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'published_at is invalid' },
          { status: 400 },
        );
      }
      publishedAtIso = parsedDate.toISOString();
    }

    const data = await adminGraphqlRequest<InsertReviewResponse>(
      INSERT_MANUAL_REVIEW,
      {
        object: {
          restaurant_id: target.restaurantId,
          source: 'manual',
          rating: rawRating,
          author_name: authorName,
          review_text: reviewText,
          avatar_url: avatarUrl,
          published_at: publishedAtIso,
          is_hidden: false,
          is_deleted: false,
        },
      },
    );

    const reviewId = normalizeText(data.insert_reviews_one?.review_id);
    if (!reviewId) {
      throw new Error('Failed to save manual review.');
    }

    return NextResponse.json({
      success: true,
      data: {
        review_id: reviewId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save review.',
      },
      { status: 500 },
    );
  }
}
