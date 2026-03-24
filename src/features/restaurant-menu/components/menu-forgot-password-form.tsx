'use client';

import Link from 'next/link';
import {
  buildCustomerAuthHref,
  CUSTOMER_LOGIN_ROUTE,
  resolveCustomerNextPath,
} from '@/features/restaurant-menu/lib/customer-auth';

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
  const resolvedNextPath = resolveCustomerNextPath(nextPath);
  const loginHref = buildCustomerAuthHref(
    CUSTOMER_LOGIN_ROUTE,
    resolvedNextPath,
    restaurantId,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-6 text-slate-700">
        Password reset is not available yet for menu customer accounts. Please sign in with your existing password or create a new account for this restaurant.
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
  );
}
