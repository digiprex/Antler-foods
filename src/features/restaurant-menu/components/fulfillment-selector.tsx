import {
  BagIcon,
  BikeIcon,
  ChevronDownIcon,
  MapPinIcon,
} from '@/features/restaurant-menu/components/icons';
import { DeliveryAddressInput } from '@/features/restaurant-menu/components/delivery-address-input';
import type { SelectedGooglePlace } from '@/hooks/useGooglePlacesAutocomplete';
import type { FulfillmentMode } from '@/features/restaurant-menu/types/restaurant-menu.types';

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
}: FulfillmentSelectorProps) {
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

        <DeliveryAddressInput
          value={deliveryAddress}
          onChange={onDeliveryAddressChange || (() => {})}
          onPlaceSelected={onDeliveryAddressPlaceSelected}
        />
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

      {mode === 'delivery' ? (
        <DeliveryAddressInput
          value={deliveryAddress}
          onChange={onDeliveryAddressChange || (() => {})}
          onPlaceSelected={onDeliveryAddressPlaceSelected}
        />
      ) : null}
    </section>
  );
}
