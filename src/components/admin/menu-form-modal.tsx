'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Simplified menu interface matching the database schema
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

type MenuFormPayload = Pick<Menu, 'name' | 'varies_with_time' | 'is_active'>;

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (menu: MenuFormPayload) => void;
  menu?: Menu | null;
  mode: 'create' | 'edit';
}

export default function MenuFormModal({
  isOpen,
  onClose,
  onSave,
  menu,
  mode,
}: MenuFormModalProps) {
  const [formData, setFormData] = useState<MenuFormPayload>({
    name: '',
    varies_with_time: false,
    is_active: true,
  });
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
      return;
    }

    setFormData({
      name: '',
      varies_with_time: false,
      is_active: true,
    });
    setErrors({});
  }, [menu, mode, isOpen]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Menu name is required';
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
      await onSave({
        ...formData,
        name: formData.name.trim(),
      });
      onClose();
    } catch (error) {
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

          <div className="space-y-4 p-5">
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
                placeholder="Main Menu, Lunch Menu, Happy Hours"
              />
              {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Menu varies with time
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.varies_with_time}
                    onChange={(event) => updateField('varies_with_time', event.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.varies_with_time ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => updateField('varies_with_time', !formData.varies_with_time)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.varies_with_time ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>

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
