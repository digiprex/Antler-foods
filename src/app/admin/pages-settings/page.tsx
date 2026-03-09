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

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import PagesListPage from '@/components/admin/pages-list';

export default function PagesSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  );
}