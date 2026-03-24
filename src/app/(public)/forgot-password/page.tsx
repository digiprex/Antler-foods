import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuForgotPasswordForm } from '@/features/restaurant-menu/components/menu-forgot-password-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata(
  getPageSEO('forgot-password', {
    title: 'Reset Password - Online Ordering',
    description: 'Reset your online ordering account password.',
  }),
);

export default function ForgotPasswordPage() {
  return (
    <MenuAuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we will send you a reset link."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-700">Loading form...</p>}
      >
        <MenuForgotPasswordForm />
      </Suspense>
    </MenuAuthLayout>
  );
}