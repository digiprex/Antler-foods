'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useAuthenticationStatus,
  useHasuraClaims,
  useSignInEmailPassword,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import { getRoleDashboardRoute } from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface MenuLoginFormProps {
  onAuthenticatedUser?: () => void;
  onRequestSignup?: () => void;
  onRequestForgotPassword?: () => void;
}

export function MenuLoginForm({
  onAuthenticatedUser,
  onRequestSignup,
  onRequestForgotPassword,
}: MenuLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { isAuthenticated, isLoading: isStatusLoading } = useAuthenticationStatus();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const { signInEmailPassword, isLoading, error } = useSignInEmailPassword();

  useEffect(() => {
    if (isStatusLoading || !isAuthenticated) {
      return;
    }

    const resolvedRole = roleFromClaims || (user ? getUserRole(user) : null);

    if (resolvedRole && resolvedRole !== 'user') {
      router.replace(getRoleDashboardRoute(resolvedRole));
      return;
    }

    if (onAuthenticatedUser) {
      onAuthenticatedUser();
      return;
    }

    router.replace(nextPath);
  }, [
    isAuthenticated,
    isStatusLoading,
    nextPath,
    onAuthenticatedUser,
    roleFromClaims,
    router,
    user,
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setHasSubmitted(true);
    setFormError(null);

    if (!isNhostConfigured) {
      setFormError(
        'Nhost is not configured. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local and restart the dev server.',
      );
      return;
    }

    const result = await signInEmailPassword(email, password);

    if (result.error) {
      setFormError(
        result.error.message ?? 'Unable to sign in. Please try again.',
      );
    }
  });

  const signupHref = buildCustomerAuthHref(CUSTOMER_SIGNUP_ROUTE, nextPath);
  const forgotPasswordHref = buildCustomerAuthHref(CUSTOMER_FORGOT_PASSWORD_ROUTE, nextPath);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-4">
          <MenuAuthInput
            type="email"
            label="Email address"
            placeholder="Enter your email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <MenuAuthInput
            type="password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="flex justify-end">
          {onRequestForgotPassword ? (
            <button
              type="button"
              onClick={onRequestForgotPassword}
              className="text-sm font-medium text-slate-700 transition hover:text-black"
            >
              Forgot password?
            </button>
          ) : (
            <Link href={forgotPasswordHref} className="text-sm font-medium text-slate-700 transition hover:text-black">
              Forgot password?
            </Link>
          )}
        </div>

        {formError || (hasSubmitted && error) ? (
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-slate-900">
            {formError ?? error?.message}
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-center text-sm text-slate-700">
        <p>
          New here?{' '}
          {onRequestSignup ? (
            <button
              type="button"
              onClick={onRequestSignup}
              className="font-semibold text-black transition hover:text-slate-700"
            >
              Create an account
            </button>
          ) : (
            <Link href={signupHref} className="font-semibold text-black transition hover:text-slate-700">
              Create an account
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}