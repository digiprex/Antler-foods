import { CartIcon } from '@/features/restaurant-menu/components/icons';

interface CartButtonProps {
  count: number;
}

export function CartButton({ count }: CartButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
      aria-label={`Open cart with ${count} items`}
    >
      <CartIcon className="h-5 w-5" />
      <span>{count}</span>
    </button>
  );
}
