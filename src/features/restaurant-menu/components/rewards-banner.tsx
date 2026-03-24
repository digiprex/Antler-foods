import { StarIcon } from '@/features/restaurant-menu/components/icons';
import type { RestaurantRewards } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RewardsBannerProps {
  rewards: RestaurantRewards;
  brandName?: string;
  onCtaClick?: () => void;
}

export function RewardsBanner({ rewards, brandName, onCtaClick }: RewardsBannerProps) {
  const normalizedBrandName = brandName?.trim();
  const normalizedMessage = rewards.message.trim();
  const messageBody = normalizedMessage
    .replace(/^join\s+.*?\s+rewards!\s*/i, '')
    .trim();
  const resolvedMessage = normalizedBrandName
    ? `Join ${normalizedBrandName} Rewards!${messageBody ? ` ${messageBody}` : ''}`
    : normalizedMessage;

  return (
    <section className="overflow-hidden rounded-[24px] border border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 text-stone-900">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-900 text-stone-50">
            <StarIcon className="h-4 w-4 fill-current" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Rewards
            </p>
            <p className="text-sm font-semibold leading-6 text-stone-900">
              {resolvedMessage}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCtaClick}
          className="inline-flex h-10 w-full items-center justify-center self-start whitespace-nowrap rounded-full bg-stone-900 px-5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 sm:w-auto sm:self-center"
        >
          {rewards.ctaLabel}
        </button>
      </div>
    </section>
  );
}
