'use client';

import { useSearchParams } from 'next/navigation';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';
import { resolveCustomerNextPath } from '@/features/restaurant-menu/lib/customer-auth';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
import { MenuForgotPasswordForm } from '@/features/restaurant-menu/components/menu-forgot-password-form';
import { MenuLoginForm } from '@/features/restaurant-menu/components/menu-login-form';
import { MenuProfileCard } from '@/features/restaurant-menu/components/menu-profile-card';
import { MenuSignupForm } from '@/features/restaurant-menu/components/menu-signup-form';
import { XIcon } from '@/features/restaurant-menu/components/icons';

export type MenuAuthView = 'login' | 'signup' | 'forgot-password';

interface MenuAuthSidebarProps {
  open: boolean;
  view: MenuAuthView;
  restaurantName: string;
  isCustomerAuthenticated?: boolean;
  customerProfile?: MenuCustomerProfile | null;
  isLoggingOut?: boolean;
  onClose: () => void;
  onViewChange: (view: MenuAuthView) => void;
  onLogout?: () => void | Promise<void>;
}

export function MenuAuthSidebar({
  open,
  view,
  restaurantName,
  isCustomerAuthenticated = false,
  customerProfile,
  isLoggingOut = false,
  onClose,
  onViewChange,
  onLogout,
}: MenuAuthSidebarProps) {
  const searchParams = useSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));

  useScrollLock(open);

  if (!open) {
    return null;
  }

  const isProfileView = Boolean(isCustomerAuthenticated && customerProfile);
  const heading = isProfileView
    ? 'Your account'
    : view === 'signup'
      ? 'Create your account'
      : view === 'forgot-password'
        ? 'Reset your password'
        : 'Sign in to continue';
  const subheading = isProfileView
    ? `You are signed in and ready to continue ordering from ${restaurantName}.`
    : view === 'signup'
      ? 'Save your details for faster checkout and future orders.'
      : view === 'forgot-password'
        ? 'We will send reset instructions to your email.'
        : `Continue ordering from ${restaurantName}.`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/40 px-2 py-2 sm:px-4 sm:py-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className="flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="border-b border-stone-200 px-5 pb-4 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Online Ordering
              </p>
              <h2 className="mt-2 text-[1.7rem] font-semibold tracking-tight text-slate-950 sm:text-[1.9rem]">
                {heading}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {subheading}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
              aria-label="Close auth panel"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {!isProfileView && view !== 'forgot-password' ? (
            <div className="mt-5 rounded-[20px] bg-stone-100 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onViewChange('login')}
                  className={`h-11 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 ${
                    view === 'login'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange('signup')}
                  className={`h-11 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 ${
                    view === 'signup'
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isProfileView && customerProfile ? (
            <MenuProfileCard
              profile={customerProfile}
              variant="sidebar"
              isLoggingOut={isLoggingOut}
              onLogout={onLogout || (() => undefined)}
            />
          ) : view === 'signup' ? (
            <MenuSignupForm
              onAuthenticatedUser={onClose}
              onRequestLogin={() => onViewChange('login')}
            />
          ) : view === 'forgot-password' ? (
            <MenuForgotPasswordForm
              nextPath={nextPath}
              onRequestLogin={() => onViewChange('login')}
            />
          ) : (
            <MenuLoginForm
              onAuthenticatedUser={onClose}
              onRequestSignup={() => onViewChange('signup')}
              onRequestForgotPassword={() => onViewChange('forgot-password')}
            />
          )}
        </div>
      </aside>
    </div>
  );
}