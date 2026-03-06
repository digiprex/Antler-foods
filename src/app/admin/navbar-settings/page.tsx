/**
 * Navbar Settings Page
 *
 * Dashboard-integrated interface for configuring navbar settings.
 * Access: /admin/navbar-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout/Type selection
 * - Position control
 * - Color customization
 * - Order online button toggle
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import NavbarSettingsForm from '@/components/admin/navbar-settings-form';

export default function NavbarSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <NavbarSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Select a Restaurant
            </h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to configure navbar settings.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
