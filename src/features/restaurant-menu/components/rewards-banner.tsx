import { StarIcon } from '@/features/restaurant-menu/components/icons';
import type { RestaurantRewards } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RewardsBannerProps {
  rewards: RestaurantRewards;
}

export function RewardsBanner({ rewards }: RewardsBannerProps) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-[#d9d5d2] px-5 py-4 shadow-sm sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-slate-900">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
            <StarIcon className="h-4 w-4 fill-current" />
          </div>
          <p className="text-sm font-medium sm:text-base">{rewards.message}</p>
        </div>
        <button
          type="button"
          className="inline-flex self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:self-center"
        >
          {rewards.ctaLabel}
        </button>
      </div>
    </section>
  );
}
