/**
 * Custom Code Settings Page
 *
 * Dashboard-integrated interface for configuring custom code per page.
 * Access: /admin/custom-code-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Page-specific configuration
 * - Enable/disable toggle
 * - Code type selection (HTML/CSS/JS or iframe)
 * - Code editors
 * - iframe URL and dimensions
 * - Live preview
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load - form loads progressively
const CustomCodeSettingsForm = dynamic(
  () => import('@/components/admin/custom-code-settings-form'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading form...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

function CustomCodeSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  return (
    <>
      {restaurantId && restaurantName && pageId ? (
        <>
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Page Settings
          </button>
          <CustomCodeSettingsForm />
        </>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Page</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a page from the pages list to configure custom code.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function CustomCodeSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomCodeSettingsContent />
    </Suspense>
  );
}
