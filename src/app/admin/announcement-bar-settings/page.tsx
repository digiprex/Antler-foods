/**
 * Announcement Bar Settings Page
 *
 * Dashboard-integrated interface for configuring announcement bar settings.
 * Access: /admin/announcement-bar-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Enable/disable toggle
 * - Text content configuration
 * - Contact information (address, phone)
 * - Social media icons management
 * - Layout and position selection
 * - Color customization
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import AnnouncementBarSettingsForm from '@/components/admin/announcement-bar-settings-form';

function AnnouncementBarSettingsContent() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <AnnouncementBarSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📢</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar to configure the announcement bar.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function AnnouncementBarSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnnouncementBarSettingsContent />
    </Suspense>
  );
}