import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_LOYALTY_SETTINGS = `
  query GetLoyaltySettings($restaurant_id: uuid!) {
    loyalty_settings(where: { restaurant_id: { _eq: $restaurant_id } }, limit: 1) {
      id
      restaurant_id
      is_enabled
      points_per_dollar
      redemption_rate
      min_redemption_points
      max_redemption_percentage
      welcome_bonus_points
      points_expiry_days
      google_review_bonus_points
    }
  }
`;

const UPSERT_LOYALTY_SETTINGS = `
  mutation UpsertLoyaltySettings(
    $restaurant_id: uuid!,
    $is_enabled: Boolean!,
    $points_per_dollar: numeric!,
    $redemption_rate: Int!,
    $min_redemption_points: Int!,
    $max_redemption_percentage: numeric!,
    $welcome_bonus_points: Int!,
    $points_expiry_days: Int,
    $google_review_bonus_points: numeric!
  ) {
    insert_loyalty_settings_one(
      object: {
        restaurant_id: $restaurant_id
        is_enabled: $is_enabled
        points_per_dollar: $points_per_dollar
        redemption_rate: $redemption_rate
        min_redemption_points: $min_redemption_points
        max_redemption_percentage: $max_redemption_percentage
        welcome_bonus_points: $welcome_bonus_points
        points_expiry_days: $points_expiry_days
        google_review_bonus_points: $google_review_bonus_points
      }
      on_conflict: {
        constraint: loyalty_settings_restaurant_id_key
        update_columns: [
          is_enabled
          points_per_dollar
          redemption_rate
          min_redemption_points
          max_redemption_percentage
          welcome_bonus_points
          points_expiry_days
          google_review_bonus_points
        ]
      }
    ) {
      id
      restaurant_id
      is_enabled
      points_per_dollar
      redemption_rate
      min_redemption_points
      max_redemption_percentage
      welcome_bonus_points
      points_expiry_days
      google_review_bonus_points
    }
  }
`;

interface LoyaltySettingsRow {
  id?: string;
  restaurant_id?: string;
  is_enabled?: boolean;
  points_per_dollar?: number;
  redemption_rate?: number;
  min_redemption_points?: number;
  max_redemption_percentage?: number;
  welcome_bonus_points?: number;
  points_expiry_days?: number | null;
  google_review_bonus_points?: number;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInt(value: unknown, fallback: number) {
  return Math.round(toNumber(value, fallback));
}

/**
 * redemption_rate is stored as an integer in Hasura (basis points).
 * The API exposes it as a decimal (e.g. 0.01 = 100 bps).
 */
function bpsToRate(bps: number | undefined | null, fallback: number) {
  return typeof bps === 'number' ? bps / 10000 : fallback;
}

function rateToBps(rate: number) {
  return Math.round(rate * 10000);
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = new URL(request.url).searchParams.get('restaurant_id');
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const data = await adminGraphqlRequest<{
      loyalty_settings?: LoyaltySettingsRow[];
    }>(GET_LOYALTY_SETTINGS, { restaurant_id: restaurantId });

    const row = data.loyalty_settings?.[0];

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        is_enabled: row?.is_enabled ?? false,
        points_per_dollar: row?.points_per_dollar ?? 1,
        redemption_rate: bpsToRate(row?.redemption_rate, 0.01),
        min_redemption_points: row?.min_redemption_points ?? 100,
        max_redemption_percentage: row?.max_redemption_percentage ?? 50,
        welcome_bonus_points: row?.welcome_bonus_points ?? 0,
        points_expiry_days: row?.points_expiry_days ?? null,
        google_review_bonus_points: row?.google_review_bonus_points ?? 0,
      },
    });
  } catch (error) {
    console.error('[Loyalty Settings] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loyalty settings' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      restaurant_id?: string;
      is_enabled?: boolean;
      points_per_dollar?: number;
      redemption_rate?: number;
      min_redemption_points?: number;
      max_redemption_percentage?: number;
      welcome_bonus_points?: number;
      points_expiry_days?: number | null;
      google_review_bonus_points?: number;
    } | null;

    const restaurantId = body?.restaurant_id;
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const isEnabled = body?.is_enabled === true;
    const pointsPerDollar = Math.max(toNumber(body?.points_per_dollar, 1), 0);
    const redemptionRate = Math.max(toNumber(body?.redemption_rate, 0.01), 0);
    const minRedemptionPoints = Math.max(toInt(body?.min_redemption_points, 100), 0);
    const maxRedemptionPercentage = Math.min(
      Math.max(toNumber(body?.max_redemption_percentage, 50), 0),
      100,
    );
    const welcomeBonusPoints = Math.max(toInt(body?.welcome_bonus_points, 0), 0);
    const pointsExpiryDays =
      body?.points_expiry_days === null || body?.points_expiry_days === undefined
        ? null
        : Math.max(toInt(body.points_expiry_days, 0), 0) || null;
    const googleReviewBonusPoints = Math.max(toInt(body?.google_review_bonus_points, 0), 0);

    const data = await adminGraphqlRequest<{
      insert_loyalty_settings_one?: LoyaltySettingsRow;
    }>(UPSERT_LOYALTY_SETTINGS, {
      restaurant_id: restaurantId,
      is_enabled: isEnabled,
      points_per_dollar: pointsPerDollar,
      redemption_rate: rateToBps(redemptionRate),
      min_redemption_points: minRedemptionPoints,
      max_redemption_percentage: maxRedemptionPercentage,
      welcome_bonus_points: welcomeBonusPoints,
      points_expiry_days: pointsExpiryDays,
      google_review_bonus_points: googleReviewBonusPoints,
    });

    const row = data.insert_loyalty_settings_one;

    return NextResponse.json({
      success: true,
      data: {
        restaurant_id: restaurantId,
        is_enabled: row?.is_enabled ?? isEnabled,
        points_per_dollar: row?.points_per_dollar ?? pointsPerDollar,
        redemption_rate: bpsToRate(row?.redemption_rate, redemptionRate),
        min_redemption_points: row?.min_redemption_points ?? minRedemptionPoints,
        max_redemption_percentage: row?.max_redemption_percentage ?? maxRedemptionPercentage,
        welcome_bonus_points: row?.welcome_bonus_points ?? welcomeBonusPoints,
        points_expiry_days: row?.points_expiry_days ?? pointsExpiryDays,
        google_review_bonus_points: row?.google_review_bonus_points ?? googleReviewBonusPoints,
      },
    });
  } catch (error) {
    console.error('[Loyalty Settings] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save loyalty settings' },
      { status: 500 },
    );
  }
}
