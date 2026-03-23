import type { Metadata } from 'next';
import { headers } from 'next/headers';
import RestaurantMenuCheckoutPage from '@/features/restaurant-menu/components/checkout-page';
import { CartProvider } from '@/features/restaurant-menu/context/cart-context';
import {
  getEmptyRestaurantMenuData,
  loadRestaurantMenuMetadata,
  loadRestaurantMenuPageData,
} from '@/features/restaurant-menu/lib/server/menu-data';

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

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const metadata = await loadRestaurantMenuMetadata(getRequestDomain());
    return {
      title: `${metadata.title.replace(' | Online Ordering', '')} | Checkout`,
      description: metadata.description,
    };
  } catch (error) {
    console.error('[Menu Checkout] Error generating metadata:', error);
    return {
      title: 'Checkout',
      description: 'Complete your online order.',
    };
  }
}

export default async function MenuCheckoutPageRoute({
  searchParams,
}: MenuCheckoutPageRouteProps) {
  try {
    const data = await loadRestaurantMenuPageData(getRequestDomain());

    return (
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
    );
  } catch (error) {
    console.error('[Menu Checkout] Error building checkout data:', error);

    return (
      <CartProvider>
        <RestaurantMenuCheckoutPage data={getEmptyRestaurantMenuData()} />
      </CartProvider>
    );
  }
}