'use client';

import { PlusIcon } from '@/features/restaurant-menu/components/icons';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface CartRecommendationsRailProps {
  items: MenuItem[];
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  getItemQuantity: (itemId: string) => number;
}

export function CartRecommendationsRail({
  items,
  onOpenItem,
  onQuickAdd,
  getItemQuantity,
}: CartRecommendationsRailProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Recommended
          </p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-stone-950 sm:mt-1 sm:text-lg">
            You may also like
          </h3>
        </div>
      </div>

      <div className="mt-2.5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 sm:mt-3 sm:gap-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const quantityInCart = getItemQuantity(item.id);

          return (
            <article
              key={item.id}
              className="group w-[136px] shrink-0 snap-start cursor-pointer overflow-hidden rounded-[14px] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-[156px] sm:rounded-[18px]"
              onClick={() => onOpenItem(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpenItem(item.id);
                }
              }}
            >
              <div className="relative overflow-hidden bg-stone-100">
                <img
                  src={item.image}
                  alt={item.name}
                  width={156}
                  height={120}
                  loading="lazy"
                  decoding="async"
                  className="h-24 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-28"
                />
                {item.inStock !== false ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onQuickAdd(item);
                    }}
                    className={`absolute bottom-1.5 right-1.5 flex items-center justify-center shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 sm:bottom-2 sm:right-2 ${
                      quantityInCart > 0
                        ? 'h-7 min-w-[2rem] rounded-full bg-stone-900 px-2.5 text-[11px] font-semibold text-stone-50 sm:h-8 sm:min-w-[2.25rem] sm:px-3 sm:text-xs'
                        : 'h-7 w-7 rounded-full border border-stone-200 bg-white text-stone-900 sm:h-8 sm:w-8'
                    }`}
                    aria-label={`Add ${item.name}`}
                  >
                    {quantityInCart > 0 ? quantityInCart : <PlusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                  </button>
                ) : null}
              </div>
              <div className="space-y-1 p-2.5 sm:space-y-1.5 sm:p-3">
                <h4 className="line-clamp-2 text-[13px] font-semibold leading-[1.3] text-stone-950 sm:text-sm sm:leading-5">
                  {item.name}
                </h4>
                <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <span className="text-[13px] font-semibold text-stone-900 sm:text-sm">
                    {formatPrice(item.price)}
                  </span>
                  {item.inStock === false ? (
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 sm:text-[10px]">
                      Sold out
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
