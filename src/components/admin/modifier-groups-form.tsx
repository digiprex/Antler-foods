/**
 * Modifier Groups Form Component
 *
 * Provides comprehensive modifier groups management functionality including:
 * - List of all modifier groups
 * - Create new modifier group
 * - Edit existing modifier groups
 * - Delete modifier groups
 * - Manage modifier items within groups
 */

'use client';

import { useState, useEffect } from 'react';
import ModifierGroupFormModal from './modifier-group-form-modal';

// Modifier group interface matching the database schema
interface ModifierGroup {
  modifier_group_id: string;
  name: string;
  description?: string;
  min_selection: number;
  max_selection: number;
  type: string;
  is_required: boolean;
  modifier_items: any;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export default function ModifierGroupsForm() {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ModifierGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch modifier groups from API
  const fetchModifierGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/modifier-groups');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch modifier groups');
      }
      
      setModifierGroups(data.modifier_groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch modifier groups');
    } finally {
      setLoading(false);
    }
  };

  // Load modifier groups on component mount
  useEffect(() => {
    fetchModifierGroups();
  }, []);

  const handleCreateGroup = () => {
    setShowCreateGroup(true);
    setSelectedGroup(null);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setSelectedGroup(group);
    setShowEditGroup(true);
  };

  const handleDeleteGroup = (group: ModifierGroup) => {
    setGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/modifier-groups?modifier_group_id=${groupToDelete.modifier_group_id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete modifier group');
      }
      
      // Remove from local state
      setModifierGroups(modifierGroups.filter(group => group.modifier_group_id !== groupToDelete.modifier_group_id));
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    } catch (err) {
      console.error('Delete modifier group error:', err);
      // Keep the modal open to show the error
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteGroup = () => {
    setShowDeleteConfirm(false);
    setGroupToDelete(null);
  };

  const handleSaveGroup = async (payload: Omit<ModifierGroup, 'modifier_group_id' | 'created_at' | 'updated_at' | 'is_deleted'>) => {
    try {
      if (showCreateGroup) {
        // Create new modifier group
        const response = await fetch('/api/modifier-groups', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create modifier group');
        }
        
        // Add to local state
        setModifierGroups((prevGroups) => [...prevGroups, data.modifier_group]);
        setShowCreateGroup(false);
      } else if (showEditGroup && selectedGroup) {
        // Update existing modifier group
        const response = await fetch('/api/modifier-groups', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            modifier_group_id: selectedGroup.modifier_group_id,
            ...payload,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update modifier group');
        }
        
        // Update local state
        setModifierGroups((prevGroups) =>
          prevGroups.map((group) =>
            group.modifier_group_id === selectedGroup.modifier_group_id ? data.modifier_group : group,
          ),
        );
        setShowEditGroup(false);
        setSelectedGroup(null);
      }
    } catch (err) {
      console.error('Save modifier group error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save modifier group';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading modifier groups...</p>
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
              onClick={fetchModifierGroups}
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
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Modifier Groups</h2>
          <p className="text-sm text-gray-600">Create and manage modifier groups for menu items</p>
        </div>
        <button
          onClick={handleCreateGroup}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Modifier Group
        </button>
      </div>

      {/* Modifier Groups List */}
      {modifierGroups.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No modifier groups found</h3>
          <p className="text-gray-600 mb-4">Start by creating modifier groups for menu item customizations.</p>
          <button
            onClick={handleCreateGroup}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Modifier Group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {modifierGroups.map((group) => (
            <div key={group.modifier_group_id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* Group Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      group.type === 'Upsell'
                        ? 'bg-amber-100 text-amber-800'
                        : group.type === 'Meal'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.type}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      group.is_required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      Required: {group.is_required ? 'True' : 'False'}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Min: {group.min_selection}</span>
                    <span>Max: {group.max_selection}</span>
                    {group.modifier_items && (
                      <span>
                        Items: {Array.isArray(group.modifier_items) 
                          ? group.modifier_items.length 
                          : Object.keys(group.modifier_items).length}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="rounded p-2 text-gray-400 hover:text-gray-600"
                    title="Edit modifier group"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="rounded p-2 text-gray-400 hover:text-red-600"
                    title="Delete modifier group"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modifier Items Display */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Modifier Items</h4>
                {group.modifier_items ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(group.modifier_items) 
                      ? group.modifier_items.map((item: any, index: number) => (
                          <span key={index} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                            {typeof item === 'string' ? item : item.name || `Item ${index + 1}`}
                            {typeof item === 'object' && item.price && (
                              <span className="ml-1 text-xs text-gray-500">+${item.price}</span>
                            )}
                          </span>
                        ))
                      : Object.entries(group.modifier_items).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                            {key}: {String(value)}
                          </span>
                        ))
                    }
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No modifier items defined</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modifier Group Modal */}
      {showCreateGroup && (
        <ModifierGroupFormModal
          isOpen={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onSave={handleSaveGroup}
          mode="create"
        />
      )}

      {/* Edit Modifier Group Modal */}
      {showEditGroup && selectedGroup && (
        <ModifierGroupFormModal
          isOpen={showEditGroup}
          onClose={() => {
            setShowEditGroup(false);
            setSelectedGroup(null);
          }}
          onSave={handleSaveGroup}
          group={selectedGroup}
          mode="edit"
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Modifier Group
              </h3>
              <button
                type="button"
                onClick={cancelDeleteGroup}
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
                    Are you sure you want to delete "{groupToDelete.name}"?
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    This action cannot be undone. The modifier group will be permanently removed and can no longer be used with menu items.
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
                          <strong>Warning:</strong> This will permanently delete the modifier group and all its items.
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
                onClick={cancelDeleteGroup}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteGroup}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {isDeleting ? 'Deleting...' : 'Delete Modifier Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
