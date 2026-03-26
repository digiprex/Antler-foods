import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { MenuAuthLayout } from '@/features/restaurant-menu/components/menu-auth-layout';
import { MenuResetPasswordForm } from '@/features/restaurant-menu/components/menu-reset-password-form';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';
import { resolveRestaurantIdForAuthRequest } from '@/lib/server/auth-route-context';

export async function generateMetadata(): Promise<Metadata> {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  return {
    ...generateSEOMetadata(
      getPageSEO('forgot-password', isRestaurantDomain
        ? {
            title: 'Set New Password - Online Ordering',
            description: 'Set a new password for your online ordering account.',
          }
        : {
            title: 'Reset Password - Antler Foods',
            description: 'Set a new password for your Antler Foods admin or owner account.',
          }),
    ),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ResetPasswordPage() {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  if (!isRestaurantDomain) {
    return (
      <AuthLayout
        title="Set a new password"
        subtitle="Choose a new password for your admin or owner account."
      >
        <ResetPasswordForm />
      </AuthLayout>
    );
  }

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
