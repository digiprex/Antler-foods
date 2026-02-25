'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAuthenticationStatus,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import {
  LOGIN_ROUTE,
  getRoleDashboardRoute,
} from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { getUserRole } from '@/lib/auth/get-user-role';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const user = useUserData();

  useEffect(() => {
    if (!isStatusLoading && isAuthenticated && user) {
      router.replace(getRoleDashboardRoute(getUserRole(user)));
    }
  }, [isAuthenticated, isStatusLoading, router, user]);

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
    setSuccessMessage(null);

    if (!isNhostConfigured) {
      setFormError(
        'Nhost is not configured. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local and restart the dev server.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup-admin', {
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

      setSuccessMessage(
        'Account created. Please verify your email, then log in.',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {successMessage ? (
        <>
          <p className="rounded-lg border border-[#bfdeb8] bg-[#f1fbef] px-3.5 py-2.5 text-xs text-[#2f7f44]">
            {successMessage}
          </p>
          <p className="pt-1 text-center text-sm text-[#5f6b73]">
            Continue to{' '}
            <Link href={LOGIN_ROUTE} className="auth-link font-semibold">
              Login
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <AuthInput
              type="text"
              label="First name"
              placeholder="First Name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <AuthInput
              type="text"
              label="Last name"
              placeholder="Last Name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <div className="space-y-3.5">
            <AuthInput
              type="email"
              label="Email"
              placeholder="Enter Email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <AuthInput
              type="tel"
              label="Phone"
              placeholder="Enter Phone Number"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <AuthInput
              type="password"
              label="Password"
              placeholder="Enter Password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <AuthInput
              type="password"
              label="Confirm password"
              placeholder="Confirm Password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          {formError ? (
            <p className="rounded-lg border border-[#f4c7c7] bg-[#fff2f2] px-3.5 py-2.5 text-xs text-[#a93737]">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className="auth-primary-btn w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Sign up'}
          </button>

          <p className="pt-1 text-center text-sm text-[#5f6b73]">
            Already have an account?{' '}
            <Link href={LOGIN_ROUTE} className="auth-link font-semibold">
              Login
            </Link>
          </p>
        </>
      )}
    </form>
  );
}
