import { StarIcon } from '@/features/restaurant-menu/components/icons';
import type { RestaurantRewards } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RewardsBannerProps {
  rewards: RestaurantRewards;
  brandName?: string;
}

export function RewardsBanner({ rewards, brandName }: RewardsBannerProps) {
  const normalizedBrandName = brandName?.trim();
  const normalizedMessage = rewards.message.trim();
  const messageBody = normalizedMessage
    .replace(/^join\s+.*?\s+rewards!\s*/i, '')
    .trim();
  const resolvedMessage = normalizedBrandName
    ? `Join ${normalizedBrandName} Rewards!${messageBody ? ` ${messageBody}` : ''}`
    : normalizedMessage;

  return (
    <section className="rounded-3xl border border-stone-200 bg-[#d8d4d1] px-4 py-3 shadow-sm sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 text-slate-900">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
            <StarIcon className="h-4 w-4 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Rewards
            </p>
            <p className="text-sm font-semibold leading-snug text-slate-900 sm:text-base">
              {resolvedMessage}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex self-start whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:self-center"
        >
          {rewards.ctaLabel}
        </button>
      </div>
    </section>
  );
}
