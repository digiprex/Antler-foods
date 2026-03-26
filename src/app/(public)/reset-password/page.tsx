import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { CUSTOMER_RESET_PASSWORD_ROUTE } from '@/lib/auth/routes';
import { generateMetadata as generateSEOMetadata, getPageSEO } from '@/lib/seo';

interface ResetPasswordPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function readSearchParam(
  searchParams: ResetPasswordPageProps['searchParams'],
  key: string,
) {
  const value = searchParams?.[key];
  return typeof value === 'string' ? value : null;
}

export const metadata: Metadata = {
  ...generateSEOMetadata(
    getPageSEO('forgot-password', {
      title: 'Reset Password - Antler Foods',
      description: 'Set a new password for your Antler Foods admin or owner account.',
    }),
  ),
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const customerResetToken = readSearchParam(searchParams, 'token');

  if (customerResetToken) {
    const params = new URLSearchParams();

    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.set(key, value);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string') {
            params.append(key, item);
          }
        });
      }
    });

    const query = params.toString();
    redirect(query ? `${CUSTOMER_RESET_PASSWORD_ROUTE}?${query}` : CUSTOMER_RESET_PASSWORD_ROUTE);
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your admin or owner account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
