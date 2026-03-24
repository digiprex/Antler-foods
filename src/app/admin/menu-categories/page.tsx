/**
 * Menu Categories Management Page
 *
 * Dashboard-integrated interface for managing menu categories.
 * Access: /admin/menu-categories
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant and menu selection requirement
 * - List of all categories for the selected menu
 * - Create new category functionality
 * - Edit existing categories
 * - Delete categories
 * - Manage category items
 * - Drag and drop reordering
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load
const MenuCategoriesForm = dynamic(
  () => import('@/components/admin/menu-categories-form'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading categories...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

function MenuCategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;
  const menuId = searchParams?.get('menu_id') || null;
  const menuName = searchParams?.get('menu_name') || null;

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    router.push(`/admin/menu-management?${params.toString()}`);
  };

  return (
    <DashboardLayout>
      {restaurantId && restaurantName && menuId && menuName ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Menu Categories</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage categories for "{menuName}" menu in {restaurantName}
              </p>
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Menu Management
            </button>
          </div>
          <MenuCategoriesForm
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            menuId={menuId}
            menuName={menuName}
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Missing Information
            </h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a restaurant and menu to manage categories.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function MenuCategoriesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuCategoriesContent />
    </Suspense>
  );
}