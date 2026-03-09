'use client';

import dynamic from 'next/dynamic';

const MyInfoGoogleProfilePage = dynamic(
  () => import('@/components/dashboard/my-info/google-profile-page').then((mod) => ({ default: mod.MyInfoGoogleProfilePage })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading Google profile...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

export default function DashboardRestaurantInformationGoogleProfilePage() {
  return <MyInfoGoogleProfilePage />;
}
