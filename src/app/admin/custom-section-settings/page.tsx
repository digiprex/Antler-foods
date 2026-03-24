/**
 * Custom Section Settings Page
 *
 * Dashboard-integrated interface for configuring custom content sections.
 * Access: /admin/custom-section-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout selection (9 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import CustomSectionSettingsForm from '@/components/admin/custom-section-settings-form-simple';

function CustomSectionSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id');
  const restaurantName = searchParams?.get('restaurant_name');
  const pageId = searchParams?.get('page_id');
  const isNewSection = searchParams?.get('new_section') === 'true';
  const templateId = searchParams?.get('template_id') || null;

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  return (
    <DashboardLayout>
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
          <CustomSectionSettingsForm
            pageId={pageId || undefined}
            templateId={templateId}
            isNewSection={isNewSection}
          />
        </>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Restaurant</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to configure custom section settings.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function CustomSectionSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomSectionSettingsContent />
    </Suspense>
  );
}
