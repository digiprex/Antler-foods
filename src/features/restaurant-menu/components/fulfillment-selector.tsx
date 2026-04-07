import {
  BagIcon,
  BikeIcon,
  ChevronDownIcon,
  MapPinIcon,
} from '@/features/restaurant-menu/components/icons';
import { DeliveryAddressInput } from '@/features/restaurant-menu/components/delivery-address-input';
import type { SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';
import type { FulfillmentMode } from '@/features/restaurant-menu/types/restaurant-menu.types';

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
  place_id: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface FulfillmentSelectorProps {
  mode: FulfillmentMode;
  pickupAllowed?: boolean;
  deliveryAllowed?: boolean;
  locationLabel?: string;
  pickupLocationName?: string;
  pickupScheduleLabel?: string;
  deliveryAddress: string;
  onModeSelect: (mode: FulfillmentMode) => void;
  onOpenSchedule?: () => void;
  onDeliveryAddressChange?: (address: string) => void;
  onDeliveryAddressPlaceSelected?: (place: SelectedGooglePlace) => void;
  savedAddresses?: SavedAddress[];
  showSavedAddressPicker?: boolean;
  hasConfirmedAddress?: boolean;
  onSelectSavedAddress?: (addr: SavedAddress) => void;
  onShowSavedAddresses?: () => void;
  onEnterNewAddress?: () => void;
  onChangeAddress?: () => void;
}

export function FulfillmentSelector({
  mode,
  pickupAllowed = true,
  deliveryAllowed = true,
  locationLabel,
  pickupLocationName,
  pickupScheduleLabel,
  deliveryAddress,
  onModeSelect,
  onOpenSchedule,
  onDeliveryAddressChange,
  onDeliveryAddressPlaceSelected,
  savedAddresses = [],
  showSavedAddressPicker = false,
  hasConfirmedAddress = false,
  onSelectSavedAddress,
  onShowSavedAddresses,
  onEnterNewAddress,
  onChangeAddress,
}: FulfillmentSelectorProps) {
  const hasSavedAddresses = savedAddresses.length > 0 && onSelectSavedAddress;

  const deliveryAddressSection = () => {
    // State 1: Confirmed address with change button
    if (hasConfirmedAddress && deliveryAddress.trim()) {
      return (
        <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <MapPinIcon className="h-4 w-4 shrink-0 text-stone-400" />
                Delivery address
              </span>
              <p className="mt-1 pl-6 text-sm text-stone-600">{deliveryAddress}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (hasSavedAddresses && onShowSavedAddresses) {
                  onShowSavedAddresses();
                } else if (onChangeAddress) {
                  onChangeAddress();
                }
              }}
              className="shrink-0 text-xs font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700"
            >
              Change
            </button>
          </div>
        </div>
      );
    }

    // State 2: Saved address picker
    if (showSavedAddressPicker && hasSavedAddresses) {
      return (
        <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Choose a delivery address
          </p>
          <div className="space-y-2">
            {savedAddresses.map((addr) => {
              const isSelected = deliveryAddress.trim() === (addr.address || '').trim();
              return (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => onSelectSavedAddress?.(addr)}
                  className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                    isSelected
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected ? 'border-stone-900' : 'border-stone-300'
                    }`}
                  >
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-stone-900" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-900 truncate">
                        {addr.address}
                      </span>
                      {addr.is_default ? (
                        <span className="shrink-0 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Default
                        </span>
                      ) : null}
                    </span>
                    {(addr.saved_as || addr.house_no || addr.nearby_landmark) ? (
                      <span className="mt-0.5 block text-xs text-stone-500">
                        {[addr.saved_as, addr.house_no, addr.nearby_landmark].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          {onEnterNewAddress ? (
            <button
              type="button"
              onClick={onEnterNewAddress}
              className="mt-3 text-xs font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700"
            >
              Enter a new address
            </button>
          ) : null}
        </div>
      );
    }

    // State 3: Google Places input (default)
    return (
      <div>
        {hasSavedAddresses && onShowSavedAddresses ? (
          <button
            type="button"
            onClick={onShowSavedAddresses}
            className="mb-2 text-xs font-semibold text-stone-900 underline underline-offset-2 hover:text-stone-700"
          >
            Choose from saved addresses
          </button>
        ) : null}
        <DeliveryAddressInput
          value={deliveryAddress}
          onChange={onDeliveryAddressChange || (() => {})}
          onPlaceSelected={onDeliveryAddressPlaceSelected}
        />
      </div>
    );
  };

  if (!pickupAllowed && !deliveryAllowed) {
    return null;
  }

  if (!pickupAllowed && deliveryAllowed) {
    return (
      <section className="space-y-3">
        <div className="rounded-[20px] border border-stone-200 bg-stone-100 p-1">
          <div className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-sm">
            <BikeIcon className="h-4 w-4" />
            Delivery
          </div>
        </div>

        {deliveryAddressSection()}
      </section>
    );
  }

  if (pickupAllowed && !deliveryAllowed) {
    return (
      <section className="space-y-3">
        <div className="rounded-[20px] border border-stone-200 bg-stone-100 p-1">
          <div className="flex h-11 items-center justify-center gap-2 rounded-[16px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-sm">
            <BagIcon className="h-4 w-4" />
            Pickup
          </div>
        </div>

        {onOpenSchedule ? (
          <button
            type="button"
            onClick={onOpenSchedule}
            className="flex min-h-[3.9rem] w-full items-center justify-between gap-3 rounded-[20px] border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                <MapPinIcon className="h-4 w-4 shrink-0 text-stone-400" />
                <span className="truncate">{pickupLocationName || 'Select pickup location'}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-stone-900">
                <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span className="truncate">{pickupScheduleLabel || 'Select date and time'}</span>
              </span>
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-stone-500" />
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 rounded-[20px] border border-stone-200 bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => onModeSelect('pickup')}
          className={`flex h-11 items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
            mode === 'pickup'
              ? 'bg-stone-900 text-stone-50 shadow-sm'
              : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          <BagIcon className="h-4 w-4" />
          Pickup
        </button>
        <button
          type="button"
          onClick={() => onModeSelect('delivery')}
          className={`flex h-11 items-center justify-center gap-2 rounded-[16px] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
            mode === 'delivery'
              ? 'bg-stone-900 text-stone-50 shadow-sm'
              : 'text-stone-600 hover:text-stone-950'
          }`}
        >
          <BikeIcon className="h-4 w-4" />
          Delivery
        </button>
      </div>

      {mode === 'pickup' && onOpenSchedule ? (
        <button
          type="button"
          onClick={onOpenSchedule}
          className="flex min-h-[3.9rem] w-full items-center justify-between gap-3 rounded-[20px] border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <MapPinIcon className="h-4 w-4 shrink-0 text-stone-400" />
              <span className="truncate">{pickupLocationName || 'Select pickup location'}</span>
            </span>
            <span className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-stone-900">
              <svg className="h-4 w-4 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span className="truncate">{pickupScheduleLabel || 'Select date and time'}</span>
            </span>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-stone-500" />
        </button>
      ) : null}

      {mode === 'delivery' ? deliveryAddressSection() : null}
    </section>
  );
}
