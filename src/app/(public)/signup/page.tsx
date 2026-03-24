import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuSignupForm } from '@/features/restaurant-menu/components/menu-signup-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata(
  getPageSEO('signup', {
    title: 'Sign Up - Online Ordering',
    description: 'Create your account for faster online ordering and checkout.',
  }),
);

export default function SignupPage() {
  return (
    <MenuAuthLayout
      title="Create your account"
      subtitle="Save your details, speed up checkout, and keep ordering simple."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-700">Loading sign up...</p>}
      >
        <MenuSignupForm />
      </Suspense>
    </MenuAuthLayout>
  );
}