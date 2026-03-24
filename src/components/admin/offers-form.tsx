'use client';

import { useEffect, useMemo, useState } from 'react';

interface Offer {
  offer_id: string;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date: string | null;
  name: string;
  type: string;
  sub_type: string | null;
  status: string;
  details: string;
  restaurant_id: string;
}

interface OffersFormProps {
  restaurantId: string;
  restaurantName: string;
}

type FormMode = 'create' | 'edit';

interface OfferFormState {
  name: string;
  type: string;
  sub_type: string;
  details: string;
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

function createInitialFormState(): OfferFormState {
  return {
    name: '',
    type: 'percentage_off',
    sub_type: '',
    details: '',
    start_date: nowDateTimeLocalInput(),
    end_date: '',
  };
}

function formatOfferType(type: string) {
  switch (type) {
    case 'percentage_off':
      return 'Percentage off';
    case 'amount_off':
      return 'Amount off';
    case 'buy_1_get_1':
      return 'Buy 1, get 1';
    case 'free_item':
      return 'Free item';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
}

function formatOfferStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function getStatusBadgeColor(status: string) {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getSubTypeOptions(type: string): { value: string; label: string; description: string }[] {
  switch (type) {
    case 'percentage_off':
      return [
        {
          value: 'total_order_value',
          label: 'Total order value',
          description: 'E.g. 10% off your order when you spend 20 $'
        },
        {
          value: 'selected_items',
          label: 'Selected items',
          description: 'E.g. 10% off 12-inch pizzas.'
        },
      ];
    case 'amount_off':
      return [
        {
          value: 'selected_items',
          label: 'Selected items',
          description: 'E.g. 1 $ off 12-inch pizzas.'
        },
        {
          value: 'total_order_value',
          label: 'Total order value',
          description: 'E.g. 1 $ off your order when you spend 20 $'
        },
      ];
    case 'buy_1_get_1':
      return [
        {
          value: 'buy_1_get_1_free',
          label: 'Buy 1 get 1 free',
          description: 'E.g. Buy 1 pizza get another pizza free. The cheapest pizza is discounted.'
        },
        {
          value: 'buy_1_get_1_half_price',
          label: 'Buy 1 get 1 half price',
          description: 'E.g. Buy 1 pizza get another price half price, the cheapest pizza is discounted.'
        },
      ];
    case 'free_item':
      return [
        {
          value: 'by_buying_another_item',
          label: 'By buying another item',
          description: 'E.g. Get a free drink when you order a meal.'
        },
        {
          value: 'by_spending_fixed_amount',
          label: 'By spending fixed $ amount',
          description: 'E.g. Get a free dessert when you spend 20 $.'
        },
      ];
    default:
      return [];
  }
}

export default function OffersForm({
  restaurantId,
  restaurantName,
}: OffersFormProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<FormMode>('create');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferFormState>(createInitialFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/offers?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to fetch offers');
      }

      setOffers(data.offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [restaurantId]);

  const filteredOffers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return offers;

    return offers.filter((offer) => {
      const searchableText = `${offer.name} ${offer.details} ${offer.type} ${offer.status}`.toLowerCase();
      return searchableText.includes(normalized);
    });
  }, [offers, search]);

  const openCreateModal = () => {
    setMode('create');
    setSelectedOffer(null);
    setForm(createInitialFormState());
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (offer: Offer) => {
    setMode('edit');
    setSelectedOffer(offer);
    setForm({
      name: offer.name,
      type: offer.type,
      sub_type: offer.sub_type || '',
      details: offer.details,
      start_date: toDateTimeLocalInput(offer.start_date),
      end_date: toDateTimeLocalInput(offer.end_date),
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setShowModal(false);
    setSelectedOffer(null);
    setForm(createInitialFormState());
    setFormError(null);
  };

  const saveOffer = async () => {
    const name = form.name.trim();
    const type = form.type.trim();
    const details = form.details.trim();
    const startDateIso = toIsoFromDateTimeInput(form.start_date);
    const endDateIso = form.end_date.trim()
      ? toIsoFromDateTimeInput(form.end_date)
      : null;

    if (!name) {
      setFormError('Offer name is required.');
      return;
    }

    if (!type) {
      setFormError('Offer type is required.');
      return;
    }

    if (!details) {
      setFormError('Offer details are required.');
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
        name,
        type,
        sub_type: form.sub_type || null,
        status: 'active', // Always set to active by default
        details,
        start_date: startDateIso,
        end_date: endDateIso,
        restaurant_id: restaurantId,
      };

      const response = await fetch('/api/offers', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          mode === 'edit' && selectedOffer
            ? { offer_id: selectedOffer.offer_id, ...payload }
            : payload,
        ),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to save offer');
      }

      if (mode === 'create') {
        setOffers((previous) => [data.offer, ...previous]);
      } else if (selectedOffer) {
        setOffers((previous) =>
          previous.map((offer) =>
            offer.offer_id === selectedOffer.offer_id ? data.offer : offer,
          ),
        );
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOfferStatus = async (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    
    try {
      const response = await fetch('/api/offers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offer_id: offer.offer_id,
          name: offer.name,
          type: offer.type,
          sub_type: offer.sub_type,
          status: newStatus,
          details: offer.details,
          start_date: offer.start_date,
          end_date: offer.end_date,
          restaurant_id: restaurantId,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Failed to ${action} offer`);
      }

      setOffers((previous) =>
        previous.map((entry) =>
          entry.offer_id === offer.offer_id ? data.offer : entry,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} offer`);
    }
  };

  const handleDeleteOffer = async (offer: Offer) => {
    const shouldDelete = window.confirm(
      `Delete offer "${offer.name}"? This action cannot be undone.`,
    );
    if (!shouldDelete) return;

    setDeletingOfferId(offer.offer_id);

    try {
      const response = await fetch(
        `/api/offers?offer_id=${encodeURIComponent(offer.offer_id)}&restaurant_id=${encodeURIComponent(restaurantId)}`,
        {
          method: 'DELETE',
        },
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to delete offer');
      }

      setOffers((previous) =>
        previous.filter((entry) => entry.offer_id !== offer.offer_id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete offer');
    } finally {
      setDeletingOfferId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading offers...</p>
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
            onClick={fetchOffers}
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
            <h2 className="text-lg font-semibold text-gray-900">Special Offers</h2>
            <p className="text-sm text-gray-600">Manage promotional offers for {restaurantName}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Offer
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
          placeholder="Search offers by name, details, type, or status..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear offer search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {offers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">No offers yet</h3>
          <p className="mt-2 text-sm text-gray-600">Create your first promotional offer to get started.</p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            Create Offer
          </button>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            No offers match "<span className="font-medium text-gray-800">{search}</span>".
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">End Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOffers.map((offer) => (
                  <tr key={offer.offer_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                        {offer.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatOfferType(offer.type)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getStatusBadgeColor(offer.status)}`}>
                        {formatOfferStatus(offer.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">{offer.details}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {offer.start_date ? new Date(offer.start_date).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {offer.end_date ? new Date(offer.end_date).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleOfferStatus(offer)}
                          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            offer.status === 'active'
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(offer)}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(offer)}
                          disabled={deletingOfferId === offer.offer_id}
                          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingOfferId === offer.offer_id ? 'Deleting...' : 'Delete'}
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
          <div className="w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {mode === 'create' ? 'Create Offer' : 'Edit Offer'}
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Configure promotional offer details and active date window.
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
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Offer Details
                </p>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Buy One Get One Free"
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Type *</label>
                    <select
                      value={form.type}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          type: event.target.value,
                          sub_type: '', // Reset sub_type when type changes
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="percentage_off">Percentage off</option>
                      <option value="amount_off">Amount off</option>
                      <option value="buy_1_get_1">Buy 1, get 1</option>
                      <option value="free_item">Free item</option>
                    </select>
                  </div>
                  {form.type && getSubTypeOptions(form.type).length > 0 && (
                    <div className="mt-4">
                      <label className="mb-3 block text-sm font-semibold text-gray-700">Sub Type</label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {getSubTypeOptions(form.type).map((option) => (
                          <div
                            key={option.value}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:border-purple-300 ${
                              form.sub_type === option.value
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white'
                            }`}
                            onClick={() =>
                              setForm((previous) => ({
                                ...previous,
                                sub_type: option.value,
                              }))
                            }
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="sub_type"
                                value={option.value}
                                checked={form.sub_type === option.value}
                                onChange={() =>
                                  setForm((previous) => ({
                                    ...previous,
                                    sub_type: option.value,
                                  }))
                                }
                                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">{option.label}</h4>
                                <p className="mt-1 text-xs text-gray-600">{option.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Details *</label>
                    <textarea
                      value={form.details}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          details: event.target.value,
                        }))
                      }
                      placeholder="Get a free item when you purchase any main course. Valid for dine-in and takeaway orders."
                      rows={3}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
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
                  Leave end date empty to keep this offer active until you disable or edit it.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 flex-shrink-0">
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
                onClick={saveOffer}
                disabled={isSaving}
                className="h-11 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : mode === 'create' ? 'Create Offer' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}