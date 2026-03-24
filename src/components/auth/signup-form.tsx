'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useAuthenticationStatus,
  useUserData,
} from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import {
  LOGIN_ROUTE,
  getRoleDashboardRoute,
} from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { getUserRole } from '@/lib/auth/get-user-role';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth';
import { useAnalytics } from '@/lib/analytics';

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, isLoading: isStatusLoading } =
    useAuthenticationStatus();
  const user = useUserData();
  const { trackSignup } = useAnalytics();

  useEffect(() => {
    if (!isStatusLoading && isAuthenticated && user) {
      router.replace(getRoleDashboardRoute(getUserRole(user)));
    }
  }, [isAuthenticated, isStatusLoading, router, user]);

  const {
    register,
    handleSubmit,
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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccessMessage(null);

    if (!isNhostConfigured) {
      setFormError(
        'Nhost is not configured. Add NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION in .env.local and restart the dev server.',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/signup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phone,
          password: values.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; warning?: string }
        | null;

      if (!response.ok) {
        setFormError(payload?.error ?? 'Unable to create account.');
        return;
      }

      // Track successful signup
      trackSignup({
        method: 'email',
        user_type: 'restaurant_owner',
        source: 'signup_form',
      });

      setSuccessMessage(
        'Account created successfully! A verification email has been sent to your inbox.',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="space-y-5">
      {successMessage ? (
        <div className="text-center space-y-5">
          {/* Success Message */}
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-green-800">Account Created!</h4>
              <p className="text-sm text-green-700 mt-1">
                {successMessage}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">What's Next?</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">1</div>
                <span>Check your email inbox</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">2</div>
                <span>Click the verification link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">3</div>
                <span>Return to sign in</span>
              </div>
            </div>
          </div>

          {/* Continue to Login */}
          <Link 
            href={LOGIN_ROUTE} 
            className="auth-primary-btn-modern w-full inline-flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Continue to Sign In
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {/* Name Fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <AuthInput
                type="text"
                label="First Name"
                placeholder="Enter your first name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <AuthInput
                type="text"
                label="Last Name"
                placeholder="Enter your last name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            {/* Contact Fields */}
            <AuthInput
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            
            <AuthInput
              type="tel"
              label="Phone Number"
              placeholder="Enter your phone number"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />

            {/* Password Fields */}
            <AuthInput
              type="password"
              label="Password"
              placeholder="Create a strong password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            
            <AuthInput
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Password Requirements */}
            <div className="bg-slate-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-slate-700 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-slate-400" />
                  At least 8 characters long
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-slate-400" />
                  Include uppercase and lowercase letters
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-slate-400" />
                  Include at least one number
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {formError ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Registration Error</h4>
                  <p className="text-sm text-red-700 mt-1">{formError}</p>
                </div>
              </div>
            ) : null}

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-primary-btn-modern w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Account
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-slate-500 font-medium">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Link 
              href={LOGIN_ROUTE} 
              className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors hover:underline underline-offset-2"
            >
              Sign in here
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
