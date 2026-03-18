'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MenuFormModal from './menu-form-modal';

interface MenuManagementFormProps {
  restaurantId: string;
  restaurantName: string;
}

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

export default function MenuManagementForm({ restaurantId, restaurantName }: MenuManagementFormProps) {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [menuModalMode, setMenuModalMode] = useState<'create' | 'edit'>('create');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedMenu = useMemo(
    () => menus.find((menu) => menu.menu_id === selectedMenuId) ?? null,
    [menus, selectedMenuId],
  );

  // Fetch menus from API
  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/menus?restaurant_id=${restaurantId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch menus');
      }
      
      const nextMenus = data.menus || [];
      setMenus(nextMenus);

      // Keep selection stable if possible, otherwise fall back to first menu.
      setSelectedMenuId((prevSelectedMenuId) => {
        if (!nextMenus.length) {
          return null;
        }

        const isStillValid = prevSelectedMenuId
          ? nextMenus.some((menu: Menu) => menu.menu_id === prevSelectedMenuId)
          : false;

        return isStillValid ? prevSelectedMenuId : nextMenus[0].menu_id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch menus');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Load menus on component mount
  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const openCreateMenu = () => {
    setMenuModalMode('create');
    setShowMenuModal(true);
  };

  const openEditMenu = (menuId: string) => {
    setSelectedMenuId(menuId);
    setMenuModalMode('edit');
    setShowMenuModal(true);
  };

  const openDeleteModal = (menu: Menu) => {
    setMenuToDelete(menu);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!menuToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/menus?menu_id=${menuToDelete.menu_id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete menu');
      }
      
      // Remove from local state and keep selection in sync without stale closures.
      setMenus((prevMenus) => {
        const nextMenus = prevMenus.filter((menu) => menu.menu_id !== menuToDelete.menu_id);
        setSelectedMenuId((prevSelectedMenuId) => {
          if (prevSelectedMenuId !== menuToDelete.menu_id) {
            return prevSelectedMenuId;
          }

          return nextMenus[0]?.menu_id ?? null;
        });
        return nextMenus;
      });

      setShowDeleteModal(false);
      setMenuToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete menu');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMenuToDelete(null);
  };

  const saveMenu = async (payload: Pick<Menu, 'name' | 'varies_with_time' | 'is_active'>) => {
    try {
      if (menuModalMode === 'create') {
        const response = await fetch('/api/menus', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            name: payload.name,
            is_active: payload.is_active,
            varies_with_time: payload.varies_with_time,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create menu');
        }
        
        // Add to local state
        setMenus((prevMenus) => [data.menu, ...prevMenus]);
        setSelectedMenuId(data.menu.menu_id);
      } else {
        if (!selectedMenu) return;
        
        const response = await fetch('/api/menus', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            menu_id: selectedMenu.menu_id,
            name: payload.name,
            is_active: payload.is_active,
            varies_with_time: payload.varies_with_time,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to update menu');
        }
        
        // Update local state
        setMenus((prevMenus) =>
          prevMenus.map((menu) =>
            menu.menu_id === selectedMenu.menu_id ? data.menu : menu,
          ),
        );
      }
      
      setShowMenuModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save menu');
    }
  };

  const openMenuDetails = (menu: Menu) => {
    const params = new URLSearchParams({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      menu_id: menu.menu_id,
      menu_name: menu.name,
    });

    router.push(`/admin/menu-categories?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
              <p className="text-sm text-gray-600">Loading menus...</p>
            </div>
          </div>
        </section>
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
              onClick={fetchMenus}
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
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Menus</h2>
            <p className="text-sm text-gray-600">Create, edit, delete, and open a menu to manage its categories and items.</p>
          </div>
          <button
            onClick={openCreateMenu}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            disabled={loading}
          >
            Add Menu
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <button
              key={menu.menu_id}
              onClick={() => openMenuDetails(menu)}
              className="rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-purple-300 hover:bg-purple-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{menu.name}</p>
                    {menu.varies_with_time && (
                      <div className="flex items-center gap-1">
                        <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-medium text-blue-600">Time-based</span>
                      </div>
                    )}
                  </div>
                  {menu.varies_with_time && (
                    <p className="mt-1 text-xs text-gray-600">Varies with time</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Updated {new Date(menu.updated_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${menu.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {menu.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 flex gap-2" onClick={(event) => event.stopPropagation()}>
                <button
                  onClick={() => openEditMenu(menu.menu_id)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => openDeleteModal(menu)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </button>
          ))}
        </div>

        {menus.length === 0 && !loading ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600">
            No menus yet. Add your first menu.
          </div>
        ) : null}
      </section>

      <MenuFormModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onSave={saveMenu}
        menu={menuModalMode === 'edit' ? selectedMenu : null}
        mode={menuModalMode}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Menu</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone.</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 mb-6">
                Are you sure you want to delete "<span className="font-medium">{menuToDelete?.name}</span>"?
                This will permanently remove the menu and all its associated data.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete Menu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
