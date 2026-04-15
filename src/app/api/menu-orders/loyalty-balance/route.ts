import { NextRequest, NextResponse } from 'next/server';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_LOYALTY_BALANCE = `
  query GetLoyaltyBalance($customer_id: uuid!, $restaurant_id: uuid!) {
    loyalty_balances(
      where: {
        customer_id: { _eq: $customer_id }
        restaurant_id: { _eq: $restaurant_id }
      }
      limit: 1
    ) {
      id
      points_balance
      lifetime_earned
      lifetime_redeemed
    }
    loyalty_settings(
      where: {
        restaurant_id: { _eq: $restaurant_id }
        is_enabled: { _eq: true }
      }
      limit: 1
    ) {
      is_enabled
      redemption_rate
      min_redemption_points
      max_redemption_percentage
      points_per_dollar
      google_review_bonus_points
    }
    reviews_aggregate(
      where: {
        customer_id: { _eq: $customer_id }
        restaurant_id: { _eq: $restaurant_id }
        is_deleted: { _neq: true }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export async function GET(request: NextRequest) {
  try {
    const restaurantId = new URL(request.url).searchParams.get('restaurant_id');
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const cookieValue = request.cookies.get(
      getMenuCustomerSessionCookieName(),
    )?.value;
    const customer = await readMenuCustomerSession(cookieValue, restaurantId);

    if (!customer) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          points_balance: 0,
          lifetime_earned: 0,
          lifetime_redeemed: 0,
          redemption_rate: 0,
          min_redemption_points: 0,
          max_redemption_percentage: 0,
          points_per_dollar: 0,
          google_review_bonus_points: 0,
          has_reviewed: false,
        },
      });
    }

    const data = await adminGraphqlRequest<{
      loyalty_balances?: Array<{
        id?: string;
        points_balance?: number;
        lifetime_earned?: number;
        lifetime_redeemed?: number;
      }>;
      loyalty_settings?: Array<{
        is_enabled?: boolean;
        redemption_rate?: number;
        min_redemption_points?: number;
        max_redemption_percentage?: number;
        points_per_dollar?: number;
        google_review_bonus_points?: number;
      }>;
      reviews_aggregate?: { aggregate?: { count?: number } };
    }>(GET_LOYALTY_BALANCE, {
      customer_id: customer.customerId,
      restaurant_id: restaurantId,
    });

    const settings = data.loyalty_settings?.[0];
    const balance = data.loyalty_balances?.[0];

    const hasReviewed = (data.reviews_aggregate?.aggregate?.count ?? 0) > 0;

    if (!settings?.is_enabled) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          points_balance: 0,
          lifetime_earned: 0,
          lifetime_redeemed: 0,
          redemption_rate: 0,
          min_redemption_points: 0,
          max_redemption_percentage: 0,
          points_per_dollar: 0,
          has_reviewed: hasReviewed,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: true,
        points_balance: balance?.points_balance ?? 0,
        lifetime_earned: balance?.lifetime_earned ?? 0,
        lifetime_redeemed: balance?.lifetime_redeemed ?? 0,
        redemption_rate: typeof settings.redemption_rate === 'number' ? settings.redemption_rate / 10000 : 0.01,
        min_redemption_points: settings.min_redemption_points ?? 100,
        max_redemption_percentage: settings.max_redemption_percentage ?? 50,
        points_per_dollar: settings.points_per_dollar ?? 1,
        google_review_bonus_points: settings.google_review_bonus_points ?? 0,
        has_reviewed: hasReviewed,
      },
    });
  } catch (error) {
    console.error('[Loyalty Balance] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loyalty balance' },
      { status: 500 },
    );
  }
}
