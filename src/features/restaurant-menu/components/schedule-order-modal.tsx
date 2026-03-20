'use client';

import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronLeftIcon } from '@/features/restaurant-menu/components/icons';
import { ModalShell } from '@/features/restaurant-menu/components/modal-shell';
import type {
  ScheduleDay,
  ScheduleSelection,
} from '@/features/restaurant-menu/types/restaurant-menu.types';

interface ScheduleOrderModalProps {
  open: boolean;
  days: ScheduleDay[];
  currentSelection: ScheduleSelection;
  onClose: () => void;
  onBack: () => void;
  onConfirm: (selection: ScheduleSelection) => void;
}

export function ScheduleOrderModal({
  open,
  days,
  currentSelection,
  onClose,
  onBack,
  onConfirm,
}: ScheduleOrderModalProps) {
  const [tempSelection, setTempSelection] = useState(currentSelection);
  const [showAllDays, setShowAllDays] = useState(false);

  useEffect(() => {
    if (open) {
      setTempSelection(currentSelection);
    }
  }, [currentSelection, open]);

  const visibleDays = showAllDays ? days : days.slice(0, 3);
  const selectedDay =
    days.find((day) => day.id === tempSelection.dayId) || visibleDays[0] || days[0];

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[760px]">
      <div className="flex max-h-[90vh] flex-col overflow-hidden px-5 py-6 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-slate-700 shadow-sm transition hover:border-black/20 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Scheduled Order
          </h2>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3">
          {visibleDays.map((day) => {
            const isSelected = tempSelection.dayId === day.id;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() =>
                  setTempSelection({
                    dayId: day.id,
                    time: day.slots[0],
                  })
                }
                className={`grid min-w-[220px] grid-cols-[1fr_auto] items-center gap-4 rounded-[24px] border px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                  isSelected
                    ? 'border-black bg-white text-slate-950 shadow-sm'
                    : 'border-black/10 bg-white text-slate-600'
                }`}
              >
                <span className="text-xl font-semibold tracking-tight">{day.label}</span>
                <span className="text-lg font-medium">{day.dateLabel}</span>
              </button>
            );
          })}
          {days.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllDays((current) => !current)}
              className="grid min-w-[220px] place-items-center rounded-[24px] border border-black/10 bg-white px-5 py-4 text-lg font-medium text-slate-700 transition hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            >
              <span className="inline-flex items-center gap-2">
                {showAllDays ? 'Show less' : 'Show more'}
                <ChevronDownIcon className={`h-5 w-5 transition ${showAllDays ? 'rotate-180' : ''}`} />
              </span>
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex-1 overflow-y-auto border-t border-black/5">
          {selectedDay?.slots.map((slot) => {
            const checked = tempSelection.dayId === selectedDay.id && tempSelection.time === slot;

            return (
              <label
                key={`${selectedDay.id}-${slot}`}
                className="flex cursor-pointer items-center gap-4 border-b border-black/5 px-2 py-5"
              >
                <input
                  type="radio"
                  name="schedule-slot"
                  checked={checked}
                  onChange={() =>
                    setTempSelection({
                      dayId: selectedDay.id,
                      time: slot,
                    })
                  }
                  className="h-6 w-6 accent-black"
                />
                <span className="text-2xl font-medium tracking-tight text-slate-900">
                  {slot}
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onConfirm(tempSelection)}
          disabled={!tempSelection.dayId || !tempSelection.time}
          className="mt-5 flex h-14 items-center justify-center rounded-2xl bg-black text-base font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Schedule Order
        </button>
      </div>
    </ModalShell>
  );
}
