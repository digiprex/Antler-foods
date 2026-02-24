'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function PageSettingsSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');

  const buildParams = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    return params.toString();
  };

  const paramsString = buildParams();

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Edit Page Settings</h1>
        <p className="text-gray-600 mb-6">Choose which settings you want to configure for this page.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            className="p-4 bg-white rounded-lg shadow hover:shadow-md text-left"
            onClick={() => router.push(`/admin/hero-settings?${paramsString}`)}
          >
            <div className="text-lg font-semibold">Hero Settings</div>
            <div className="text-sm text-gray-500 mt-1">Configure hero content and media for this page</div>
          </button>

          <button
            className="p-4 bg-white rounded-lg shadow hover:shadow-md text-left"
            onClick={() => router.push(`/admin/navbar-settings?${paramsString}`)}
          >
            <div className="text-lg font-semibold">Navbar Settings</div>
            <div className="text-sm text-gray-500 mt-1">Adjust navigation entries and visibility for this page</div>
          </button>

          <button
            className="p-4 bg-white rounded-lg shadow hover:shadow-md text-left"
            onClick={() => router.push(`/admin/footer-settings?${paramsString}`)}
          >
            <div className="text-lg font-semibold">Footer Settings</div>
            <div className="text-sm text-gray-500 mt-1">Manage footer links and visibility for this page</div>
          </button>
          
          <button
            className="p-4 bg-white rounded-lg shadow hover:shadow-md text-left"
            onClick={() => router.push(`/admin/faq-settings?${paramsString}`)}
          >
            <div className="text-lg font-semibold">FAQ Settings</div>
            <div className="text-sm text-gray-500 mt-1">Manage frequently asked questions for this page</div>
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
