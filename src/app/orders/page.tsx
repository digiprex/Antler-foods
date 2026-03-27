import type { Metadata } from 'next';
import { headers } from 'next/headers';
import OrderHistoryPage from '@/features/restaurant-menu/components/order-history-page';
import {
  getEmptyRestaurantMenuData,
  loadRestaurantMenuMetadata,
  loadRestaurantMenuPageData,
} from '@/features/restaurant-menu/lib/server/menu-data';

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

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getRequestOrigin()}/orders`;
  try {
    const metadata = await loadRestaurantMenuMetadata(getRequestDomain());
    const titlePrefix = metadata.title.replace(' | Online Ordering', '');
    return {
      title: `${titlePrefix} | Order History`,
      description: 'Review your recent orders and receipts.',
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    console.error('[Menu Orders] Error generating metadata:', error);
    return {
      title: 'Order History',
      description: 'Review your recent online orders.',
      alternates: {
        canonical,
      },
    };
  }
}

export default async function MenuOrdersPageRoute() {
  try {
    const data = await loadRestaurantMenuPageData(getRequestDomain());

    return (
      <OrderHistoryPage
        restaurantId={data.restaurantId}
        restaurantName={data.restaurant.name || 'Restaurant'}
      />
    );
  } catch (error) {
    console.error('[Menu Orders] Error loading menu context:', error);
    const fallbackData = getEmptyRestaurantMenuData();

    return (
      <OrderHistoryPage
        restaurantId={fallbackData.restaurantId}
        restaurantName={fallbackData.restaurant.name || 'Restaurant'}
      />
    );
  }
}
