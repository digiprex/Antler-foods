/**
 * Modifier Items Management Page
 *
 * Dashboard page for managing items inside a specific modifier group.
 * Access: /admin/modifier-items
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

const ModifierItemsForm = dynamic(
  () => import('@/components/admin/modifier-items-form'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading modifier items...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);

function ModifierItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modifierGroupId = searchParams?.get('modifier_group_id') || null;
  const modifierGroupName = searchParams?.get('modifier_group_name') || null;

  const handleBack = () => {
    router.push('/admin/modifier-groups');
  };

  return (
    <DashboardLayout>
      {modifierGroupId ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Modifier Items</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage items in "{modifierGroupName || 'Modifier Group'}"
              </p>
            </div>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Modifier Groups
            </button>
          </div>
          <ModifierItemsForm
            modifierGroupId={modifierGroupId}
            modifierGroupName={modifierGroupName || ''}
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Missing Information</h2>
            <p className="mx-auto max-w-md text-sm text-gray-600">
              Please select a modifier group to manage its items.
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ModifierItemsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModifierItemsContent />
    </Suspense>
  );
}

