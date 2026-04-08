import { redirect } from 'next/navigation';
import {
  buildRestaurantBankAccountsPath,
  parseRestaurantSlug,
} from '@/lib/restaurants/route-utils';

export default function DashboardRestaurantInformationBankAccountsRedirectPage({
  params,
  searchParams,
}: {
  params: { role: string; restaurant: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const parsed = parseRestaurantSlug(params.restaurant);
  if (!parsed.restaurantId) {
    redirect(`/dashboard/${params.role}/bank-accounts`);
  }

  const nextPath = buildRestaurantBankAccountsPath(
    params.role,
    {
      id: parsed.restaurantId,
      name: parsed.restaurantNameFromSlug,
    },
  );

  const url = new URL(nextPath, 'http://dashboard.local');
  const entries = Object.entries(searchParams ?? {});
  entries.forEach(([key, value]) => {
    if (key === 'restaurant_id' || key === 'restaurant_name') {
      return;
    }

    if (typeof value === 'string' && value.trim()) {
      url.searchParams.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value
        .filter((entry): entry is string => typeof entry === 'string' && Boolean(entry.trim()))
        .forEach((entry) => {
          url.searchParams.append(key, entry);
        });
    }
  });

  redirect(`${url.pathname}${url.search}${url.hash}`);
}
