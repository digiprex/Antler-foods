import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';
import { buildCustomerAuthRedirectPath } from '@/features/restaurant-menu/lib/customer-auth';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';
import { resolveRestaurantIdForAuthRequest } from '@/lib/server/auth-route-context';

interface SignupPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function readSearchParam(
  searchParams: SignupPageProps['searchParams'],
  key: string,
) {
  const value = searchParams?.[key];
  return typeof value === 'string' ? value : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  return generateSEOMetadata(
    getPageSEO('signup', isRestaurantDomain
      ? {
          title: 'Sign Up - Online Ordering',
          description: 'Create your account for faster online ordering and checkout.',
        }
      : {
          title: 'Admin Sign Up - Antler Foods',
          description: 'Create your Antler Foods staff account.',
        }),
  );
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const restaurantId = await resolveRestaurantIdForAuthRequest();
  const isRestaurantDomain = Boolean(restaurantId);

  if (isRestaurantDomain) {
    const nextPath = readSearchParam(searchParams, 'next');
    const requestedRestaurantId =
      readSearchParam(searchParams, 'restaurantId') ||
      readSearchParam(searchParams, 'restaurant_id') ||
      restaurantId;

    redirect(
      buildCustomerAuthRedirectPath('signup', nextPath, requestedRestaurantId),
    );
  }

  return (
    <AuthLayout
      title="Run your restaurant from anywhere"
      subtitle="Create your staff account to launch and manage operations."
    >
      <SignupForm />
    </AuthLayout>
  );
}
