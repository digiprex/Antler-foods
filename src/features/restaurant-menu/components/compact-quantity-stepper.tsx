import { MinusIcon, PlusIcon } from '@/features/restaurant-menu/components/icons';

interface CompactQuantityStepperProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

export function CompactQuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: CompactQuantityStepperProps) {
  return (
    <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-9 w-9 items-center justify-center rounded-l-xl text-slate-500 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:h-8 sm:w-8"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-3 w-3" />
      </button>
      <span className="min-w-[2.25rem] text-center text-[13px] font-semibold text-slate-950 sm:min-w-[2rem] sm:text-xs">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-9 w-9 items-center justify-center rounded-r-xl text-slate-500 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:h-8 sm:w-8"
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-3 w-3" />
      </button>
    </div>
  );
}
