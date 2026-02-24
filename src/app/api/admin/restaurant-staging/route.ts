import { NextResponse } from 'next/server';

const HASURA_URL = process.env.HASURA_GRAPHQL_URL || 'https://pycfacumenjefxtblime.hasura.us-east-1.nhost.run/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || "i;8zmVF8SvnMiX5gao@F'a6,uJ%WphsD";

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
    const response = await fetch(HASURA_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');

        if (!restaurantId) {
            return NextResponse.json({ success: false, error: 'restaurant_id required' }, { status: 400 });
        }

        const data = await graphqlRequest(GET_RESTAURANT_STAGING, { restaurant_id: restaurantId });

        const rest = data.restaurants_by_pk || null;
        if (!rest) {
            return NextResponse.json({ success: false, error: 'Restaurant not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: { staging_domain: rest.staging_domain || null } });
    } catch (err) {
        return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
