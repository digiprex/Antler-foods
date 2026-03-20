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
    <div className="flex items-center rounded-2xl border border-black/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-14 w-14 items-center justify-center rounded-l-2xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <span className="min-w-14 text-center text-lg font-semibold text-slate-900">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-14 w-14 items-center justify-center rounded-r-2xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
