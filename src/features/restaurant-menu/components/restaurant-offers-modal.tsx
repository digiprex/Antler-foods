'use client';

import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';
import type { MenuOfferEvaluation } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RestaurantOffersModalProps {
  open: boolean;
  offers: MenuOfferEvaluation[];
  hasManualCoupon: boolean;
  onClose: () => void;
}

export function RestaurantOffersModal({
  open,
  offers,
  hasManualCoupon,
  onClose,
}: RestaurantOffersModalProps) {
  const eligibleCount = offers.filter((o) => o.isEligible).length;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-lg"
      panelClassName="border border-stone-200 bg-stone-50 shadow-[0_24px_64px_rgba(15,23,42,0.18)]"
      showTopGlow={false}
    >
      <div className="flex max-h-[80vh] flex-col overflow-hidden">
        {/* Header */}
        <div className="relative overflow-hidden bg-slate-900 px-6 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.12),transparent_60%)]" />
          <div className="relative pr-8">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                Available offers
              </p>
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-[1.4rem]">
              Offers for this order
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/50">
              {eligibleCount > 0
                ? `${eligibleCount} ${eligibleCount === 1 ? 'offer qualifies' : 'offers qualify'} for your current cart.`
                : 'Add more items to unlock available offers.'}
            </p>
          </div>
          {hasManualCoupon ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-xs text-amber-300">
                Restaurant offers are paused while a coupon code is active.
              </p>
            </div>
          ) : null}
        </div>

        {/* Offers list */}
        <div className="overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5">
          {offers.length ? (
            <div className="space-y-3">
              {offers.map((offer) => {
                const isApplied = offer.isBestOffer && offer.isEligible && !hasManualCoupon;
                const isPaused = offer.isBestOffer && offer.isEligible && hasManualCoupon;

                return (
                  <article
                    key={offer.offerId}
                    className={`group relative overflow-hidden rounded-2xl border transition-shadow ${
                      isApplied
                        ? 'border-emerald-200 bg-white shadow-[0_0_0_1px_rgba(16,185,129,0.1),0_4px_16px_rgba(16,185,129,0.08)]'
                        : isPaused
                          ? 'border-amber-200 bg-white'
                          : offer.isEligible
                            ? 'border-stone-200 bg-white hover:shadow-sm'
                            : 'border-stone-200 bg-stone-50'
                    }`}
                  >
                    {/* Applied indicator bar */}
                    {isApplied ? (
                      <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-500" />
                    ) : null}

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Status badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isApplied ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Applied
                              </span>
                            ) : isPaused ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                Paused
                              </span>
                            ) : offer.isEligible ? (
                              <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                {offer.statusLabel}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                {offer.statusLabel}
                              </span>
                            )}
                          </div>

                          {/* Headline */}
                          <h4 className={`mt-2 text-[15px] font-semibold leading-snug ${
                            offer.isEligible ? 'text-slate-900' : 'text-stone-500'
                          }`}>
                            {offer.headline}
                          </h4>

                          {/* Description */}
                          <p className={`mt-1 text-sm leading-relaxed ${
                            offer.isEligible ? 'text-stone-600' : 'text-stone-400'
                          }`}>
                            {offer.description}
                          </p>

                          {/* Helper text */}
                          <p className={`mt-2 text-xs leading-5 ${
                            isApplied
                              ? 'text-emerald-700'
                              : isPaused
                                ? 'text-amber-600'
                                : offer.isEligible
                                  ? 'text-emerald-600'
                                  : 'text-stone-400'
                          }`}>
                            {isPaused
                              ? 'Available, but paused while a coupon code is active.'
                              : offer.helperText}
                          </p>
                        </div>

                        {/* Savings badge */}
                        {offer.discountAmount > 0 ? (
                          <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${
                            isApplied
                              ? 'bg-emerald-600'
                              : offer.isEligible
                                ? 'bg-emerald-50'
                                : 'bg-stone-100'
                          }`}>
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                              isApplied ? 'text-emerald-200' : offer.isEligible ? 'text-emerald-600' : 'text-stone-400'
                            }`}>
                              Save
                            </p>
                            <p className={`text-base font-bold ${
                              isApplied ? 'text-white' : offer.isEligible ? 'text-emerald-700' : 'text-stone-500'
                            }`}>
                              {formatPrice(offer.discountAmount)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
                <svg className="h-6 w-6 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <h4 className="mt-4 text-sm font-semibold text-slate-900">No offers right now</h4>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-500">
                When this restaurant publishes promotions, they&apos;ll appear here automatically.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 bg-white px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
