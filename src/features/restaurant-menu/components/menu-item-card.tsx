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
      className="group relative grid cursor-pointer gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_136px] md:items-start">
        <div className="space-y-2">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-stone-900">
              {item.name}
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-stone-900">{formatPrice(item.price)}</span>
            </div>
          </div>
          <p className="text-sm text-stone-600">{item.description}</p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-stone-100">
          <img src={item.image} alt={item.name} className="h-32 w-full object-cover transition duration-300 group-hover:scale-105" />
          {item.inStock !== false ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuickAdd(item);
              }}
              className={`absolute bottom-2 right-2 flex items-center justify-center shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 ${
                quantityInCart > 0
                  ? 'h-10 min-w-[2.5rem] rounded-2xl bg-black px-3 text-sm font-semibold text-white'
                  : 'h-8 w-8 rounded-full bg-white text-stone-900'
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