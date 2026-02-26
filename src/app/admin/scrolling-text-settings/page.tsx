/**
 * Scrolling Text Settings Page
 *
 * Dashboard-integrated interface for configuring scrolling text settings per page.
 * Access: /admin/scrolling-text-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Page-specific configuration
 * - Enable/disable toggle
 * - Text content configuration
 * - Color customization (background and text)
 * - Scroll speed selection
 * - Live preview
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import ScrollingTextSettingsForm from '@/components/admin/scrolling-text-settings-form';

export default function ScrollingTextSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName && pageId ? (
        <ScrollingTextSettingsForm />
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">📜</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Page
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please select a page from the pages list to configure the scrolling text.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
