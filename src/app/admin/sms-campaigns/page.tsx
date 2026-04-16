'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const SmsCampaignsForm = dynamic(() => import('@/components/admin/sms-campaigns-form'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-700">Loading SMS campaigns...</p>
      </div>
    </div>
  ),
  ssr: false,
});

function SmsCampaignsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;

  return (
    <>
      {restaurantId && restaurantName ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">SMS Campaigns</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage SMS campaigns and templates for {restaurantName}
            </p>
          </div>
          <SmsCampaignsForm restaurantId={restaurantId} restaurantName={restaurantName} />
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Missing Information</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a restaurant to manage SMS campaigns.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function SmsCampaignsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SmsCampaignsContent />
    </Suspense>
  );
}
