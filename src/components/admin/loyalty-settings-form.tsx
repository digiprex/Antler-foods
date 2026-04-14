'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface LoyaltySettingsFormProps {
  restaurantId: string;
  restaurantName: string;
}

interface LoyaltySettingsData {
  is_enabled: boolean;
  points_per_dollar: number;
  redemption_rate: number;
  min_redemption_points: number;
  max_redemption_percentage: number;
  welcome_bonus_points: number;
  points_expiry_days: number | null;
  google_review_bonus_points: number;
}

export default function LoyaltySettingsForm({
  restaurantId,
  restaurantName,
}: LoyaltySettingsFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [pointsPerDollar, setPointsPerDollar] = useState('1');
  const [redemptionRate, setRedemptionRate] = useState('0.01');
  const [minRedemptionPoints, setMinRedemptionPoints] = useState('100');
  const [maxRedemptionPercentage, setMaxRedemptionPercentage] = useState('50');
  const [welcomeBonusPoints, setWelcomeBonusPoints] = useState('0');
  const [pointsExpiryDays, setPointsExpiryDays] = useState('');
  const [googleReviewBonusPoints, setGoogleReviewBonusPoints] = useState('0');

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/loyalty-settings?restaurant_id=${encodeURIComponent(restaurantId)}`,
        );
        const payload = (await response.json().catch(() => null)) as {
          success?: boolean;
          data?: LoyaltySettingsData;
          error?: string;
        } | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load loyalty settings.');
        }

        if (!active) return;

        setIsEnabled(payload.data?.is_enabled ?? false);
        setPointsPerDollar(String(payload.data?.points_per_dollar ?? 1));
        setRedemptionRate(String(payload.data?.redemption_rate ?? 0.01));
        setMinRedemptionPoints(String(payload.data?.min_redemption_points ?? 100));
        setMaxRedemptionPercentage(String(payload.data?.max_redemption_percentage ?? 50));
        setWelcomeBonusPoints(String(payload.data?.welcome_bonus_points ?? 0));
        setPointsExpiryDays(
          payload.data?.points_expiry_days != null
            ? String(payload.data.points_expiry_days)
            : '',
        );
        setGoogleReviewBonusPoints(String(payload.data?.google_review_bonus_points ?? 0));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load loyalty settings.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSettings();
    return () => { active = false; };
  }, [restaurantId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/loyalty-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          is_enabled: isEnabled,
          points_per_dollar: Number(pointsPerDollar) || 1,
          redemption_rate: Number(redemptionRate) || 0.01,
          min_redemption_points: Math.round(Number(minRedemptionPoints) || 100),
          max_redemption_percentage: Number(maxRedemptionPercentage) || 50,
          welcome_bonus_points: Math.round(Number(welcomeBonusPoints) || 0),
          points_expiry_days: pointsExpiryDays.trim() ? Math.round(Number(pointsExpiryDays)) || null : null,
          google_review_bonus_points: Math.round(Number(googleReviewBonusPoints) || 0),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save loyalty settings.');
      }

      toast.success('Loyalty settings saved.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save loyalty settings.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Compute preview values
  const previewPointsEarned = Math.round(Number(pointsPerDollar) * 50 || 0);
  const previewRedemptionValue = (Number(redemptionRate) * Number(minRedemptionPoints) || 0).toFixed(2);

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading loyalty settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Loyalty Points Program</h2>
          <p className="mt-1 text-sm text-gray-600">
            Reward repeat customers with points they can redeem for discounts at {restaurantName}.
          </p>
        </div>

        {/* Enable toggle */}
        <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Enable loyalty program</p>
            <p className="mt-1 text-xs text-gray-600">
              When enabled, customers earn points on orders and can redeem them at checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled((v) => !v)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              isEnabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {isEnabled ? (
          <div className="mt-5 space-y-4">
            {/* Earning section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Earning Rules</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Points earned per $1 spent
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={pointsPerDollar}
                    onChange={(e) => setPointsPerDollar(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A $50 order earns {previewPointsEarned} points.
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Welcome bonus points
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={welcomeBonusPoints}
                    onChange={(e) => setWelcomeBonusPoints(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Bonus points on first order. Set 0 to disable.
                  </p>
                </label>
              </div>
            </div>

            {/* Redemption section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Redemption Rules</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Dollar value per point
                  </span>
                  <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
                    <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-700">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={redemptionRate}
                      onChange={(e) => setRedemptionRate(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-gray-900 focus:outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    e.g. 0.01 means 100 points = $1.00
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Minimum points to redeem
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={minRedemptionPoints}
                    onChange={(e) => setMinRedemptionPoints(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum is worth ${previewRedemptionValue}.
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Max % of order payable with points
                  </span>
                  <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={maxRedemptionPercentage}
                      onChange={(e) => setMaxRedemptionPercentage(e.target.value)}
                      className="w-full px-3 py-2 text-sm text-gray-900 focus:outline-none"
                    />
                    <span className="inline-flex items-center border-l border-gray-300 bg-gray-50 px-3 text-sm text-gray-700">%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Limits how much of the subtotal can be covered by points.
                  </p>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Points expiry (days)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Never"
                    value={pointsExpiryDays}
                    onChange={(e) => setPointsExpiryDays(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty for points that never expire.
                  </p>
                </label>
              </div>
            </div>
            {/* Google Review Bonus section */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5a7 7 0 1 0 6.7 9h-6.2" />
                    <path d="M20 12h-8" />
                    <path d="M16 8v8" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">Google Review Bonus</h3>
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Reward customers with bonus loyalty points when they leave a review on your Google Business profile.
                    This helps boost your online presence while keeping customers engaged.
                  </p>
                </div>
              </div>
              <div className="mt-3 max-w-sm">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-700">
                    Points awarded per Google review
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={googleReviewBonusPoints}
                    onChange={(e) => setGoogleReviewBonusPoints(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {Number(googleReviewBonusPoints) > 0
                      ? `Customers earn ${Math.round(Number(googleReviewBonusPoints))} bonus points for each Google review.`
                      : 'Set to 0 to disable Google review rewards.'}
                  </p>
                </label>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
