'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@/features/restaurant-menu/components/icons';
import type { MenuCustomerProfile } from '@/features/restaurant-menu/lib/customer-profile';

interface ProfileDropdownProps {
  profile: MenuCustomerProfile;
  isLoggingOut: boolean;
  loyaltyPoints?: number | null;
  onLogout: () => void | Promise<void>;
}

export function ProfileDropdown({
  profile,
  isLoggingOut,
  loyaltyPoints,
  onLogout,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        aria-label="Open profile menu"
        aria-expanded={isOpen}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-stone-50">
          {profile.initials}
        </span>
        <span className="hidden min-w-0 pr-1 text-left sm:block">
          <span className="block max-w-[9rem] truncate text-sm font-semibold text-stone-900">
            {profile.name}
          </span>
          <span className="block text-[11px] text-stone-500">
            {profile.isGuest ? 'Guest checkout' : 'Profile'}
          </span>
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-stone-500 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.65rem)] z-50 w-64 origin-top-right rounded-[22px] border border-stone-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] transition duration-200 ${
          isOpen ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
        }`}
      >
        <div className="rounded-[16px] border border-stone-200 bg-white p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-stone-50">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">
                {profile.name}
              </p>
              <p className="mt-1 truncate text-xs text-stone-500">
                {profile.email}
              </p>
              {profile.phone ? (
                <p className="mt-1.5 text-xs text-stone-600">{profile.phone}</p>
              ) : null}
              {profile.isGuest ? (
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">
                  Guest checkout
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {typeof loyaltyPoints === 'number' && loyaltyPoints > 0 && !profile.isGuest ? (
          <div className="mt-2 rounded-[16px] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20">
                <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.28l-4.77 2.51.91-5.33L2.27 6.69l5.34-.78L10 1z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-amber-900">Loyalty Points</p>
              </div>
              <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-700">
                {loyaltyPoints}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-2">
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
          >
            <span>My Profile</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>

          {!profile.isGuest ? (
            <Link
              href="/menu/order-history"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
            >
              <span>Order History</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              void onLogout();
            }}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m8 4v1a3 3 0 01-3 3H7a3 3 0 01-3-3V8a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}


