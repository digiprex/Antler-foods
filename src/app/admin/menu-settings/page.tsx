/**
 * Menu Settings Page
 *
 * Dashboard-integrated interface for configuring menu section settings.
 * Access: /admin/menu-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout selection (10 different layouts)
 * - Content configuration (title, subtitle, description)
 * - Menu categories and items management
 * - Button configuration (CTA)
 * - Media settings (images, background)
 * - Styling options (colors, spacing, alignment)
 * - Display options (prices, images, descriptions)
 * - Layout previews
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load - form loads progressively
const MenuSettingsForm = dynamic(
  () => import('@/components/admin/menu-settings-form-enhanced'),
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
import styles from '@/components/admin/gallery-settings-form.module.css';

function MenuSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;
  const pageId = searchParams?.get('page_id') || null;
  const pageName = searchParams?.get('page_name') || null;
  const templateId = searchParams?.get('template_id') || undefined;
  const isNewSection = searchParams?.get('new_section') === 'true';

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    if (pageName) params.set('page_name', pageName);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  return (
    <>
      {restaurantId && restaurantName ? (
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
          <MenuSettingsForm
            pageId={pageId || undefined}
            templateId={templateId}
            isNewSection={isNewSection}
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
              Please add or select a restaurant from the sidebar to configure menu settings.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function MenuSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuSettingsContent />
    </Suspense>
  );
}
