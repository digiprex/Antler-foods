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
    <div className="inline-flex items-center rounded-2xl border border-stone-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-10 w-10 items-center justify-center rounded-l-2xl text-slate-500 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[2.75rem] text-center text-sm font-semibold text-slate-950">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-10 w-10 items-center justify-center rounded-r-2xl text-slate-500 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}