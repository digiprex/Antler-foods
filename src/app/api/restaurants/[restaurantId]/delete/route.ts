import { NextRequest, NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import { removeVercelDomain } from '@/lib/server/vercel-domains';

const GET_RESTAURANT_DOMAINS = `
  query GetRestaurantDomains($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      staging_domain
      custom_domain
    }
  }
`;

const SOFT_DELETE_RESTAURANT = `
  mutation SoftDeleteRestaurant($restaurant_id: uuid!) {
    update_restaurants_by_pk(
      pk_columns: { restaurant_id: $restaurant_id }
      _set: { is_deleted: true, updated_at: "now()" }
    ) {
      restaurant_id
      is_deleted
    }
  }
`;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> },
) {
  const { restaurantId } = await params;

  if (!restaurantId) {
    return NextResponse.json(
      { success: false, error: 'Restaurant ID is required' },
      { status: 400 },
    );
  }

  try {
    // Fetch domains before deleting
    const restaurantData = await adminGraphqlRequest<{
      restaurants_by_pk: {
        restaurant_id: string;
        staging_domain: string | null;
        custom_domain: string | null;
      } | null;
    }>(GET_RESTAURANT_DOMAINS, { restaurant_id: restaurantId });

    const restaurant = restaurantData.restaurants_by_pk;
    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 },
      );
    }

    // Soft delete the restaurant
    await adminGraphqlRequest(SOFT_DELETE_RESTAURANT, {
      restaurant_id: restaurantId,
    });

    // Remove domains from Vercel (best-effort, don't fail the delete if this errors)
    const domainResults: Array<{ domain: string; success: boolean; error?: string }> = [];

    const customDomain = restaurant.custom_domain?.trim();
    if (customDomain) {
      const result = await removeVercelDomain(customDomain);
      domainResults.push({ domain: customDomain, ...result });
    }

    const stagingDomain = restaurant.staging_domain?.trim();
    if (stagingDomain) {
      const result = await removeVercelDomain(stagingDomain);
      domainResults.push({ domain: stagingDomain, ...result });
    }

    return NextResponse.json({
      success: true,
      domainResults,
    });
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete restaurant',
      },
      { status: 500 },
    );
  }
}
