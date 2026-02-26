/**
 * FAQ Settings Page
 *
 * Dashboard-integrated interface for configuring FAQ settings.
 * Access: /admin/faq-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - FAQ management (add, edit, delete)
 * - Category organization
 * - Order management
 * - Content customization
 * - Live preview
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import FAQSettingsForm from '@/components/admin/faq-settings-form';
import styles from '@/components/admin/gallery-settings-form.module.css';

export default function FAQSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

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
        <div className={styles.container}>
          <div className={styles.singleLayout}>
            <div className={styles.formSection}>
              <button
                onClick={handleBack}
                className={`${styles.button} ${styles.secondaryButton} ${styles.backButton}`}
              >
                ← Back to Page Settings
              </button>
              <FAQSettingsForm pageId={pageId || undefined} restaurantId={restaurantId || undefined} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">❓</div>
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
