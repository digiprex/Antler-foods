'use client';

import { useEffect, useState } from 'react';
import { ChevronDownIcon } from '@/features/restaurant-menu/components/icons';
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

  const visibleDays = showAllDays ? days : days.slice(0, 2);
  const selectedDay =
    days.find((day) => day.id === tempSelection.dayId) || visibleDays[0] || days[0];

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[520px]">
      <div className="flex max-h-[85vh] flex-col overflow-hidden px-6 py-5 sm:px-7 sm:py-6">
        <div className="mb-6 pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Schedule
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            Order time
          </h2>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          {visibleDays.map((day) => {
            const isSelected = tempSelection.dayId === day.id;
            const isClosed = day.slots.length === 0;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() =>
                  !isClosed && setTempSelection({
                    dayId: day.id,
                    time: day.slots[0],
                  })
                }
                disabled={isClosed}
                className={`flex flex-col items-start gap-1 rounded-[22px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 ${
                  isSelected
                    ? 'border-stone-900 bg-stone-900 text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.16)]'
                    : isClosed
                      ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                      : 'border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span className="text-sm font-semibold">{day.label}</span>
                <span className="text-sm opacity-80">
                  {isClosed ? 'Orders closed' : day.dateLabel}
                </span>
              </button>
            );
          })}
        </div>

        {days.length > 2 ? (
          <button
            type="button"
            onClick={() => setShowAllDays((current) => !current)}
            className="mb-6 flex items-center justify-center gap-2 rounded-[18px] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10"
          >
            {showAllDays ? 'Less dates' : 'More dates'}
            <ChevronDownIcon className={`h-4 w-4 transition ${showAllDays ? 'rotate-180' : ''}`} />
          </button>
        ) : null}

        <div className="mb-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
            {selectedDay?.slots.map((slot) => {
              const checked = tempSelection.dayId === selectedDay.id && tempSelection.time === slot;

              return (
                <label
                  key={`${selectedDay.id}-${slot}`}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition ${
                    checked
                      ? 'border-stone-900 bg-stone-50'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-base font-medium text-stone-900">
                    {slot}
                  </span>
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
                    className="h-5 w-5 accent-stone-900"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-stone-200 pt-4">
          <button
            type="button"
            onClick={() => onConfirm(tempSelection)}
            disabled={!tempSelection.dayId || !tempSelection.time}
            className="flex h-11 w-full items-center justify-center rounded-[18px] bg-stone-900 text-sm font-semibold text-stone-50 shadow-[0_16px_32px_rgba(28,25,23,0.16)] transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/10 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
          >
            Schedule order
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
