import { HeartIcon, PlusIcon } from '@/features/restaurant-menu/components/icons';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuItemCardProps {
  item: MenuItem;
  onOpen: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
}

export function MenuItemCard({ item, onOpen, onQuickAdd }: MenuItemCardProps) {
  return (
    <article
      className="group relative grid cursor-pointer gap-5 rounded-[28px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_148px] md:items-start">
        <div className="space-y-3">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight text-slate-950">
              {item.name}
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{formatPrice(item.price)}</span>
              <span className="inline-flex items-center gap-1">
                <HeartIcon className="h-4 w-4" />
                {item.likes}
              </span>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-600 md:text-[15px]">{item.description}</p>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-black/5 bg-[#f4f1ec]">
          <img src={item.image} alt={item.name} className="h-36 w-full object-cover" />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onQuickAdd(item);
            }}
            className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-md transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label={`Add ${item.name}`}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
