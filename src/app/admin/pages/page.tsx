"use client";

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import PagesList from '@/components/admin/pages-list';

export default function AdminPagesPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <PagesList />
      </div>
    </DashboardLayout>
  );
}
