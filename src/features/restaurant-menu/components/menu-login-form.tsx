'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSignInEmailPassword } from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  loginSchema,
  phoneLoginSchema,
  type LoginFormValues,
  type PhoneLoginFormValues,
} from '@/lib/validation/auth';
import { DEFAULT_AUTH_REDIRECT, getRoleDashboardRoute } from '@/lib/auth/routes';
import { getUserRole } from '@/lib/auth/get-user-role';
import { isNhostConfigured, nhost } from '@/lib/nhost';
import {
  buildCustomerAuthHref,
  CUSTOMER_DEFAULT_AUTH_REDIRECT,
  CUSTOMER_FORGOT_PASSWORD_ROUTE,
  CUSTOMER_SIGNUP_ROUTE,
  resolveCustomerRestaurantId,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';
import { MenuAuthInput } from '@/features/restaurant-menu/components/menu-auth-input';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

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

type LoginMode = 'email' | 'phone';

interface MenuLoginFormProps {
  restaurantId?: string | null;
  onAuthenticatedUser?: (customer: MenuCustomerProfile) => void;
  onRequestSignup?: () => void;
  onRequestForgotPassword?: () => void;
}

export function MenuLoginForm({
  restaurantId,
  onAuthenticatedUser,
  onRequestSignup,
  onRequestForgotPassword,
}: MenuLoginFormProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const resolvedRestaurantId = resolveCustomerRestaurantId(searchParams, restaurantId);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('email');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const { signInEmailPassword } = useSignInEmailPassword();

  const emailForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const phoneForm = useForm<PhoneLoginFormValues>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setFormError(null);
  };

  const handleEmailLogin = async ({ email, password }: LoginFormValues) => {
    setFormError(null);

    if (!resolvedRestaurantId) {
      if (!isNhostConfigured) {
        setFormError('Restaurant context is missing. Return to the menu and try again.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signInEmailPassword(email, password);

        if (result.error) {
          setFormError(result.error.message ?? 'Unable to sign in. Please try again.');
          return;
        }

        const signedInUser = nhost.auth.getUser();
        const role = getUserRole(signedInUser || null);
        const destination = role && role !== 'user'
          ? getRoleDashboardRoute(role)
          : DEFAULT_AUTH_REDIRECT;

        router.replace(destination);
        router.refresh();
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/menu-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          email,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: MenuCustomerProfile }
        | null;

      if (!response.ok || !payload?.customer) {
        setFormError(payload?.error ?? 'Unable to sign in. Please try again.');
        return;
      }

      if (onAuthenticatedUser) {
        onAuthenticatedUser(payload.customer);
        return;
      }

      const destination =
        nextPath === pathname ? CUSTOMER_DEFAULT_AUTH_REDIRECT : nextPath;
      router.replace(destination);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneLogin = async ({ phone, password }: PhoneLoginFormValues) => {
    setFormError(null);

    if (!resolvedRestaurantId) {
      setFormError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const fullPhone = `${phoneCountryCode}${phone.trim()}`;
      const response = await fetch('/api/menu-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          restaurantId: resolvedRestaurantId,
          phone: fullPhone,
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; customer?: MenuCustomerProfile }
        | null;

      if (!response.ok || !payload?.customer) {
        setFormError(payload?.error ?? 'Unable to sign in. Please try again.');
        return;
      }

      if (onAuthenticatedUser) {
        onAuthenticatedUser(payload.customer);
        return;
      }

      const destination =
        nextPath === pathname ? CUSTOMER_DEFAULT_AUTH_REDIRECT : nextPath;
      router.replace(destination);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const signupHref = buildCustomerAuthHref(
    CUSTOMER_SIGNUP_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );
  const forgotPasswordHref = buildCustomerAuthHref(
    CUSTOMER_FORGOT_PASSWORD_ROUTE,
    nextPath,
    resolvedRestaurantId,
  );

  return (
    <div className="space-y-6">
      <div className="flex rounded-2xl border border-slate-200 bg-slate-50/80 p-1 shadow-sm">
        <button
          type="button"
          onClick={() => switchMode('email')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            loginMode === 'email'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => switchMode('phone')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            loginMode === 'phone'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Phone
        </button>
      </div>

      {loginMode === 'email' ? (
        <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-5" noValidate>
          <div className="space-y-4">
            <MenuAuthInput
              type="email"
              label="Email address"
              placeholder="Enter your email"
              autoComplete="email"
              error={emailForm.formState.errors.email?.message}
              {...emailForm.register('email')}
            />
            <MenuAuthInput
              type="password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={emailForm.formState.errors.password?.message}
              {...emailForm.register('password')}
            />
          </div>

          <div className="flex justify-end">
            {onRequestForgotPassword ? (
              <button
                type="button"
                onClick={onRequestForgotPassword}
                className="menu-auth-link text-sm"
              >
                Forgot password?
              </button>
            ) : (
              <Link href={forgotPasswordHref} className="menu-auth-link text-sm">
                Forgot password?
              </Link>
            )}
          </div>

          {formError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            className="menu-auth-primary-btn w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneLogin)} className="space-y-5" noValidate>
          <div className="space-y-4">
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
                  className={`menu-auth-input flex-1 ${phoneForm.formState.errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  {...phoneForm.register('phone')}
                />
              </div>
              {phoneForm.formState.errors.phone?.message ? (
                <p className="text-xs font-semibold text-red-600">
                  {phoneForm.formState.errors.phone.message}
                </p>
              ) : null}
            </div>
            <MenuAuthInput
              type="password"
              label="Password"
              placeholder="Enter your password"
              autoComplete="current-password"
              error={phoneForm.formState.errors.password?.message}
              {...phoneForm.register('password')}
            />
          </div>

          <div className="flex justify-end">
            {onRequestForgotPassword ? (
              <button
                type="button"
                onClick={onRequestForgotPassword}
                className="menu-auth-link text-sm"
              >
                Forgot password?
              </button>
            ) : (
              <Link href={forgotPasswordHref} className="menu-auth-link text-sm">
                Forgot password?
              </Link>
            )}
          </div>

          {formError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900 shadow-sm">
              {formError}
            </div>
          ) : null}

          <button
            type="submit"
            className="menu-auth-primary-btn w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-center text-sm text-slate-700 shadow-sm">
        <p>
          New here?{' '}
          {onRequestSignup ? (
            <button
              type="button"
              onClick={onRequestSignup}
              className="menu-auth-link"
            >
              Create an account
            </button>
          ) : (
            <Link href={signupHref} className="menu-auth-link">
              Create an account
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
