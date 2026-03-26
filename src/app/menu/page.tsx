import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { RestaurantMenuPage } from '@/features/restaurant-menu';
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

function MenuPageFallback() {
  return <div className="min-h-screen bg-stone-50" />;
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getRequestOrigin()}/menu`;
  try {
    const metadata = await loadRestaurantMenuMetadata(getRequestDomain());
    return {
      title: metadata.title,
      description: metadata.description,
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    console.error('[Menu Page] Error generating metadata:', error);
    return {
      title: 'Online Ordering',
      description: 'Order pickup or delivery online.',
      alternates: {
        canonical,
      },
    };
  }
}

export default async function MenuPageRoute() {
  try {
    const data = await loadRestaurantMenuPageData(getRequestDomain());
    return (
      <Suspense fallback={<MenuPageFallback />}>
        <RestaurantMenuPage data={data} />
      </Suspense>
    );
  } catch (error) {
    console.error('[Menu Page] Error building menu data:', error);
    return (
      <Suspense fallback={<MenuPageFallback />}>
        <RestaurantMenuPage data={getEmptyRestaurantMenuData()} />
      </Suspense>
    );
  }
}
