/**
 * Select Theme Page
 *
 * Dashboard-integrated interface for selecting website templates.
 * Access: /admin/select-theme
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Template gallery with placeholder templates
 * - Template selection and preview
 * - Continue to domain settings after selection
 *
 * TODO: Replace placeholder templates with database-driven templates
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load
const SelectThemeForm = dynamic(
  () => import('@/components/admin/select-theme-form'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading templates...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

function SelectThemeContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <SelectThemeForm />
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Restaurant</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a restaurant from the list to choose a website template.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function SelectThemePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectThemeContent />
    </Suspense>
  );
}
