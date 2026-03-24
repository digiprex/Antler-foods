import { PlusIcon } from '@/features/restaurant-menu/components/icons';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuItemCardProps {
  item: MenuItem;
  quantityInCart?: number;
  onOpen: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
}

export function MenuItemCard({
  item,
  quantityInCart = 0,
  onOpen,
  onQuickAdd,
}: MenuItemCardProps) {
  return (
    <article
      className="group relative grid cursor-pointer gap-3 overflow-hidden rounded-[24px] border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => onOpen(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item.id);
        }
      }}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_132px] md:items-start">
        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold leading-tight text-stone-950">
              {item.name}
            </h3>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="font-semibold text-stone-900">{formatPrice(item.price)}</span>
              {item.badge ? (
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600">
                  {item.badge}
                </span>
              ) : null}
            </div>
          </div>
          <p className="line-clamp-2 text-sm leading-5 text-stone-600">{item.description}</p>
        </div>

        <div className="relative overflow-hidden rounded-[18px] bg-stone-100">
          <img src={item.image} alt={item.name} className="h-32 w-full object-cover transition duration-500 group-hover:scale-105" />
          {item.inStock !== false ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuickAdd(item);
              }}
              className={`absolute bottom-3 right-3 flex items-center justify-center shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                quantityInCart > 0
                  ? 'h-9 min-w-[2.5rem] rounded-full bg-stone-900 px-3.5 text-sm font-semibold text-stone-50'
                  : 'h-9 w-9 rounded-full border border-stone-200 bg-white text-stone-900'
              }`}
              aria-label={`Add ${item.name}`}
            >
              {quantityInCart > 0 ? quantityInCart : <PlusIcon className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
