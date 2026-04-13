/**
 * Pages Settings Page
 *
 * Dashboard-integrated interface for managing website pages.
 * Access: /admin/pages-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Pages list with CRUD operations
 * - Page status management
 * - SEO metadata management
 * - Visibility controls (navbar/footer)
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';
import PagesListPage from '@/components/admin/pages-list';

function PagesSettingsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <>
      {restaurantId && restaurantName ? (
        <PagesListPage />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar to manage pages.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function PagesSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PagesSettingsContent />
    </Suspense>
  );
}
