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
  FORGOT_PASSWORD_ROUTE,
  getRoleDashboardRoute,
  SIGNUP_ROUTE,
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
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-4">
          <AuthInput
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <AuthInput
            type="password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link
            href={FORGOT_PASSWORD_ROUTE}
            className="text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors hover:underline underline-offset-2"
          >
            Forgot password?
          </Link>
        </div>

        {/* Error Messages */}
        {formError || (hasSubmitted && error) ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">Authentication Error</h4>
              <p className="text-sm text-red-700 mt-1">
                {formError ?? error?.message}
              </p>
            </div>
          </div>
        ) : null}

        {/* Email Verification Notice */}
        {needsEmailVerification ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800">Email Verification Required</h4>
              <p className="text-sm text-amber-700 mt-1">
                Please check your inbox and verify your email before signing in.
              </p>
            </div>
          </div>
        ) : null}

        {/* Submit Button */}
        <button
          type="submit"
          className="auth-primary-btn-modern w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </span>
          )}
        </button>
      </form>

      {/* Divider */}
      {/* <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-4 text-slate-500 font-medium">New to our platform?</span>
        </div>
      </div> */}

      {/* Sign Up Link */}
      {/* <div className="text-center">
        <p className="text-sm text-slate-600">
          Create your account to get started{' '}
          <Link 
            href={SIGNUP_ROUTE} 
            className="font-semibold text-violet-600 hover:text-violet-700 transition-colors hover:underline underline-offset-2"
          >
            Sign up here
          </Link>
        </p>
      </div> */}
    </div>
  );
}
