'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const CampaignsForm = dynamic(() => import('@/components/admin/campaigns-form'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
        <p className="text-sm font-medium text-gray-700">Loading campaigns...</p>
      </div>
    </div>
  ),
  ssr: false,
});

function CampaignsContent() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || null;
  const restaurantName = searchParams?.get('restaurant_name') || null;

  return (
    <>
      {restaurantId && restaurantName ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage automated email templates for {restaurantName}
            </p>
          </div>
          <CampaignsForm restaurantId={restaurantId} restaurantName={restaurantName} />
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Missing Information</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a restaurant to manage campaigns.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CampaignsContent />
    </Suspense>
  );
}
