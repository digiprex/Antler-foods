'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface GiftCard {
  gift_card_id: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  initial_value: number;
  restaurant_id: string;
  code: string;
  is_active: boolean;
  current_balance: number;
  customer_id: string | null;
  email: string;
}

interface GiftCardsFormProps {
  restaurantId: string;
  restaurantName: string;
}

interface GiftCardFormState {
  code: string;
  email: string;
  initial_value: string;
}

const GIFT_CARD_VALUE_PRESETS = [10, 25, 50, 75, 100] as const;

function createInitialState(): GiftCardFormState {
  return {
    code: '',
    email: '',
    initial_value: '25',
  };
}

function normalizeNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function isExpired(expiryDate: string) {
  const parsed = Date.parse(expiryDate);
  if (!Number.isFinite(parsed)) return false;
  return parsed < Date.now();
}

export default function GiftCardsForm({ restaurantId, restaurantName }: GiftCardsFormProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<GiftCardFormState>(createInitialState());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingGiftCardId, setUpdatingGiftCardId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const fetchGiftCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/gift-cards?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to fetch gift cards');
      }

      setGiftCards(data.gift_cards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gift cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftCards();
  }, [restaurantId]);

  const filteredGiftCards = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return giftCards;

    return giftCards.filter((giftCard) =>
      `${giftCard.code} ${giftCard.email}`.toLowerCase().includes(normalized),
    );
  }, [giftCards, search]);

  const openCreateModal = () => {
    setForm(createInitialState());
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setForm(createInitialState());
    setFormError(null);
  };

  const saveGiftCard = async () => {
    const email = form.email.trim().toLowerCase();
    const initialValue = normalizeNumber(form.initial_value, NaN);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    if (!email) {
      setFormError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Email must be valid.');
      return;
    }

    if (!Number.isFinite(initialValue) || initialValue <= 0) {
      setFormError('Initial value must be greater than 0.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        restaurant_id: restaurantId,
        code: form.code.trim().toUpperCase(),
        email,
        initial_value: initialValue,
        current_balance: initialValue,
        expiry_date: expiryDate.toISOString(),
        is_active: true,
      };

      const response = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to create gift card');
      }

      setGiftCards((previous) => [data.gift_card, ...previous]);
      closeModal();
      if (data.email_sent === false && data.warning) {
        alert(data.warning);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create gift card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivateGiftCard = async (giftCard: GiftCard) => {
    if (!giftCard.is_active) {
      return;
    }

    const shouldDeactivate = window.confirm(
      `Deactivate gift card "${giftCard.code}"?`,
    );
    if (!shouldDeactivate) return;

    setUpdatingGiftCardId(giftCard.gift_card_id);
    try {
      const response = await fetch('/api/gift-cards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gift_card_id: giftCard.gift_card_id,
          restaurant_id: restaurantId,
          is_active: false,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to deactivate gift card');
      }

      setGiftCards((previous) =>
        previous.map((entry) =>
          entry.gift_card_id === giftCard.gift_card_id ? data.gift_card : entry,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate gift card');
    } finally {
      setUpdatingGiftCardId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading gift cards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <div className="text-center">
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchGiftCards}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gift Cards</h2>
            <p className="text-sm text-gray-600">Manage gift cards for {restaurantName}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Gift Card
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by code or email..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {giftCards.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">No gift cards yet</h3>
          <p className="mt-2 text-sm text-gray-600">Create your first gift card to get started.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            Create Gift Card
          </button>
        </div>
      ) : filteredGiftCards.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            No gift cards match "<span className="font-medium text-gray-800">{search}</span>".
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Initial Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Current Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Expiry Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGiftCards.map((giftCard) => {
                  const expired = isExpired(giftCard.expiry_date);
                  const active = giftCard.is_active && !expired;
                  return (
                    <tr key={giftCard.gift_card_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                          {giftCard.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{giftCard.email}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatCurrency(Number(giftCard.initial_value || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatCurrency(Number(giftCard.current_balance || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {giftCard.expiry_date ? new Date(giftCard.expiry_date).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              active
                                ? 'bg-green-100 text-green-700'
                                : expired
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {active ? 'Active' : expired ? 'Expired' : 'Inactive'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeactivateGiftCard(giftCard)}
                            disabled={!giftCard.is_active || updatingGiftCardId === giftCard.gift_card_id}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:opacity-80"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {updatingGiftCardId === giftCard.gift_card_id ? 'Deactivating...' : 'Deactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] overflow-y-auto bg-black/45 backdrop-blur-[1px]">
          <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-6 md:pt-8">
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Create Gift Card</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Create a new card and send the code to your customer.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-gray-700 disabled:opacity-60"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Gift Card Details</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Code (Optional)</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value.toUpperCase() }))}
                      placeholder="Auto-generated if empty"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Recipient Email *</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                      placeholder="customer@email.com"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Value ($) *</label>
                    <input
                      type="number"
                      value={form.initial_value}
                      onChange={(event) => setForm((previous) => ({ ...previous, initial_value: event.target.value }))}
                      min="1"
                      step="0.01"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Quick Amounts</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {GIFT_CARD_VALUE_PRESETS.map((amount) => {
                      const isActive = Number(form.initial_value) === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setForm((previous) => ({ ...previous, initial_value: String(amount) }))}
                          className={`h-10 rounded-lg border text-sm font-semibold transition ${isActive
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50/50'
                            }`}
                        >
                          ${amount}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-sm font-semibold text-emerald-800">Delivery & Validity</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-emerald-700">
                  <span className="rounded-full bg-white px-2.5 py-1">Instant email delivery</span>
                  <span className="rounded-full bg-white px-2.5 py-1">Active immediately</span>
                  <span className="rounded-full bg-white px-2.5 py-1">Valid for 3 years</span>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="h-11 rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveGiftCard}
                disabled={isSaving}
                className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {isSaving ? 'Creating...' : 'Create Gift Card'}
              </button>
            </div>
          </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
