"use client";

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import PagesList from '@/components/admin/pages-list';

function AdminPagesContent() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <PagesList />
      </div>
    </DashboardLayout>
  );
}

export default function AdminPagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPagesContent />
    </Suspense>
  );
}
