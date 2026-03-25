'use client';

import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import { formatPrice } from '@/features/restaurant-menu/lib/format-price';

export interface CheckoutCouponOffer {
  couponId: string;
  code: string;
  discountType: 'percent' | 'amount';
  value: number;
  minSpend: number;
  discountAmount: number;
  isEligible: boolean;
  title: string;
  description: string;
  helperText: string;
  savingsText: string;
  isBestOffer: boolean;
}

interface CouponPickerModalProps {
  open: boolean;
  loading: boolean;
  coupons: CheckoutCouponOffer[];
  appliedCouponCode: string | null;
  error: string | null;
  onClose: () => void;
  onApply: (coupon: CheckoutCouponOffer) => void;
  onRemove: () => void;
}

export function CouponPickerModal({
  open,
  loading,
  coupons,
  appliedCouponCode,
  error,
  onClose,
  onApply,
  onRemove,
}: CouponPickerModalProps) {
  const eligibleCount = coupons.filter((coupon) => coupon.isEligible).length;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      panelClassName="border border-stone-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.16)]"
      showTopGlow={false}
    >
      <div className="flex max-h-[84vh] flex-col overflow-hidden bg-white">
        <div className="border-b border-stone-200 px-4 py-4 sm:px-5 sm:py-5">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Offers
            </p>
            <h3 className="text-[1.35rem] font-semibold text-slate-950 sm:text-[1.55rem]">
              Restaurant coupons
            </h3>
            <p className="text-sm leading-6 text-stone-600">
              Pick the best coupon for this order and apply it instantly.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {error ? (
            <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="animate-pulse rounded-[20px] border border-stone-200 bg-stone-50 p-4">
                  <div className="h-4 w-24 rounded-full bg-stone-200" />
                  <div className="mt-3 h-6 w-40 rounded-full bg-stone-200" />
                  <div className="mt-3 h-4 w-full rounded-full bg-stone-200" />
                  <div className="mt-2 h-4 w-2/3 rounded-full bg-stone-200" />
                </div>
              ))}
            </div>
          ) : coupons.length ? (
            <div className="space-y-3">
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {eligibleCount > 0
                  ? `${eligibleCount} offer${eligibleCount === 1 ? '' : 's'} ready to apply for this order.`
                  : 'Coupons are available, but your subtotal does not meet the current offer conditions.'}
              </div>

              {coupons.map((coupon) => {
                const isApplied = appliedCouponCode === coupon.code;

                return (
                  <article
                    key={coupon.couponId}
                    className={`rounded-[20px] border p-4 transition sm:p-4.5 ${
                      coupon.isEligible
                        ? 'border-stone-200 bg-white shadow-sm'
                        : 'border-stone-200 bg-stone-50/70'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
                            {coupon.code}
                          </span>
                          {coupon.isBestOffer ? (
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                              Best offer
                            </span>
                          ) : null}
                          {isApplied ? (
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                              Applied
                            </span>
                          ) : null}
                        </div>
                        <h4 className="mt-3 text-[1.05rem] font-semibold text-slate-950">
                          {coupon.title}
                        </h4>
                        <p className="mt-1 text-sm text-stone-600">
                          {coupon.description}
                        </p>
                        <p className={`mt-3 text-sm leading-6 ${coupon.isEligible ? 'text-emerald-800' : 'text-stone-600'}`}>
                          {coupon.helperText}
                        </p>
                      </div>

                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <div className={`rounded-full px-3 py-1 text-sm font-semibold ${coupon.isEligible ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'}`}>
                          {coupon.savingsText}
                        </div>
                        {isApplied ? (
                          <button
                            type="button"
                            onClick={onRemove}
                            className="inline-flex h-10 items-center justify-center rounded-[14px] border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-stone-400 hover:bg-stone-50"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onApply(coupon)}
                            disabled={!coupon.isEligible}
                            className={`inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${coupon.isEligible ? 'bg-black text-white hover:bg-stone-800' : 'cursor-not-allowed bg-stone-200 text-stone-500'}`}
                          >
                            {coupon.isEligible ? 'Apply' : 'Unavailable'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-stone-200 bg-stone-50 px-5 py-8 text-center">
              <h4 className="text-lg font-semibold text-slate-950">No active coupons right now</h4>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                New offers for this restaurant will show here as soon as they become available.
              </p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
