'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Menu {
  menu_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  is_active: boolean;
  name: string;
  restaurant_id: string;
  varies_with_time: boolean;
}

export interface MenuScheduleData {
  schedule_type: 'always' | 'time_based' | 'date_range';
  start_time: string;
  end_time: string;
  days: number[];
  specific_dates: string[];
}

export const DEFAULT_SCHEDULE: MenuScheduleData = {
  schedule_type: 'always',
  start_time: '06:00',
  end_time: '23:00',
  days: [1, 2, 3, 4, 5, 6, 7],
  specific_dates: [],
};

type MenuFormPayload = Pick<Menu, 'name' | 'varies_with_time' | 'is_active'>;

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menu: MenuFormPayload, schedule: MenuScheduleData) => void;
  menu?: Menu | null;
  schedule?: MenuScheduleData | null;
  mode: 'create' | 'edit';
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

export default function MenuFormModal({
  isOpen,
  onClose,
  onSave,
  menu,
  schedule,
  mode,
}: MenuFormModalProps) {
  const [formData, setFormData] = useState<MenuFormPayload>({
    name: '',
    varies_with_time: false,
    is_active: true,
  });
  const [scheduleData, setScheduleData] = useState<MenuScheduleData>({ ...DEFAULT_SCHEDULE });
  const [newDate, setNewDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (menu && mode === 'edit') {
      setFormData({
        name: menu.name,
        varies_with_time: menu.varies_with_time,
        is_active: menu.is_active,
      });
      setScheduleData(schedule ? { ...schedule } : { ...DEFAULT_SCHEDULE });
      return;
    }

    setFormData({
      name: '',
      varies_with_time: false,
      is_active: true,
    });
    setScheduleData({ ...DEFAULT_SCHEDULE });
    setNewDate('');
    setErrors({});
  }, [menu, schedule, mode, isOpen]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Menu name is required';
    }

    if (scheduleData.schedule_type !== 'always') {
      if (!scheduleData.start_time) {
        nextErrors.start_time = 'Start time is required';
      }
      if (!scheduleData.end_time) {
        nextErrors.end_time = 'End time is required';
      }
      if (scheduleData.start_time && scheduleData.end_time && scheduleData.start_time >= scheduleData.end_time) {
        nextErrors.end_time = 'End time must be after start time';
      }
      if (scheduleData.schedule_type === 'time_based' && scheduleData.days.length === 0) {
        nextErrors.days = 'Select at least one day';
      }
      if (scheduleData.schedule_type === 'date_range' && scheduleData.specific_dates.length === 0) {
        nextErrors.specific_dates = 'Add at least one date';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const variesWithTime = scheduleData.schedule_type !== 'always';
      await onSave(
        {
          ...formData,
          name: formData.name.trim(),
          varies_with_time: variesWithTime,
        },
        scheduleData,
      );
      onClose();
    } catch {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof MenuFormPayload>(field: K, value: MenuFormPayload[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: '' }));
    }
  };

  const updateSchedule = <K extends keyof MenuScheduleData>(field: K, value: MenuScheduleData[K]) => {
    setScheduleData((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: '' }));
    }
  };

  const toggleDay = (day: number) => {
    setScheduleData((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((d) => d !== day)
        : [...current.days, day].sort((a, b) => a - b),
    }));
    if (errors.days) {
      setErrors((current) => ({ ...current, days: '' }));
    }
  };

  const selectAllDays = () => {
    setScheduleData((current) => ({ ...current, days: [1, 2, 3, 4, 5, 6, 7] }));
    if (errors.days) {
      setErrors((current) => ({ ...current, days: '' }));
    }
  };

  const selectWeekdays = () => {
    setScheduleData((current) => ({ ...current, days: [1, 2, 3, 4, 5] }));
    if (errors.days) {
      setErrors((current) => ({ ...current, days: '' }));
    }
  };

  const selectWeekends = () => {
    setScheduleData((current) => ({ ...current, days: [6, 7] }));
    if (errors.days) {
      setErrors((current) => ({ ...current, days: '' }));
    }
  };

  const addSpecificDate = () => {
    if (!newDate) return;
    if (scheduleData.specific_dates.includes(newDate)) return;
    setScheduleData((current) => ({
      ...current,
      specific_dates: [...current.specific_dates, newDate].sort(),
    }));
    setNewDate('');
    if (errors.specific_dates) {
      setErrors((current) => ({ ...current, specific_dates: '' }));
    }
  };

  const removeSpecificDate = (date: string) => {
    setScheduleData((current) => ({
      ...current,
      specific_dates: current.specific_dates.filter((d) => d !== date),
    }));
  };

  if (!isOpen || !isMounted || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Create Menu' : 'Edit Menu'}
            </h3>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5 p-5">
            {/* Menu Name */}
            <div>
              <label htmlFor="menuName" className="mb-1 block text-sm font-medium text-gray-700">
                Menu Name
              </label>
              <input
                id="menuName"
                type="text"
                value={formData.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={80}
                disabled={mode === 'edit'}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  mode === 'edit'
                    ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                    : 'border-gray-300'
                }`}
                placeholder="Breakfast Menu, Lunch Menu, Dinner Menu"
              />
              {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
            </div>

            {/* Schedule Type */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Availability Schedule
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'always', label: 'Always', icon: '24/7' },
                  { value: 'time_based', label: 'Time & Days', icon: null },
                  { value: 'date_range', label: 'Specific Dates', icon: null },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSchedule('schedule_type', option.value)}
                    className={`rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition ${
                      scheduleData.schedule_type === option.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.icon ? (
                      <span className="mb-0.5 block text-xs font-bold">{option.icon}</span>
                    ) : (
                      <svg className="mx-auto mb-0.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range (shown for time_based and date_range) */}
            {scheduleData.schedule_type !== 'always' ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    {scheduleData.schedule_type === 'time_based'
                      ? 'Set the time window when this menu is active'
                      : 'Set the time and dates when this menu is active'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="startTime" className="mb-1 block text-xs font-medium text-gray-600">
                        Start Time
                      </label>
                      <input
                        id="startTime"
                        type="time"
                        value={scheduleData.start_time}
                        onChange={(event) => updateSchedule('start_time', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      {errors.start_time ? <p className="mt-1 text-xs text-red-600">{errors.start_time}</p> : null}
                    </div>
                    <div>
                      <label htmlFor="endTime" className="mb-1 block text-xs font-medium text-gray-600">
                        End Time
                      </label>
                      <input
                        id="endTime"
                        type="time"
                        value={scheduleData.end_time}
                        onChange={(event) => updateSchedule('end_time', event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      {errors.end_time ? <p className="mt-1 text-xs text-red-600">{errors.end_time}</p> : null}
                    </div>
                  </div>
                </div>

                {/* Days of Week (only for time_based) */}
                {scheduleData.schedule_type === 'time_based' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Active Days</label>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={selectAllDays} className="text-[10px] font-medium text-purple-600 hover:text-purple-700">All</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={selectWeekdays} className="text-[10px] font-medium text-purple-600 hover:text-purple-700">Weekdays</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={selectWeekends} className="text-[10px] font-medium text-purple-600 hover:text-purple-700">Weekends</button>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
                            scheduleData.days.includes(day.value)
                              ? 'border-purple-500 bg-purple-100 text-purple-700'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    {errors.days ? <p className="mt-1 text-xs text-red-600">{errors.days}</p> : null}
                  </div>
                ) : null}

                {/* Specific Dates (only for date_range) */}
                {scheduleData.schedule_type === 'date_range' ? (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-600">Active Dates</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newDate}
                        onChange={(event) => setNewDate(event.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addSpecificDate}
                        disabled={!newDate}
                        className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {scheduleData.specific_dates.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {scheduleData.specific_dates.map((date) => (
                          <span
                            key={date}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700"
                          >
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            <button
                              type="button"
                              onClick={() => removeSpecificDate(date)}
                              className="ml-0.5 text-purple-500 hover:text-purple-800"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {errors.specific_dates ? <p className="mt-1 text-xs text-red-600">{errors.specific_dates}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Menu is active
              </label>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(event) => updateField('is_active', event.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                    formData.is_active ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  onClick={() => updateField('is_active', !formData.is_active)}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                    formData.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {isSubmitting
                ? (mode === 'create' ? 'Creating...' : 'Saving...')
                : (mode === 'create' ? 'Create Menu' : 'Save Menu')
              }
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
