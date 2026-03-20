import {
  BagIcon,
  BikeIcon,
  ChevronDownIcon,
  MapPinIcon,
} from '@/features/restaurant-menu/components/icons';
import { DeliveryAddressInput } from '@/features/restaurant-menu/components/delivery-address-input';
import type { FulfillmentMode } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface FulfillmentSelectorProps {
  mode: FulfillmentMode;
  locationLabel?: string;
  deliveryAddress: string;
  onModeSelect: (mode: FulfillmentMode) => void;
  onOpenSchedule?: () => void;
  onDeliveryAddressChange?: (address: string) => void;
}

export function FulfillmentSelector({
  mode,
  locationLabel,
  deliveryAddress,
  onModeSelect,
  onOpenSchedule,
  onDeliveryAddressChange,
}: FulfillmentSelectorProps) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 rounded-[24px] bg-[#e8e4de] p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => onModeSelect('pickup')}
          className={`flex h-14 items-center justify-center gap-2 rounded-[20px] text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
            mode === 'pickup'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BagIcon className="h-4 w-4" />
          Pickup
        </button>
        <button
          type="button"
          onClick={() => onModeSelect('delivery')}
          className={`flex h-14 items-center justify-center gap-2 rounded-[20px] text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
            mode === 'delivery'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BikeIcon className="h-4 w-4" />
          Delivery
        </button>
      </div>

      {mode === 'pickup' && onOpenSchedule && (
        <button
          type="button"
          onClick={onOpenSchedule}
          className="flex h-16 w-full items-center justify-between gap-3 rounded-[24px] border border-black/10 bg-white px-5 text-left shadow-sm transition hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f1ec] text-slate-700">
              <MapPinIcon className="h-5 w-5" />
            </span>
            <span className="truncate text-base font-semibold text-slate-900">
              {locationLabel || 'Select pickup date & time'}
            </span>
          </span>
          <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-500" />
        </button>
      )}

      {mode === 'delivery' && (
        <DeliveryAddressInput
          value={deliveryAddress}
          onChange={onDeliveryAddressChange || (() => {})}
        />
      )}
    </section>
  );
}
