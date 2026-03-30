import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_RESTAURANT_REVIEWS = `
  query GetRestaurantReviews($restaurant_id: uuid!) {
    reviews(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _neq: true }
      }
      order_by: [{ published_at: desc_nulls_last }, { created_at: desc }]
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

const GET_REVIEW_BY_ID = `
  query GetReviewById($review_id: uuid!) {
    reviews_by_pk(review_id: $review_id) {
      review_id
      source
      is_deleted
    }
  }
`;

const INSERT_MANUAL_REVIEW = `
  mutation InsertManualReview($object: reviews_insert_input!) {
    insert_reviews_one(object: $object) {
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

const UPDATE_REVIEW_BY_PK = `
  mutation UpdateReviewByPk($review_id: uuid!, $changes: reviews_set_input!) {
    update_reviews_by_pk(
      pk_columns: { review_id: $review_id }
      _set: $changes
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

type ReviewRow = {
  review_id?: string | null;
  restaurant_id?: string | null;
  source?: string | null;
  external_review_id?: string | null;
  rating?: number | null;
  author_name?: string | null;
  review_text?: string | null;
  author_url?: string | null;
  review_url?: string | null;
  published_at?: string | null;
  is_hidden?: boolean | null;
  created_by_user_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_deleted?: boolean | null;
  avatar_url?: string | null;
  avatar_file_id?: string | null;
};

type ReviewIdentityRow = {
  review_id?: string | null;
  source?: string | null;
  is_deleted?: boolean | null;
};

interface ReviewsQueryResponse {
  reviews?: ReviewRow[];
}

interface ReviewByIdResponse {
  reviews_by_pk?: ReviewIdentityRow | null;
}

interface InsertManualReviewResponse {
  insert_reviews_one?: ReviewRow | null;
}

interface UpdateReviewResponse {
  update_reviews_by_pk?: ReviewRow | null;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  return adminGraphqlRequest<T>(query, variables);
}

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asNullableString(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function asNullableIsoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseRating(value: unknown) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(1, Math.min(5, parsed));
}

function normalizeReview(row: ReviewRow) {
  return {
    review_id: asTrimmedString(row.review_id),
    restaurant_id: asTrimmedString(row.restaurant_id),
    source: asTrimmedString(row.source),
    external_review_id: asNullableString(row.external_review_id),
    rating: typeof row.rating === 'number' ? row.rating : 0,
    author_name: asNullableString(row.author_name),
    review_text: asNullableString(row.review_text),
    author_url: asNullableString(row.author_url),
    review_url: asNullableString(row.review_url),
    published_at: asNullableString(row.published_at),
    is_hidden: Boolean(row.is_hidden),
    created_by_user_id: asNullableString(row.created_by_user_id),
    created_at: asNullableString(row.created_at),
    updated_at: asNullableString(row.updated_at),
    is_deleted: Boolean(row.is_deleted),
    avatar_url: asNullableString(row.avatar_url),
    avatar_file_id: asNullableString(row.avatar_file_id),
  };
}

async function getReviewIdentity(reviewId: string) {
  const data = await graphqlRequest<ReviewByIdResponse>(GET_REVIEW_BY_ID, {
    review_id: reviewId,
  });
  return data.reviews_by_pk || null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id')?.trim() ?? '';

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id required' },
        { status: 400 },
      );
    }

    const data = await graphqlRequest<ReviewsQueryResponse>(GET_RESTAURANT_REVIEWS, {
      restaurant_id: restaurantId,
    });

    const rows = Array.isArray(data.reviews) ? data.reviews : [];
    const normalized = rows.map(normalizeReview);

    return NextResponse.json({
      success: true,
      data: normalized,
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;

    const restaurantId = asTrimmedString(payload.restaurant_id);
    const authorName = asTrimmedString(payload.author_name);
    const reviewText = asTrimmedString(payload.review_text);
    const rating = parseRating(payload.rating);
    const publishedAt = asNullableIsoDate(payload.published_at);

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id required' },
        { status: 400 },
      );
    }

    if (!authorName) {
      return NextResponse.json(
        { success: false, error: 'author_name required' },
        { status: 400 },
      );
    }

    if (!reviewText) {
      return NextResponse.json(
        { success: false, error: 'review_text required' },
        { status: 400 },
      );
    }

    if (!rating) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
        { status: 400 },
      );
    }

    const object = {
      restaurant_id: restaurantId,
      source: 'manual',
      rating,
      author_name: authorName,
      review_text: reviewText,
      author_url: asNullableString(payload.author_url),
      review_url: asNullableString(payload.review_url),
      published_at: publishedAt,
      is_hidden: Boolean(payload.is_hidden),
      created_by_user_id: asNullableString(payload.created_by_user_id),
      avatar_url: asNullableString(payload.avatar_url),
      avatar_file_id: asNullableString(payload.avatar_file_id),
    };

    const data = await graphqlRequest<InsertManualReviewResponse>(
      INSERT_MANUAL_REVIEW,
      { object },
    );

    const row = data.insert_reviews_one;
    if (!row) {
      throw new Error('Failed to insert manual review.');
    }

    return NextResponse.json({
      success: true,
      data: normalizeReview(row),
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const reviewId = asTrimmedString(payload.review_id);
    const action = asTrimmedString(payload.action);

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'review_id required' },
        { status: 400 },
      );
    }

    const identity = await getReviewIdentity(reviewId);
    if (!identity?.review_id || identity.is_deleted === true) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 },
      );
    }

    if (action === 'toggle_hidden') {
      if (typeof payload.is_hidden !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'is_hidden boolean required' },
          { status: 400 },
        );
      }

      const data = await graphqlRequest<UpdateReviewResponse>(UPDATE_REVIEW_BY_PK, {
        review_id: reviewId,
        changes: {
          is_hidden: payload.is_hidden,
        },
      });

      const row = data.update_reviews_by_pk;
      if (!row) {
        throw new Error('Failed to update review visibility.');
      }

      return NextResponse.json({
        success: true,
        data: normalizeReview(row),
      });
    }

    if (action !== 'edit_manual') {
      return NextResponse.json(
        { success: false, error: 'Unsupported action' },
        { status: 400 },
      );
    }

    if (asTrimmedString(identity.source).toLowerCase() !== 'manual') {
      return NextResponse.json(
        { success: false, error: 'Only manual reviews can be edited.' },
        { status: 403 },
      );
    }

    const changes: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(payload, 'rating')) {
      const rating = parseRating(payload.rating);
      if (!rating) {
        return NextResponse.json(
          { success: false, error: 'rating must be between 1 and 5' },
          { status: 400 },
        );
      }
      changes.rating = rating;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'author_name')) {
      const authorName = asTrimmedString(payload.author_name);
      if (!authorName) {
        return NextResponse.json(
          { success: false, error: 'author_name required' },
          { status: 400 },
        );
      }
      changes.author_name = authorName;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'review_text')) {
      const reviewText = asTrimmedString(payload.review_text);
      if (!reviewText) {
        return NextResponse.json(
          { success: false, error: 'review_text required' },
          { status: 400 },
        );
      }
      changes.review_text = reviewText;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'published_at')) {
      changes.published_at = asNullableIsoDate(payload.published_at);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'is_hidden')) {
      if (typeof payload.is_hidden !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'is_hidden must be boolean' },
          { status: 400 },
        );
      }
      changes.is_hidden = payload.is_hidden;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'avatar_url')) {
      changes.avatar_url = asNullableString(payload.avatar_url);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'avatar_file_id')) {
      changes.avatar_file_id = asNullableString(payload.avatar_file_id);
    }

    if (!Object.keys(changes).length) {
      return NextResponse.json(
        { success: false, error: 'No editable fields provided.' },
        { status: 400 },
      );
    }

    const data = await graphqlRequest<UpdateReviewResponse>(UPDATE_REVIEW_BY_PK, {
      review_id: reviewId,
      changes,
    });

    const row = data.update_reviews_by_pk;
    if (!row) {
      throw new Error('Failed to update manual review.');
    }

    return NextResponse.json({
      success: true,
      data: normalizeReview(row),
    });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const reviewId = asTrimmedString(payload.review_id);

    if (!reviewId) {
      return NextResponse.json(
        { success: false, error: 'review_id required' },
        { status: 400 },
      );
    }

    const identity = await getReviewIdentity(reviewId);
    if (!identity?.review_id || identity.is_deleted === true) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 },
      );
    }

    if (asTrimmedString(identity.source).toLowerCase() !== 'manual') {
      return NextResponse.json(
        { success: false, error: 'Google reviews cannot be deleted.' },
        { status: 403 },
      );
    }

    const data = await graphqlRequest<UpdateReviewResponse>(UPDATE_REVIEW_BY_PK, {
      review_id: reviewId,
      changes: {
        is_deleted: true,
      },
    });

    if (!data.update_reviews_by_pk) {
      throw new Error('Failed to delete review.');
    }

    return NextResponse.json({ success: true });
  } catch (caughtError) {
    return NextResponse.json(
      {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : String(caughtError),
      },
      { status: 500 },
    );
  }
}
