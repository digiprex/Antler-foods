/**
 * Modifier Groups Management Page
 *
 * Dashboard-integrated interface for managing modifier groups and their items.
 * Access: /admin/modifier-groups
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - List of all modifier groups
 * - Create new modifier group functionality
 * - Edit existing modifier groups
 * - Delete modifier groups
 * - Manage modifier items within groups
 *
 * TODO: Add authentication before deploying to production
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for faster initial load
const ModifierGroupsForm = dynamic(
  () => import('../../../components/admin/modifier-groups-form'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading modifier groups...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

function ModifierGroupsContent() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modifier Groups</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage modifier groups and their items for menu customization
        </p>
      </div>
      <ModifierGroupsForm />
    </>
  );
}

export default function ModifierGroupsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ModifierGroupsContent />
    </Suspense>
  );
}
