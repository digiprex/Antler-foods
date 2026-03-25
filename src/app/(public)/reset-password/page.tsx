import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuResetPasswordForm } from '@/features/restaurant-menu/components/menu-reset-password-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = {
  ...generateSEOMetadata(
    getPageSEO('forgot-password', {
      title: 'Set New Password - Online Ordering',
      description: 'Set a new password for your online ordering account.',
    }),
  ),
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return (
    <MenuAuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your online ordering account."
    >
      <Suspense
        fallback={
          <div className="rounded-[24px] border border-stone-200 bg-white/95 px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
            Loading reset form...
          </div>
        }
      >
        <MenuResetPasswordForm />
      </Suspense>
    </MenuAuthLayout>
  );
}
