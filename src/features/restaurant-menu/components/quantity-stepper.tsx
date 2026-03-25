'use client';

import { MinusIcon, PlusIcon } from '@/features/restaurant-menu/components/icons';

interface QuantityStepperProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

export function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: QuantityStepperProps) {
  return (
    <div className="flex items-center rounded-[16px] border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-10 w-10 items-center justify-center rounded-l-[16px] text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-10 text-center text-sm font-semibold text-stone-900">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-10 w-10 items-center justify-center rounded-r-[16px] text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
