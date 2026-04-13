/**
 * Timeline Settings Page
 *
 * Dashboard-integrated interface for configuring timeline per page.
 * Access: /admin/timeline-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Page-specific configuration
 * - Enable/disable toggle
 * - Timeline items management
 * - Layout selection
 * - Color customization
 * - Live preview
 */

'use client';

import { Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load - form loads progressively
const TimelineSettingsForm = dynamic(
  () => import('@/components/admin/timeline-settings-form'),
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

function TimelineSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id');
  const restaurantName = searchParams?.get('restaurant_name');
  const pageId = searchParams?.get('page_id');

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
          <TimelineSettingsForm />
        </>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Page</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a page from the pages list to configure timeline settings.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function TimelineSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TimelineSettingsContent />
    </Suspense>
  );
}
