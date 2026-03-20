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
  const [stagingDomainExists, setStagingDomainExists] = useState<boolean | null>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPages();
    checkStagingDomain();
  }, [restaurantId]);

  const checkStagingDomain = async () => {
    if (!restaurantId) {
      setStagingDomainExists(null);
      return;
    }

    setCheckingDomain(true);
    try {
      const res = await fetch(`/api/admin/restaurant-staging?restaurant_id=${encodeURIComponent(restaurantId)}`);
      if (!res.ok) {
        setStagingDomainExists(false);
        return;
      }
      
      const data = await res.json();
      if (!data.success || !data.data) {
        setStagingDomainExists(false);
        return;
      }

      const hasStagingDomain = Boolean(data.data.staging_domain?.trim());
      setStagingDomainExists(hasStagingDomain);
    } catch (err) {
      console.error('Error checking staging domain:', err);
      setStagingDomainExists(false);
    } finally {
      setCheckingDomain(false);
    }
  };

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
    const isMenuPage = page.url_slug?.trim().toLowerCase() === 'menu';
    if (isMenuPage) {
      return;
    }

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
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Error Loading Pages</h2>
          <p className="mb-6 text-sm text-gray-600">{error}</p>
          <button
            onClick={loadPages}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show loading state while checking domain
  if (checkingDomain) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Checking site status...</p>
        </div>
      </div>
    );
  }

  // Show message when no staging domain exists
  if (stagingDomainExists === false) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-purple-200">
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            Site Not Created
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            This restaurant doesn't have a website created yet. You need to create a site first before managing pages.
          </p>
          <button
            onClick={() => {
              // Navigate to restaurant list page
              const currentPath = window.location.pathname;
              const roleMatch = currentPath.match(/\/dashboard\/([^\/]+)/);
              const role = roleMatch ? roleMatch[1] : 'admin';
              router.push(`/dashboard/${role}/restaurants`);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Go to Restaurant List
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pages</h1>
            <p className="mt-0.5 text-sm text-gray-600">Manage your website pages</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Page
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="fixed inset-0 bg-black/50" onClick={cancelDelete} />
          <div className="relative z-50 w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-red-200 bg-white p-6 shadow-2xl duration-200">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Are you sure you want to delete this page? This action can be undone by restoring the record in the database.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 py-16">
          <svg className="h-20 w-20 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <h3 className="mt-4 text-xl font-bold text-gray-900">No pages found</h3>
          <p className="mt-2 text-sm text-gray-600">Create your first page to get started.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Your First Page
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-purple-100/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Page
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    URL Slug
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Visibility
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                    Updated
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pages.map((page) => (
                  (() => {
                    const isMenuPage = page.url_slug?.trim().toLowerCase() === 'menu';
                    return (
                  <tr
                    key={page.page_id}
                    className={`transition-colors ${
                      isMenuPage ? 'bg-white hover:bg-white' : 'hover:bg-purple-50/50'
                    }`}
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {page.name}
                        </div>
                        {page.meta_title && (
                          <div className="mt-0.5 text-xs text-gray-600">
                            {page.meta_title}
                          </div>
                        )}
                        {page.is_system_page && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <code className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700">
                        /{page.url_slug}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          page.published
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {page.published ? (
                          <>
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            Published
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                            Draft
                          </>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex gap-1.5">
                        {page.show_on_navbar && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                            </svg>
                            Navbar
                          </span>
                        )}
                        {page.show_on_footer && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-7.5 7.5-7.5-7.5m15 6l-7.5 7.5-7.5-7.5" />
                            </svg>
                            Footer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-600">
                      {new Date(page.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePublish(page.page_id, page.published)}
                          disabled={updatingPublishId === page.page_id}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            page.published
                              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={page.published ? 'Unpublish' : 'Publish'}
                        >
                          {updatingPublishId === page.page_id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          ) : page.published ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(page)}
                          disabled={isMenuPage}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                            isMenuPage
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-purple-200 text-purple-600 hover:bg-purple-50'
                          }`}
                          title={isMenuPage ? 'Menu page cannot be edited here' : 'Edit page'}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleView(page)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-gray-600 transition hover:bg-gray-50"
                          title="View page"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                          </svg>
                        </button>
                        {!page.is_system_page && (
                          <button
                            onClick={() => handleDelete(page.page_id)}
                            disabled={deletingId === page.page_id}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Delete page"
                          >
                            {deletingId === page.page_id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
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
