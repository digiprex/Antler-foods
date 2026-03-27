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
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      panelClassName="border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)]"
      showTopGlow={false}
    >
      <div className="flex max-h-[80vh] flex-col overflow-hidden bg-white">
        <div className="border-b border-stone-200 px-4 py-3.5 sm:px-4 sm:py-4">
          <div className="space-y-1 pr-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Restaurant offers
            </p>
            <h3 className="text-[1.2rem] font-semibold text-slate-950 sm:text-[1.35rem]">
              Offers for this order
            </h3>
            <p className="text-[13px] leading-6 text-stone-600">
              Only one restaurant offer auto-applies at a time. Manual coupons override automatic restaurant offers.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-3.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-4 sm:py-4">
          {offers.length ? (
            <div className="space-y-3">
              {offers.map((offer) => {
                const highlighted = offer.isBestOffer && offer.isEligible && !hasManualCoupon;

                return (
                  <article
                    key={offer.offerId}
                    className={
                      highlighted
                        ? 'rounded-[18px] border border-emerald-200 bg-emerald-50 p-3.5'
                        : 'rounded-[18px] border border-stone-200 bg-white p-3.5 shadow-sm'
                    }
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              highlighted
                                ? 'inline-flex rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700'
                                : offer.isEligible
                                  ? 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700'
                                  : 'inline-flex rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600'
                            }
                          >
                            {offer.statusLabel}
                          </span>
                          {highlighted ? (
                            <span className="inline-flex rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                              Applied now
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-2.5 break-words text-[0.98rem] font-semibold text-slate-950">
                          {offer.headline}
                        </h4>
                        <p className="mt-1 break-words text-[13px] text-stone-600">
                          {offer.description}
                        </p>
                        <p
                          className={
                            highlighted
                              ? 'mt-2.5 break-words text-[13px] font-medium leading-6 text-emerald-800'
                              : offer.isEligible && !hasManualCoupon
                                ? 'mt-2.5 break-words text-[13px] font-medium leading-6 text-emerald-700'
                                : 'mt-2.5 break-words text-[13px] font-medium leading-6 text-stone-600'
                          }
                        >
                          {hasManualCoupon && offer.isBestOffer && offer.isEligible
                            ? 'Available, but paused while a manual coupon is active.'
                            : offer.helperText}
                        </p>
                      </div>

                      {offer.discountAmount > 0 ? (
                        <div className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[13px] font-semibold text-emerald-900">
                          Save {formatPrice(offer.discountAmount)}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-7 text-center">
              <h4 className="text-[1.05rem] font-semibold text-slate-950">No active restaurant offers right now</h4>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                When this restaurant publishes new offers, they will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
