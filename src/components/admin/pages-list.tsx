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
  const [updatingPublishId, setUpdatingPublishId] = useState<string | null>(null);
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

  const togglePublish = async (pageId: string, currentStatus: boolean) => {
    setUpdatingPublishId(pageId);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: !currentStatus,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadPages(); // Reload the list to show updated status
      } else {
        alert('Failed to update publish status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      alert('Error updating publish status');
    } finally {
      setUpdatingPublishId(null);
    }
  };

  const handleView = async (page: PageItem) => {
    if (!page.restaurant_id) {
      alert('No restaurant associated with this page');
      return;
    }

    try {
      console.log('[Pages List] 👁️ Viewing page:', page.name, 'slug:', page.url_slug);
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(page.restaurant_id)}`);
      if (!res.ok) throw new Error('Failed to fetch restaurant staging domain');
      const data = await res.json();
      console.log('[Pages List] 🏪 Restaurant data:', data);

      if (!data.success || !data.data) throw new Error(data.error || 'No staging domain');

      let domain = data.data.staging_domain;
      console.log('[Pages List] 🌐 Staging domain from DB:', domain);

      if (!domain) {
        alert('⚠️ Staging domain not configured!\n\nPlease go to Location Settings and set the staging_domain field.\n\nFor localhost development, set it to: localhost:3000');
        return;
      }

      // Ensure protocol (use http for localhost, https for others)
      if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
        if (domain.includes('localhost') || domain.startsWith('192.168.') || domain.startsWith('127.0.0.1')) {
          domain = `http://${domain}`;
        } else {
          domain = `https://${domain}`;
        }
      }

      const url = `${domain.replace(/\/$/, '')}/${page.url_slug.replace(/^\//, '')}`;
      console.log('[Pages List] 🚀 Opening URL:', url);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[Pages List] ❌ Error:', err);
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

      const restaurantName = data.data.name || '';
      const params = new URLSearchParams();
      params.set('restaurant_id', page.restaurant_id);
      if (restaurantName) params.set('restaurant_name', restaurantName);
      params.set('page_id', page.page_id);
      if (page.name) params.set('page_name', page.name);

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
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#667eea] mx-auto mb-4"></div>
          <p className="text-[#556678] text-base">Loading pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#111827] mb-2">Error Loading Pages</h2>
          <p className="text-[#556678] max-w-md mb-6">{error}</p>
          <button
            onClick={loadPages}
            className="rounded-xl bg-[#667eea] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b21b6]"
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
          <h1 className="text-[28px] font-semibold text-[#111827]">Pages</h1>
          <p className="text-[#556678] mt-1">Manage your website pages</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-[#667eea] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] shadow-sm hover:shadow-md"
        >
          + Create Page
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-4xl z-50">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute -top-3 -right-3 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] text-[#6b7280] hover:text-[#111827] transition-all duration-200 hover:scale-110 z-10"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={cancelDelete} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#111827]">Confirm Delete</h3>
              </div>
              <p className="text-sm text-[#556678] leading-relaxed">
                Are you sure you want to delete this page? This action can be undone by restoring the record in the database.
              </p>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#f7fafc]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Delete Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-7xl mb-6">📄</div>
          <h3 className="text-xl font-semibold text-[#111827] mb-2">No pages found</h3>
          <p className="text-[#556678] mb-8">Create your first page to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl bg-[#667eea] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5b21b6] shadow-sm hover:shadow-md"
          >
            Create Your First Page
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#d7e2e6] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e5e7eb]">
              <thead className="bg-[#f8fbfd]">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    URL Slug
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    Visibility
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-[#556678] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#e5e7eb]">
                {pages.map((page) => (
                  <tr key={page.page_id} className="hover:bg-[#f9fafb] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-[#111827]">
                          {page.name}
                        </div>
                        {page.meta_title && (
                          <div className="text-sm text-[#6b7280] mt-0.5">
                            {page.meta_title}
                          </div>
                        )}
                        {page.is_system_page && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#ede9fe] text-[#667eea] mt-1">
                            System Page
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm text-[#556678] bg-[#f3f4f6] px-2.5 py-1 rounded-md font-mono">
                        /{page.url_slug}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          page.published
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {page.show_on_navbar && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#f3f4f6] text-[#374151]">
                            Navbar
                          </span>
                        )}
                        {page.show_on_footer && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#f3f4f6] text-[#374151]">
                            Footer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6b7280]">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => togglePublish(page.page_id, page.published)}
                          disabled={updatingPublishId === page.page_id}
                          className={`font-medium transition disabled:opacity-50 ${
                            page.published
                              ? 'text-amber-600 hover:text-amber-700'
                              : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {updatingPublishId === page.page_id
                            ? 'Updating...'
                            : page.published
                              ? 'Unpublish'
                              : 'Publish'
                          }
                        </button>
                        <button
                          onClick={() => handleEdit(page)}
                          className="text-[#667eea] hover:text-[#5b21b6] font-medium transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleView(page)}
                          className="text-[#6b7280] hover:text-[#111827] font-medium transition"
                        >
                          View
                        </button>
                        {!page.is_system_page && (
                          <button
                            onClick={() => handleDelete(page.page_id)}
                            disabled={deletingId === page.page_id}
                            className="text-red-600 hover:text-red-700 font-medium transition disabled:opacity-50"
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