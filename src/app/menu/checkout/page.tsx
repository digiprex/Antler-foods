import { Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import RestaurantMenuCheckoutPage from '@/features/restaurant-menu/components/checkout-page';
import { CartProvider } from '@/features/restaurant-menu/context/cart-context';
import {
  getEmptyRestaurantMenuData,
  loadRestaurantMenuMetadata,
  loadRestaurantMenuPageData,
} from '@/features/restaurant-menu/lib/server/menu-data';

export const dynamic = 'force-dynamic';

interface MenuCheckoutPageRouteProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

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

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function MenuCheckoutFallback() {
  return <div className="min-h-screen bg-white" />;
}

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getRequestOrigin()}/menu/checkout`;
  try {
    const metadata = await loadRestaurantMenuMetadata(getRequestDomain());
    return {
      title: `${metadata.title.replace(' | Online Ordering', '')} | Checkout`,
      description: metadata.description,
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    console.error('[Menu Checkout] Error generating metadata:', error);
    return {
      title: 'Checkout',
      description: 'Complete your online order.',
      alternates: {
        canonical,
      },
    };
  }
}

export default async function MenuCheckoutPageRoute({
  searchParams,
}: MenuCheckoutPageRouteProps) {
  try {
    const data = await loadRestaurantMenuPageData(getRequestDomain());

    return (
      <Suspense fallback={<MenuCheckoutFallback />}>
        <CartProvider>
          <RestaurantMenuCheckoutPage
            data={data}
            locationId={readSingleParam(searchParams?.locationId)}
            mode={readSingleParam(searchParams?.mode)}
            scheduleDayId={readSingleParam(searchParams?.dayId)}
            scheduleTime={readSingleParam(searchParams?.time)}
            deliveryAddress={readSingleParam(searchParams?.deliveryAddress)}
          />
        </CartProvider>
      </Suspense>
    );
  } catch (error) {
    console.error('[Menu Checkout] Error building checkout data:', error);

    return (
      <Suspense fallback={<MenuCheckoutFallback />}>
        <CartProvider>
          <RestaurantMenuCheckoutPage data={getEmptyRestaurantMenuData()} />
        </CartProvider>
      </Suspense>
    );
  }
}
