import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';

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

const GET_REVIEW_BONUS_SETTINGS = `
  query GetReviewBonusSettings($restaurant_id: uuid!) {
    loyalty_settings(
      where: { restaurant_id: { _eq: $restaurant_id }, is_enabled: { _eq: true } }
      limit: 1
    ) {
      google_review_bonus_points
    }
  }
`;

const GET_LOYALTY_BALANCE_FOR_CREDIT = `
  query GetLoyaltyBalanceForCredit($customer_id: uuid!, $restaurant_id: uuid!) {
    loyalty_balances(
      where: { customer_id: { _eq: $customer_id }, restaurant_id: { _eq: $restaurant_id } }
      limit: 1
    ) {
      id
      points_balance
      lifetime_earned
      lifetime_redeemed
    }
  }
`;

const UPDATE_LOYALTY_BALANCE = `
  mutation UpdateLoyaltyBalance($id: uuid!, $changes: loyalty_balances_set_input!) {
    update_loyalty_balances_by_pk(pk_columns: { id: $id }, _set: $changes) {
      id
      points_balance
    }
  }
`;

const INSERT_LOYALTY_BALANCE = `
  mutation InsertLoyaltyBalance($object: loyalty_balances_insert_input!) {
    insert_loyalty_balances_one(object: $object) {
      id
      points_balance
    }
  }
`;

const INSERT_LOYALTY_TRANSACTION = `
  mutation InsertLoyaltyTransaction($object: loyalty_transactions_insert_input!) {
    insert_loyalty_transactions_one(object: $object) {
      id
    }
  }
`;

const COUNT_PREVIOUS_REVIEWS = `
  query CountPreviousReviews($customer_id: uuid!, $restaurant_id: uuid!, $exclude_review_id: uuid!) {
    reviews_aggregate(
      where: {
        customer_id: { _eq: $customer_id }
        restaurant_id: { _eq: $restaurant_id }
        review_id: { _neq: $exclude_review_id }
        is_deleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

async function creditReviewBonusPoints(
  restaurantId: string,
  customerId: string,
  reviewId: string,
): Promise<number> {
  try {
    // Skip if customer already received review bonus (has a previous review)
    const prevData = await adminGraphqlRequest<{
      reviews_aggregate?: { aggregate?: { count?: number } };
    }>(COUNT_PREVIOUS_REVIEWS, {
      customer_id: customerId,
      restaurant_id: restaurantId,
      exclude_review_id: reviewId,
    });
    const previousCount = prevData.reviews_aggregate?.aggregate?.count ?? 0;
    if (previousCount > 0) {
      console.log('[Review Bonus] Skipped — customer', customerId, 'already has', previousCount, 'previous review(s)');
      return 0;
    }

    const settingsData = await adminGraphqlRequest<{
      loyalty_settings?: Array<{ google_review_bonus_points?: number }>;
    }>(GET_REVIEW_BONUS_SETTINGS, { restaurant_id: restaurantId });

    const bonusPoints = settingsData.loyalty_settings?.[0]?.google_review_bonus_points;
    if (!bonusPoints || bonusPoints <= 0) return 0;

    const points = Math.round(bonusPoints);

    const balData = await adminGraphqlRequest<{
      loyalty_balances?: Array<{
        id?: string;
        points_balance?: number;
        lifetime_earned?: number;
        lifetime_redeemed?: number;
      }>;
    }>(GET_LOYALTY_BALANCE_FOR_CREDIT, {
      customer_id: customerId,
      restaurant_id: restaurantId,
    });

    const existing = balData.loyalty_balances?.[0];
    const currentBalance = typeof existing?.points_balance === 'number' ? existing.points_balance : 0;
    const currentLifetimeEarned = typeof existing?.lifetime_earned === 'number' ? existing.lifetime_earned : 0;
    const newBalance = currentBalance + points;
    const newLifetimeEarned = currentLifetimeEarned + points;

    if (existing?.id) {
      await adminGraphqlRequest(UPDATE_LOYALTY_BALANCE, {
        id: existing.id,
        changes: {
          points_balance: Math.max(newBalance, 0),
          lifetime_earned: newLifetimeEarned,
          lifetime_redeemed: typeof existing.lifetime_redeemed === 'number' ? existing.lifetime_redeemed : 0,
        },
      });
    } else {
      await adminGraphqlRequest(INSERT_LOYALTY_BALANCE, {
        object: {
          customer_id: customerId,
          restaurant_id: restaurantId,
          points_balance: Math.max(newBalance, 0),
          lifetime_earned: newLifetimeEarned,
          lifetime_redeemed: 0,
        },
      });
    }

    await adminGraphqlRequest(INSERT_LOYALTY_TRANSACTION, {
      object: {
        customer_id: customerId,
        restaurant_id: restaurantId,
        type: 'earned',
        points,
        balance_after: Math.max(newBalance, 0),
        description: 'Google review bonus',
      },
    });

    console.log('[Review Bonus] Credited', points, 'pts for review', reviewId, 'customer', customerId);
    return points;
  } catch (err) {
    console.error('[Review Bonus] Failed to credit points:', err);
    return 0;
  }
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function buildGoogleReviewUrl(gmbLink: string | null) {
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
    googleReviewUrl: buildGoogleReviewUrl(gmbLink),
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

    if (Number.isNaN(rawRating) || rawRating < 1 || rawRating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating must be between 1 and 5' },
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

    // Read customer session before insert so we can attach customer_id to the review
    const cookieValue = request.cookies.get(
      getMenuCustomerSessionCookieName(),
    )?.value;
    const customer = await readMenuCustomerSession(cookieValue, target.restaurantId);

    const reviewObject: Record<string, unknown> = {
      restaurant_id: target.restaurantId,
      source: 'manual',
      rating: rawRating,
      author_name: authorName,
      review_text: reviewText,
      avatar_url: avatarUrl,
      published_at: publishedAtIso,
      is_hidden: false,
      is_deleted: false,
    };

    if (customer?.customerId) {
      reviewObject.customer_id = customer.customerId;
    }

    const data = await adminGraphqlRequest<InsertReviewResponse>(
      INSERT_MANUAL_REVIEW,
      { object: reviewObject },
    );

    const reviewId = normalizeText(data.insert_reviews_one?.review_id);
    if (!reviewId) {
      throw new Error('Failed to save manual review.');
    }

    // Credit review bonus loyalty points if customer is logged in
    let bonusPointsAwarded = 0;
    if (customer?.customerId) {
      bonusPointsAwarded = await creditReviewBonusPoints(
        target.restaurantId,
        customer.customerId,
        reviewId,
      );
    }

    // For 4-5 star ratings, also return Google review URL so frontend can redirect
    const googleReviewUrl = rawRating >= 4 ? target.googleReviewUrl : null;

    return NextResponse.json({
      success: true,
      data: {
        review_id: reviewId,
        google_review_url: googleReviewUrl,
        bonus_points_awarded: bonusPointsAwarded,
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
