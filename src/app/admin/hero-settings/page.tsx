/**
 * Hero Settings Page
 *
 * Dashboard-integrated interface for configuring hero section settings.
 * Access: /admin/hero-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout selection (10 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Feature cards management
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import HeroSettingsForm from '@/components/admin/hero-settings-form';

export default function HeroSettingsPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <div>
          <div className="mb-6 rounded-xl border border-[#d8e3e8] bg-white px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#7c8a96]">
              Configuring hero section for
            </p>
            <p className="mt-1 text-lg font-semibold text-[#111827]">
              {restaurantName}
            </p>
          </div>
          <HeroSettingsForm />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}