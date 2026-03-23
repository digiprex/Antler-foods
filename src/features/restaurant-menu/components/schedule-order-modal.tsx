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

  const visibleDays = showAllDays ? days : days.slice(0, 2);
  const selectedDay =
    days.find((day) => day.id === tempSelection.dayId) || visibleDays[0] || days[0];

  return (
    <ModalShell open={open} onClose={onClose} maxWidthClassName="max-w-[500px]">
      <div className="flex max-h-[85vh] flex-col overflow-hidden px-6 py-5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950">
            Order time
          </h2>
        </div>

        {/* Days Grid */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {visibleDays.map((day) => {
            const isSelected = tempSelection.dayId === day.id;
            const isToday = day.label.toLowerCase() === 'tomorrow';
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
                className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
                  isSelected
                    ? 'border-black bg-black text-white'
                    : isClosed
                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-slate-900 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium">{day.label}</span>
                <span className="text-sm">
                  {isClosed ? 'Orders closed' : day.dateLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Show More/Less Button */}
        {days.length > 2 && (
          <button
            type="button"
            onClick={() => setShowAllDays((current) => !current)}
            className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            {showAllDays ? 'Less dates' : 'More dates'}
            <ChevronDownIcon className={`h-4 w-4 transition ${showAllDays ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Time Slots - Scrollable */}
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-3 pr-2">
            {selectedDay?.slots.map((slot) => {
              const checked = tempSelection.dayId === selectedDay.id && tempSelection.time === slot;

              return (
                <label
                  key={`${selectedDay.id}-${slot}`}
                  className="flex cursor-pointer items-center gap-3"
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
                    className="h-5 w-5 accent-black"
                  />
                  <span className="text-base font-medium text-slate-900">
                    {slot}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Schedule Button - Fixed at bottom */}
        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => onConfirm(tempSelection)}
            disabled={!tempSelection.dayId || !tempSelection.time}
            className="w-full flex h-12 items-center justify-center rounded-xl bg-black text-base font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            Schedule order
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
