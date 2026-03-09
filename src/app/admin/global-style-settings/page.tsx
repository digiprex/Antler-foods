/**
 * Global Style Settings Page
 *
 * Dashboard-integrated interface for configuring global website styles.
 * Access: /admin/global-style-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Typography settings
 * - Color scheme configuration
 * - Button styling
 * - Spacing and layout controls
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import GlobalStyleSettingsForm from '@/components/admin/global-style-settings-form';

function GlobalStyleSettingsContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <GlobalStyleSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar to configure global styles.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function GlobalStyleSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GlobalStyleSettingsContent />
    </Suspense>
  );
}
