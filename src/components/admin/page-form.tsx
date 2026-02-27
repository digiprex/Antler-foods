'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
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

  const loadPage = useCallback(async () => {
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
  }, [pageId]);

  useEffect(() => {
    if (pageId) {
      loadPage();
    }
  }, [pageId, loadPage]);

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
        (payload as Record<string, unknown>).keywords = keywordsPayload;

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#667eea] mx-auto mb-4"></div>
          <p className="text-[#556678]">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl border border-[#d7e2e6] overflow-hidden">
        <div className="border-b border-[#d8e3e7] px-8 py-5">
          <h2 className="text-[28px] font-semibold text-[#111827]">
            {isEditing ? 'Edit Page' : 'Create New Page'}
          </h2>
          <p className="text-sm text-[#556678] mt-1">
            {isEditing ? 'Update page information and settings' : 'Add a new page to your website'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="rounded-xl border border-[#f4c3c3] bg-[#fff5f5] px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="text-[#e57373] text-lg">⚠️</span>
                <div>
                  <h3 className="text-sm font-semibold text-[#c62828]">Error</h3>
                  <p className="text-sm text-[#d32f2f] mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-sm font-medium text-[#374151] mb-1.5">
                Page Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-12 w-full px-3 border border-[#d4e0e6] rounded-xl bg-white text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20"
                placeholder="About Us"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="url_slug" className="block text-sm font-medium text-[#374151] mb-1.5">
                URL Slug *
              </label>
              <div className="flex min-h-12 items-center rounded-xl border border-[#d4e0e6] bg-white">
                <span className="ml-3 flex items-center gap-2 border-r border-[#d6e0e5] pr-3 text-[#556678]">
                  /
                </span>
                <input
                  type="text"
                  id="url_slug"
                  value={formData.url_slug}
                  onChange={(e) => handleInputChange('url_slug', e.target.value)}
                  className="h-12 w-full bg-transparent px-3 text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none"
                  placeholder="about-us"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-xs text-[#6b7280] mt-1">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>
          </div>

          {/* SEO Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#111827]">SEO Settings</h3>

            <div className="space-y-1.5">
              <label htmlFor="meta_title" className="block text-sm font-medium text-[#374151] mb-1.5">
                Meta Title
              </label>
              <input
                type="text"
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                className="h-12 w-full px-3 border border-[#d4e0e6] rounded-xl bg-white text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20"
                placeholder="Page title for search engines"
                maxLength={60}
              />
              <p className="text-xs text-[#6b7280] mt-1">
                {formData.meta_title.length}/60 characters (recommended)
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="meta_description" className="block text-sm font-medium text-[#374151] mb-1.5">
                Meta Description
              </label>
              <textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#d4e0e6] rounded-xl bg-white text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20"
                placeholder="Brief description for search engines"
                maxLength={160}
              />
              <p className="text-xs text-[#6b7280] mt-1">
                {formData.meta_description.length}/160 characters (recommended)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#374151] mb-1.5">
                Open Graph Image
                <span className="text-[#6b7280] font-normal ml-2">(Recommended: 1200x630px)</span>
              </label>
              <div className="space-y-3">
                {formData.og_image && (
                  <div className="relative inline-block">
                    <Image
                      src={formData.og_image}
                      alt="Open Graph preview"
                      width={192}
                      height={100}
                      className="w-48 h-auto rounded-xl border border-[#d4e0e6]"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('og_image', '')}
                      className="absolute top-2 right-2 bg-[#e57373] text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-[#d32f2f] transition text-sm"
                    >
                      ×
                    </button>
                  </div>
                )}
                {!formData.og_image && (
                  <>
                    <button
                      type="button"
                      onClick={openImageGallery}
                      disabled={!restaurantId}
                      className="rounded-xl bg-[#667eea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#cfc8ff] disabled:text-[#f8f7ff]"
                    >
                      📁 Choose Image from Gallery
                    </button>
                    {!restaurantId && (
                      <p className="text-xs text-[#d32f2f]">Restaurant ID is required to select images</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="keywords" className="block text-sm font-medium text-[#374151] mb-1.5">
                Keywords (comma-separated)
              </label>
              <textarea
                id="keywords"
                value={formData.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#d4e0e6] rounded-xl bg-white text-base text-[#101827] placeholder:text-[#a0acb7] focus:outline-none focus:border-[#667eea] focus:ring-2 focus:ring-[#667eea]/20"
                placeholder="restaurant, food, about"
              />
              <p className="text-xs text-[#6b7280] mt-1">
                Optional comma-separated tags (converted to JSON on save)
              </p>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#111827]">Visibility Settings</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => handleInputChange('published', e.target.checked)}
                  className="h-4 w-4 text-[#667eea] focus:ring-[#667eea] border-[#d4e0e6] rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-[#374151]">
                  Published
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_on_navbar"
                  checked={formData.show_on_navbar}
                  onChange={(e) => handleInputChange('show_on_navbar', e.target.checked)}
                  className="h-4 w-4 text-[#667eea] focus:ring-[#667eea] border-[#d4e0e6] rounded"
                />
                <label htmlFor="show_on_navbar" className="ml-2 block text-sm text-[#374151]">
                  Show in Navigation
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_on_footer"
                  checked={formData.show_on_footer}
                  onChange={(e) => handleInputChange('show_on_footer', e.target.checked)}
                  className="h-4 w-4 text-[#667eea] focus:ring-[#667eea] border-[#d4e0e6] rounded"
                />
                <label htmlFor="show_on_footer" className="ml-2 block text-sm text-[#374151]">
                  Show in Footer
                </label>
              </div>

              {/* System Page flag removed from UI */}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#d8e3e7]">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#f7fafc]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#667eea] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:bg-[#cfc8ff] disabled:text-[#f8f7ff]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditing ? 'Update Page' : 'Create Page'
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
  const searchParams = useSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');

  const handleSuccess = () => {
    // Redirect back to pages list with success message
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    params.set('success', pageId ? 'updated' : 'created');

    window.location.href = `/admin/pages-settings?${params.toString()}`;
  };

  const handleCancel = () => {
    // Redirect back to pages list
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    
    window.location.href = `/admin/pages-settings?${params.toString()}`;
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