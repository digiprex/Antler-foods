'use client';

import { useSearchParams } from 'next/navigation';
import PagesListPage from '@/components/admin/pages-list';

export default function RoleWebsitePagesSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  if (!restaurantId || !restaurantName) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#111827] mb-2">
            Select a Restaurant
          </h2>
          <p className="text-[#6b7280] max-w-md">
            Please add or select a restaurant from the sidebar to manage pages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PagesListPage />
    </div>
  );
}
