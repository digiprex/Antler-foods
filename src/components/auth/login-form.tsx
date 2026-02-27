'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAuthenticationStatus,
  useHasuraClaims,
  useSignInEmailPassword,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import {
  DEFAULT_AUTH_REDIRECT,
  getRoleDashboardRoute,
} from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth';

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const { signInEmailPassword, isLoading, error, needsEmailVerification } =
    useSignInEmailPassword();

  useEffect(() => {
    if (isStatusLoading || !isAuthenticated) {
      return;
    }

    const resolvedRole =
      roleFromClaims && roleFromClaims !== 'user'
        ? roleFromClaims
        : user
          ? getUserRole(user)
          : null;

    router.replace(
      resolvedRole
        ? getRoleDashboardRoute(resolvedRole)
        : DEFAULT_AUTH_REDIRECT
    );
  }, [
    isAuthenticated,
    isStatusLoading,
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
        result.error.message ?? 'Unable to log in. Please try again.',
      );
      return;
    }

    const signedInRole = getUserRole(result.user);
    router.replace(getRoleDashboardRoute(signedInRole) || DEFAULT_AUTH_REDIRECT);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-3">
        <AuthInput
          type="email"
          label="Email"
          placeholder="Enter Email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <AuthInput
          type="password"
          label="Password"
          placeholder="Enter Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      {formError || error ? (
        <p className="rounded-lg border border-[#f4c7c7] bg-[#fff5f5] px-3 py-2 text-[11px] font-medium leading-relaxed text-[#b33838]">
          {formError ?? error?.message}
        </p>
      ) : null}

      {needsEmailVerification ? (
        <p className="rounded-lg border border-[#c5dfc0] bg-[#f3fbf1] px-3 py-2 text-[11px] font-medium leading-relaxed text-[#2d7640]">
          Email verification is required before sign-in. Check your inbox.
        </p>
      ) : null}

      <button
        type="submit"
        className="auth-primary-btn w-full"
        disabled={isLoading}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      <div className="pt-0.5 text-center">
        <Link
          className="auth-link inline-flex text-[13px] font-medium"
          href="#"
        >
          Forgot Password
        </Link>
      </div>
    </form>
  );
}
