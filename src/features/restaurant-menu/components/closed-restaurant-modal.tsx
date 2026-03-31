'use client';

import { ClockIcon, CalendarIcon } from '@/features/restaurant-menu/components/icons';
import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';

interface ClosedRestaurantModalProps {
  open: boolean;
  restaurantName: string;
  openingText: string;
  onClose: () => void;
  onScheduleOrder: () => void;
}

export function ClosedRestaurantModal({
  open,
  restaurantName,
  openingText,
  onClose,
  onScheduleOrder,
}: ClosedRestaurantModalProps) {
  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[440px]">
      <div className="flex flex-col items-center px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
          <ClockIcon className="h-7 w-7 text-stone-500" />
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight text-stone-950 sm:text-2xl">
          Currently closed
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-stone-500 sm:text-base">
          {restaurantName} is not accepting orders right now.
        </p>

        <p className="mt-1 text-sm font-medium text-stone-700">
          {openingText}
        </p>

        <button
          type="button"
          onClick={onScheduleOrder}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-[0_16px_32px_rgba(28,25,23,0.16)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        >
          <CalendarIcon className="h-4 w-4" />
          Schedule order for later
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-[18px] border border-stone-200 bg-white text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        >
          Browse menu anyway
        </button>
      </div>
    </ModalShell>
  );
}
