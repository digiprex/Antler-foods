'use client';

import { Suspense, type ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50" />}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
