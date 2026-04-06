'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from '@/features/restaurant-menu/components/icons';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuItem } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface PopularItemsCarouselProps {
  items: MenuItem[];
  onOpenItem: (itemId: string) => void;
  onQuickAdd: (item: MenuItem) => void;
  getItemQuantity?: (itemId: string) => number;
}

export function PopularItemsCarousel({
  items,
  onOpenItem,
  onQuickAdd,
  getItemQuantity,
}: PopularItemsCarouselProps) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(items.length > 1);

  const updateScrollState = () => {
    const rail = railRef.current;
    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(items.length > 1);
      return;
    }

    const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const currentLeft = Math.min(Math.max(rail.scrollLeft, 0), maxScrollLeft);
    const epsilon = 2;

    setCanScrollLeft(currentLeft > epsilon);
    setCanScrollRight(currentLeft < maxScrollLeft - epsilon);
  };

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const handleScroll = () => {
      updateScrollState();
    };

    const handleResize = () => {
      updateScrollState();
    };

    updateScrollState();
    rail.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            updateScrollState();
          })
        : null;

    resizeObserver?.observe(rail);

    return () => {
      rail.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [items.length]);

  const scrollRail = (direction: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const firstCard =
      rail.firstElementChild instanceof HTMLElement ? rail.firstElementChild : null;
    const computedStyles = window.getComputedStyle(rail);
    const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || '0') || 0;
    const cardWidth = firstCard?.getBoundingClientRect().width || 0;
    const step = cardWidth > 0 ? cardWidth + gap : rail.clientWidth;
    const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
    const currentLeft = Math.min(Math.max(rail.scrollLeft, 0), maxScrollLeft);
    const currentIndex = step > 0 ? Math.round(currentLeft / step) : 0;
    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    const targetLeft = Math.min(Math.max(nextIndex * step, 0), maxScrollLeft);

    rail.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });
  };

  return (
    <section className="space-y-3 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Recommended
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-950 sm:text-[1.7rem]">
            Popular right now
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollRail('left')}
            disabled={!canScrollLeft}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Scroll popular items left"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollRail('right')}
            disabled={!canScrollRight}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Scroll popular items right"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          ref={railRef}
          className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const quantityInCart = getItemQuantity ? getItemQuantity(item.id) : 0;

            return (
              <article
                key={item.id}
                className="group w-[240px] shrink-0 snap-start [scroll-snap-stop:always] cursor-pointer overflow-hidden rounded-[22px] border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                  {item.badge ? (
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-700 shadow-sm">
                      {item.badge}
                    </div>
                  ) : null}
                  <img
                    src={item.image}
                    alt={item.name}
                    width={240}
                    height={160}
                    loading="lazy"
                    decoding="async"
                    className="h-40 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
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
                <div className="space-y-1.5 p-3.5">
                  <h3 className="text-base font-semibold leading-tight text-stone-950">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-stone-900">{formatPrice(item.price)}</span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-stone-500">
                      Popular
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

