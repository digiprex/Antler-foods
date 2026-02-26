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

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import CustomCodeSettingsForm from '@/components/admin/custom-code-settings-form';

export default function CustomCodeSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName && pageId ? (
        <CustomCodeSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Page
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please select a page from the pages list to configure custom code.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
