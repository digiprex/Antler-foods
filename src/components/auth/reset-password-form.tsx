'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAuthenticationStatus,
  useChangePassword,
  useHasuraClaims,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import {
  FORGOT_PASSWORD_ROUTE,
  getRoleDashboardRoute,
  LOGIN_ROUTE,
} from '@/lib/auth/routes';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/auth';

const RESET_SUCCESS_REDIRECT_DELAY_MS = 1600;
const ROLE_RESOLUTION_WAIT_MS = 1200;
const PASSWORD_GUIDANCE = [
  'At least 8 characters',
  'Use a unique password',
  'Avoid reusing old passwords',
];

function isAllowedResetRole(role: string | null | undefined) {
  return role === 'admin' || role === 'owner' || role === 'client';
}

export function ResetPasswordForm() {
  const router = useRouter();
  const redirectTimeoutRef = useRef<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [roleWaitElapsed, setRoleWaitElapsed] = useState(false);
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const { changePassword, isLoading, isError, error } = useChangePassword();
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const roleFromUser = user ? getUserRole(user) : null;
  const resolvedRole = roleFromClaims ?? roleFromUser;
  const canResetPassword = isAllowedResetRole(resolvedRole);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || resolvedRole) {
      setRoleWaitElapsed(false);
      return;
    }

    const timeout = window.setTimeout(
      () => setRoleWaitElapsed(true),
      ROLE_RESOLUTION_WAIT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, resolvedRole]);

  useEffect(() => {
    if (!successMessage || !resolvedRole) {
      return;
    }

    if (redirectTimeoutRef.current) {
      window.clearTimeout(redirectTimeoutRef.current);
    }

    redirectTimeoutRef.current = window.setTimeout(() => {
      router.replace(getRoleDashboardRoute(resolvedRole));
      router.refresh();
    }, RESET_SUCCESS_REDIRECT_DELAY_MS);
  }, [resolvedRole, router, successMessage]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    setSuccessMessage(null);

    const result = await changePassword(password);

    if (result.error) {
      setFormError(
        result.error.message ?? 'Unable to update your password. Please try again.',
      );
      return;
    }

    reset();
    setSuccessMessage(
      'Password updated successfully. Redirecting you to your dashboard.',
    );
  });

  if (isStatusLoading || (isAuthenticated && !resolvedRole && !roleWaitElapsed)) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <svg className="mt-0.5 h-5 w-5 animate-spin text-violet-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-slate-900">Validating reset session</h4>
            <p className="mt-1 text-sm text-slate-600">
              We are verifying your password reset link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-red-800">Reset link unavailable</h4>
            <p className="mt-1 text-sm text-red-700">
              This reset link is invalid or has expired. Request a new password reset email.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={FORGOT_PASSWORD_ROUTE}
            className="auth-primary-btn-modern inline-flex w-full items-center justify-center"
          >
            Request New Link
          </Link>
          <Link
            href={LOGIN_ROUTE}
            className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!canResetPassword) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-amber-800">This reset page is restricted</h4>
            <p className="mt-1 text-sm text-amber-700">
              Password reset on this route is only available for admin and owner accounts.
            </p>
          </div>
        </div>

        <Link
          href={LOGIN_ROUTE}
          className="inline-flex w-full items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
          Staff account recovery
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Choose a new password for your admin or owner account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <AuthInput
          type="password"
          label="New Password"
          placeholder="Enter your new password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <AuthInput
          type="password"
          label="Confirm Password"
          placeholder="Confirm your new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="bg-slate-50 rounded-lg p-3">
          <h4 className="mb-2 text-xs font-medium text-slate-700">Password guidance:</h4>
          <ul className="space-y-1 text-xs text-slate-600">
            {PASSWORD_GUIDANCE.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-slate-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {formError || isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-red-800">Unable to update password</h4>
              <p className="mt-1 text-sm text-red-700">{formError ?? error?.message}</p>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800">Password updated</h4>
              <p className="mt-1 text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-primary-btn-modern w-full"
          disabled={isLoading || Boolean(successMessage)}
        >
          {isLoading
            ? 'Updating password...'
            : successMessage
              ? 'Password updated'
              : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
