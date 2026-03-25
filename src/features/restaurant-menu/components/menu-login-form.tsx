'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSignInEmailPassword } from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';
import { DEFAULT_AUTH_REDIRECT, getRoleDashboardRoute } from '@/lib/auth/routes';
import { getUserRole } from '@/lib/auth/get-user-role';
import { isNhostConfigured, nhost } from '@/lib/nhost';
import {
  buildCustomerAuthHref,
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  resolveCustomerRestaurantId,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

interface MenuLoginFormProps {
  restaurantId?: string | null;
  onAuthenticatedUser?: (customer: MenuCustomerProfile) => void;
  onRequestSignup?: () => void;
  onRequestForgotPassword?: () => void;
}

export function MenuLoginForm({
  restaurantId,
  onAuthenticatedUser,
  onRequestSignup,
  onRequestForgotPassword,
}: MenuLoginFormProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const resolvedRestaurantId = resolveCustomerRestaurantId(searchParams, restaurantId);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signInEmailPassword } = useSignInEmailPassword();

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
    setFormError(null);

    if (!resolvedRestaurantId) {
      if (!isNhostConfigured) {
        setFormError('Restaurant context is missing. Return to the menu and try again.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signInEmailPassword(email, password);

        if (result.error) {
          setFormError(result.error.message ?? 'Unable to sign in. Please try again.');
          return;
        }

        const signedInUser = result.session?.user || nhost.auth.getUser();
        const role = getUserRole(signedInUser || null);
        const destination = role && role !== 'user'
          ? getRoleDashboardRoute(role)
          : DEFAULT_AUTH_REDIRECT;

        router.replace(destination);
        router.refresh();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: MenuCustomerProfile }
        | null;

      if (!response.ok || !payload?.customer) {
        setFormError(payload?.error ?? 'Unable to sign in. Please try again.');
        return;
      }

      if (onAuthenticatedUser) {
        onAuthenticatedUser(payload.customer);
        return;
      }

      const destination =
        nextPath === pathname ? CUSTOMER_DEFAULT_AUTH_REDIRECT : nextPath;
      router.replace(destination);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  const signupHref = buildCustomerAuthHref(
    CUSTOMER_SIGNUP_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );
  const forgotPasswordHref = buildCustomerAuthHref(
    CUSTOMER_FORGOT_PASSWORD_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );

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
              className="auth-link-modern text-sm"
            >
              Forgot password?
            </button>
          ) : (
            <Link href={forgotPasswordHref} className="auth-link-modern text-sm">
              Forgot password?
            </Link>
          )}
        </div>

        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-primary-btn-modern w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-center text-sm text-slate-700 shadow-sm">
        <p>
          New here?{' '}
          {onRequestSignup ? (
            <button
              type="button"
              onClick={onRequestSignup}
              className="auth-link-modern"
            >
              Create an account
            </button>
          ) : (
            <Link href={signupHref} className="auth-link-modern">
              Create an account
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
