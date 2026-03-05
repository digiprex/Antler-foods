'use client';

import { useEffect, useState } from 'react';
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
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
        result.error.message ?? 'Unable to log in. Please try again.',
      );
      return;
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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
          type="password"
          label="Password"
          placeholder="Enter Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      {formError || (hasSubmitted && error) ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
          {formError ?? error?.message}
        </p>
      ) : null}

      {needsEmailVerification ? (
        <p className="rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2.5 text-xs font-medium text-purple-700">
          Email verification is required before sign-in. Check your inbox.
        </p>
      ) : null}

      <button
        type="submit"
        className="auth-primary-btn w-full"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging in...
          </span>
        ) : (
          'Login'
        )}
      </button>
    </form>
  );
}
