'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useResetPassword } from '@nhost/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AuthInput } from './auth-input';
import { LOGIN_ROUTE, RESET_PASSWORD_ROUTE } from '@/lib/auth/routes';
import { isNhostConfigured } from '@/lib/nhost';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validation/auth';

export function ForgotPasswordForm() {
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

    const redirectTo = new URL(RESET_PASSWORD_ROUTE, window.location.origin).toString();
    const result = await resetPassword(email, {
      redirectTo,
    });

    if (result.error) {
      setFormError(
        result.error.message ?? 'Unable to send reset email. Please try again.',
      );
      return;
    }

    if (result.isSent) {
      setSuccessMessage(
        'Password reset instructions have been sent to your email address.',
      );
    }
  });

  return (
    <div className="space-y-5">
      {successMessage || isSent ? (
        <div className="text-center space-y-5">
          {/* Success Message */}
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-green-800">Email Sent!</h4>
              <p className="text-sm text-green-700 mt-1">
                {successMessage || 'Password reset instructions have been sent to your email address.'}
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
                <span>Click the password reset link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-violet-600 text-xs font-semibold">3</div>
                <span>Create a new password</span>
              </div>
            </div>
          </div>

          {/* Return to Login */}
          <Link
            href={LOGIN_ROUTE}
            className="auth-primary-btn-modern w-full inline-flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Return to Sign In
          </Link>
        </div>
      ) : (
        <>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <AuthInput
              type="email"
              label="Email Address"
              placeholder="Enter your email"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Instructions */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600">
                Enter the email address associated with your admin or owner account, and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error Message */}
            {formError || isError ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Error</h4>
                  <p className="text-sm text-red-700 mt-1">{formError ?? error?.message}</p>
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
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending reset link...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Reset Link
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
              <span className="bg-white px-3 text-slate-500 font-medium">Remember your password?</span>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <Link
              href={LOGIN_ROUTE}
              className="text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors hover:underline underline-offset-2"
            >
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

