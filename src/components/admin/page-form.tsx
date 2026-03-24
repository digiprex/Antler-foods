'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { insertPage, updatePage, getPageById } from '@/lib/graphql/queries';
import type { PageItem, CreatePageInput, UpdatePageInput } from '@/types/pages.types';
import { ImageGalleryModal } from './image-gallery-modal';

interface PageFormProps {
  pageId?: string;
  onSuccess?: (page: PageItem) => void;
  onCancel?: () => void;
  restaurantId?: string;
  websiteId?: string;
}

interface FormData {
  name: string;
  url_slug: string;
  meta_title: string;
  meta_description: string;
  keywords: string;
  og_image: string;
  published: boolean;
  show_on_navbar: boolean;
  show_on_footer: boolean;
  is_system_page: boolean;
}

const initialFormData: FormData = {
  name: '',
  url_slug: '',
  meta_title: '',
  meta_description: '',
  keywords: '',
  og_image: '',
  published: false,
  show_on_navbar: true,
  show_on_footer: true,
  is_system_page: false,
};

export function PageForm({ pageId, onSuccess, onCancel, restaurantId }: PageFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(!!pageId);
  const [showImageGallery, setShowImageGallery] = useState(false);

  const isEditing = !!pageId;

  useEffect(() => {
    if (pageId) {
      loadPage();
    }
  }, [pageId]);

  const loadPage = async () => {
    if (!pageId) return;

    try {
      setLoadingPage(true);
      setError(null);
      const page = await getPageById(pageId);

      if (!page) {
        setError('Page not found');
        return;
      }

      // Normalize keywords to comma-separated string for the form
      let keywordsString = '';
      if (page.keywords) {
        if (Array.isArray(page.keywords)) {
          keywordsString = page.keywords.join(', ');
        } else if (page.keywords.tags && Array.isArray(page.keywords.tags)) {
          keywordsString = page.keywords.tags.join(', ');
        } else {
          try {
            keywordsString = JSON.stringify(page.keywords);
          } catch {
            keywordsString = String(page.keywords);
          }
        }
      }

      setFormData({
        name: page.name,
        url_slug: page.url_slug,
        meta_title: page.meta_title || '',
        meta_description: page.meta_description || '',
        keywords: keywordsString,
        og_image: page.og_image || '',
        published: page.published,
        show_on_navbar: page.show_on_navbar,
        show_on_footer: page.show_on_footer,
        is_system_page: page.is_system_page,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
    } finally {
      setLoadingPage(false);
    }
  };

  const openImageGallery = () => {
    setShowImageGallery(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    handleInputChange('og_image', imageUrl);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate URL slug from name if creating new page
    if (field === 'name' && !isEditing && typeof value === 'string') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, url_slug: slug }));
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Page name is required';
    }
    
    if (!formData.url_slug.trim()) {
      return 'URL slug is required';
    }

    // Validate URL slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(formData.url_slug)) {
      return 'URL slug can only contain lowercase letters, numbers, and hyphens';
    }

    // No strict validation for comma-separated keywords; optional

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreatePageInput | UpdatePageInput = {
        name: formData.name.trim(),
        url_slug: formData.url_slug.trim(),
        meta_title: formData.meta_title.trim() || undefined,
        meta_description: formData.meta_description.trim() || undefined,
        // keywords will be set below (converted from comma-separated string)
        og_image: formData.og_image.trim() || undefined,
        published: formData.published,
        show_on_navbar: formData.show_on_navbar,
        show_on_footer: formData.show_on_footer,
        is_system_page: formData.is_system_page,
          restaurant_id: restaurantId

      };

        // Convert comma-separated keywords into JSON payload { tags: [...] }
        const keywordsPayload = formData.keywords.trim()
          ? { tags: formData.keywords.split(',').map((s) => s.trim()).filter(Boolean) }
          : null;

        // attach keywordsPayload (or null) to payload
        (payload as any).keywords = keywordsPayload;

      let result: PageItem;
      
      if (isEditing) {
        await updatePage(pageId!, payload as Record<string, unknown>);
        // Reload the page data to get the updated version
        const updatedPage = await getPageById(pageId!);
        if (!updatedPage) {
          throw new Error('Failed to load updated page');
        }
        result = updatedPage;
      } else {
        result = await insertPage(payload as Record<string, unknown>);
      }

      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} page`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPage) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                {isEditing ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                )}
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Page' : 'Create New Page'}
              </h2>
              <p className="mt-0.5 text-sm text-gray-600">
                {isEditing ? 'Update page information and settings' : 'Add a new page to your website'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-900">Error</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                <p className="mt-0.5 text-sm text-gray-600">Page name and URL configuration</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Page Name</span>
                  <span className="ml-1 text-xs text-red-600">*</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Display name for the page</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="About Us"
                  required
                />
              </div>

              <div>
                <label htmlFor="url_slug" className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">URL Slug</span>
                  <span className="ml-1 text-xs text-red-600">*</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Appears in the page URL</span>
                </label>
                <div className="flex items-center rounded-lg border border-gray-300 bg-white transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500">
                  <span className="border-r border-gray-300 px-3 font-mono text-sm text-gray-500">/</span>
                  <input
                    type="text"
                    id="url_slug"
                    value={formData.url_slug}
                    onChange={(e) => handleInputChange('url_slug', e.target.value)}
                    className="flex-1 px-4 py-2.5 font-mono text-sm focus:outline-none"
                    placeholder="about-us"
                    pattern="[a-z0-9-]+"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Only lowercase letters, numbers, and hyphens
                </p>
              </div>
            </div>
          </div>

          {/* SEO Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">SEO Settings</h3>
                <p className="mt-0.5 text-sm text-gray-600">Search engine optimization</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="meta_title" className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Meta Title</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Title for search results</span>
                </label>
                <input
                  type="text"
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => handleInputChange('meta_title', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="Page title for search engines"
                  maxLength={60}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.meta_title.length}/60 characters
                </p>
              </div>

              <div>
                <label htmlFor="meta_description" className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Meta Description</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Brief description for search results</span>
                </label>
                <textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => handleInputChange('meta_description', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="Brief description for search engines"
                  maxLength={160}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.meta_description.length}/160 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Open Graph Image</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Recommended: 1200x630px</span>
                </label>
              <div className="space-y-3">
                {formData.og_image && (
                  <div className="relative inline-block">
                    <img
                      src={formData.og_image}
                      alt="Open Graph preview"
                      className="h-auto w-48 rounded-lg border-2 border-purple-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('og_image', '')}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-sm text-white transition hover:bg-red-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {!formData.og_image && (
                  <>
                    <button
                      type="button"
                      onClick={openImageGallery}
                      disabled={!restaurantId}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      Choose Image from Gallery
                    </button>
                    {!restaurantId && (
                      <p className="text-xs text-red-600">Restaurant ID is required to select images</p>
                    )}
                  </>
                )}
                </div>
              </div>

              <div>
                <label htmlFor="keywords" className="mb-2 block">
                  <span className="text-sm font-semibold text-gray-900">Keywords</span>
                  <span className="mt-0.5 block text-xs text-gray-600">Comma-separated tags for SEO</span>
                </label>
                <textarea
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => handleInputChange('keywords', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="restaurant, food, about"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional comma-separated tags
                </p>
              </div>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Visibility Settings</h3>
                <p className="mt-0.5 text-sm text-gray-600">Control page visibility</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label htmlFor="published" className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => handleInputChange('published', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Published</div>
                  <div className="text-xs text-gray-600">Make page visible</div>
                </div>
              </label>

              <label htmlFor="show_on_navbar" className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                <input
                  type="checkbox"
                  id="show_on_navbar"
                  checked={formData.show_on_navbar}
                  onChange={(e) => handleInputChange('show_on_navbar', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Show in Navbar</div>
                  <div className="text-xs text-gray-600">Display in navigation</div>
                </div>
              </label>

              <label htmlFor="show_on_footer" className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-gray-200 p-4 transition-all hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50">
                <input
                  type="checkbox"
                  id="show_on_footer"
                  checked={formData.show_on_footer}
                  onChange={(e) => handleInputChange('show_on_footer', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Show in Footer</div>
                  <div className="text-xs text-gray-600">Display in footer</div>
                </div>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {isEditing ? 'Update Page' : 'Create Page'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelect={handleSelectImage}
        restaurantId={restaurantId}
        title="Select Open Graph Image"
        description="Choose an image from your media library or upload new"
      />
    </div>
  );
}

export default function PageFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');

  const handleSuccess = (page: PageItem) => {
    // Redirect back to pages list with success message
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    params.set('success', pageId ? 'updated' : 'created');
    
    router.replace(`/admin/pages-settings?${params.toString()}`);
  };

  const handleCancel = () => {
    // Redirect back to pages list
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    
    router.replace(`/admin/pages-settings?${params.toString()}`);
  };

  return (
    <PageForm
      pageId={pageId || undefined}
      restaurantId={restaurantId || undefined}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
}
