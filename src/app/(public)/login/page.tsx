import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuLoginForm } from '@/features/restaurant-menu/components/menu-login-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata(
  getPageSEO('login', {
    title: 'Sign In - Online Ordering',
    description: 'Sign in to continue your online ordering experience.',
  }),
);

export default function LoginPage() {
  return (
    <MenuAuthLayout
      title="Sign in to your account"
      subtitle="Continue with your saved details, checkout faster, and manage future orders."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-700">Loading sign in...</p>}
      >
        <MenuLoginForm />
      </Suspense>
    </MenuAuthLayout>
  );
}