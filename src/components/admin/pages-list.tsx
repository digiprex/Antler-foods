'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPages, deletePage } from '@/lib/graphql/queries';
import { PageForm } from './page-form';
import type { PageItem } from '@/types/pages.types';

interface PagesListProps {
  restaurantId?: string;
  websiteId?: string;
}

export function PagesList({ restaurantId }: PagesListProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPages();
  }, [restaurantId]);

  const loadPages = async () => {
    try {
      setLoading(true);
      setError(null);
      const pagesData = await getPages(restaurantId);
      setPages(pagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (pageId: string) => {
    // open confirmation modal
    setConfirmDeleteId(pageId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const pageId = confirmDeleteId;
    try {
      setDeletingId(pageId);
      setConfirmDeleteId(null);
      await deletePage(pageId);
      await loadPages(); // Reload the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  const handleView = async (page: PageItem) => {
    if (!page.restaurant_id) {
      alert('No restaurant associated with this page');
      return;
    }

    try {
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(page.restaurant_id)}`);
      if (!res.ok) throw new Error('Failed to fetch restaurant staging domain');
      const data = await res.json();
      if (!data.success || !data.data) throw new Error(data.error || 'No staging domain');

      let domain = data.data.staging_domain;
      if (!domain) {
        alert('Staging domain not configured for this restaurant');
        return;
      }

      // Ensure protocol
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        domain = `https://${domain}`;
      }

      const url = `${domain.replace(/\/$/, '')}/${page.url_slug.replace(/^\//, '')}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to open page');
    }
  };

  const handleEdit = async (page: PageItem) => {
    if (!page.restaurant_id) {
      alert('No restaurant associated with this page');
      return;
    }

    try {
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(page.restaurant_id)}`);
      if (!res.ok) throw new Error('Failed to fetch restaurant');
      const data = await res.json();
      if (!data.success || !data.data) throw new Error(data.error || 'Restaurant not found');

      const name = data.data.name || '';
      const params = new URLSearchParams();
      params.set('restaurant_id', page.restaurant_id);
      if (name) params.set('restaurant_name', name);
      params.set('page_id', page.page_id);

      router.push(`/admin/page-settings?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to navigate to settings selector');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Pages</h2>
          <p className="text-gray-600 max-w-md">{error}</p>
          <button
            onClick={loadPages}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600">Manage your website pages</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create Page
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/40 z-60" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-auto z-70">
            <div className="p-4">
              <PageForm
                onCancel={() => setShowCreateModal(false)}
                onSuccess={async () => {
                  setShowCreateModal(false);
                  await loadPages();
                }}
                restaurantId={restaurantId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/40" onClick={cancelDelete} />
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delete</h3>
              <p className="text-sm text-gray-600 mt-2">Are you sure you want to delete this page? This action can be undone by restoring the record in the database.</p>
              <div className="mt-6 flex justify-end space-x-3">
                <button onClick={cancelDelete} className="px-4 py-2 bg-white border border-gray-300 rounded-lg">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirm Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pages found</h3>
          <p className="text-gray-600 mb-6">Create your first page to get started.</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Create Your First Page
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL Slug
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.page_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {page.name}
                        </div>
                        {page.meta_title && (
                          <div className="text-sm text-gray-500">
                            {page.meta_title}
                          </div>
                        )}
                        {page.is_system_page && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            System Page
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        /{page.url_slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          page.published
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {page.show_on_navbar && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Navbar
                          </span>
                        )}
                        {page.show_on_footer && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            Footer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(page)} className="text-blue-600 hover:text-blue-900">
                          Edit
                        </button>
                        <button onClick={() => handleView(page)} className="text-gray-400 hover:text-gray-600">
                          View
                        </button>
                        {!page.is_system_page && (
                          <button
                            onClick={() => handleDelete(page.page_id)}
                            disabled={deletingId === page.page_id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deletingId === page.page_id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PagesListPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');

  return (
    <PagesList 
      restaurantId={restaurantId || undefined} 
    />
  );
}