import { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { buildCustomerAuthRedirectPath } from '@/features/restaurant-menu/lib/customer-auth';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';
import { resolveRestaurantIdForAuthRequest } from '@/lib/server/auth-route-context';

interface LoginPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function readSearchParam(
  searchParams: LoginPageProps['searchParams'],
  key: string,
) {
  const value = searchParams?.[key];
  return typeof value === 'string' ? value : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  return generateSEOMetadata(
    getPageSEO('login', isRestaurantDomain
      ? {
          title: 'Sign In - Online Ordering',
          description: 'Sign in to continue your online ordering experience.',
        }
      : {
          title: 'Admin Sign In - Antler Foods',
          description: 'Sign in to your Antler Foods staff account.',
        }),
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  if (isRestaurantDomain) {
    const nextPath = readSearchParam(searchParams, 'next');
    const requestedRestaurantId =
      readSearchParam(searchParams, 'restaurantId') ||
      readSearchParam(searchParams, 'restaurant_id') ||
      restaurantId;

    redirect(
      buildCustomerAuthRedirectPath('login', nextPath, requestedRestaurantId),
    );
  }

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
