import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuForgotPasswordForm } from '@/features/restaurant-menu/components/menu-forgot-password-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';
import { resolveRestaurantIdForAuthRequest } from '@/lib/server/auth-route-context';

export async function generateMetadata(): Promise<Metadata> {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  return generateSEOMetadata(
    getPageSEO('forgot-password', isRestaurantDomain
      ? {
          title: 'Reset Password - Online Ordering',
          description: 'Reset your online ordering account password.',
        }
      : {
          title: 'Admin Reset Password - Antler Foods',
          description: 'Reset your Antler Foods staff account password.',
        }),
  );
}

export default async function ForgotPasswordPage() {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  if (isRestaurantDomain) {
    return (
      <MenuAuthLayout
        title="Reset your password"
        subtitle="Enter your email address and we will send you a reset link."
      >
        <Suspense
          fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm text-slate-700">Loading form...</p>}
        >
          <MenuForgotPasswordForm restaurantId={restaurantId} />
        </Suspense>
      </MenuAuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive a password reset link."
    >
      <Suspense
        fallback={<p className="rounded-lg bg-white px-4 py-3 text-sm">Loading form...</p>}
      >
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
