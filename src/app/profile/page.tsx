import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import CustomerProfilePage from '@/features/restaurant-menu/components/customer-profile-page';
import {
  getMenuCustomerSessionCookieName,
  readMenuCustomerSession,
} from '@/features/restaurant-menu/lib/server/customer-auth';
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
  const canonical = `${getRequestOrigin()}/profile`;
  try {
    const metadata = await loadRestaurantMenuMetadata(getRequestDomain());
    const titlePrefix = metadata.title.replace(' | Online Ordering', '');
    return {
      title: `${titlePrefix} | My Profile`,
      description: 'Manage your profile and account settings.',
      alternates: {
        canonical,
      },
    };
  } catch (error) {
    console.error('[Menu Profile] Error generating metadata:', error);
    return {
      title: 'My Profile',
      description: 'Manage your profile and account settings.',
      alternates: {
        canonical,
      },
    };
  }
}

export default async function MenuProfilePageRoute() {
  try {
    const data = await loadRestaurantMenuPageData(getRequestDomain());
    const cookieStore = cookies();
    const cookieValue = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
    const customerSession = await readMenuCustomerSession(
      cookieValue,
      data.restaurantId || undefined,
    );

    if (!customerSession) {
      redirect('/menu');
    }

    return (
      <CustomerProfilePage
        restaurantId={data.restaurantId}
        restaurantName={data.restaurant.name || 'Restaurant'}
      />
    );
  } catch (error) {
    console.error('[Menu Profile] Error loading menu context:', error);
    const fallbackData = getEmptyRestaurantMenuData();
    const cookieStore = cookies();
    const cookieValue = cookieStore.get(getMenuCustomerSessionCookieName())?.value;
    const customerSession = await readMenuCustomerSession(
      cookieValue,
      fallbackData.restaurantId || undefined,
    );

    if (!customerSession) {
      redirect('/menu');
    }

    return (
      <CustomerProfilePage
        restaurantId={fallbackData.restaurantId}
        restaurantName={fallbackData.restaurant.name || 'Restaurant'}
      />
    );
  }
}
