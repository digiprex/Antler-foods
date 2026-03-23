'use client';

import { useRef } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  PlusIcon,
} from '@/features/restaurant-menu/components/icons';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface PopularItemsCarouselProps {
  items: MenuItem[];
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
}

export function PopularItemsCarousel({
  items,
  onOpenItem,
  onQuickAdd,
}: PopularItemsCarouselProps) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollRail = (direction: 'left' | 'right') => {
    railRef.current?.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900">
          Popular
        </h2>
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollRail('left')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-200"
            aria-label="Scroll popular items left"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail('right')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-200"
            aria-label="Scroll popular items right"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="group w-[250px] shrink-0 cursor-pointer rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
            <div className="relative overflow-hidden rounded-t-2xl bg-stone-100">
              {item.badge ? (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-stone-700 shadow-sm">
                  {item.badge}
                </div>
              ) : null}
              <img src={item.image} alt={item.name} className="h-40 w-full object-cover transition duration-300 group-hover:scale-105" />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickAdd(item);
                }}
                className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-stone-900 shadow-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-200"
                aria-label={`Add ${item.name}`}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <h3 className="mb-1 text-lg font-semibold text-stone-900">
                {item.name}
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-900">{formatPrice(item.price)}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  <HeartIcon className="h-3 w-3" />
                  {item.likes}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
