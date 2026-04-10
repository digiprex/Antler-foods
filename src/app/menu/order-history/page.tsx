import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import OrderHistoryPage from '@/features/restaurant-menu/components/order-history-page';
import { resolveRestaurantIdByDomain } from '@/lib/server/domain-resolver';
import { adminGraphqlRequest } from '@/lib/server/api-auth';

export const dynamic = 'force-dynamic';

function getRequestDomain() {
  const requestHeaders = headers();
  return (
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    'localhost:1000'
  );
}

function getRequestOrigin() {
  const requestHeaders = headers();
  const host = getRequestDomain();
  const protocol =
    requestHeaders.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

function OrderHistoryFallback() {
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_32%,#ffffff_74%)]" />;
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getRequestOrigin()}/menu/order-history`;
  try {
    const domain = getRequestDomain();
    const restaurantId = await resolveRestaurantIdByDomain(domain);

    if (!restaurantId) {
      return {
        title: 'Order History',
        description: 'View your order history.',
        alternates: { canonical },
      };
    }

    const restaurantData = await adminGraphqlRequest<{
      restaurants_by_pk: { name?: string } | null;
    }>(
      `query ($id: uuid!) { restaurants_by_pk(restaurant_id: $id) { name } }`,
      { id: restaurantId }
    );

    const restaurantName = restaurantData.restaurants_by_pk?.name || 'Restaurant';

    return {
      title: `Order History - ${restaurantName}`,
      description: `View your order history at ${restaurantName}`,
      alternates: { canonical },
    };
  } catch (error) {
    console.error('[Order History Page] Error generating metadata:', error);
    return {
      title: 'Order History',
      description: 'View your order history.',
      alternates: { canonical },
    };
  }
}

export default async function OrderHistoryRoute() {
  try {
    const domain = getRequestDomain();
    const restaurantId = await resolveRestaurantIdByDomain(domain);

    if (!restaurantId) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Restaurant Not Found</h1>
            <p className="mt-2 text-sm text-slate-600">Unable to locate restaurant information.</p>
          </div>
        </div>
      );
    }

    const restaurantData = await adminGraphqlRequest<{
      restaurants_by_pk: { name?: string } | null;
    }>(
      `query ($id: uuid!) { restaurants_by_pk(restaurant_id: $id) { name } }`,
      { id: restaurantId }
    );

    const restaurantName = restaurantData.restaurants_by_pk?.name || 'Restaurant';

    return (
      <Suspense fallback={<OrderHistoryFallback />}>
        <OrderHistoryPage
          restaurantId={restaurantId}
          restaurantName={restaurantName}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('[Order History Route] Error:', error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Error</h1>
          <p className="mt-2 text-sm text-slate-600">Unable to load order history.</p>
        </div>
      </div>
    );
  }
}
