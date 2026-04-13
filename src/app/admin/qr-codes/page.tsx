/**
 * QR Codes Page
 *
 * Dashboard-integrated interface for generating and managing QR codes.
 * Access: /admin/qr-codes
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Menu QR code generation
 * - Site page QR code generation
 * - Download functionality for QR codes
 * - Customizable QR code sizes
 * - Preview functionality
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCodesForm from '@/components/admin/qr-codes-form';

function QRCodesContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;
  const [restaurantData, setRestaurantData] = useState<{
    customDomain?: string;
    stagingDomain?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantData();
    }
  }, [restaurantId]);

  const fetchRestaurantData = async () => {
    if (!restaurantId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(restaurantId)}`);
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setRestaurantData({
            customDomain: data.data.custom_domain?.trim() || '',
            stagingDomain: data.data.staging_domain?.trim() || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  // Show loading state while fetching restaurant data
  if (restaurantId && restaurantName && isLoading) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Loading restaurant data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {restaurantId && restaurantName ? (
        <>
          <QRCodesForm
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            customDomain={restaurantData?.customDomain}
            stagingDomain={restaurantData?.stagingDomain}
          />
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Select a Restaurant
            </h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please add or select a restaurant from the sidebar to generate QR codes.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function QRCodesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QRCodesContent />
    </Suspense>
  );
}