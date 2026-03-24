import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata(
  getPageSEO('login', {
    title: 'Admin Sign In - Antler Foods',
    description: 'Sign in to your Antler Foods staff account.',
  }),
);

export default function AdminLoginPage() {
  return (
    <AuthLayout
      title="Run your restaurant from anywhere"
      subtitle="Login to your existing staff account."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm">Loading login form...</p>}
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}