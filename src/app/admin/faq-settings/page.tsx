/**
 * FAQ Settings Page
 *
 * Dashboard-integrated interface for configuring FAQ settings.
 * Access: /admin/faq-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - FAQ management (add, edit, delete)
 * - Category organization
 * - Order management
 * - Content customization
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import FAQSettingsForm from '@/components/admin/faq-settings-form';
import styles from '@/components/admin/gallery-settings-form.module.css';

export default function FAQSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

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
          <FAQSettingsForm pageId={pageId || undefined} restaurantId={restaurantId || undefined} />
        </>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Restaurant</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to configure FAQ settings.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
