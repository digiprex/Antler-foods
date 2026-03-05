'use client';

import { useSearchParams } from 'next/navigation';
import PagesListPage from '@/components/admin/pages-list';

export default function RoleWebsitePagesSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  if (!restaurantId || !restaurantName) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Select a Restaurant
          </h2>
          <p className="text-sm text-gray-600">
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
