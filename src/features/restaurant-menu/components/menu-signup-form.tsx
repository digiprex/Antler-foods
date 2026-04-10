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
  resolveCustomerRestaurantId,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';
import { useAnalytics } from '@/lib/analytics';

const PHONE_COUNTRY_CODES = [
  { code: '+1', label: 'US/CA +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
  { code: '+33', label: 'FR +33' },
  { code: '+49', label: 'DE +49' },
  { code: '+81', label: 'JP +81' },
  { code: '+86', label: 'CN +86' },
  { code: '+52', label: 'MX +52' },
  { code: '+55', label: 'BR +55' },
  { code: '+34', label: 'ES +34' },
  { code: '+39', label: 'IT +39' },
  { code: '+82', label: 'KR +82' },
  { code: '+31', label: 'NL +31' },
  { code: '+46', label: 'SE +46' },
  { code: '+47', label: 'NO +47' },
  { code: '+41', label: 'CH +41' },
  { code: '+65', label: 'SG +65' },
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+234', label: 'NG +234' },
  { code: '+27', label: 'ZA +27' },
  { code: '+254', label: 'KE +254' },
  { code: '+63', label: 'PH +63' },
  { code: '+60', label: 'MY +60' },
  { code: '+66', label: 'TH +66' },
  { code: '+62', label: 'ID +62' },
  { code: '+64', label: 'NZ +64' },
  { code: '+353', label: 'IE +353' },
  { code: '+48', label: 'PL +48' },
];

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
  const { trackSignup } = useAnalytics();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const resolvedRestaurantId = resolveCustomerRestaurantId(searchParams, restaurantId);
  const redirectTimeoutRef = useRef<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');

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
          phone: `${phoneCountryCode}${values.phone.trim()}`,
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
      trackSignup({
        method: 'email',
        user_type: 'customer',
        restaurant_id: resolvedRestaurantId || undefined,
      });

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

        <div className="space-y-2">
          <label className="block text-sm font-semibold tracking-[-0.01em] text-slate-700">
            Phone number
          </label>
          <div className="flex gap-2">
            <select
              value={phoneCountryCode}
              onChange={(e) => setPhoneCountryCode(e.target.value)}
              className="menu-auth-input w-[120px] shrink-0"
            >
              {PHONE_COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="(555) 555-5555"
              autoComplete="tel-national"
              className={`menu-auth-input flex-1 ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              {...register('phone')}
            />
          </div>
          {errors.phone?.message ? (
            <p className="text-xs font-semibold text-red-600">{errors.phone.message}</p>
          ) : null}
        </div>

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
          className="menu-auth-primary-btn w-full"
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
              className="menu-auth-link"
            >
              Sign in
            </button>
          ) : (
            <Link href={loginHref} className="menu-auth-link">
              Sign in
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
