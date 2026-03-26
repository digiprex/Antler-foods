'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuOfferEvaluation } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface CheckoutOffersPanelProps {
  offers: MenuOfferEvaluation[];
  hasManualCoupon: boolean;
}

const DEFAULT_VISIBLE_OFFERS = 3;

export function CheckoutOffersPanel({
  offers,
  hasManualCoupon,
}: CheckoutOffersPanelProps) {
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
    <div className="space-y-3 rounded-[16px] border border-stone-200 bg-stone-50 px-3.5 py-3">
      <div>
        <p className="text-[13px] font-semibold text-slate-950">
          Restaurant offers
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          The best qualifying offer is applied automatically before gift cards.
        </p>
      </div>

      {hasManualCoupon ? (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
          Manual coupons override automatic restaurant offers for this order.
        </div>
      ) : null}

      <div className="space-y-2.5">
        {visibleOffers.map((offer) => (
          <div
            key={offer.offerId}
            className={
              offer.isBestOffer && offer.isEligible && !hasManualCoupon
                ? 'rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-3'
                : 'rounded-[14px] border border-stone-200 bg-white px-3 py-3'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="break-words text-[12px] font-semibold text-slate-950">
                    {offer.headline}
                  </p>
                  <span
                    className={
                      offer.isBestOffer && offer.isEligible && !hasManualCoupon
                        ? 'inline-flex rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700'
                        : offer.isEligible
                          ? 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700'
                          : 'inline-flex rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-600'
                    }
                  >
                    {offer.statusLabel}
                  </span>
                </div>
                <p className="mt-1 break-words text-[11px] leading-5 text-slate-500">
                  {offer.description}
                </p>
              </div>
              {offer.discountAmount > 0 ? (
                <p className="shrink-0 text-[12px] font-semibold text-emerald-700">
                  Save {formatPrice(offer.discountAmount)}
                </p>
              ) : null}
            </div>
            <p
              className={
                offer.isEligible && !hasManualCoupon
                  ? 'mt-2 break-words text-[11px] font-medium leading-5 text-emerald-700'
                  : 'mt-2 break-words text-[11px] font-medium leading-5 text-slate-600'
              }
            >
              {hasManualCoupon && offer.isBestOffer && offer.isEligible
                ? 'Available, but paused while a manual coupon is active.'
                : offer.helperText}
            </p>
          </div>
        ))}
      </div>

      {hasMoreOffers ? (
        <button
          type="button"
          onClick={() => setShowAllOffers((current) => !current)}
          className="inline-flex h-10 items-center justify-center self-start rounded-full border border-stone-300 bg-white px-4 text-[12px] font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          {showAllOffers
            ? 'Show fewer offers'
            : `View all ${offers.length} offers`}
        </button>
      ) : null}
    </div>
  );
}
