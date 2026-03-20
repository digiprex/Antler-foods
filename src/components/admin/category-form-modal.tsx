/**
 * Category Form Modal Component
 *
 * A comprehensive form for creating and editing menu categories with validation
 * and user-friendly interface.
 */

'use client';

import { useState, useEffect } from 'react';

// Enhanced category interface matching the database schema
interface Category {
  category_id?: string;
  name: string;
  description?: string;
  order_index: number;
  menu_id: string;
  type: string;
  image?: string;
  is_active: boolean;
}

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Pick<Category, 'name' | 'description' | 'order_index' | 'type' | 'is_active'>) => void;
  category?: Category | null;
  mode: 'create' | 'edit';
  menuId: string;
  restaurantId: string;
}

export default function CategoryFormModal({
  isOpen,
  onClose,
  onSave,
  category,
  mode,
  menuId,
  restaurantId
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState<Pick<Category, 'name' | 'description' | 'order_index' | 'type' | 'is_active'>>({
    name: '',
    description: '',
    order_index: 1,
    type: 'default',
    is_active: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name: category.name,
        description: category.description,
        order_index: category.order_index,
        type: category.type,
        is_active: category.is_active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        order_index: 1,
        type: 'default',
        is_active: true
      });
    }
    setErrors({});
  }, [category, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Category name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Category name must be less than 50 characters';
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    if (formData.order_index < 1 || formData.order_index > 100) {
      newErrors.order_index = 'Sort order must be between 1 and 100';
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
        description: formData.description?.trim() || undefined
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof Pick<Category, 'name' | 'description' | 'order_index' | 'type' | 'is_active'>, value: string | number | boolean) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Category' : 'Edit Category'}
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
          <div className="p-6 space-y-4">
            {/* Category Name */}
            <div>
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                id="categoryName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Appetizers, Main Courses, Desserts"
                maxLength={50}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.name.length}/50 characters
              </p>
            </div>

            {/* Category Description */}
            <div>
              <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="categoryDescription"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of this category (optional)"
                maxLength={200}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {(formData.description || '').length}/200 characters
              </p>
            </div>

            {/* Sort Order */}
            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order *
              </label>
              <input
                type="number"
                id="sortOrder"
                value={formData.order_index}
                onChange={(e) => handleInputChange('order_index', parseInt(e.target.value) || 1)}
                min={1}
                max={100}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.order_index ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.order_index && (
                <p className="mt-1 text-sm text-red-600">{errors.order_index}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Lower numbers appear first in the menu
              </p>
            </div>

            {/* Category Type */}
            <div>
              <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 mb-1">
                Category Type *
              </label>
              <select
                id="categoryType"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="default">Default</option>
                <option value="favourites">Favourites</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the category type to organize menu items
              </p>
            </div>


            {/* Active Status Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Category is active
                </label>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 p-0.5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      formData.is_active ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                    onClick={() => handleInputChange('is_active', !formData.is_active)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
                      formData.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Active categories are visible to customers. Inactive categories are hidden but can be reactivated later.
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
              {mode === 'create' ? 'Create Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}