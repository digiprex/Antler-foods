/**
 * Page Form Page
 *
 * Dashboard-integrated interface for creating and editing pages.
 * Access: /admin/pages-form
 *
 * Features:
 * - Create new pages
 * - Edit existing pages
 * - Form validation
 * - SEO metadata management
 * - Visibility controls
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PageForm } from '@/components/admin/page-form';

function PageFormContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Restaurant:</span>
              <span className="font-medium text-gray-900">{restaurantName}</span>
            </div>
          </div>
          <PageForm
            pageId={pageId || undefined}
            restaurantId={restaurantId}
          />
        </div>
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

export default function PageFormPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageFormContent />
    </Suspense>
  );
}
