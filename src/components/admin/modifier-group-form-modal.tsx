/**
 * Modifier Group Form Modal Component
 *
 * A comprehensive form for creating and editing modifier groups with validation
 * and user-friendly interface for managing modifier items.
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Modifier group form data interface
interface ModifierGroupFormData {
  name: string;
  description?: string;
  min_selection: number;
  max_selection: number;
  type: string;
  is_required: boolean;
  is_multi_select: boolean;
  modifier_items: any;
}

// Full modifier group interface matching the database schema
interface ModifierGroup extends ModifierGroupFormData {
  modifier_group_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ModifierGroupFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (group: ModifierGroupFormData) => void;
  group?: ModifierGroup | null;
  mode: 'create' | 'edit';
}

export default function ModifierGroupFormModal({
  isOpen,
  onClose,
  onSave,
  group,
  mode
}: ModifierGroupFormModalProps) {
  const [formData, setFormData] = useState<ModifierGroupFormData>({
    name: '',
    description: '',
    min_selection: 0,
    max_selection: 1,
    type: 'Regular',
    is_required: false,
    is_multi_select: false,
    modifier_items: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModifierItemModal, setShowAddModifierItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [modifierItemError, setModifierItemError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (group && mode === 'edit') {
      setFormData({
        name: group.name,
        description: group.description || '',
        min_selection: group.min_selection,
        max_selection: group.max_selection,
        type: group.type,
        is_required: group.is_required ?? false,
        is_multi_select: group.is_multi_select ?? false,
        modifier_items: group.modifier_items || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        min_selection: 0,
        max_selection: 1,
        type: 'Regular',
        is_required: false,
        is_multi_select: false,
        modifier_items: []
      });
    }
    setErrors({});
    setShowAddModifierItemModal(false);
    setNewItemName('');
    setNewItemPrice('');
    setModifierItemError(null);
  }, [group, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Modifier group name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.min_selection < 0) {
      newErrors.min_selection = 'Minimum selection cannot be negative';
    }

    if (formData.max_selection < 0) {
      newErrors.max_selection = 'Maximum selection cannot be negative';
    }

    if (formData.max_selection > 0 && formData.min_selection > formData.max_selection) {
      newErrors.min_selection = 'Minimum selection cannot be greater than maximum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        min_selection: Number(formData.min_selection),
        max_selection: Number(formData.max_selection)
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving modifier group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ModifierGroupFormData, value: string | number | any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({
        ...prev,
        [field as string]: ''
      }));
    }
  };

  const openAddModifierItemModal = () => {
    setShowAddModifierItemModal(true);
    setNewItemName('');
    setNewItemPrice('');
    setModifierItemError(null);
  };

  const closeAddModifierItemModal = () => {
    setShowAddModifierItemModal(false);
    setNewItemName('');
    setNewItemPrice('');
    setModifierItemError(null);
  };

  const addModifierItem = () => {
    if (!newItemName.trim()) {
      setModifierItemError('Modifier item name is required');
      return;
    }

    const parsedPrice = newItemPrice ? parseFloat(newItemPrice) : 0;
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setModifierItemError('Price must be 0 or greater');
      return;
    }

    const newItem = {
      name: newItemName.trim(),
      price: parsedPrice
    };

    const currentItems = Array.isArray(formData.modifier_items) ? formData.modifier_items : [];
    handleInputChange('modifier_items', [...currentItems, newItem]);
    closeAddModifierItemModal();
  };

  const removeModifierItem = (index: number) => {
    const currentItems = Array.isArray(formData.modifier_items) ? formData.modifier_items : [];
    const newItems = currentItems.filter((_, i) => i !== index);
    handleInputChange('modifier_items', newItems);
  };

  if (!isOpen || !isMounted || typeof document === 'undefined' || !document.body) return null;
  return createPortal(
    <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Modifier Group' : 'Edit Modifier Group'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6">
            {/* Group Name */}
            <div>
              <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                id="groupName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Size Options, Extra Toppings, Cooking Style"
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Group Description */}
            <div>
              <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="groupDescription"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of this modifier group"
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {(formData.description || '').length}/500 characters
              </p>
            </div>

            {/* Group Type */}
            <div>
              <label htmlFor="groupType" className="block text-sm font-medium text-gray-700 mb-1">
                Group Type *
              </label>
              <select
                id="groupType"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="Regular">Regular</option>
                <option value="Meal">Meal</option>
                <option value="Upsell">Upsell</option>
              </select>
            </div>

            {/* Required Option */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Is Required *
              </label>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => handleInputChange('is_required', e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                    formData.is_required ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  onClick={() => handleInputChange('is_required', !formData.is_required)}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_required ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Multi Select Option */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Is Multi Select *
              </label>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={formData.is_multi_select}
                  onChange={(e) => handleInputChange('is_multi_select', e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                    formData.is_multi_select ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                  onClick={() => handleInputChange('is_multi_select', !formData.is_multi_select)}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_multi_select ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Selection Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Minimum Selection */}
              <div>
                <label htmlFor="minSelection" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Selection *
                </label>
                <input
                  type="number"
                  id="minSelection"
                  value={formData.min_selection}
                  onChange={(e) => handleInputChange('min_selection', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.min_selection ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.min_selection && (
                  <p className="mt-1 text-sm text-red-600">{errors.min_selection}</p>
                )}
              </div>

              {/* Maximum Selection */}
              <div>
                <label htmlFor="maxSelection" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Selection *
                </label>
                <input
                  type="number"
                  id="maxSelection"
                  value={formData.max_selection}
                  onChange={(e) => handleInputChange('max_selection', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                    errors.max_selection ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.max_selection && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_selection}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Set to 0 for unlimited selections
                </p>
              </div>
            </div>

            {/* Modifier Items */}
            {mode === 'edit' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modifier Items
                </label>
                
                <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 p-4">
                  <h4 className="text-sm font-medium text-gray-700">Manage Group Items</h4>
                  <button
                    type="button"
                    onClick={openAddModifierItemModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Modifier Item
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {Array.isArray(formData.modifier_items) && formData.modifier_items.length > 0 ? (
                    formData.modifier_items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">
                            {typeof item === 'string' ? item : item.name}
                          </span>
                          {typeof item === 'object' && item.price > 0 && (
                            <span className="ml-2 text-sm text-gray-500">+${item.price}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeModifierItem(index)}
                          className="text-red-600 hover:text-red-700"
                          title="Remove item"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No modifier items added yet. Use "Add Modifier Item" to get started.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  Create the modifier group first. You can add modifier items after the group is created.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              )}
              {mode === 'create' ? 'Create Modifier Group' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {showAddModifierItemModal && (
        <div className="fixed inset-0 top-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <h4 className="text-base font-semibold text-gray-900">Add Modifier Item</h4>
              <button
                type="button"
                onClick={closeAddModifierItemModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => {
                    setNewItemName(e.target.value);
                    if (modifierItemError) setModifierItemError(null);
                  }}
                  placeholder="e.g., Large, Extra Cheese"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => {
                      setNewItemPrice(e.target.value);
                      if (modifierItemError) setModifierItemError(null);
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {modifierItemError && (
                <p className="text-sm text-red-600">{modifierItemError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button
                type="button"
                onClick={closeAddModifierItemModal}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addModifierItem}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
