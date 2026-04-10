import { headers } from 'next/headers';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';
import { adminGraphqlRequest } from '@/lib/server/api-auth';
import FeedbackClient from './feedback-client';

export const dynamic = 'force-dynamic';

const GET_RESTAURANT_BASIC = `
  query GetRestaurantBasic($restaurant_id: uuid!) {
    restaurants_by_pk(restaurant_id: $restaurant_id) {
      restaurant_id
      name
      logo
    }
  }
`;

function getDomain() {
  const h = headers();
  return h.get('x-forwarded-host') || h.get('host') || 'localhost:1000';
}

export default async function FeedbackPage() {
  const domain = getDomain();
  let restaurantId: string | null = null;

  try {
    restaurantId = await resolveRestaurantIdByDomain(domain);
  } catch {
    /* silent */
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm">Restaurant not found.</p>
      </div>
    );
  }

  let restaurant: { restaurant_id: string; name: string; logo: string | null } | null = null;
  try {
    const data = await adminGraphqlRequest<any>(GET_RESTAURANT_BASIC, { restaurant_id: restaurantId });
    const r = data.restaurants_by_pk;
    if (r) {
      const rawLogo = typeof r.logo === 'string' ? r.logo.trim() : '';
      const logo = rawLogo
        ? rawLogo.startsWith('/') || rawLogo.startsWith('http') ? rawLogo : `/api/image-proxy?fileId=${encodeURIComponent(rawLogo)}`
        : null;
      restaurant = { restaurant_id: r.restaurant_id, name: r.name, logo };
    }
  } catch {
    /* silent */
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm">Restaurant not found.</p>
      </div>
    );
  }

  return (
    <FeedbackClient
      restaurantId={restaurant.restaurant_id}
      restaurantName={restaurant.name}
      restaurantLogo={restaurant.logo}
    />
  );
}
