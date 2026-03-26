'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface OrderSettingsFormProps {
  restaurantId: string;
  restaurantName: string;
}

export default function OrderSettingsForm({
  restaurantId,
  restaurantName,
}: OrderSettingsFormProps) {
  const [allowTips, setAllowTips] = useState(true);
  const [pickupAllowed, setPickupAllowed] = useState(true);
  const [deliveryAllowed, setDeliveryAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/order-settings?restaurant_id=${encodeURIComponent(restaurantId)}`,
        );
        const payload = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: {
                allow_tips?: boolean;
                pickup_allowed?: boolean;
                delivery_allowed?: boolean;
              };
              error?: string;
            }
          | null;

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load order settings.');
        }

        if (!active) {
          return;
        }

        setAllowTips(payload.data?.allow_tips ?? true);
        setPickupAllowed(payload.data?.pickup_allowed ?? true);
        setDeliveryAllowed(payload.data?.delivery_allowed ?? true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load order settings.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/order-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          allow_tips: allowTips,
          pickup_allowed: pickupAllowed,
          delivery_allowed: deliveryAllowed,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save order settings.');
      }

      toast.success('Order settings saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save order settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading order settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Ordering Preferences</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage tip and fulfillment availability for {restaurantName}.
          </p>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Allow tips</p>
            <p className="mt-1 text-xs text-gray-600">
              When enabled, tip options will appear on the checkout page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowTips}
            onClick={() => setAllowTips((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              allowTips ? 'bg-purple-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                allowTips ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Pickup allowed</p>
            <p className="mt-1 text-xs text-gray-600">
              When disabled, pickup is hidden on menu, cart, and checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pickupAllowed}
            onClick={() => setPickupAllowed((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              pickupAllowed ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                pickupAllowed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Delivery allowed</p>
            <p className="mt-1 text-xs text-gray-600">
              When disabled, delivery is hidden on menu, cart, and checkout.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={deliveryAllowed}
            onClick={() => setDeliveryAllowed((current) => !current)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              deliveryAllowed ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                deliveryAllowed ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

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
