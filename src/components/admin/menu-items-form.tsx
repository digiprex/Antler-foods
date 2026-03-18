/**
 * Menu Items Form Component
 *
 * Provides comprehensive menu items management functionality including:
 * - List of all items for a category
 * - Create new item
 * - Edit existing items
 * - Delete items
 * - Toggle item availability
 * - Image upload for items
 * - Drag and drop reordering
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import MenuItemFormModal from './menu-item-form-modal';

interface MenuItem {
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

interface MenuItemsFormProps {
  restaurantId: string;
  restaurantName: string;
  menuId: string;
  menuName: string;
  categoryId: string;
  categoryName: string;
}

export default function MenuItemsForm({ 
  restaurantId,
  categoryId,
}: MenuItemsFormProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch items from API
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/items?category_id=${categoryId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch items');
      }
      
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  // Load items on component mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = () => {
    setShowCreateItem(true);
    setSelectedItem(null);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setShowEditItem(true);
  };

  const handleDeleteItem = (item: MenuItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/items?item_id=${itemToDelete.item_id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }
      
      // Remove from local state
      setItems((prevItems) => prevItems.filter((item) => item.item_id !== itemToDelete.item_id));
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (err) {
      console.error('Delete item error:', err);
      // Keep the modal open to show the error
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteItem = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const toggleItemAvailability = async (itemId: string) => {
    const item = items.find(item => item.item_id === itemId);
    if (!item) return;

    await updateItemFlags(item, { is_available: !item.is_available });
  };

  const toggleItemStock = async (itemId: string) => {
    const item = items.find(item => item.item_id === itemId);
    if (!item) return;

    await updateItemFlags(item, { in_stock: !item.in_stock });
  };

  const updateItemFlags = async (
    item: MenuItem,
    updates: Partial<Pick<MenuItem, 'is_available' | 'in_stock'>>,
  ) => {
    try {
      const response = await fetch('/api/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_id: item.item_id,
          name: item.name,
          description: item.description,
          delivery_price: item.delivery_price,
          pickup_price: item.pickup_price,
          image_url: item.image_url,
          is_recommended: item.is_recommended,
          is_best_seller: item.is_best_seller,
          is_available: updates.is_available ?? item.is_available,
          in_stock: updates.in_stock ?? item.in_stock,
          modifiers: item.modifiers,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update item');
      }
      
      // Update local state
      setItems((prevItems) =>
        prevItems.map((currentItem) =>
          currentItem.item_id === item.item_id
            ? {
                ...currentItem,
                is_available: updates.is_available ?? currentItem.is_available,
                in_stock: updates.in_stock ?? currentItem.in_stock,
              }
            : currentItem,
        ),
      );
    } catch (err) {
      console.error('Toggle item flag error:', err);
      alert(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const handleSaveItem = async (payload: Omit<MenuItem, 'item_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => {
    try {
      if (showCreateItem) {
        // Create new item
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create item');
        }
        
        // Add to local state without waiting for another network round-trip.
        if (data.item) {
          setItems((prevItems) => [...prevItems, data.item]);
        }
        
        setShowCreateItem(false);
      } else if (showEditItem && selectedItem) {
        // Update existing item
        const response = await fetch('/api/items', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_id: selectedItem.item_id,
            ...payload,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update item');
        }
        
        // Update local state
        if (data.item) {
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.item_id === selectedItem.item_id ? data.item : item,
            ),
          );
        }
        
        setShowEditItem(false);
        setSelectedItem(null);
      }
    } catch (err) {
      console.error('Save item error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save item';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading menu items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchItems}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        {/* <div>
          <h2 className="text-lg font-semibold text-gray-900">Menu Items</h2>
          <p className="text-sm text-gray-600">Manage items in the "{categoryName}" category</p>
        </div> */}
        <button
          onClick={handleCreateItem}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600 mb-4">Start building your menu by adding items to this category.</p>
          <button
            onClick={handleCreateItem}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.item_id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex gap-6 p-6">
                {/* Item Image */}
                <div className="flex-shrink-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          item.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            item.in_stock
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {item.in_stock ? 'In Stock' : 'Out of Stock'}
                          </span>
                          {item.is_recommended && (
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800">
                              Recommended
                            </span>
                          )}
                          {item.is_best_seller && (
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800">
                              Best Seller
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-4 mb-2">
                        <p className="text-lg font-bold text-gray-900">
                          Delivery: ${item.delivery_price}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          Pickup: ${item.pickup_price}
                        </p>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex flex-col items-end gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <span>Available</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.is_available}
                            onClick={() => toggleItemAvailability(item.item_id)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                              item.is_available ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                item.is_available ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                          <span>In Stock</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.in_stock}
                            onClick={() => toggleItemStock(item.item_id)}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                              item.in_stock ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                item.in_stock ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </label>
                      </div>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="rounded p-2 text-gray-400 hover:text-gray-600"
                        title="Edit item"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="rounded p-2 text-gray-400 hover:text-red-600"
                        title="Delete item"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {item.modifiers && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Modifiers:</span>
                        <span className="text-gray-700">Available</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Item Modal */}
      {showCreateItem && (
        <MenuItemFormModal
          isOpen={showCreateItem}
          onClose={() => setShowCreateItem(false)}
          onSave={handleSaveItem}
          categoryId={categoryId}
          restaurantId={restaurantId}
          mode="create"
        />
      )}

      {/* Edit Item Modal */}
      {showEditItem && selectedItem && (
        <MenuItemFormModal
          isOpen={showEditItem}
          onClose={() => {
            setShowEditItem(false);
            setSelectedItem(null);
          }}
          onSave={handleSaveItem}
          categoryId={categoryId}
          restaurantId={restaurantId}
          item={selectedItem}
          mode="edit"
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Item
              </h3>
              <button
                type="button"
                onClick={cancelDeleteItem}
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
                    Are you sure you want to delete "{itemToDelete.name}"?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This action cannot be undone. The item will be permanently removed from your menu.
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
                          <strong>Warning:</strong> This will permanently delete the menu item.
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
                onClick={cancelDeleteItem}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {isDeleting ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
