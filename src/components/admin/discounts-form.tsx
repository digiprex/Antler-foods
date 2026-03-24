'use client';

import { useEffect, useMemo, useState } from 'react';

interface Coupon {
  coupon_id: string;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date: string | null;
  code: string;
  discount_type: string;
  value: number;
  min_spend: number;
  usage_limit: number | null;
  restaurant_id: string;
}

interface DiscountsFormProps {
  restaurantId: string;
  restaurantName: string;
}

type FormMode = 'create' | 'edit';

interface CouponFormState {
  code: string;
  discount_type: string;
  value: string;
  min_spend: string;
  start_date: string;
  end_date: string;
}

function toDateTimeLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function nowDateTimeLocalInput() {
  return toDateTimeLocalInput(new Date().toISOString());
}

function toIsoFromDateTimeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function createInitialFormState(): CouponFormState {
  return {
    code: '',
    discount_type: 'percentage',
    value: '0',
    min_spend: '0',
    start_date: nowDateTimeLocalInput(),
    end_date: '',
  };
}

function normalizeNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDiscountValue(discountType: string, value: number) {
  if (discountType.toLowerCase() === 'percentage') {
    return `${Number(value || 0)}%`;
  }

  return formatCurrency(value);
}

function formatDiscountType(discountType: string) {
  if (discountType.toLowerCase() === 'percentage') {
    return 'Percentage';
  }

  if (discountType.toLowerCase() === 'fixed_amount') {
    return 'Fixed amount';
  }

  return discountType;
}

export default function DiscountsForm({
  restaurantId,
  restaurantName,
}: DiscountsFormProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<FormMode>('create');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(createInitialFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/coupons?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to fetch coupons');
      }

      setCoupons(data.coupons || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [restaurantId]);

  const filteredCoupons = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return coupons;

    return coupons.filter((coupon) => {
      const searchableText = `${coupon.code} ${coupon.discount_type}`.toLowerCase();
      return searchableText.includes(normalized);
    });
  }, [coupons, search]);

  const openCreateModal = () => {
    setMode('create');
    setSelectedCoupon(null);
    setForm(createInitialFormState());
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setMode('edit');
    setSelectedCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      value: String(Number(coupon.value ?? 0)),
      min_spend: String(Number(coupon.min_spend ?? 0)),
      start_date: toDateTimeLocalInput(coupon.start_date),
      end_date: toDateTimeLocalInput(coupon.end_date),
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setSelectedCoupon(null);
    setForm(createInitialFormState());
    setFormError(null);
  };

  const saveCoupon = async () => {
    const code = form.code.trim().toUpperCase();
    const discountType = form.discount_type.trim();
    const value = normalizeNumber(form.value, NaN);
    const minSpend = normalizeNumber(form.min_spend, NaN);
    const startDateIso = toIsoFromDateTimeInput(form.start_date);
    const endDateIso = form.end_date.trim()
      ? toIsoFromDateTimeInput(form.end_date)
      : null;

    if (!code) {
      setFormError('Coupon code is required.');
      return;
    }

    if (!discountType) {
      setFormError('Discount type is required.');
      return;
    }

    if (!Number.isFinite(value) || value < 0) {
      setFormError('Value must be a valid number greater than or equal to 0.');
      return;
    }

    if (discountType.toLowerCase() === 'percentage' && value > 100) {
      setFormError('Percentage discount cannot be greater than 100.');
      return;
    }

    if (!Number.isFinite(minSpend) || minSpend < 0) {
      setFormError('Minimum spend must be a valid number greater than or equal to 0.');
      return;
    }

    if (!startDateIso) {
      setFormError('Start date must be a valid date and time.');
      return;
    }

    if (form.end_date.trim() && !endDateIso) {
      setFormError('End date must be a valid date and time.');
      return;
    }

    if (endDateIso && Date.parse(endDateIso) < Date.parse(startDateIso)) {
      setFormError('End date must be greater than or equal to start date.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        code,
        discount_type: discountType,
        value,
        min_spend: minSpend,
        usage_limit: null,
        start_date: startDateIso,
        end_date: endDateIso,
        restaurant_id: restaurantId,
      };

      const response = await fetch('/api/coupons', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          mode === 'edit' && selectedCoupon
            ? { coupon_id: selectedCoupon.coupon_id, ...payload }
            : payload,
        ),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to save coupon');
      }

      if (mode === 'create') {
        setCoupons((previous) => [data.coupon, ...previous]);
      } else if (selectedCoupon) {
        setCoupons((previous) =>
          previous.map((coupon) =>
            coupon.coupon_id === selectedCoupon.coupon_id ? data.coupon : coupon,
          ),
        );
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save coupon');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    const shouldDelete = window.confirm(
      `Delete coupon "${coupon.code}"? This action cannot be undone.`,
    );
    if (!shouldDelete) return;

    setDeletingCouponId(coupon.coupon_id);

    try {
      const response = await fetch(
        `/api/coupons?coupon_id=${encodeURIComponent(coupon.coupon_id)}&restaurant_id=${encodeURIComponent(restaurantId)}`,
        {
          method: 'DELETE',
        },
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to delete coupon');
      }

      setCoupons((previous) =>
        previous.filter((entry) => entry.coupon_id !== coupon.coupon_id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete coupon');
    } finally {
      setDeletingCouponId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading discounts...</p>
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
            onClick={fetchCoupons}
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
            <h2 className="text-lg font-semibold text-gray-900">Discount Coupons</h2>
            <p className="text-sm text-gray-600">Manage coupon codes for {restaurantName}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Coupon
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
          placeholder="Search coupons by code or type..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear coupon search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">No coupons yet</h3>
          <p className="mt-2 text-sm text-gray-600">Create your first discount coupon to get started.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            Create Coupon
          </button>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            No coupons match "<span className="font-medium text-gray-800">{search}</span>".
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Min Spend</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">End Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.coupon_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDiscountType(coupon.discount_type)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatDiscountValue(coupon.discount_type, Number(coupon.value || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatCurrency(Number(coupon.min_spend || 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {coupon.start_date ? new Date(coupon.start_date).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {coupon.end_date ? new Date(coupon.end_date).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(coupon)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon)}
                          disabled={deletingCouponId === coupon.coupon_id}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingCouponId === coupon.coupon_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create Coupon' : 'Edit Coupon'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure discount value and active date window.
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
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Coupon Details
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Code *</label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="SAVE20"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Discount Type *</label>
                    <select
                      value={form.discount_type}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          discount_type: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      {form.discount_type === 'percentage' ? 'Value (%)' : 'Value ($)'} *
                    </label>
                    <input
                      type="number"
                      value={form.value}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, value: event.target.value }))
                      }
                      min="0"
                      max={form.discount_type === 'percentage' ? 100 : undefined}
                      step="0.01"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Min Spend ($)</label>
                    <input
                      type="number"
                      value={form.min_spend}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, min_spend: event.target.value }))
                      }
                      min="0"
                      step="0.01"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Active Window
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Start Date *</label>
                    <input
                      type="datetime-local"
                      value={form.start_date}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, start_date: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">End Date</label>
                    <input
                      type="datetime-local"
                      value={form.end_date}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, end_date: event.target.value }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((previous) => ({ ...previous, end_date: '' }))
                      }
                      className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Clear End Date
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-600">
                  Leave end date empty to keep this coupon active until you disable or edit it.
                </p>
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
                onClick={saveCoupon}
                disabled={isSaving}
                className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : mode === 'create' ? 'Create Coupon' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
