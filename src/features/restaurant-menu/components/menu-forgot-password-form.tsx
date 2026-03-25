'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerRestaurantId,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface MenuForgotPasswordFormProps {
  nextPath?: string | null;
  restaurantId?: string | null;
  onRequestLogin?: () => void;
}

export function MenuForgotPasswordForm({
  nextPath,
  restaurantId,
  onRequestLogin,
}: MenuForgotPasswordFormProps) {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const resolvedNextPath = resolveCustomerNextPath(nextPath ?? searchParams.get('next'));
  const resolvedRestaurantId = resolveCustomerRestaurantId(searchParams, restaurantId);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const loginHref = buildCustomerAuthHref(
    CUSTOMER_LOGIN_ROUTE,
    resolvedNextPath,
    resolvedRestaurantId,
  );

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    setSuccessMessage(null);

    if (!resolvedRestaurantId) {
      setFormError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          email,
          nextPath: resolvedNextPath,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !payload?.message) {
        setFormError(payload?.error ?? 'Unable to send reset instructions.');
        return;
      }

      reset();
      setSuccessMessage(payload.message);
    } finally {
      setIsSubmitting(false);
    }
  });

  const loginAction = onRequestLogin ? (
    <button
      type="button"
      onClick={onRequestLogin}
      className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20"
    >
      Return to Sign In
    </button>
  ) : (
    <Link
      href={loginHref}
      className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-violet-200 bg-white px-5 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/20"
    >
      Return to Sign In
    </Link>
  );

  if (successMessage) {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm leading-7 text-emerald-900 shadow-sm">
          {successMessage}
        </div>
        {loginAction}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <MenuAuthInput
          type="email"
          label="Email address"
          placeholder="Enter your email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-700">
          Enter the email address you used for this restaurant. If an account exists, we will send a one-time reset link.
        </div>

        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm">
            {formError}
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-primary-btn-modern w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
        </button>
      </form>

      {loginAction}
    </div>
  );
}
