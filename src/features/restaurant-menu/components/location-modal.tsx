import {
  BagIcon,
  BikeIcon,
  MapPinIcon,
} from '@/features/restaurant-menu/components/icons';
import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import type {
  FulfillmentMode,
  RestaurantLocation,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface LocationModalProps {
  open: boolean;
  restaurantName: string;
  locations: RestaurantLocation[];
  pickupAllowed?: boolean;
  activeMode: FulfillmentMode;
  selectedLocationId: string;
  deliveryAddress: string;
  selectedScheduleLabel: string;
  onClose: () => void;
  onModeChange: (mode: FulfillmentMode) => void;
  onLocationChange: (locationId: string) => void;
  onDeliveryAddressChange: (value: string) => void;
  onScheduleClick: () => void;
  onConfirm: () => void;
}

export function LocationModal({
  open,
  restaurantName,
  locations,
  pickupAllowed = true,
  activeMode,
  selectedLocationId,
  deliveryAddress,
  selectedScheduleLabel,
  onClose,
  onModeChange,
  onLocationChange,
  onDeliveryAddressChange,
  onScheduleClick,
  onConfirm,
}: LocationModalProps) {
  const selectedLocation =
    locations.find((location) => location.id === selectedLocationId) || locations[0];
  const resolvedActiveMode: FulfillmentMode =
    pickupAllowed || activeMode === 'delivery' ? activeMode : 'delivery';
  const isDeliveryDisabled = !deliveryAddress.trim();

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[760px]">
      <div className="flex max-h-[88vh] flex-col overflow-hidden px-5 py-5 sm:px-6">
        <div className="mb-6 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Order setup
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Select location
          </h2>
        </div>

        {pickupAllowed ? (
          <div className="grid grid-cols-2 rounded-[20px] border border-stone-200 bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => onModeChange('pickup')}
              className={`flex h-12 items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                resolvedActiveMode === 'pickup'
                  ? 'bg-stone-900 text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BagIcon className="h-4 w-4" />
              Pickup
            </button>
            <button
              type="button"
              onClick={() => onModeChange('delivery')}
              className={`flex h-12 items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                resolvedActiveMode === 'delivery'
                  ? 'bg-stone-900 text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BikeIcon className="h-4 w-4" />
              Delivery
            </button>
          </div>
        ) : (
          <div className="rounded-[20px] border border-stone-200 bg-stone-100 p-1">
            <div className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]">
              <BikeIcon className="h-4 w-4" />
              Delivery
            </div>
          </div>
        )}

        <div className="mt-6 flex-1 overflow-y-auto pb-6">
          {resolvedActiveMode === 'pickup' ? (
            <div className="space-y-4">
              <div className="rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold tracking-tight text-stone-950">
                      {restaurantName}
                    </h3>
                    <p className="text-sm font-medium text-amber-600">
                      {selectedLocation.openingText}
                    </p>
                    <p className="inline-flex items-center gap-2 text-base text-stone-700">
                      <MapPinIcon className="h-4 w-4" />
                      {selectedLocation.fullAddress}
                    </p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-stone-900 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-900"
                    >
                      See hours
                    </button>
                  </div>
                  <input
                    type="radio"
                    checked
                    onChange={() => onLocationChange(selectedLocation.id)}
                    aria-label={`Select ${selectedLocation.fullAddress}`}
                    className="mt-2 h-6 w-6 accent-stone-900"
                  />
                </div>
              </div>

              <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-stone-950">Schedule for later</p>
                    <p className="mt-1 text-sm text-stone-500">{selectedScheduleLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onScheduleClick}
                    className="rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-900 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="sr-only">Delivery address</span>
                <div className="flex min-h-[4rem] items-center gap-3 rounded-[20px] border border-stone-200 bg-white px-4 py-3.5 shadow-sm">
                  <MapPinIcon className="h-5 w-5 text-stone-400" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(event) => onDeliveryAddressChange(event.target.value)}
                    placeholder="Search your delivery address"
                    className="w-full bg-transparent text-base text-stone-900 outline-none placeholder:text-stone-400"
                  />
                </div>
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={resolvedActiveMode === 'delivery' && isDeliveryDisabled}
          className="mt-2 flex h-12 items-center justify-center rounded-[18px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-[0_16px_32px_rgba(15,23,42,0.16)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
        >
          {resolvedActiveMode === 'pickup' ? 'View menu' : 'Next'}
        </button>
      </div>
    </ModalShell>
  );
}
