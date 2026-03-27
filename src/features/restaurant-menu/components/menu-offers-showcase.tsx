'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuOfferEvaluation } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface MenuOffersShowcaseProps {
  offers: MenuOfferEvaluation[];
}

const DEFAULT_VISIBLE_OFFERS = 3;

export function MenuOffersShowcase({ offers }: MenuOffersShowcaseProps) {
  const [showAllOffers, setShowAllOffers] = useState(false);

  useEffect(() => {
    setShowAllOffers(false);
  }, [offers]);

  if (!offers.length) {
    return null;
  }

  const hasMoreOffers = offers.length > DEFAULT_VISIBLE_OFFERS;
  const visibleOffers = showAllOffers
    ? offers
    : offers.slice(0, DEFAULT_VISIBLE_OFFERS);

  return (
    <section className="rounded-[26px] border border-stone-200 bg-stone-50/70 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Restaurant offers
          </p>
          <h2 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-stone-950 sm:text-[1.55rem]">
            Savings that auto-apply at checkout
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            We automatically apply the best qualifying restaurant offer before gift cards.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {visibleOffers.map((offer) => {
          const highlighted = offer.isBestOffer && offer.isEligible;

          return (
            <article
              key={offer.offerId}
              className={
                highlighted
                  ? 'rounded-[24px] border border-stone-900 bg-stone-950 p-4 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]'
                  : 'rounded-[24px] border border-stone-200 bg-white p-4 text-stone-950 shadow-sm'
              }
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={
                    highlighted
                      ? 'inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white'
                      : offer.isEligible
                        ? 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700'
                        : 'inline-flex rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-600'
                  }
                >
                  {offer.statusLabel}
                </span>
                {offer.discountAmount > 0 ? (
                  <span
                    className={
                      highlighted
                        ? 'shrink-0 text-sm font-semibold text-white'
                        : 'shrink-0 text-sm font-semibold text-emerald-700'
                    }
                  >
                    Save {formatPrice(offer.discountAmount)}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 break-words text-lg font-semibold tracking-tight">
                {offer.headline}
              </h3>
              <p
                className={
                  highlighted
                    ? 'mt-2 break-words text-sm leading-6 text-white/75'
                    : 'mt-2 break-words text-sm leading-6 text-stone-600'
                }
              >
                {offer.description}
              </p>
              <p
                className={
                  highlighted
                    ? 'mt-4 break-words text-sm font-medium leading-6 text-white'
                    : offer.isEligible
                      ? 'mt-4 break-words text-sm font-medium leading-6 text-emerald-700'
                      : 'mt-4 break-words text-sm font-medium leading-6 text-stone-700'
                }
              >
                {offer.helperText}
              </p>
            </article>
          );
        })}
      </div>

      {hasMoreOffers ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAllOffers((current) => !current)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-950 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            {showAllOffers
              ? 'Show fewer offers'
              : `View all ${offers.length} offers`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
