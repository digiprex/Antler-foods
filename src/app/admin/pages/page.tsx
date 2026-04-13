"use client";

import { Suspense } from 'react';
import PagesList from '@/components/admin/pages-list';

function AdminPagesContent() {
  return (
    <>
      <div className="p-6">
        <PagesList />
      </div>
    </>
  );
}

export default function AdminPagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminPagesContent />
    </Suspense>
  );
}
