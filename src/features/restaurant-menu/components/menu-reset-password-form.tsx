'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerRestaurantId,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface ResetPasswordContext {
  email: string;
  restaurantId: string;
}

const RESET_SUCCESS_REDIRECT_DELAY_MS = 1600;
const PASSWORD_GUIDANCE = [
  '8+ characters',
  'One-time secure link',
  'Use a unique password',
];

export function MenuResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const fallbackRestaurantId = resolveCustomerRestaurantId(searchParams);
  const redirectTimeoutRef = useRef<number | null>(null);
  const [context, setContext] = useState<ResetPasswordContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const controller = new AbortController();

    async function loadContext() {
      setIsLoading(true);
      setLoadError(null);
      setContext(null);

      if (!token) {
        setLoadError('This reset link is invalid. Request a new password reset email.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/menu-auth/reset-password?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; email?: string; restaurantId?: string }
          | null;

        if (!response.ok || !payload?.email || !payload?.restaurantId) {
          setLoadError(payload?.error ?? 'Unable to verify this reset link.');
          return;
        }

        setContext({
          email: payload.email,
          restaurantId: payload.restaurantId,
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('[Menu Auth] Failed to verify reset token:', error);
        setLoadError('Unable to verify this reset link right now.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadContext();

    return () => {
      controller.abort();
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [token]);

  const resolvedRestaurantId = context?.restaurantId || fallbackRestaurantId;
  const loginHref = buildCustomerAuthHref(
    CUSTOMER_LOGIN_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );
  const forgotPasswordHref = buildCustomerAuthHref(
    CUSTOMER_FORGOT_PASSWORD_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );
  const postResetHref = nextPath || CUSTOMER_DEFAULT_AUTH_REDIRECT;

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    setSuccessMessage(null);

    if (!token) {
      setFormError('This reset link is invalid. Request a new password reset email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; restaurantId?: string }
        | null;

      if (!response.ok || !payload?.message) {
        setFormError(payload?.error ?? 'Unable to reset your password.');
        return;
      }

      reset();
      setSuccessMessage(payload.message);

      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }

      const destination = postResetHref;

      redirectTimeoutRef.current = window.setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, RESET_SUCCESS_REDIRECT_DELAY_MS);
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-[#211d1a] text-white shadow-sm">
            <SpinnerIcon />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Secure verification
            </p>
            <h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">
              Validating your reset link
            </h3>
            <p className="text-[13px] leading-5.5 text-slate-600">
              We are checking your one-time reset token. This only takes a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !context) {
    return (
      <div className="space-y-3.5">
        <div className="rounded-[20px] border border-red-200 bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] p-4 shadow-[0_10px_24px_rgba(239,68,68,0.06)]">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-red-100 text-red-700">
              <AlertIcon />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-500">
                Reset link issue
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-[-0.03em] text-red-950">
                This reset link is no longer available
              </h3>
              <p className="mt-1.5 text-[13px] leading-5.5 text-red-900/80">
                {loadError || 'This reset link is invalid. Request a new password reset email.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Link
            href={forgotPasswordHref}
            className="menu-auth-primary-btn w-full px-5 text-[13px] sm:w-auto"
          >
            Request new reset link
          </Link>
          <Link
            href={successMessage ? postResetHref : loginHref}
            className="menu-auth-secondary-btn h-10.5 w-full px-5 text-[13px] sm:w-auto"
          >
            {successMessage ? 'Continue to menu' : 'Return to Sign In'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-[#211d1a] text-white shadow-sm">
            <MailIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Verified account
              </p>
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-700">
                Secure
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-5.5 text-slate-600">
              Resetting the password for this email.
            </p>
            <div className="mt-2 truncate text-[13px] font-semibold tracking-[-0.01em] text-slate-950">
              {context.email}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="grid gap-2.5">
          <MenuAuthInput
            type="password"
            label="New password"
            placeholder="Enter your new password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <MenuAuthInput
            type="password"
            label="Confirm password"
            placeholder="Confirm your new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-slate-50/85 px-3.5 py-3">
          <div className="flex flex-wrap gap-2">
            {PASSWORD_GUIDANCE.map((tip) => (
              <span
                key={tip}
                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800"
              >
                {tip}
              </span>
            ))}
          </div>
        </div>

        {formError ? (
          <div className="rounded-[16px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] leading-5.5 text-red-900 shadow-sm">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] leading-5.5 text-emerald-900 shadow-sm">
            {successMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5 pt-0.5">
          <button
            type="submit"
            className="menu-auth-primary-btn w-full"
            disabled={isSubmitting || Boolean(successMessage)}
          >
            {isSubmitting
              ? 'Updating password...'
              : successMessage
                ? 'Password updated'
                : 'Update password'}
          </button>

          <Link
            href={loginHref}
            className="menu-auth-secondary-btn h-11.5 w-full px-5 text-[13px]"
          >
            Return to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6.5h16v11H4z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  );
}
