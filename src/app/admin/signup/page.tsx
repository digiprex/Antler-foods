import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

export const metadata: Metadata = generateSEOMetadata(
  getPageSEO('signup', {
    title: 'Admin Sign Up - Antler Foods',
    description: 'Create your Antler Foods staff account.',
  }),
);

export default function AdminSignupPage() {
  return (
    <AuthLayout
      title="Run your restaurant from anywhere"
      subtitle="Create your staff account to launch and manage operations."
    >
      <SignupForm />
    </AuthLayout>
  );
}