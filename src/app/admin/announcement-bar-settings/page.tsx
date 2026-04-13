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
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AnnouncementBarSettingsForm from '@/components/admin/announcement-bar-settings-form';

function AnnouncementBarSettingsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const router = useRouter();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const [stagingDomainExists, setStagingDomainExists] = useState<boolean | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      checkStagingDomain();
    }
  }, [restaurantId]);

  const checkStagingDomain = async () => {
    if (!restaurantId) {
      setStagingDomainExists(null);
      return;
    }

    setCheckingDomain(true);
    try {
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(restaurantId)}`);
      if (!res.ok) {
        setStagingDomainExists(false);
        return;
      }
      
      const data = await res.json();
      if (!data.success || !data.data) {
        setStagingDomainExists(false);
        return;
      }

      const hasStagingDomain = Boolean(data.data.staging_domain?.trim());
      setStagingDomainExists(hasStagingDomain);
    } catch (err) {
      console.error('Error checking staging domain:', err);
      setStagingDomainExists(false);
    } finally {
      setCheckingDomain(false);
    }
  };

  // Show loading state while checking domain
  if (restaurantId && restaurantName && checkingDomain) {
    return (
      <>
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Checking site status...</p>
          </div>
        </div>
      </>
    );
  }

  // Show message when no staging domain exists
  if (restaurantId && restaurantName && stagingDomainExists === false) {
    return (
      <>
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Site Not Created
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              This restaurant doesn't have a website created yet. You need to create a site first before configuring announcement bar settings.
            </p>
            <button
              onClick={() => {
                // Navigate to restaurant list page
                const currentPath = window.location.pathname;
                const roleMatch = currentPath.match(/\/dashboard\/([^\/]+)/);
                const role = roleMatch ? roleMatch[1] : 'admin';
                router.push(`/dashboard/${role}/restaurants`);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Go to Restaurant List
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {restaurantId && restaurantName && stagingDomainExists === true ? (
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
    </>
  );
}

export default function AnnouncementBarSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnnouncementBarSettingsContent />
    </Suspense>
  );
}