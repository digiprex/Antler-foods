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
  const isDeliveryDisabled = !deliveryAddress.trim();

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[760px]">
      <div className="flex max-h-[90vh] flex-col overflow-hidden px-6 py-6 sm:px-8">
        <div className="mb-6 pr-12">
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Select location
          </h2>
        </div>

        <div className="grid grid-cols-2 rounded-[28px] bg-[#f1ede8] p-1.5">
          <button
            type="button"
            onClick={() => onModeChange('pickup')}
            className={`flex h-14 items-center justify-center gap-2 rounded-[22px] text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
              activeMode === 'pickup'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BagIcon className="h-4 w-4" />
            Pickup
          </button>
          <button
            type="button"
            onClick={() => onModeChange('delivery')}
            className={`flex h-14 items-center justify-center gap-2 rounded-[22px] text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
              activeMode === 'delivery'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BikeIcon className="h-4 w-4" />
            Delivery
          </button>
        </div>

        <div className="mt-6 flex-1 overflow-y-auto pb-6">
          {activeMode === 'pickup' ? (
            <div className="space-y-4">
              <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                      {restaurantName}
                    </h3>
                    <p className="text-base font-medium text-amber-500">
                      {selectedLocation.openingText}
                    </p>
                    <p className="inline-flex items-center gap-2 text-base text-slate-700">
                      <MapPinIcon className="h-4 w-4" />
                      {selectedLocation.fullAddress}
                    </p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
                    >
                      See hours
                    </button>
                  </div>
                  <input
                    type="radio"
                    checked
                    onChange={() => onLocationChange(selectedLocation.id)}
                    aria-label={`Select ${selectedLocation.fullAddress}`}
                    className="mt-2 h-6 w-6 accent-black"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-slate-950">Schedule for later</p>
                    <p className="mt-1 text-sm text-slate-500">{selectedScheduleLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onScheduleClick}
                    className="text-base font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
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
                <div className="flex h-16 items-center gap-3 rounded-[24px] border border-black/10 bg-white px-5 shadow-sm">
                  <MapPinIcon className="h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(event) => onDeliveryAddressChange(event.target.value)}
                    placeholder="Search your delivery address"
                    className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={activeMode === 'delivery' && isDeliveryDisabled}
          className="mt-2 flex h-14 items-center justify-center rounded-2xl bg-black text-base font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {activeMode === 'pickup' ? 'View Menu' : 'Next'}
        </button>
      </div>
    </ModalShell>
  );
}
