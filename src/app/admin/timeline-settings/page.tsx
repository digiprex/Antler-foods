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

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import TimelineSettingsForm from '@/components/admin/timeline-settings-form';

export default function TimelineSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName && pageId ? (
        <TimelineSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant to continue.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
