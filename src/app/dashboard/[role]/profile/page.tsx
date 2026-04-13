'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  useChangePassword,
  useHasuraClaims,
  useUserData,
} from '@nhost/react';
import toast from 'react-hot-toast';
import { getRoleFromHasuraClaims, getUserRole } from '@/lib/auth/get-user-role';
import { nhost } from '@/lib/nhost';

type ProfileTab = 'details' | 'password';

export default function ProfilePage() {
  const pathname = usePathname() ?? '';
  const roleSegment = pathname.split('/')[2] || 'admin';
  const user = useUserData();
  const hasuraClaims = useHasuraClaims();
  const roleFromClaims = getRoleFromHasuraClaims(hasuraClaims);
  const roleFromUser = user ? getUserRole(user) : null;
  const role = roleFromClaims && roleFromClaims !== 'user' ? roleFromClaims : roleFromUser;

  const [activeTab, setActiveTab] = useState<ProfileTab>('details');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { changePassword, isLoading: changingPassword } = useChangePassword();

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName?.trim() || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const accessToken = await nhost.auth.getAccessToken();
        const response = await fetch('/api/admin/profile', {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
          data?: { phoneNumber?: string };
        } | null;
        if (active && payload?.success) {
          setPhoneNumber(payload.data?.phoneNumber || '');
        }
      } catch {
        // silent — phone field stays empty
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, []);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Display name is required.');
      return;
    }

    try {
      setSavingProfile(true);
      const accessToken = await nhost.auth.getAccessToken();
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ displayName: displayName.trim(), phoneNumber: phoneNumber.trim() }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update profile.');
      }

      // Refresh the nhost session to reflect the updated display name
      await nhost.auth.refreshSession();
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    try {
      const result = await changePassword(newPassword);
      if (result.isError) {
        throw new Error(result.error?.message || 'Failed to change password.');
      }
      toast.success('Password changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password.');
    }
  };

  const roleBadge = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : 'User';

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'details', label: 'Profile Details' },
    { key: 'password', label: 'Change Password' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#8b5cf6] via-[#7c3aed] to-[#6d28d9] p-8 shadow-lg">
        <div className="absolute right-0 top-0 h-64 w-64 -translate-y-12 translate-x-12 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 translate-y-12 -translate-x-12 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white">
            {(displayName || email || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {displayName || email || 'My Profile'}
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-sm text-purple-200">{email}</span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
                {roleBadge}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-6 py-3.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="profile-display-name" className="block text-sm font-medium text-gray-700">
                  Display name
                </label>
                <input
                  id="profile-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  disabled
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed from here.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <div className="mt-1 inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  {roleBadge}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="inline-flex items-center rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                >
                  {savingProfile ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="profile-new-password" className="block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  id="profile-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  id="profile-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="inline-flex items-center rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
                >
                  {changingPassword ? 'Changing...' : 'Change password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
