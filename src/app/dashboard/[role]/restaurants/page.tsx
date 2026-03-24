'use client';

import dynamic from 'next/dynamic';
import { RestaurantsSkeleton } from '@/components/restaurants/restaurants-skeleton';

const RestaurantsListPage = dynamic(
  () => import('@/components/restaurants/restaurants-list-page').then((mod) => ({ default: mod.RestaurantsListPage })),
  {
    loading: () => <RestaurantsSkeleton />,
    ssr: false
  }
);

export default function DashboardRestaurantsPage() {
  return <RestaurantsListPage />;
}
