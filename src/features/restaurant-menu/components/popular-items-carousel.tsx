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
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          Most popular
        </h2>
        <div className="hidden items-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => scrollRail('left')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 transition hover:border-black/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Scroll popular items left"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail('right')}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-700 transition hover:border-black/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Scroll popular items right"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="flex gap-5 overflow-x-auto pb-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="group w-[262px] shrink-0 cursor-pointer rounded-[28px] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
            <div className="relative overflow-hidden rounded-[24px] bg-[#f4f1ec]">
              {item.badge ? (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
                  {item.badge}
                </div>
              ) : null}
              <img src={item.image} alt={item.name} className="h-56 w-full object-cover" />
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
            <div className="space-y-1 px-1 pb-1 pt-4">
              <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
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
          </article>
        ))}
      </div>
    </section>
  );
}
