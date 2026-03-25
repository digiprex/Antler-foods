/**
 * Menu Item Form Modal Component
 *
 * A comprehensive form for creating and editing menu items with validation
 * and user-friendly interface.
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function normalizeModifierIds(modifiers: any): string[] {
  if (Array.isArray(modifiers)) {
    return modifiers.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }

  if (modifiers && typeof modifiers === 'object') {
    if (Array.isArray(modifiers.modifier_group_ids)) {
      return modifiers.modifier_group_ids.filter(
        (value: unknown): value is string => typeof value === 'string' && value.length > 0,
      );
    }

    return Object.keys(modifiers).filter((key) => Boolean((modifiers as Record<string, unknown>)[key]));
  }

  return [];
}

// Modifier group interface
interface ModifierGroup {
  modifier_group_id: string;
  name: string;
  description?: string;
  min_selection: number;
  max_selection: number;
  type: string;
  is_required: boolean;
  is_multi_select: boolean;
  modifier_items: any;
}

// Menu item form data interface
interface MenuItemFormData {
  name: string;
  description?: string;
  delivery_price: number;
  pickup_price: number;
  image_url?: string;
  is_recommended: boolean;
  is_best_seller: boolean;
  category_id: string;
  is_available: boolean;
  in_stock: boolean;
  modifiers?: any;
  has_variants?: boolean;
  parent_item_id?: string;
}

// Full menu item interface matching the database schema
interface MenuItem extends MenuItemFormData {
  item_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface MenuItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MenuItemFormData) => void;
  item?: MenuItem | null;
  mode: 'create' | 'edit';
  categoryId: string;
  restaurantId: string;
}

export default function MenuItemFormModal({
  isOpen,
  onClose,
  onSave,
  item,
  mode,
  categoryId,
  restaurantId
}: MenuItemFormModalProps) {
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: '',
    description: '',
    delivery_price: 0,
    pickup_price: 0,
    image_url: '',
    is_recommended: false,
    is_best_seller: false,
    category_id: categoryId,
    is_available: true,
    in_stock: true,
    modifiers: null,
    has_variants: false,
    parent_item_id: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [isModifierDropdownOpen, setIsModifierDropdownOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<MenuItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const selectedModifierIds = normalizeModifierIds(formData.modifiers);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Fetch modifier groups
  const fetchModifierGroups = async () => {
    try {
      setLoadingModifiers(true);
      const response = await fetch('/api/modifier-groups');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setModifierGroups(data.modifier_groups || []);
      } else {
        console.error('Failed to fetch modifier groups:', data.error);
      }
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
    } finally {
      setLoadingModifiers(false);
    }
  };

  // Fetch available items for parent selection
  const fetchAvailableItems = async () => {
    try {
      setLoadingItems(true);
      const response = await fetch(`/api/items?category_id=${categoryId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Filter out the current item if we're in edit mode
        const items = data.items || [];
        const filteredItems = item && mode === 'edit'
          ? items.filter((availableItem: MenuItem) => availableItem.item_id !== item.item_id)
          : items;
        setAvailableItems(filteredItems);
      } else {
        console.error('Failed to fetch items:', data.error);
        setAvailableItems([]);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setAvailableItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  // Load modifier groups when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchModifierGroups();
      fetchAvailableItems();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item && mode === 'edit') {
      setFormData({
        name: item.name,
        description: item.description || '',
        delivery_price: item.delivery_price,
        pickup_price: item.pickup_price,
        image_url: item.image_url || '',
        is_recommended: item.is_recommended,
        is_best_seller: item.is_best_seller,
        category_id: item.category_id,
        is_available: item.is_available,
        in_stock: item.in_stock,
        modifiers: normalizeModifierIds(item.modifiers),
        has_variants: item.has_variants || false,
        parent_item_id: item.parent_item_id || undefined
      });
    } else {
      setFormData({
        name: '',
        description: '',
        delivery_price: 0,
        pickup_price: 0,
        image_url: '',
        is_recommended: false,
        is_best_seller: false,
        category_id: categoryId,
        is_available: true,
        in_stock: true,
        modifiers: null,
        has_variants: false,
        parent_item_id: undefined
      });
    }
    setErrors({});
    setIsModifierDropdownOpen(false);
  }, [item, mode, isOpen, categoryId]);

  const toggleModifierSelection = (modifierGroupId: string) => {
    const isSelected = selectedModifierIds.includes(modifierGroupId);
    const nextValues = isSelected
      ? selectedModifierIds.filter((id) => id !== modifierGroupId)
      : [...selectedModifierIds, modifierGroupId];

    handleInputChange('modifiers', nextValues.length > 0 ? nextValues : null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Item name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Item name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (formData.delivery_price < 0) {
      newErrors.delivery_price = 'Delivery price must be 0 or greater';
    }

    if (formData.pickup_price < 0) {
      newErrors.pickup_price = 'Pickup price must be 0 or greater';
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSave({
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        delivery_price: Number(formData.delivery_price),
        pickup_price: Number(formData.pickup_price)
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof MenuItemFormData, value: string | number | boolean | any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // If has_variants is being disabled, clear the parent_item_id
      if (field === 'has_variants' && !value) {
        newData.parent_item_id = undefined;
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({
        ...prev,
        [field as string]: ''
      }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        image: 'Please select an image file'
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        image: 'Image size must be less than 5MB'
      }));
      return;
    }

    setImageUploading(true);
    // Clear any previous image errors
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/upload-optimized-media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Upload failed (${response.status})`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Upload failed');
      }
      
      // Use the URL from the response data
      handleInputChange('image_url', data.data.url || data.data.file?.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      // Set a more user-friendly error state instead of alert
      setErrors(prev => ({
        ...prev,
        image: `Failed to upload image: ${error instanceof Error ? error.message : 'Please try again.'}`
      }));
    } finally {
      setImageUploading(false);
    }
  };

  if (!isOpen || !isMounted || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Item' : 'Edit Item'}
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
            {/* Item Name */}
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                id="itemName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Caesar Salad, Grilled Chicken, Chocolate Cake"
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Item Description */}
            <div>
              <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="itemDescription"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the item, ingredients, preparation method, etc."
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {(formData.description || '').length}/500 characters
              </p>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Price */}
              <div>
                <label htmlFor="deliveryPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="deliveryPrice"
                    value={formData.delivery_price}
                    onChange={(e) => handleInputChange('delivery_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.delivery_price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.delivery_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.delivery_price}</p>
                )}
              </div>

              {/* Pickup Price */}
              <div>
                <label htmlFor="pickupPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    id="pickupPrice"
                    value={formData.pickup_price}
                    onChange={(e) => handleInputChange('pickup_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                      errors.pickup_price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.pickup_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.pickup_price}</p>
                )}
              </div>
            </div>

            {/* Item Image */}
            <div>
              <label htmlFor="itemImage" className="block text-sm font-medium text-gray-700 mb-1">
                Item Image
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  id="itemImage"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {formData.image_url && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <img
                      src={formData.image_url}
                      alt="Item preview"
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">Image uploaded</p>
                      <button
                        type="button"
                        onClick={() => handleInputChange('image_url', '')}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                )}
                {imageUploading && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm text-blue-700">Uploading image...</p>
                  </div>
                )}
              </div>
              {errors.image && (
                <p className="mt-1 text-sm text-red-600">{errors.image}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Upload an image for the item (JPG, PNG, WebP supported)
              </p>
            </div>

            {/* Item Flags */}
            <div className="space-y-4">
              {/* <h4 className="text-sm font-medium text-gray-700">Item Properties</h4> */}
              
              {/* Available Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Item is available
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => handleInputChange('is_available', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.is_available ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('is_available', !formData.is_available)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_available ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>

              {/* Recommended Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Recommended item
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={(e) => handleInputChange('is_recommended', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.is_recommended ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('is_recommended', !formData.is_recommended)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_recommended ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>

              {/* Best Seller Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Best seller
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_best_seller}
                    onChange={(e) => handleInputChange('is_best_seller', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.is_best_seller ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('is_best_seller', !formData.is_best_seller)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_best_seller ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>

              {/* In Stock Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  In stock
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.in_stock}
                    onChange={(e) => handleInputChange('in_stock', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.in_stock ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('in_stock', !formData.in_stock)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.in_stock ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>

              {/* Has Variants Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Is variant
                  <p className="text-xs text-gray-500 font-normal">Item is part of different variations (size, color, etc.)</p>
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.has_variants || false}
                    onChange={(e) => handleInputChange('has_variants', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.has_variants ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('has_variants', !formData.has_variants)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.has_variants ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Parent Item Selection - Only show when has_variants is true */}
            {formData.has_variants && (
              <div>
                <label htmlFor="parentItem" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Item
                </label>
                
                {loadingItems ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                    <p className="text-sm text-gray-600">Loading available items...</p>
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">No other items available in this category to use as parent.</p>
                  </div>
                ) : (
                  <select
                    id="parentItem"
                    value={formData.parent_item_id || ''}
                    onChange={(e) => handleInputChange('parent_item_id', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select a parent item...</option>
                    {availableItems.map((availableItem) => (
                      <option key={availableItem.item_id} value={availableItem.item_id}>
                        {availableItem.name} - ${availableItem.delivery_price}
                      </option>
                    ))}
                  </select>
                )}
                
                <p className="mt-1 text-xs text-gray-500">
                  Select the parent item that this variant belongs to
                </p>
              </div>
            )}

            {/* Modifiers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modifier Groups
              </label>
              
              {loadingModifiers ? (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                  <p className="text-sm text-gray-600">Loading modifier groups...</p>
                </div>
              ) : modifierGroups.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">No modifier groups available. Create modifier groups first to assign them to items.</p>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModifierDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  >
                    <span>
                      {selectedModifierIds.length > 0
                        ? `${selectedModifierIds.length} modifier group${selectedModifierIds.length > 1 ? 's' : ''} selected`
                        : 'Select modifier groups'}
                    </span>
                    <svg
                      className={`h-4 w-4 text-gray-500 transition-transform ${isModifierDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isModifierDropdownOpen && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="space-y-1 p-2">
                        {modifierGroups.map((group) => {
                          const isChecked = selectedModifierIds.includes(group.modifier_group_id);
                          return (
                            <label
                              key={group.modifier_group_id}
                              className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleModifierSelection(group.modifier_group_id)}
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900">{group.name}</p>
                                <p className="text-xs text-gray-500">
                                  {group.type} | Required: {group.is_required ? 'True' : 'False'} | Multi: {group.is_multi_select ? 'True' : 'False'} | Min {group.min_selection}, Max {group.max_selection}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Modifier Groups Display */}
              {selectedModifierIds.length > 0 && (
                <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs font-medium text-purple-800 mb-2">Selected Modifier Groups:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedModifierIds.map((modifierId: string) => {
                      const group = modifierGroups.find(g => g.modifier_group_id === modifierId);
                      return group ? (
                        <span key={modifierId} className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                          {group.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                Choose one or more modifier groups from the dropdown.
              </p>
            </div>
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
              {mode === 'create' ? 'Create Item' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
