'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';
import {
  buildCustomerAuthHref,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';

interface MenuSignupFormProps {
  restaurantId?: string | null;
  onRequestLogin?: () => void;
}

const SIGNUP_SUCCESS_REDIRECT_DELAY_MS = 1500;

export function MenuSignupForm({
  restaurantId,
  onRequestLogin,
}: MenuSignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const resolvedRestaurantId = restaurantId || searchParams.get('restaurantId');
  const redirectTimeoutRef = useRef<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    reset,
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

  const loginHref = buildCustomerAuthHref(
    CUSTOMER_LOGIN_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);

    if (!resolvedRestaurantId) {
      setFormError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    if (redirectTimeoutRef.current) {
      window.clearTimeout(redirectTimeoutRef.current);
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null;

      if (!response.ok || !payload?.message) {
        setFormError(payload?.error ?? 'Unable to create account.');
        return;
      }

      const confirmationText = payload.message;
      reset();
      setSuccessMessage(`${confirmationText} Redirecting you to sign in...`);
      toast.success('Account created successfully. Please sign in.');

      redirectTimeoutRef.current = window.setTimeout(() => {
        if (onRequestLogin) {
          onRequestLogin();
          return;
        }

        router.replace(loginHref);
        router.refresh();
      }, SIGNUP_SUCCESS_REDIRECT_DELAY_MS);
    } finally {
      setIsSubmitting(false);
    }
  });

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

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-xs leading-6 text-slate-600 shadow-sm">
          Password must be at least 8 characters and should include a mix of letters and numbers.
        </div>

        {formError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-900 shadow-sm">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          className="auth-primary-btn-modern w-full"
          disabled={isSubmitting || Boolean(successMessage)}
        >
          {isSubmitting
            ? 'Creating account...'
            : successMessage
              ? 'Account created'
              : 'Create Account'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-center text-sm text-slate-700 shadow-sm">
        <p>
          Already have an account?{' '}
          {onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="auth-link-modern"
            >
              Sign in
            </button>
          ) : (
            <Link href={loginHref} className="auth-link-modern">
              Sign in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
