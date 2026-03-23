'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useResetPassword } from '@nhost/react';
import { isNhostConfigured } from '@/lib/nhost';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface MenuForgotPasswordFormProps {
  nextPath?: string | null;
  onRequestLogin?: () => void;
}

export function MenuForgotPasswordForm({ nextPath, onRequestLogin }: MenuForgotPasswordFormProps) {
  const resolvedNextPath = resolveCustomerNextPath(nextPath);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { resetPassword, isLoading, isSent, isError, error } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    setSuccessMessage(null);

    if (!isNhostConfigured) {
      setFormError(
        'Nhost is not configured. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local and restart the dev server.',
      );
      return;
    }

    const result = await resetPassword(email);

    if (result.error) {
      setFormError(
        result.error.message ?? 'Unable to send reset email. Please try again.',
      );
      return;
    }

    if (result.isSent) {
      setSuccessMessage('Password reset instructions have been sent to your email address.');
    }
  });

  const loginHref = buildCustomerAuthHref(CUSTOMER_LOGIN_ROUTE, resolvedNextPath);

  return (
    <div className="space-y-5">
      {successMessage || isSent ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-black/10 bg-stone-50 px-4 py-4 text-sm text-slate-900">
            {successMessage || 'Password reset instructions have been sent to your email address.'}
          </div>

          {onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            >
              Return to Sign In
            </button>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            >
              Return to Sign In
            </Link>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <MenuAuthInput
              type="email"
              label="Email address"
              placeholder="Enter your email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-xs leading-6 text-slate-600">
              Enter the email associated with your account and we will send you a reset link.
            </div>

            {formError || isError ? (
              <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-slate-900">
                {formError ?? error?.message}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:bg-stone-300"
              disabled={isLoading}
            >
              {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="text-center text-sm text-slate-700">
            {onRequestLogin ? (
              <button
                type="button"
                onClick={onRequestLogin}
                className="font-semibold text-black transition hover:text-slate-700"
              >
                Back to sign in
              </button>
            ) : (
              <Link href={loginHref} className="font-semibold text-black transition hover:text-slate-700">
                Back to sign in
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}