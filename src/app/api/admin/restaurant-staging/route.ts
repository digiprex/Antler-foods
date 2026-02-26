import { NextResponse } from 'next/server';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

const GET_RESTAURANT_STAGING = `
    query GetRestaurantStaging($restaurant_id: uuid!) {
        restaurants_by_pk(restaurant_id: $restaurant_id) {
            restaurant_id
            name
            staging_domain
        }
    }
`;

async function graphqlRequest(query: string, variables?: any) {
    return adminGraphqlRequest(query, variables);
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
        }

        const data = await graphqlRequest(GET_RESTAURANT_STAGING, { restaurant_id: restaurantId });

        const rest = (data as any).restaurants_by_pk || null;
        if (!rest) {
            return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: { staging_domain: rest.staging_domain || null, name: rest.name || null } });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
