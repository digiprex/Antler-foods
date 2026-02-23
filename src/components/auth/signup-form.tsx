'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAuthenticationStatus,
  useSignUpEmailPassword,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import {
  DEFAULT_AUTH_REDIRECT,
  LOGIN_ROUTE,
  getRoleDashboardRoute,
} from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { getUserRole } from '@/lib/auth/get-user-role';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';

export function SignupForm() {
  const router = useRouter();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const user = useUserData();
  const { signUpEmailPassword, isLoading, error, needsEmailVerification } =
    useSignUpEmailPassword();

  useEffect(() => {
    if (!isStatusLoading && isAuthenticated && user) {
      router.replace(getRoleDashboardRoute(getUserRole(user)));
    }
  }, [isAuthenticated, isStatusLoading, router, user]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

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

    const displayName = `${values.firstName} ${values.lastName}`.trim();
    const result = await signUpEmailPassword(values.email, values.password, {
      displayName,
      metadata: {
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phone,
        role: 'client',
      },
    });

    if (result.error) {
      setFormError(result.error.message ?? 'Unable to create account.');
      return;
    }

    const verificationHint = needsEmailVerification
      ? 'Please verify your email from inbox if required.'
      : 'Redirecting to dashboard...';
    setSuccessMessage(`Account created successfully. ${verificationHint}`);

    const nextRoute = getRoleDashboardRoute(getUserRole(result.user));
    redirectTimer.current = setTimeout(() => {
      router.replace(nextRoute || DEFAULT_AUTH_REDIRECT);
    }, 700);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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

      {formError || error ? (
        <p className="rounded-lg border border-[#f4c7c7] bg-[#fff2f2] px-3.5 py-2.5 text-xs text-[#a93737]">
          {formError ?? error?.message}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-[#bfdeb8] bg-[#f1fbef] px-3.5 py-2.5 text-xs text-[#2f7f44]">
          {successMessage}
        </p>
      ) : null}

      <button
        type="submit"
        className="auth-primary-btn w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Sign up'}
      </button>

      <p className="pt-1 text-center text-sm text-[#5f6b73]">
        Already have an account?{' '}
        <Link href={LOGIN_ROUTE} className="auth-link font-semibold">
          Login
        </Link>
      </p>
    </form>
  );
}
