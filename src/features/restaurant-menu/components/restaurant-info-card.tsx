'use client';

import { useState } from 'react';
import {
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
} from '@/features/restaurant-menu/components/icons';
import type { RestaurantInfo } from '@/features/restaurant-menu/types/restaurant-menu.types';

interface RestaurantInfoCardProps {
  restaurant: RestaurantInfo;
  scheduleLabel: string;
  onChangeTime: () => void;
}

export function RestaurantInfoCard({
  restaurant,
  scheduleLabel,
  onChangeTime,
}: RestaurantInfoCardProps) {
  const [showHours, setShowHours] = useState(false);

  return (
    <section
      id="store-info"
      className="rounded-[32px] border border-black/10 bg-white p-5 shadow-sm sm:p-7"
    >
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
        <div className="space-y-5">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {restaurant.name}
            </h2>
            <p className="mt-2 text-lg text-slate-600">{restaurant.addressLine}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-700">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold">
              <ClockIcon className="h-4 w-4" />
              <span>{scheduleLabel}</span>
            </div>
            <button
              type="button"
              onClick={onChangeTime}
              className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              Change time
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <p className="text-base">{restaurant.openingText}</p>
            <button
              type="button"
              onClick={() => setShowHours((current) => !current)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              See hours
              <ChevronDownIcon
                className={`h-4 w-4 transition ${showHours ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showHours ? (
            <div className="rounded-3xl bg-[#f4f1ec] p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {restaurant.hours.map((hour) => (
                  <div
                    key={hour.day}
                    className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="font-semibold text-slate-900">{hour.day}</span>
                    <span>{hour.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="inline-flex items-center gap-2 rounded-full bg-[#f2efe9] px-4 py-2 text-sm font-medium text-slate-700">
            <CalendarIcon className="h-4 w-4" />
            {restaurant.infoCardLabel}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-black/5 bg-[#f4f1ec]">
          <img
            src={restaurant.heroImage}
            alt={restaurant.name}
            className="h-72 w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
