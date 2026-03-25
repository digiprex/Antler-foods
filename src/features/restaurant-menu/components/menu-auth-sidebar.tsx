'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScrollLock } from '@/features/restaurant-menu/hooks/use-scroll-lock';
import { resolveCustomerNextPath } from '@/features/restaurant-menu/lib/customer-auth';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';
import { MenuForgotPasswordForm } from '@/features/restaurant-menu/components/menu-forgot-password-form';
import { MenuLoginForm } from '@/features/restaurant-menu/components/menu-login-form';
import { MenuSignupForm } from '@/features/restaurant-menu/components/menu-signup-form';
import { XIcon } from '@/features/restaurant-menu/components/icons';

export type MenuAuthView = 'login' | 'signup' | 'forgot-password';

interface MenuAuthSidebarProps {
  open: boolean;
  view: MenuAuthView;
  restaurantId?: string | null;
  restaurantName: string;
  hasCustomerSession?: boolean;
  customerProfile?: MenuCustomerProfile | null;
  onClose: () => void;
  onViewChange: (view: MenuAuthView) => void;
  onAuthenticatedCustomer?: (customer: MenuCustomerProfile) => void;
}

const EXIT_ANIMATION_MS = 220;

export function MenuAuthSidebar({
  open,
  view,
  restaurantId,
  restaurantName,
  hasCustomerSession = false,
  customerProfile,
  onClose,
  onViewChange,
  onAuthenticatedCustomer,
}: MenuAuthSidebarProps) {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const nextPath = resolveCustomerNextPath(searchParams.get('next'));
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useScrollLock(isMounted);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(
      () => setIsMounted(false),
      EXIT_ANIMATION_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!isMounted) {
    return null;
  }

  const isGuestView = customerProfile?.isGuest === true;
  const allowsGuestAuthView = isGuestView && (view === 'signup' || view === 'login');
  const isProfileView = Boolean(hasCustomerSession && customerProfile && !allowsGuestAuthView);
  const heading = isProfileView
    ? isGuestView
      ? 'Guest checkout active'
      : 'Your account'
    : view === 'signup'
      ? 'Create your account'
      : view === 'forgot-password'
        ? 'Reset your password'
        : 'Sign in to continue';
  const subheading = isProfileView
    ? isGuestView
      ? `You are continuing as a guest for ${restaurantName}. Create an account any time to save your details.`
      : `You are signed in and ready to continue ordering from ${restaurantName}.`
    : view === 'signup'
      ? 'Save your details for faster checkout and future orders.'
      : view === 'forgot-password'
        ? 'Enter your email address and we will send a reset link for this restaurant.'
        : `Continue ordering from ${restaurantName}.`;

  const handleAuthenticatedCustomer = (customer: MenuCustomerProfile) => {
    onAuthenticatedCustomer?.(customer);
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-end bg-[rgba(20,16,12,0.55)] px-0 py-0 backdrop-blur-md transition duration-200 sm:items-stretch sm:px-4 sm:py-4 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside className={`flex h-[min(94vh,100%)] w-full max-w-full flex-col overflow-hidden rounded-t-[28px] border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] transition duration-200 sm:h-full sm:max-w-[520px] sm:rounded-[28px] ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
      }`}>
        <div className="border-b border-stone-200 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Online Ordering
              </p>
              <h2 className="mt-2 text-[1.5rem] font-semibold leading-tight tracking-tight text-stone-950 sm:text-[1.75rem]">
                {heading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {subheading}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white/90 text-stone-500 shadow-sm transition hover:border-stone-300 hover:bg-white hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
              aria-label="Close auth panel"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {!isProfileView && view !== 'forgot-password' ? (
            <div className="mt-5 rounded-[18px] border border-stone-200 bg-stone-100 p-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onViewChange('login')}
                  className={`h-10 rounded-[14px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                    view === 'login'
                      ? 'bg-stone-900 text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange('signup')}
                  className={`h-10 rounded-[14px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                    view === 'signup'
                      ? 'bg-stone-900 text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {isProfileView ? (
            <div className="rounded-[20px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
              <p className="text-base font-semibold text-stone-900">
                {isGuestView ? 'Guest checkout is active.' : 'You are signed in.'}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {isGuestView
                  ? 'You can continue checking out now, or create an account later to save your details for this restaurant.'
                  : `Continue ordering from ${restaurantName}. Use the profile menu in the top right if you need account actions.`}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-900 transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
              >
                Continue to menu
              </button>
            </div>
          ) : view === 'signup' ? (
            <MenuSignupForm
              restaurantId={restaurantId}
              onRequestLogin={() => onViewChange('login')}
            />
          ) : view === 'forgot-password' ? (
            <MenuForgotPasswordForm
              nextPath={nextPath}
              restaurantId={restaurantId}
              onRequestLogin={() => onViewChange('login')}
            />
          ) : (
            <MenuLoginForm
              restaurantId={restaurantId}
              onAuthenticatedUser={handleAuthenticatedCustomer}
              onRequestSignup={() => onViewChange('signup')}
              onRequestForgotPassword={() => onViewChange('forgot-password')}
            />
          )}
        </div>
      </aside>
    </div>
  );
}


