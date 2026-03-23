import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import {
  ensureUmamiWebsiteForDomain,
  getUmamiAnalyticsForWebsite,
  getUmamiWebsiteMatchForDomains,
} from '@/lib/server/umami';

interface RestaurantByIdResponse {
  restaurants_by_pk: {
    restaurant_id: string;
    name: string;
    custom_domain: string | null;
    staging_domain: string | null;
    is_deleted: boolean | null;
  } | null;
}

const GET_RESTAURANT_DOMAINS = `
  query GetRestaurantDomains($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
      custom_domain
      staging_domain
      is_deleted
    }
  }
`;

type ResolvedRestaurantContext = {
  restaurant: NonNullable<RestaurantByIdResponse['restaurants_by_pk']>;
  candidateDomains: string[];
};

function getPeriodDays(raw: string | null) {
  const parsed = Number(raw || '30');
  return Number.isFinite(parsed) ? Math.max(1, Math.min(365, Math.floor(parsed))) : 30;
}

async function resolveRestaurantContext(restaurantId: string): Promise<ResolvedRestaurantContext> {
  const restaurantData = await adminGraphqlRequest<RestaurantByIdResponse>(
    GET_RESTAURANT_DOMAINS,
    { restaurant_id: restaurantId },
  );

  const restaurant = restaurantData.restaurants_by_pk;
  if (!restaurant || restaurant.is_deleted) {
    throw new Error('Restaurant not found');
  }

  const candidateDomains = [restaurant.custom_domain, restaurant.staging_domain]
    .map((value) => value?.trim() || '')
    .filter(Boolean);

  return { restaurant, candidateDomains };
}

async function getAnalyticsPayload(restaurantId: string, periodDays: number) {
  const { restaurant, candidateDomains } = await resolveRestaurantContext(restaurantId);

  if (candidateDomains.length === 0) {
    return {
      success: true,
      configured: false,
      reason: 'no-domain',
      analytics: null,
    };
  }

  const websiteMatch = await getUmamiWebsiteMatchForDomains(candidateDomains);

  if (!websiteMatch) {
    return {
      success: true,
      configured: false,
      reason: 'umami-site-missing',
      domain: candidateDomains[0] || null,
      analytics: null,
    };
  }

  const analytics = await getUmamiAnalyticsForWebsite(
    websiteMatch.websiteId,
    websiteMatch.domain,
    periodDays,
  );

  return {
    success: true,
    configured: true,
    restaurant: {
      id: restaurant.restaurant_id,
      name: restaurant.name,
    },
    domain: websiteMatch.domain,
    website_id: websiteMatch.websiteId,
    analytics,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id')?.trim() || '';
    const periodDays = getPeriodDays(searchParams.get('period_days'));

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const payload = await getAnalyticsPayload(restaurantId, periodDays);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch site analytics';
    if (message === 'Restaurant not found') {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    console.error('[Site Analytics API][GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      restaurant_id?: string;
      period_days?: number;
    };
    const restaurantId = body.restaurant_id?.trim() || '';
    const periodDays = Number.isFinite(body.period_days)
      ? Math.max(1, Math.min(365, Math.floor(Number(body.period_days))))
      : 30;

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'restaurant_id is required' },
        { status: 400 },
      );
    }

    const { restaurant, candidateDomains } = await resolveRestaurantContext(restaurantId);

    if (candidateDomains.length === 0) {
      return NextResponse.json({
        success: true,
        configured: false,
        reason: 'no-domain',
        analytics: null,
      });
    }

    const targetDomain = candidateDomains[0];
    const websiteId = await ensureUmamiWebsiteForDomain(targetDomain, restaurant.name || targetDomain);
    if (!websiteId) {
      return NextResponse.json({
        success: false,
        configured: false,
        reason: 'umami-site-create-failed',
        domain: targetDomain,
        error: 'Unable to create Umami site for domain',
        analytics: null,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      created: true,
      restaurant: {
        id: restaurant.restaurant_id,
        name: restaurant.name,
      },
      domain: targetDomain,
      website_id: websiteId,
      analytics: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize site analytics';
    if (message === 'Restaurant not found') {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    console.error('[Site Analytics API][POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
