'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

const OrderSettingsForm = dynamic(
  () => import('@/components/admin/order-settings-form'),
  {
    loading: () => (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading order settings...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

function OrderSettingsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  return (
    <DashboardLayout>
      {restaurantId && restaurantName ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Order Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure checkout options for {restaurantName}
            </p>
          </div>
          <OrderSettingsForm
            restaurantId={restaurantId}
            restaurantName={restaurantName}
          />
        </>
      ) : (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-gray-900">Missing Information</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a restaurant from the sidebar to manage order settings.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function OrderSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderSettingsContent />
    </Suspense>
  );
}
