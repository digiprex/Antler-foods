/**
 * Modifier Items Form Component
 *
 * Dedicated management screen for modifier items using the new separate modifier_items table.
 * This component now uses the new API endpoints for CRUD operations on individual modifier items.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModifierItem {
  modifier_item_id: string;
  name: string;
  price: number;
  modifier_group_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ModifierGroup {
  modifier_group_id: string;
  name: string;
  description?: string;
  min_selection: number;
  max_selection: number;
  type: string;
  is_required: boolean;
  is_multi_select: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

interface ModifierItemsFormProps {
  modifierGroupId: string;
  modifierGroupName: string;
}

export default function ModifierItemsForm({
  modifierGroupId,
  modifierGroupName,
}: ModifierItemsFormProps) {
  const [group, setGroup] = useState<ModifierGroup | null>(null);
  const [items, setItems] = useState<ModifierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ModifierItem | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('0');
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const normalizedItemSearch = itemSearch.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    if (!normalizedItemSearch) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(normalizedItemSearch)
    );
  }, [items, normalizedItemSearch]);

  const fetchGroup = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch('/api/modifier-groups');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch modifier groups');
      }

      const foundGroup = (data.modifier_groups || []).find(
        (item: ModifierGroup) => item.modifier_group_id === modifierGroupId,
      );

      if (!foundGroup) {
        throw new Error('Modifier group not found');
      }

      setGroup(foundGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch modifier group');
    }
  }, [modifierGroupId]);

  const fetchItems = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch(`/api/modifier-items?modifier_group_id=${modifierGroupId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch modifier items');
      }

      setItems(data.modifier_items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch modifier items');
    }
  }, [modifierGroupId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchGroup(), fetchItems()]);
    } finally {
      setLoading(false);
    }
  }, [fetchGroup, fetchItems]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleCreateItem = async () => {
    const name = itemName.trim();
    const price = Number(itemPrice || 0);

    if (!name) {
      setItemError('Modifier item name is required');
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setItemError('Price must be 0 or greater');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/modifier-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          price,
          modifier_group_id: modifierGroupId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create modifier item');
      }

      // Add the new item to the list
      setItems(prevItems => [...prevItems, data.modifier_item]);
      setShowCreateItem(false);
      setItemName('');
      setItemPrice('0');
      setItemError(null);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to create modifier item');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditItemModal = (item: ModifierItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemError(null);
    setShowEditItem(true);
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    const name = itemName.trim();
    const price = Number(itemPrice || 0);

    if (!name) {
      setItemError('Modifier item name is required');
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setItemError('Price must be 0 or greater');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/modifier-items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modifier_item_id: editingItem.modifier_item_id,
          name,
          price,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update modifier item');
      }

      // Update the item in the list
      setItems(prevItems =>
        prevItems.map(item =>
          item.modifier_item_id === editingItem.modifier_item_id
            ? data.modifier_item
            : item
        )
      );
      setShowEditItem(false);
      setEditingItem(null);
      setItemName('');
      setItemPrice('0');
      setItemError(null);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to update modifier item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: ModifierItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/modifier-items?modifier_item_id=${item.modifier_item_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete modifier item');
      }

      // Remove the item from the list
      setItems(prevItems =>
        prevItems.filter(i => i.modifier_item_id !== item.modifier_item_id)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete modifier item');
    } finally {
      setIsSaving(false);
    }
  };

  const closeCreateItemModal = () => {
    setShowCreateItem(false);
    setItemName('');
    setItemPrice('0');
    setItemError(null);
  };

  const closeEditItemModal = () => {
    setShowEditItem(false);
    setEditingItem(null);
    setItemName('');
    setItemPrice('0');
    setItemError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading modifier items...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">{error || 'Modifier group not found'}</p>
            <button
              onClick={fetchData}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{modifierGroupName || group.name}</h2>
          <p className="text-sm text-gray-600">Manage modifier items for this group</p>
        </div>
        <button
          onClick={() => {
            setItemName('');
            setItemPrice('0');
            setItemError(null);
            setShowCreateItem(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 disabled:opacity-60"
          disabled={isSaving}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={itemSearch}
          onChange={(event) => setItemSearch(event.target.value)}
          placeholder="Search modifier items..."
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
        />
        {itemSearch && (
          <button
            type="button"
            onClick={() => setItemSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Clear modifier item search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No modifier items found</h3>
          <p className="text-gray-600 mb-4">Start by adding items to this modifier group.</p>
          <button
            onClick={() => {
              setItemName('');
              setItemPrice('0');
              setItemError(null);
              setShowCreateItem(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-600">
            No modifier items match "<span className="font-medium text-gray-800">{itemSearch}</span>".
          </p>
          <button
            type="button"
            onClick={() => setItemSearch('')}
            className="mt-3 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div key={item.modifier_item_id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">Price: ${Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditItemModal(item)}
                    className="rounded p-2 text-gray-400 hover:text-gray-600 disabled:opacity-60"
                    title="Edit modifier item"
                    disabled={isSaving}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="rounded p-2 text-gray-400 hover:text-red-600 disabled:opacity-60"
                    title="Delete modifier item"
                    disabled={isSaving}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateItem &&
        isMounted &&
        typeof document !== 'undefined' &&
        document.body &&
        createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Add Modifier Item</h3>
              <button
                type="button"
                onClick={closeCreateItemModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(event) => {
                    setItemName(event.target.value);
                    if (itemError) setItemError(null);
                  }}
                  placeholder="e.g., Extra Cheese"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(event) => {
                      setItemPrice(event.target.value);
                      if (itemError) setItemError(null);
                    }}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              {itemError && <p className="text-sm text-red-600">{itemError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <button
                type="button"
                onClick={closeCreateItemModal}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateItem}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                disabled={isSaving}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showEditItem &&
        isMounted &&
        typeof document !== 'undefined' &&
        document.body &&
        createPortal(
        <div className="fixed inset-0 top-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Modifier Item</h3>
              <button
                type="button"
                onClick={closeEditItemModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(event) => {
                    setItemName(event.target.value);
                    if (itemError) setItemError(null);
                  }}
                  placeholder="e.g., Extra Cheese"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={itemPrice}
                    onChange={(event) => {
                      setItemPrice(event.target.value);
                      if (itemError) setItemError(null);
                    }}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              {itemError && <p className="text-sm text-red-600">{itemError}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
              <button
                type="button"
                onClick={closeEditItemModal}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditItem}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                disabled={isSaving}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
