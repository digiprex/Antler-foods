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

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import HeroSettingsForm from '@/components/admin/hero-settings-form';

export default function HeroSettingsPage() {
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

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <div>
          <div style={{ padding: '1.5rem 2rem 0' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1f2937',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              ← Back to Page Settings
            </button>
          </div>
          <HeroSettingsForm pageId={pageId || undefined} />
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