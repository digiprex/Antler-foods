'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSignInEmailPassword } from '@nhost/react';
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

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;

function detectInputType(value: string): 'email' | 'phone' | 'unknown' {
  const trimmed = value.trim();
  if (!trimmed) return 'unknown';
  if (EMAIL_REGEX.test(trimmed)) return 'email';
  if (PHONE_REGEX.test(trimmed)) return 'phone';
  // If it contains @ it's likely an email being typed
  if (trimmed.includes('@')) return 'email';
  // If it starts with + or is mostly digits, treat as phone
  if (/^\+/.test(trimmed) || /^[0-9()\-\s]{3,}$/.test(trimmed)) return 'phone';
  return 'unknown';
}

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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const { signInEmailPassword } = useSignInEmailPassword();

  const detectedType = detectInputType(identity);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldError(null);

    const trimmedIdentity = identity.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentity) {
      setFieldError('Email or phone number is required.');
      return;
    }

    if (!trimmedPassword) {
      setFormError('Password is required.');
      return;
    }

    const type = detectInputType(trimmedIdentity);

    if (type === 'unknown') {
      setFieldError('Enter a valid email address or phone number.');
      return;
    }

    // Nhost admin/owner login (email only, no restaurantId)
    if (!resolvedRestaurantId && type === 'email') {
      if (!isNhostConfigured) {
        setFormError('Restaurant context is missing. Return to the menu and try again.');
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await signInEmailPassword(trimmedIdentity, trimmedPassword);

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

    if (!resolvedRestaurantId) {
      setFormError('Restaurant context is missing. Return to the menu and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, string> = {
        restaurantId: resolvedRestaurantId,
        password: trimmedPassword,
      };

      if (type === 'email') {
        body.email = trimmedIdentity;
      } else {
        body.phone = trimmedIdentity;
      }

      const response = await fetch('/api/menu-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
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
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-identity" className="block text-sm font-semibold tracking-[-0.01em] text-slate-700">
              Email or phone number
            </label>
            <input
              id="login-identity"
              type="text"
              value={identity}
              onChange={(e) => { setIdentity(e.target.value); setFieldError(null); setFormError(null); }}
              placeholder="Enter your email or phone number"
              autoComplete="username"
              className={`menu-auth-input w-full ${fieldError ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
            />
            {fieldError ? (
              <p className="text-xs font-semibold text-red-600">{fieldError}</p>
            ) : identity.trim() && detectedType === 'phone' ? (
              <p className="text-xs text-slate-400">
                Signing in with phone number — include your country code (e.g. +1, +44, +91)
              </p>
            ) : identity.trim() && detectedType === 'email' ? (
              <p className="text-xs text-slate-400">
                Signing in with email
              </p>
            ) : null}
          </div>
          <MenuAuthInput
            type="password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
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
