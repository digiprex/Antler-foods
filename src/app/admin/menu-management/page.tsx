/**
 * Menu Management Page
 *
 * Dashboard-integrated interface for managing restaurant menus.
 * Access: /admin/menu-management
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - List of all menus for the selected restaurant
 * - Create new menu functionality
 * - Edit existing menus
 * - Delete menus
 * - Menu categories and items management
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import MenuManagementForm from '@/components/admin/menu-management-form';

function MenuManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage menus for {restaurantName}
              </p>
            </div>
          </div>
          <MenuManagementForm
            restaurantId={restaurantId}
            restaurantName={restaurantName}
          />
        </>
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Select a Restaurant
            </h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to manage menus.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function MenuManagementPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuManagementContent />
    </Suspense>
  );
}
