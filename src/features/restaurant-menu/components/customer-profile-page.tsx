'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useMenuCustomerAuth } from '@/features/restaurant-menu/hooks/use-menu-customer-auth';
import { ProfileDropdown } from '@/features/restaurant-menu/components/profile-dropdown';
import { DeliveryAddressInput as DeliveryAddressInputField } from '@/features/restaurant-menu/components/delivery-address-input';
import type { SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'password'>('profile');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Address state
  interface SavedAddress {
    id: string;
    address: string;
    street: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip_code: string | null;
    house_no: string | null;
    saved_as: string | null;
    nearby_landmark: string | null;
    is_default: boolean;
    created_at: string;
  }
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  // Shared modal state for add / edit
  const [addrModalMode, setAddrModalMode] = useState<'add' | 'edit' | null>(null);
  const [addrModalId, setAddrModalId] = useState<string | null>(null);
  const [isSavingModal, setIsSavingModal] = useState(false);
  const [modalAddr, setModalAddr] = useState('');
  const [modalLine1, setModalLine1] = useState('');
  const [modalLine2, setModalLine2] = useState('');
  const [modalCity, setModalCity] = useState('');
  const [modalState, setModalState] = useState('');
  const [modalPostal, setModalPostal] = useState('');
  const [modalCountry, setModalCountry] = useState('');
  const [modalHouseNo, setModalHouseNo] = useState('');
  const [modalLandmark, setModalLandmark] = useState('');
  const [modalLabel, setModalLabel] = useState('');

  const fetchAddresses = async () => {
    setIsLoadingAddresses(true);
    setAddressError(null);
    try {
      const res = await fetch('/api/menu-auth/addresses', { credentials: 'same-origin' });
      const data = await res.json();
      if (res.ok) {
        setAddresses(data.addresses || []);
      } else {
        setAddressError(data.error || 'Failed to load addresses.');
      }
    } catch {
      setAddressError('Failed to load addresses.');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'addresses' && hasCustomerSession && !customerProfile?.isGuest) {
      fetchAddresses();
    }
  }, [activeTab, hasCustomerSession, customerProfile?.isGuest]);

  const handleDeleteAddress = async (id: string) => {
    setDeletingAddressId(id);
    try {
      const res = await fetch(`/api/menu-auth/addresses?id=${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silent
    } finally {
      setDeletingAddressId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try {
      const res = await fetch('/api/menu-auth/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id, is_default: true }),
      });
      if (res.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({ ...a, is_default: a.id === id })),
        );
      }
    } catch {
      // silent
    } finally {
      setSettingDefaultId(null);
    }
  };

  const openAddModal = () => {
    setAddrModalMode('add');
    setAddrModalId(null);
    setModalAddr('');
    setModalLine1('');
    setModalLine2('');
    setModalCity('');
    setModalState('');
    setModalPostal('');
    setModalCountry('');
    setModalHouseNo('');
    setModalLandmark('');
    setModalLabel('');
  };

  const openEditModal = (addr: SavedAddress) => {
    setAddrModalMode('edit');
    setAddrModalId(addr.id);
    setModalAddr(addr.address || '');
    setModalLine1(addr.address || '');
    setModalLine2(addr.street || '');
    setModalCity(addr.city || '');
    setModalState(addr.state || '');
    setModalPostal(addr.zip_code || '');
    setModalCountry(addr.country || '');
    setModalHouseNo(addr.house_no || '');
    setModalLandmark(addr.nearby_landmark || '');
    setModalLabel(addr.saved_as || '');
  };

  const closeAddrModal = () => {
    setAddrModalMode(null);
    setAddrModalId(null);
  };

  const handleModalPlaceSelected = useCallback((place: SelectedGooglePlace) => {
    const t = (v: string) => (v && v.trim() ? v.trim() : '');
    setModalAddr(t(place.formattedAddress) || t(place.address) || t(place.name));
    setModalLine1(t(place.address));
    setModalCity(t(place.city));
    setModalState(t(place.state));
    setModalPostal(t(place.postalCode));
    setModalCountry(t(place.country));
  }, []);

  const handleSaveAddrModal = async () => {
    if (!modalAddr.trim()) return;
    setIsSavingModal(true);
    const str = (v: string) => (v.trim() || null);
    const payload = {
      address: modalAddr.trim(),
      street: str(modalLine1),
      city: str(modalCity),
      state: str(modalState),
      country: str(modalCountry),
      zip_code: str(modalPostal),
      house_no: str(modalHouseNo),
      nearby_landmark: str(modalLandmark),
      saved_as: str(modalLabel),
    };

    try {
      if (addrModalMode === 'edit' && addrModalId) {
        const res = await fetch('/api/menu-auth/addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ id: addrModalId, ...payload }),
        });
        if (res.ok) {
          const data = await res.json();
          setAddresses((prev) => prev.map((a) => a.id === addrModalId ? { ...a, ...data.address } : a));
          closeAddrModal();
        }
      } else {
        const res = await fetch('/api/menu-auth/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setAddresses((prev) => [data.address, ...prev]);
          closeAddrModal();
        }
      }
    } catch {
      // silent
    } finally {
      setIsSavingModal(false);
    }
  };

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

    if (!firstName.trim() || !lastName.trim()) {
      setSaveMessage({ type: 'error', text: 'First name and last name are required.' });
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
        <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-base font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-lg">
                {customerProfile?.initials || '??'}
              </div>
              <div className="min-w-0 flex-1 sm:flex-initial">
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-400 sm:text-[10px]">
                  {restaurantName}
                </p>
                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-950 sm:mt-1 sm:text-[1.9rem] lg:text-[2.35rem]">
                  {customerProfile?.name || 'Your Profile'}
                </h1>
                <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                  {customerProfile?.email}
                </p>
              </div>
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

        {/* Tabs */}
        {!isGuest ? (
          <div className="mt-5 overflow-x-auto rounded-[16px] border border-slate-200 bg-slate-100 p-1">
            <div className="flex min-w-max gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex-1 whitespace-nowrap rounded-[12px] px-5 py-2.5 text-sm font-semibold transition sm:px-6 ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`flex-1 whitespace-nowrap rounded-[12px] px-5 py-2.5 text-sm font-semibold transition sm:px-6 ${
                  activeTab === 'addresses'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Addresses
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`flex-1 whitespace-nowrap rounded-[12px] px-5 py-2.5 text-sm font-semibold transition sm:px-6 ${
                  activeTab === 'password'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Password
                </span>
              </button>
            </div>
          </div>
        ) : null}

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
          ) : activeTab === 'addresses' ? (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950 sm:text-lg">Saved addresses</h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">Manage your delivery addresses.</p>
                </div>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[12px] bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-4 sm:py-2"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add address
                </button>
              </div>

              {/* Add address modal */}
              {addrModalMode ? (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="relative mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl">
                    {/* Modal header */}
                    <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
                      <h3 className="text-base font-semibold text-slate-950">
                        {addrModalMode === 'edit' ? 'Edit address' : 'Add new address'}
                      </h3>
                      <button
                        type="button"
                        onClick={closeAddrModal}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Modal body - scrollable */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <div className="space-y-4">
                        {/* Google Places autocomplete */}
                        <div>
                          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                            Search address
                          </span>
                          <DeliveryAddressInputField
                            value={modalAddr}
                            onChange={setModalAddr}
                            onPlaceSelected={handleModalPlaceSelected}
                          />
                        </div>

                        {modalAddr.trim() ? (
                          <>
                            {/* Address detail fields */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block text-sm font-medium text-slate-900 sm:col-span-2">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Street address
                                </span>
                                <input
                                  type="text"
                                  value={modalLine1}
                                  onChange={(e) => setModalLine1(e.target.value)}
                                  placeholder="House number, street, road"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900 sm:col-span-2">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Address line 2
                                </span>
                                <input
                                  type="text"
                                  value={modalLine2}
                                  onChange={(e) => setModalLine2(e.target.value)}
                                  placeholder="Apartment, suite, area, or building"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  City
                                </span>
                                <input
                                  type="text"
                                  value={modalCity}
                                  onChange={(e) => setModalCity(e.target.value)}
                                  placeholder="City"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  State
                                </span>
                                <input
                                  type="text"
                                  value={modalState}
                                  onChange={(e) => setModalState(e.target.value)}
                                  placeholder="State"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Postal code
                                </span>
                                <input
                                  type="text"
                                  value={modalPostal}
                                  onChange={(e) => setModalPostal(e.target.value)}
                                  placeholder="Postal code"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Country
                                </span>
                                <input
                                  type="text"
                                  value={modalCountry}
                                  onChange={(e) => setModalCountry(e.target.value)}
                                  placeholder="Country"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                            </div>

                            {/* Extra delivery fields */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  House / Flat / Floor
                                </span>
                                <input
                                  type="text"
                                  value={modalHouseNo}
                                  onChange={(e) => setModalHouseNo(e.target.value)}
                                  placeholder="e.g., Apt 4B, Floor 2"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                              <label className="block text-sm font-medium text-slate-900">
                                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                  Nearby landmark
                                </span>
                                <input
                                  type="text"
                                  value={modalLandmark}
                                  onChange={(e) => setModalLandmark(e.target.value)}
                                  placeholder="e.g., Near City Mall"
                                  className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50/60 px-4 text-sm text-slate-900 outline-none placeholder:text-stone-400 transition-colors focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900/10"
                                />
                              </label>
                            </div>

                            {/* Save as label */}
                            <div>
                              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                                Save address as
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {['home', 'work', 'other'].map((labelOption) => {
                                  const isSelected = modalLabel === labelOption;
                                  return (
                                    <button
                                      key={labelOption}
                                      type="button"
                                      onClick={() => setModalLabel(isSelected ? '' : labelOption)}
                                      className={`h-10 rounded-[12px] border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                                        isSelected
                                          ? 'border-black/60 bg-black text-white'
                                          : 'border-stone-300 bg-white text-slate-900 hover:border-stone-400 hover:bg-stone-50'
                                      }`}
                                    >
                                      {labelOption.charAt(0).toUpperCase() + labelOption.slice(1)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-[16px] border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                            Search your address above, then fill in the details.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Modal footer */}
                    <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-4">
                      <button
                        type="button"
                        onClick={closeAddrModal}
                        className="h-11 rounded-[12px] px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAddrModal}
                        disabled={isSavingModal || !modalAddr.trim()}
                        className="h-11 rounded-[12px] bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSavingModal ? 'Saving...' : addrModalMode === 'edit' ? 'Update address' : 'Save address'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isLoadingAddresses ? (
                <div className="mt-5 space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-[16px] border border-slate-200 bg-slate-50 px-5 py-4">
                      <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
                      <div className="mt-1.5 h-3 w-40 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : addressError ? (
                <div className="mt-5 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {addressError}
                </div>
              ) : addresses.length === 0 ? (
                <div className="mt-5 rounded-[16px] border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
                  <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-slate-600">No saved addresses</p>
                  <p className="mt-1 text-xs text-slate-400">Add an address or it will be saved automatically when you place a delivery order.</p>
                </div>
              ) : addresses.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`rounded-[16px] border bg-white px-4 py-4 transition hover:border-slate-300 sm:px-5 ${
                        addr.is_default ? 'border-slate-900/20 ring-1 ring-slate-900/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {addr.saved_as ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                                {addr.saved_as}
                              </span>
                            ) : null}
                            {addr.is_default ? (
                              <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                                Default
                              </span>
                            ) : null}
                          </div>
                          <p className={`text-sm font-semibold leading-relaxed text-slate-950 ${addr.saved_as || addr.is_default ? 'mt-2' : ''}`}>{addr.address}</p>
                          {(addr.house_no || addr.nearby_landmark) ? (
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                              {[addr.house_no, addr.nearby_landmark].filter(Boolean).join(' • ')}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(addr)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Edit address"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            disabled={deletingAddressId === addr.id}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete address"
                          >
                            {deletingAddressId === addr.id ? (
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Default toggle */}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs font-medium text-slate-500 sm:text-sm">Default address</span>
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr.id)}
                          disabled={addr.is_default || settingDefaultId === addr.id}
                          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-default disabled:opacity-70"
                          style={{ backgroundColor: addr.is_default ? '#0f172a' : '#cbd5e1' }}
                        >
                          {settingDefaultId === addr.id ? (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            </span>
                          ) : (
                            <span
                              className="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                              style={{ transform: addr.is_default ? 'translateX(22px)' : 'translateX(4px)' }}
                            />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleSave}>
              <h2 className="text-base font-semibold text-slate-950 sm:text-lg">Personal information</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Update your personal details.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 sm:max-w-md">
              <div>
                <h2 className="text-base font-semibold text-slate-950 sm:text-lg">Change password</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">Update your account password.</p>
              </div>
              <div>
                <label
                  htmlFor="profile-current-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="profile-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-new-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="profile-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-confirm-password"
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="profile-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMessage(null); }}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/5"
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
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
          )}
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
