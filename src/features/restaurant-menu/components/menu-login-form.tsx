'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
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
  const resolvedRestaurantId = restaurantId || searchParams.get('restaurantId');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setFormError('Restaurant context is missing. Return to the menu and try again.');
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
              className="text-sm font-semibold text-stone-600 transition hover:text-stone-900"
            >
              Forgot password?
            </button>
          ) : (
            <Link href={forgotPasswordHref} className="text-sm font-semibold text-stone-600 transition hover:text-stone-900">
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
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-stone-50 shadow-[0_18px_34px_rgba(28,25,23,0.18)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/20 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-center text-sm text-stone-700 shadow-sm">
        <p>
          New here?{' '}
          {onRequestSignup ? (
            <button
              type="button"
              onClick={onRequestSignup}
              className="font-semibold text-stone-900 transition hover:text-stone-700"
            >
              Create an account
            </button>
          ) : (
            <Link href={signupHref} className="font-semibold text-stone-900 transition hover:text-stone-700">
              Create an account
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
