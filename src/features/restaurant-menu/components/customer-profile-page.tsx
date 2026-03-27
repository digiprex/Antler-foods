'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { ProfileDropdown } from '@/features/restaurant-menu/components/profile-dropdown';

interface CustomerProfilePageProps {
  restaurantId?: string | null;
  restaurantName: string;
}

export default function CustomerProfilePage({
  restaurantId,
  restaurantName,
}: CustomerProfilePageProps) {
  const router = useRouter();
  const {
    customerProfile,
    hasCustomerSession,
    isLoading: isAuthLoading,
    isLoggingOut,
    logout,
    refresh,
  } = useMenuCustomerAuth(restaurantId);
  const [navbarAuthSlot, setNavbarAuthSlot] = useState<HTMLElement | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleLogout = async () => {
    await logout();
    router.replace('/menu');
  };

  // Sync form fields from profile
  useEffect(() => {
    if (!customerProfile) return;

    const nameParts = customerProfile.name.split(/\s+/);
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.slice(1).join(' ') || '');
    setPhone(customerProfile.phone || '');
    setAddress(customerProfile.address || '');
    setCity(customerProfile.city || '');
    setState(customerProfile.state || '');
    setCountry(customerProfile.country || '');
    setPostalCode(customerProfile.postalCode || '');
    setIsFormDirty(false);
  }, [customerProfile]);

  // Navbar auth slot detection
  useEffect(() => {
    const syncNavbarAuthSlot = () => {
      setNavbarAuthSlot(document.getElementById('menu-navbar-auth-slot'));
    };

    syncNavbarAuthSlot();

    const observer = new MutationObserver(() => {
      syncNavbarAuthSlot();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Hide navbar sign-in/sign-up links when logged in
  useEffect(() => {
    const authLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[href="/login"], a[href="/signup"]'),
    );

    authLinks.forEach((link) => {
      if (!('menuAuthOriginalDisplay' in link.dataset)) {
        link.dataset.menuAuthOriginalDisplay = link.style.display || '';
      }

      link.style.display = hasCustomerSession ? 'none' : link.dataset.menuAuthOriginalDisplay || '';
    });

    return () => {
      authLinks.forEach((link) => {
        link.style.display = link.dataset.menuAuthOriginalDisplay || '';
        delete link.dataset.menuAuthOriginalDisplay;
      });
    };
  }, [hasCustomerSession]);

  // Redirect to menu if not logged in
  useEffect(() => {
    if (isAuthLoading) return;
    if (!hasCustomerSession) {
      router.replace('/menu');
    }
  }, [hasCustomerSession, isAuthLoading, router]);

  const handleFieldChange = (setter: (value: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setter(e.target.value);
    setIsFormDirty(true);
    setSaveMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setSaveMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/menu-auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          country: country.trim() || null,
          postalCode: postalCode.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSaveMessage({
          type: 'error',
          text: data?.error || 'Failed to update profile.',
        });
        return;
      }

      setSaveMessage({ type: 'success', text: 'Profile updated successfully.' });
      setIsFormDirty(false);
      await refresh();
    } catch {
      setSaveMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword.trim()) {
      setPasswordMessage({ type: 'error', text: 'Current password is required.' });
      return;
    }

    if (!newPassword.trim()) {
      setPasswordMessage({ type: 'error', text: 'New password is required.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const res = await fetch('/api/menu-auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPasswordMessage({
          type: 'error',
          text: data?.error || 'Failed to change password.',
        });
        return;
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isAuthLoading || !hasCustomerSession) {
    return (
      <div
        className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_32%,#ffffff_74%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10"
        style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
      >
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="mb-5">
            <div className="h-10 w-32 animate-pulse rounded-full bg-stone-200" />
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 animate-pulse rounded-full bg-stone-200" />
              <div className="space-y-2.5">
                <div className="h-3 w-20 animate-pulse rounded bg-stone-200" />
                <div className="h-7 w-44 animate-pulse rounded-lg bg-stone-200" />
                <div className="h-4 w-56 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          </div>
          <div className="mt-5 space-y-5 px-1 sm:px-2">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="mb-2 h-3 w-20 animate-pulse rounded bg-stone-200" />
                <div className="h-12 w-full animate-pulse rounded-[14px] bg-stone-100" />
              </div>
            ))}
            <div className="h-12 w-36 animate-pulse rounded-[14px] bg-stone-200" />
          </div>
        </div>
      </div>
    );
  }

  const isGuest = customerProfile?.isGuest === true;

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f5f7ff_0%,#f8fafc_32%,#ffffff_74%)] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-10 lg:pb-10"
      style={{ paddingTop: 'calc(var(--navbar-height, 0px) + 2.5rem)' }}
    >
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-5">
          <Link
            href="/menu"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_4px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-950 hover:shadow-[0_10px_26px_rgba(15,23,42,0.1)]"
          >
            <svg className="h-4 w-4 transition group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to menu
          </Link>
        </div>

        {/* Header */}
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-slate-50">
              {customerProfile?.initials || '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                {restaurantName}
              </p>
              <h1 className="mt-1 truncate text-[1.9rem] font-semibold tracking-tight text-slate-950 sm:text-[2.35rem]">
                {customerProfile?.name || 'Your Profile'}
              </h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {customerProfile?.email}
              </p>
            </div>
          </div>
          {isGuest ? (
            <div className="mt-5 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Guest account</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Create an account to edit your profile, view order history, and more.
                  </p>
                  <Link
                    href="/menu?auth=signup"
                    className="mt-2 inline-flex rounded-[10px] border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="mt-5 px-1 sm:px-2">
          {isGuest ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Name</p>
                <p className="mt-1.5 text-sm font-medium text-slate-950">{customerProfile?.name || '-'}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Email</p>
                <p className="mt-1.5 text-sm font-medium text-slate-950">{customerProfile?.email || '-'}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Phone</p>
                <p className="mt-1.5 text-sm font-medium text-slate-950">{customerProfile?.phone || '-'}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave}>
              <h2 className="text-base font-semibold text-slate-950">Personal information</h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-first-name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    First name
                  </label>
                  <input
                    id="profile-first-name"
                    type="text"
                    value={firstName}
                    onChange={handleFieldChange(setFirstName)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-last-name"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Last name
                  </label>
                  <input
                    id="profile-last-name"
                    type="text"
                    value={lastName}
                    onChange={handleFieldChange(setLastName)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="profile-email"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={customerProfile?.email || ''}
                  disabled
                  className="h-12 w-full rounded-[14px] border border-slate-100 bg-slate-100 px-4 text-sm text-slate-500 outline-none"
                />
                <p className="mt-1.5 text-xs text-slate-400">Email cannot be changed.</p>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="profile-phone"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Phone number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={handleFieldChange(setPhone)}
                  className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <h2 className="mt-8 text-base font-semibold text-slate-950">Address</h2>

              <div className="mt-4">
                <label
                  htmlFor="profile-address"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Street address
                </label>
                <input
                  id="profile-address"
                  type="text"
                  value={address}
                  onChange={handleFieldChange(setAddress)}
                  className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                  placeholder="123 Main St"
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-city"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    City
                  </label>
                  <input
                    id="profile-city"
                    type="text"
                    value={city}
                    onChange={handleFieldChange(setCity)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-state"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    State / Province
                  </label>
                  <input
                    id="profile-state"
                    type="text"
                    value={state}
                    onChange={handleFieldChange(setState)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="NY"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-postal-code"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Postal code
                  </label>
                  <input
                    id="profile-postal-code"
                    type="text"
                    value={postalCode}
                    onChange={handleFieldChange(setPostalCode)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="10001"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-country"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Country
                  </label>
                  <input
                    id="profile-country"
                    type="text"
                    value={country}
                    onChange={handleFieldChange(setCountry)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="United States"
                  />
                </div>
              </div>

              {saveMessage ? (
                <div
                  className={`mt-5 rounded-[14px] border px-4 py-3 text-sm ${
                    saveMessage.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {saveMessage.text}
                </div>
              ) : null}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSaving || !isFormDirty}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          )}

          {/* Change password */}
          {!isGuest ? (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h2 className="text-base font-semibold text-slate-950">Change password</h2>
              <form onSubmit={handleChangePassword} className="mt-4 max-w-md space-y-4">
                <div>
                  <label
                    htmlFor="profile-current-password"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Current password
                  </label>
                  <input
                    id="profile-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-new-password"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    New password
                  </label>
                  <input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-confirm-password"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                </div>

                {passwordMessage ? (
                  <div
                    className={`rounded-[14px] border px-4 py-3 text-sm ${
                      passwordMessage.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isChangingPassword || (!currentPassword && !newPassword && !confirmPassword)}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isChangingPassword ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </div>
          ) : null}

          {/* Quick links */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-base font-semibold text-slate-950">Quick links</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {!isGuest ? (
                <Link
                  href="/orders"
                  className="flex items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                >
                  <span className="flex items-center gap-2.5">
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Order history
                  </span>
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center justify-between rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex items-center gap-2.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H9m8 4v1a3 3 0 01-3 3H7a3 3 0 01-3-3V8a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {navbarAuthSlot && !isAuthLoading && hasCustomerSession && customerProfile
        ? createPortal(
            <ProfileDropdown
              profile={customerProfile}
              isLoggingOut={isLoggingOut}
              onLogout={handleLogout}
            />,
            navbarAuthSlot,
          )
        : null}
    </div>
  );
}
