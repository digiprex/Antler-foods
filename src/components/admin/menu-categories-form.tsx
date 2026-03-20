/**
 * Menu Categories Form Component
 *
 * Provides comprehensive menu categories management functionality including:
 * - List of all categories for a menu
 * - Create new category
 * - Edit existing categories
 * - Delete categories
 * - Manage category items
 * - Drag and drop reordering
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CategoryFormModal from './category-form-modal';

// Item interface
interface Item {
  item_id: string;
  name: string;
  description?: string;
  delivery_price: number;
  pickup_price: number;
  image_url?: string;
  is_recommended: boolean;
  is_best_seller: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  category_id: string;
  is_available: boolean;
  in_stock: boolean;
  modifiers?: any;
}

// Enhanced category interface matching the database schema
interface Category {
  category_id: string;
  name: string;
  description?: string;
  order_index: number;
  menu_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  type: string;
  image?: string;
  is_active: boolean;
  modifier_groups?: any;
  identifiers?: any;
  items?: Item[];
  items_count?: number;
}

interface MenuCategoriesFormProps {
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  menuName: string;
}

export default function MenuCategoriesForm({ 
  restaurantId, 
  restaurantName, 
  menuId, 
  menuName 
}: MenuCategoriesFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch categories + item previews in one request to avoid N+1 fetches.
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/categories?menu_id=${menuId}&include_items=true&item_preview_limit=3`);
      const data = await response.json();
      
      if (!response.ok) {
        // Instead of showing error, treat as empty state
        console.log('Categories API returned error, treating as empty state:', data.error);
        setCategories([]);
        setLoading(false);
        return;
      }

      // Handle successful response with empty categories array
      const categoriesArray = data.categories || [];
      setCategories(categoriesArray);
      
      // Log for debugging
      console.log('Categories fetched successfully:', categoriesArray.length, 'categories found');
    } catch (err) {
      // Instead of showing error, treat as empty state
      console.log('Categories fetch failed, treating as empty state:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [menuId]);

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = () => {
    setShowCreateCategory(true);
    setSelectedCategory(null);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditCategory(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories?category_id=${categoryToDelete.category_id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }
      
      // Remove from local state
      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.category_id !== categoryToDelete.category_id),
      );
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Delete category error:', err);
      // Keep the modal open to show the error
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteCategory = () => {
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  const handleManageItems = (category: Category) => {
    const params = new URLSearchParams({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      menu_id: menuId,
      menu_name: menuName,
      category_id: category.category_id,
      category_name: category.name
    });
    router.push(`/admin/menu-items?${params.toString()}`);
  };

  const handleSaveCategory = async (payload: Pick<Category, 'name' | 'description' | 'order_index' | 'type' | 'is_active'>) => {
    try {
      if (showCreateCategory) {
        // Create new category
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menu_id: menuId,
            name: payload.name,
            description: payload.description,
            order_index: payload.order_index || 0,
            type: payload.type,
            is_active: payload.is_active,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create category');
        }
        
        // Add to local state with empty items array
        const newCategory = { ...data.category, items: [], items_count: 0 };
        setCategories((prevCategories) => [...prevCategories, newCategory]);
        setShowCreateCategory(false);
      } else if (showEditCategory && selectedCategory) {
        // Update existing category
        const response = await fetch('/api/categories', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category_id: selectedCategory.category_id,
            name: payload.name,
            description: payload.description,
            order_index: payload.order_index,
            type: payload.type,
            is_active: payload.is_active,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update category');
        }
        
        // Update local state, preserving existing item preview/count.
        setCategories((prevCategories) =>
          prevCategories.map((category) =>
            category.category_id === selectedCategory.category_id
              ? {
                  ...data.category,
                  items: category.items,
                  items_count: category.items_count ?? category.items?.length ?? 0,
                }
              : category,
          ),
        );
        setShowEditCategory(false);
        setSelectedCategory(null);
      }
    } catch (err) {
      console.error('Save category error:', err);
      // You could add a toast notification or error state here instead of alert
      // For now, keeping it simple but this could be improved with proper error handling
      const errorMessage = err instanceof Error ? err.message : 'Failed to save category';
      // Temporary alert replacement - could be replaced with a toast or error modal
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading categories...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          <p className="text-sm text-gray-600">Organize your menu items into categories</p>
        </div>
        <button
          onClick={handleCreateCategory}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-600 mb-4">Start organizing your menu by creating categories.</p>
          <button
            onClick={handleCreateCategory}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.category_id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* Category Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                      {category.type}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      category.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Sort: {category.order_index}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="rounded p-2 text-gray-400 hover:text-gray-600"
                    title="Edit category"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="rounded p-2 text-gray-400 hover:text-red-600"
                    title="Delete category"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Items Management */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    Items ({category.items_count ?? category.items?.length ?? 0})
                  </h4>
                  <button
                    onClick={() => handleManageItems(category)}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Manage Items {'\u2192'}
                  </button>
                </div>
                
                {category.items && category.items.length > 0 ? (
                  <div className="space-y-3">
                    {category.items.slice(0, 3).map((item) => (
                      <div key={item.item_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                            {item.is_recommended && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
                                Recommended
                              </span>
                            )}
                            {item.is_best_seller && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                Best Seller
                              </span>
                            )}
                            {!item.is_available && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                                Unavailable
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-600 mb-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>Delivery: ${item.delivery_price}</span>
                            <span>Pickup: ${item.pickup_price}</span>
                            <span className={`${item.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                              {item.in_stock ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                        {item.image_url && (
                          <div className="ml-3">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    {(category.items_count ?? category.items.length) > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => handleManageItems(category)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          View all {category.items_count ?? category.items.length} items {'\u2192'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <CategoryFormModal
          isOpen={showCreateCategory}
          onClose={() => setShowCreateCategory(false)}
          onSave={handleSaveCategory}
          menuId={menuId}
          restaurantId={restaurantId}
          mode="create"
        />
      )}

      {/* Edit Category Modal */}
      {showEditCategory && selectedCategory && (
        <CategoryFormModal
          isOpen={showEditCategory}
          onClose={() => {
            setShowEditCategory(false);
            setSelectedCategory(null);
          }}
          onSave={handleSaveCategory}
          menuId={menuId}
          restaurantId={restaurantId}
          category={selectedCategory}
          mode="edit"
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Category
              </h3>
              <button
                type="button"
                onClick={cancelDeleteCategory}
                className="text-gray-400 hover:text-gray-600"
                disabled={isDeleting}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Are you sure you want to delete "{categoryToDelete.name}"?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This action cannot be undone. All items in this category will also be deleted permanently.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Warning:</strong> This will permanently delete the category and all its items.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={cancelDeleteCategory}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
