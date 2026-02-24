'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import FileUpload from '@/components/ui/file-upload';
import { insertPage, updatePage, getPageById } from '@/lib/graphql/queries';
import type { PageItem, CreatePageInput, UpdatePageInput } from '@/types/pages.types';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Page' : 'Create New Page'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditing ? 'Update page information and settings' : 'Add a new page to your website'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-red-400 mr-3">⚠️</div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Page Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="About Us"
                required
              />
            </div>

            <div>
              <label htmlFor="url_slug" className="block text-sm font-medium text-gray-700 mb-2">
                URL Slug *
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-lg">
                  /
                </span>
                <input
                  type="text"
                  id="url_slug"
                  value={formData.url_slug}
                  onChange={(e) => handleInputChange('url_slug', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="about-us"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only lowercase letters, numbers, and hyphens allowed
              </p>
            </div>
          </div>

          {/* SEO Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">SEO Settings</h3>
            
            <div>
              <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <input
                type="text"
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Page title for search engines"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.meta_title.length}/60 characters (recommended)
              </p>
            </div>

            <div>
              <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description for search engines"
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.meta_description.length}/160 characters (recommended)
              </p>
            </div>

            <div>
              {/* <label className="block text-sm font-medium text-gray-700 mb-2">Open Graph Image</label> */}
              <FileUpload
                accept="image"
                currentUrl={formData.og_image || undefined}
                onUpload={(media) => handleInputChange('og_image', media.url)}
                onRemove={() => handleInputChange('og_image', '')}
                label="Open Graph Image"
                description="Upload an image for social previews. We'll compress and upload it for you."
                restaurantId={restaurantId || ''}
                disabled={!restaurantId}
              />
            </div>

            <div>
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <textarea
                id="keywords"
                value={formData.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="restaurant, food, about"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional comma-separated tags (converted to JSON on save)
              </p>
            </div>
          </div>

          {/* Visibility Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Visibility Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) => handleInputChange('published', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                  Published
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_on_navbar"
                  checked={formData.show_on_navbar}
                  onChange={(e) => handleInputChange('show_on_navbar', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_on_navbar" className="ml-2 block text-sm text-gray-700">
                  Show in Navigation
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show_on_footer"
                  checked={formData.show_on_footer}
                  onChange={(e) => handleInputChange('show_on_footer', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="show_on_footer" className="ml-2 block text-sm text-gray-700">
                  Show in Footer
                </label>
              </div>

              {/* System Page flag removed from UI */}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditing ? 'Update Page' : 'Create Page'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PageFormPage() {
  const searchParams = useSearchParams();
  const pageId = searchParams.get('page_id');
  const restaurantId = searchParams.get('restaurant_id');

  const handleSuccess = (page: PageItem) => {
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