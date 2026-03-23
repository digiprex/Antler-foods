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
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface MenuSignupFormProps {
  onAuthenticatedUser?: () => void;
  onRequestLogin?: () => void;
}

function wait(durationMs: number) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

export function MenuSignupForm({ onAuthenticatedUser, onRequestLogin }: MenuSignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, isLoading: isStatusLoading } = useAuthenticationStatus();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const { signInEmailPassword, isLoading: isSigningIn } = useSignInEmailPassword();

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

    if (!isNhostConfigured) {
      setFormError(
        'Nhost is not configured. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local and restart the dev server.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phone,
          password: values.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setFormError(payload?.error ?? 'Unable to create account.');
        return;
      }

      const retryDelays = [0, 300, 700, 1200];
      let autoSignInError: string | null = null;

      for (const delayMs of retryDelays) {
        if (delayMs > 0) {
          await wait(delayMs);
        }

        const signInResult = await signInEmailPassword(values.email, values.password);

        if (!signInResult.error) {
          autoSignInError = null;
          break;
        }

        autoSignInError = signInResult.error.message ?? 'Automatic sign-in failed.';
      }

      if (autoSignInError) {
        setFormError('Account created, but automatic sign-in could not be completed. Please sign in once.');
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  const loginHref = buildCustomerAuthHref(CUSTOMER_LOGIN_ROUTE, nextPath);
  const isBusy = isSubmitting || isSigningIn;

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

        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-xs leading-6 text-slate-600">
          Password must be at least 8 characters and should include a mix of letters and numbers.
        </div>

        {formError ? (
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-slate-900">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={isBusy}
        >
          {isSigningIn ? 'Signing you in...' : isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-center text-sm text-slate-700">
        <p>
          Already have an account?{' '}
          {onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="font-semibold text-black transition hover:text-slate-700"
            >
              Sign in
            </button>
          ) : (
            <Link href={loginHref} className="font-semibold text-black transition hover:text-slate-700">
              Sign in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}