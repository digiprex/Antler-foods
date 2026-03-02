/**
 * Menu Settings Page
 *
 * Dashboard-integrated interface for configuring menu section settings.
 * Access: /admin/menu-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout selection (10 different layouts)
 * - Content configuration (title, subtitle, description)
 * - Menu categories and items management
 * - Button configuration (CTA)
 * - Media settings (images, background)
 * - Styling options (colors, spacing, alignment)
 * - Display options (prices, images, descriptions)
 * - Layout previews
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import MenuSettingsForm from '@/components/admin/menu-settings-form';
import styles from '@/components/admin/gallery-settings-form.module.css';

export default function MenuSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  const pageName = searchParams.get('page_name');
  const isNewSection = searchParams.get('new_section') === 'true';

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    if (pageName) params.set('page_name', pageName);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <div className={styles.container}>
          <div className={styles.singleLayout}>
            <div className={styles.formSection}>
              <button
                onClick={handleBack}
                className={`${styles.button} ${styles.secondaryButton} ${styles.backButton}`}
              >
                ← Back to Page Settings
              </button>
              <MenuSettingsForm pageId={pageId || undefined} isNewSection={isNewSection} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar to configure menu settings.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
