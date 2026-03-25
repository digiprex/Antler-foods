'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

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
  percentage_off: number | null;
  amount_off: number | null;
  min_spend: number | null;
  discounted_items: any | null;
  qualifying_items: any | null;
  free_items: any | null;
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
  percentage_off: string;
  amount_off: string;
  min_spend: string;
  discounted_items: any[];
  qualifying_items: any[];
  free_items: any[];
  start_date: string;
  end_date: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
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
    sub_type: 'total_order_value', // Explicitly set the first sub-type for percentage_off
    percentage_off: '',
    amount_off: '',
    min_spend: '',
    discounted_items: [],
    qualifying_items: [],
    free_items: [],
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
          description: 'E.g. 10% off your order when you spend $20'
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
          value: 'total_order_value',
          label: 'Total order value',
          description: 'E.g. 1 $ off your order when you spend $20'
        },
        {
          value: 'selected_items',
          label: 'Selected items',
          description: 'E.g. 1 $ off 12-inch pizzas.'
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
          description: 'E.g. Get a free dessert when you spend $20.'
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
  const [isMounted, setIsMounted] = useState(false);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<Offer | null>(null);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showQualifyingItemSelector, setShowQualifyingItemSelector] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedQualifyingCategories, setExpandedQualifyingCategories] = useState<Set<string>>(new Set());

  const [menuData, setMenuData] = useState<MenuCategory[]>([]);
  const [loadingMenuData, setLoadingMenuData] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoadingMenuData(true);
      
      // Fetch categories with items
      const response = await fetch(
        `/api/categories?restaurant_id=${encodeURIComponent(restaurantId)}&include_items=true`,
      );
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch menu data');
      }

      // Transform the API response to match our MenuCategory interface
      const transformedData: MenuCategory[] = (data.categories || []).map((category: any) => ({
        id: category.category_id,
        name: category.name,
        items: (category.items || []).map((item: any) => ({
          id: item.item_id,
          name: item.name,
          price: item.price || 0,
          category_id: category.category_id,
        })),
      }));

      setMenuData(transformedData);
    } catch (err) {
      console.error('Error fetching menu data:', err);
      // Set empty array on error so the form still works
      setMenuData([]);
    } finally {
      setLoadingMenuData(false);
    }
  };

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
    fetchMenuData();
  }, [restaurantId]);

  // Ensure first sub-type is selected when form loads or type changes
  useEffect(() => {
    if (form.type && (!form.sub_type || form.sub_type === '')) {
      const subTypeOptions = getSubTypeOptions(form.type);
      if (subTypeOptions.length > 0) {
        setForm((previous) => ({
          ...previous,
          sub_type: subTypeOptions[0].value,
        }));
      }
    }
  }, [form.type]);

  const filteredOffers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return offers;

    return offers.filter((offer) => {
      const searchableText = `${offer.name} ${offer.type} ${offer.status}`.toLowerCase();
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
      percentage_off: offer.percentage_off ? String(offer.percentage_off) : '',
      amount_off: offer.amount_off ? String(offer.amount_off) : '',
      min_spend: offer.min_spend ? String(offer.min_spend) : '',
      discounted_items: offer.discounted_items && typeof offer.discounted_items === 'object'
        ? Object.entries(offer.discounted_items).flatMap(([categoryId, itemIds]) => {
            if (!Array.isArray(itemIds)) return [];
            return itemIds.map(itemId => {
              // Find the full item object from menuData using the ID
              for (const category of menuData) {
                const item = category.items.find(item => item.id === itemId);
                if (item) return item;
              }
              return null;
            }).filter(Boolean);
          })
        : [],
      qualifying_items: offer.qualifying_items && typeof offer.qualifying_items === 'object'
        ? Object.entries(offer.qualifying_items).flatMap(([categoryId, itemIds]) => {
            if (!Array.isArray(itemIds)) return [];
            return itemIds.map(itemId => {
              // Find the full item object from menuData using the ID
              for (const category of menuData) {
                const item = category.items.find(item => item.id === itemId);
                if (item) return item;
              }
              return null;
            }).filter(Boolean);
          })
        : [],
      free_items: offer.free_items && typeof offer.free_items === 'object'
        ? Object.entries(offer.free_items).flatMap(([categoryId, itemIds]) => {
            if (!Array.isArray(itemIds)) return [];
            return itemIds.map(itemId => {
              // Find the full item object from menuData using the ID
              for (const category of menuData) {
                const item = category.items.find(item => item.id === itemId);
                if (item) return item;
              }
              return null;
            }).filter(Boolean);
          })
        : [],
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

    if (!form.sub_type) {
      setFormError('Sub type is required.');
      return;
    }

    // Validate conditional fields for percentage off with total order value
    if (form.type === 'percentage_off' && form.sub_type === 'total_order_value') {
      if (!form.min_spend || Number(form.min_spend) <= 0) {
        setFormError('Minimum spend amount is required and must be greater than 0.');
        return;
      }
      if (!form.percentage_off || Number(form.percentage_off) <= 0 || Number(form.percentage_off) > 100) {
        setFormError('Percentage discount is required and must be between 1 and 100.');
        return;
      }
    }

    // Validate conditional fields for amount off with total order value
    if (form.type === 'amount_off' && form.sub_type === 'total_order_value') {
      if (!form.min_spend || Number(form.min_spend) <= 0) {
        setFormError('Minimum spend amount is required and must be greater than 0.');
        return;
      }
      if (!form.amount_off || Number(form.amount_off) <= 0) {
        setFormError('Amount off is required and must be greater than 0.');
        return;
      }
    }

    // Validate conditional fields for percentage off with selected items
    if (form.type === 'percentage_off' && form.sub_type === 'selected_items') {
      if (!Array.isArray(form.discounted_items) || form.discounted_items.length === 0) {
        setFormError('At least one discounted item must be selected.');
        return;
      }
      if (!form.percentage_off || Number(form.percentage_off) <= 0 || Number(form.percentage_off) > 100) {
        setFormError('Percentage discount is required and must be between 1 and 100.');
        return;
      }
    }

    // Validate conditional fields for amount off with selected items
    if (form.type === 'amount_off' && form.sub_type === 'selected_items') {
      if (!Array.isArray(form.discounted_items) || form.discounted_items.length === 0) {
        setFormError('At least one discounted item must be selected.');
        return;
      }
      if (!form.amount_off || Number(form.amount_off) <= 0) {
        setFormError('Amount off is required and must be greater than 0.');
        return;
      }
    }

    // Validate conditional fields for buy 1 get 1 free
    if (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free') {
      if (!Array.isArray(form.qualifying_items) || form.qualifying_items.length === 0) {
        setFormError('At least one qualifying item must be selected.');
        return;
      }
      if (!Array.isArray(form.free_items) || form.free_items.length === 0) {
        setFormError('At least one free item must be selected.');
        return;
      }
    }

    // Validate conditional fields for buy 1 get 1 half price
    if (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_half_price') {
      if (!Array.isArray(form.qualifying_items) || form.qualifying_items.length === 0) {
        setFormError('At least one qualifying item must be selected.');
        return;
      }
    }

    // Validate conditional fields for free item with by buying another item
    if (form.type === 'free_item' && form.sub_type === 'by_buying_another_item') {
      if (!Array.isArray(form.qualifying_items) || form.qualifying_items.length === 0) {
        setFormError('At least one qualifying item must be selected.');
        return;
      }
      if (!Array.isArray(form.free_items) || form.free_items.length === 0) {
        setFormError('At least one free item must be selected.');
        return;
      }
    }

    // Validate conditional fields for free item with by spending fixed amount
    if (form.type === 'free_item' && form.sub_type === 'by_spending_fixed_amount') {
      if (!form.min_spend || Number(form.min_spend) <= 0) {
        setFormError('Minimum spend amount is required and must be greater than 0.');
        return;
      }
      if (!Array.isArray(form.free_items) || form.free_items.length === 0) {
        setFormError('At least one free item must be selected.');
        return;
      }
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
        percentage_off: form.percentage_off ? Number(form.percentage_off) : null,
        amount_off: form.amount_off ? Number(form.amount_off) : null,
        min_spend: form.min_spend ? Number(form.min_spend) : null,
        discounted_items: Array.isArray(form.discounted_items) && form.discounted_items.length > 0
          ? form.discounted_items.reduce((acc, item) => {
              if (!acc[item.category_id]) {
                acc[item.category_id] = [];
              }
              acc[item.category_id].push(item.id);
              return acc;
            }, {} as Record<string, string[]>)
          : null,
        qualifying_items: Array.isArray(form.qualifying_items) && form.qualifying_items.length > 0
          ? form.qualifying_items.reduce((acc, item) => {
              if (!acc[item.category_id]) {
                acc[item.category_id] = [];
              }
              acc[item.category_id].push(item.id);
              return acc;
            }, {} as Record<string, string[]>)
          : null,
        free_items: Array.isArray(form.free_items) && form.free_items.length > 0
          ? form.free_items.reduce((acc, item) => {
              if (!acc[item.category_id]) {
                acc[item.category_id] = [];
              }
              acc[item.category_id].push(item.id);
              return acc;
            }, {} as Record<string, string[]>)
          : null,
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
          percentage_off: offer.percentage_off,
          amount_off: offer.amount_off,
          min_spend: offer.min_spend,
          discounted_items: offer.discounted_items && typeof offer.discounted_items === 'object' ? offer.discounted_items : null,
          qualifying_items: offer.qualifying_items && typeof offer.qualifying_items === 'object' ? offer.qualifying_items : null,
          free_items: offer.free_items && typeof offer.free_items === 'object' ? offer.free_items : null,
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

  const handleDeleteOffer = (offer: Offer) => {
    setOfferToDelete(offer);
    setShowDeleteModal(true);
  };

  const confirmDeleteOffer = async () => {
    if (!offerToDelete) return;

    setDeletingOfferId(offerToDelete.offer_id);
    setShowDeleteModal(false);

    try {
      const response = await fetch(
        `/api/offers?offer_id=${encodeURIComponent(offerToDelete.offer_id)}&restaurant_id=${encodeURIComponent(restaurantId)}`,
        {
          method: 'DELETE',
        },
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to delete offer');
      }

      setOffers((previous) =>
        previous.filter((entry) => entry.offer_id !== offerToDelete.offer_id),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete offer');
    } finally {
      setDeletingOfferId(null);
      setOfferToDelete(null);
    }
  };

  const cancelDeleteOffer = () => {
    setShowDeleteModal(false);
    setOfferToDelete(null);
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
          placeholder="Search offers by name, type, or status..."
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

      {showModal && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
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
                      onChange={(event) => {
                        const newType = event.target.value;
                        const subTypeOptions = getSubTypeOptions(newType);
                        setForm((previous) => ({
                          ...previous,
                          type: newType,
                          sub_type: subTypeOptions.length > 0 ? subTypeOptions[0].value : '', // Auto-select first sub-type
                        }));
                      }}
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
                      <label className="mb-3 block text-sm font-semibold text-gray-700">Sub Type *</label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {getSubTypeOptions(form.type).map((option) => {
                          const isSelected = form.sub_type === option.value;
                          return (
                            <div
                              key={option.value}
                              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:border-purple-300 ${
                                isSelected
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
                                  checked={isSelected}
                                  onChange={() =>
                                    setForm((previous) => ({
                                      ...previous,
                                      sub_type: option.value,
                                    }))
                                  }
                                  className="mt-1 h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500 focus:ring-2"
                                />
                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900">{option.label}</h4>
                                  <p className="mt-1 text-xs text-gray-600">{option.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for percentage off with total order value */}
                  {form.type === 'percentage_off' && form.sub_type === 'total_order_value' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Minimum spend amount *</label>
                          <input
                            type="number"
                            value={form.min_spend}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                min_spend: event.target.value,
                              }))
                            }
                            placeholder="20"
                            min="0"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">% discount *</label>
                          <input
                            type="number"
                            value={form.percentage_off}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                percentage_off: event.target.value,
                              }))
                            }
                            placeholder="10"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for amount off with total order value */}
                  {form.type === 'amount_off' && form.sub_type === 'total_order_value' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Minimum spend amount *</label>
                          <input
                            type="number"
                            value={form.min_spend}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                min_spend: event.target.value,
                              }))
                            }
                            placeholder="20"
                            min="0"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">$ Amount off *</label>
                          <input
                            type="number"
                            value={form.amount_off}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                amount_off: event.target.value,
                              }))
                            }
                            placeholder="5"
                            min="0"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for percentage off with selected items */}
                  {form.type === 'percentage_off' && form.sub_type === 'selected_items' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Discounted items *</label>
                          <button
                            type="button"
                            onClick={() => setShowItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.discounted_items) && form.discounted_items.length > 0
                              ? `${form.discounted_items.length} item(s) selected`
                              : 'Select items...'
                            }
                          </button>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">% discount *</label>
                          <input
                            type="number"
                            value={form.percentage_off}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                percentage_off: event.target.value,
                              }))
                            }
                            placeholder="10"
                            min="0"
                            max="100"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for amount off with selected items */}
                  {form.type === 'amount_off' && form.sub_type === 'selected_items' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Discounted items *</label>
                          <button
                            type="button"
                            onClick={() => setShowItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.discounted_items) && form.discounted_items.length > 0
                              ? `${form.discounted_items.length} item(s) selected`
                              : 'Select items...'
                            }
                          </button>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">$ Amount off *</label>
                          <input
                            type="number"
                            value={form.amount_off}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                amount_off: event.target.value,
                              }))
                            }
                            placeholder="2"
                            min="0"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for buy 1 get 1 free */}
                  {form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Qualifying items *</label>
                          <button
                            type="button"
                            onClick={() => setShowQualifyingItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.qualifying_items) && form.qualifying_items.length > 0
                              ? `${form.qualifying_items.length} qualifying item(s) selected`
                              : 'Select qualifying items...'
                            }
                          </button>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Free items *</label>
                          <button
                            type="button"
                            onClick={() => setShowItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.free_items) && form.free_items.length > 0
                              ? `${form.free_items.length} free item(s) selected`
                              : 'Select free items...'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for buy 1 get 1 half price */}
                  {form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_half_price' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Qualifying items *</label>
                          <button
                            type="button"
                            onClick={() => setShowQualifyingItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.qualifying_items) && form.qualifying_items.length > 0
                              ? `${form.qualifying_items.length} qualifying item(s) selected`
                              : 'Select qualifying items...'
                            }
                          </button>
                          <p className="mt-2 text-xs text-gray-600">
                            Select the category that the customer must choose from to get a discounted item. Customers can select their second item from the qualifying items you've selected. The customer will get the cheapest of the two items at half price.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for free item with by buying another item */}
                  {form.type === 'free_item' && form.sub_type === 'by_buying_another_item' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Qualifying items *</label>
                          <button
                            type="button"
                            onClick={() => setShowQualifyingItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.qualifying_items) && form.qualifying_items.length > 0
                              ? `${form.qualifying_items.length} qualifying item(s) selected`
                              : 'Select qualifying items...'
                            }
                          </button>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Free items *</label>
                          <button
                            type="button"
                            onClick={() => setShowItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.free_items) && form.free_items.length > 0
                              ? `${form.free_items.length} free item(s) selected`
                              : 'Select free items...'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Conditional fields for free item with by spending fixed amount */}
                  {form.type === 'free_item' && form.sub_type === 'by_spending_fixed_amount' && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Minimum spend amount *</label>
                          <input
                            type="number"
                            value={form.min_spend}
                            onChange={(event) =>
                              setForm((previous) => ({
                                ...previous,
                                min_spend: event.target.value,
                              }))
                            }
                            placeholder="20"
                            min="0"
                            step="0.01"
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Free items *</label>
                          <button
                            type="button"
                            onClick={() => setShowItemSelector(true)}
                            className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-left focus:border-purple-500 focus:ring-2 focus:ring-purple-500 hover:bg-gray-50"
                          >
                            {Array.isArray(form.free_items) && form.free_items.length > 0
                              ? `${form.free_items.length} free item(s) selected`
                              : 'Select free items...'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
      , document.body) : null}

      {/* Item Selector Modal */}
      {showItemSelector && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md h-[70vh] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {(form.type === 'free_item' || (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free'))
                  ? 'Select free item(s)'
                  : 'Select discounted item(s)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowItemSelector(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {menuData.map((category) => {
                  const currentItems = (form.type === 'free_item' || (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free'))
                    ? form.free_items
                    : form.discounted_items;
                  return (
                    <div key={category.id}>
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-lg"
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories);
                          if (newExpanded.has(category.id)) {
                            newExpanded.delete(category.id);
                          } else {
                            newExpanded.add(category.id);
                          }
                          setExpandedCategories(newExpanded);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={category.items.every(item =>
                              currentItems.some(selected => selected.id === item.id)
                            )}
                            onChange={(e) => {
                              const fieldName = (form.type === 'free_item' || (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free'))
                                ? 'free_items'
                                : 'discounted_items';
                              if (e.target.checked) {
                                // Select all items in category
                                const newItems = [...currentItems];
                                category.items.forEach(item => {
                                  if (!newItems.some(selected => selected.id === item.id)) {
                                    newItems.push(item);
                                  }
                                });
                                setForm(prev => ({ ...prev, [fieldName]: newItems }));
                              } else {
                                // Deselect all items in category
                                const newItems = currentItems.filter(selected =>
                                  !category.items.some(item => item.id === selected.id)
                                );
                                setForm(prev => ({ ...prev, [fieldName]: newItems }));
                              }
                            }}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm font-medium text-gray-900">{category.name}</span>
                        </div>
                        <svg
                          className={`h-4 w-4 text-gray-400 transition-transform ${
                            expandedCategories.has(category.id) ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      
                      {expandedCategories.has(category.id) && (
                        <div className="ml-6 space-y-1">
                          {category.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={currentItems.some(selected => selected.id === item.id)}
                                  onChange={(e) => {
                                    const fieldName = (form.type === 'free_item' || (form.type === 'buy_1_get_1' && form.sub_type === 'buy_1_get_1_free'))
                                      ? 'free_items'
                                      : 'discounted_items';
                                    if (e.target.checked) {
                                      setForm(prev => ({
                                        ...prev,
                                        [fieldName]: [...currentItems, item]
                                      }));
                                    } else {
                                      setForm(prev => ({
                                        ...prev,
                                        [fieldName]: currentItems.filter(selected => selected.id !== item.id)
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">{item.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 border-t border-gray-200 p-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowItemSelector(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowItemSelector(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Add items
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      {/* Qualifying Item Selector Modal */}
      {showQualifyingItemSelector && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md h-[70vh] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Select qualifying item(s)</h3>
              <button
                type="button"
                onClick={() => setShowQualifyingItemSelector(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {menuData.map((category) => (
                  <div key={category.id}>
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 rounded-lg"
                      onClick={() => {
                        const newExpanded = new Set(expandedQualifyingCategories);
                        if (newExpanded.has(category.id)) {
                          newExpanded.delete(category.id);
                        } else {
                          newExpanded.add(category.id);
                        }
                        setExpandedQualifyingCategories(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={category.items.every(item =>
                            form.qualifying_items.some(selected => selected.id === item.id)
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all items in category
                              const newItems = [...form.qualifying_items];
                              category.items.forEach(item => {
                                if (!newItems.some(selected => selected.id === item.id)) {
                                  newItems.push(item);
                                }
                              });
                              setForm(prev => ({ ...prev, qualifying_items: newItems }));
                            } else {
                              // Deselect all items in category
                              const newItems = form.qualifying_items.filter(selected =>
                                !category.items.some(item => item.id === selected.id)
                              );
                              setForm(prev => ({ ...prev, qualifying_items: newItems }));
                            }
                          }}
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      </div>
                      <svg
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          expandedQualifyingCategories.has(category.id) ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    
                    {expandedQualifyingCategories.has(category.id) && (
                      <div className="ml-6 space-y-1">
                        {category.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={form.qualifying_items.some(selected => selected.id === item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setForm(prev => ({
                                      ...prev,
                                      qualifying_items: [...prev.qualifying_items, item]
                                    }));
                                  } else {
                                    setForm(prev => ({
                                      ...prev,
                                      qualifying_items: prev.qualifying_items.filter(selected => selected.id !== item.id)
                                    }));
                                  }
                                }}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-700">{item.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 border-t border-gray-200 p-4 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowQualifyingItemSelector(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowQualifyingItemSelector(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Add qualifying items
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && offerToDelete && isMounted && typeof document !== 'undefined' && document.body ? createPortal(
        <div className="fixed inset-0 top-0 z-[110] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Delete Offer</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Delete offer "{offerToDelete.name}"? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6">
              <button
                type="button"
                onClick={cancelDeleteOffer}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOffer}
                disabled={deletingOfferId === offerToDelete.offer_id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingOfferId === offerToDelete.offer_id ? 'Deleting...' : 'Delete Offer'}
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
