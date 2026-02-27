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

import { useRouter, useSearchParams } from 'next/navigation';
import TimelineSettingsForm from '@/components/admin/timeline-settings-form';

export default function TimelineSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  if (!restaurantId || !restaurantName || !pageId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md">
          <div className="text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280]">
              Please add or select a restaurant to continue.
            </p>
            <button
              onClick={handleBack}
              className="mt-6 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50">
          <h1 className="text-2xl font-bold">Timeline Settings</h1>
          <button
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TimelineSettingsForm />
        </div>
      </div>
    </div>
  );
}
