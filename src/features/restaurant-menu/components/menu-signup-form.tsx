'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

interface MenuSignupFormProps {
  restaurantId?: string | null;
  onAuthenticatedUser?: (customer: MenuCustomerProfile) => void;
  onRequestLogin?: () => void;
}

export function MenuSignupForm({
  restaurantId,
  onAuthenticatedUser,
  onRequestLogin,
}: MenuSignupFormProps) {
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
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    if (!resolvedRestaurantId) {
      setFormError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: MenuCustomerProfile }
        | null;

      if (!response.ok || !payload?.customer) {
        setFormError(payload?.error ?? 'Unable to create account.');
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

  const loginHref = buildCustomerAuthHref(
    CUSTOMER_LOGIN_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <MenuAuthInput
            type="text"
            label="First name"
            placeholder="Enter your first name"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <MenuAuthInput
            type="text"
            label="Last name"
            placeholder="Enter your last name"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <MenuAuthInput
          type="email"
          label="Email address"
          placeholder="Enter your email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <MenuAuthInput
          type="tel"
          label="Phone number"
          placeholder="Enter your phone number"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <MenuAuthInput
          type="password"
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <MenuAuthInput
          type="password"
          label="Confirm password"
          placeholder="Confirm your password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-xs leading-6 text-stone-600 shadow-sm">
          Password must be at least 8 characters and should include a mix of letters and numbers.
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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4 text-center text-sm text-stone-700 shadow-sm">
        <p>
          Already have an account?{' '}
          {onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="font-semibold text-stone-900 transition hover:text-stone-700"
            >
              Sign in
            </button>
          ) : (
            <Link href={loginHref} className="font-semibold text-stone-900 transition hover:text-stone-700">
              Sign in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
