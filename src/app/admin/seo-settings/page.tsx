/**
 * SEO Settings Page
 *
 * Dashboard-integrated interface for configuring page SEO settings.
 * Access: /admin/seo-settings
 *
 * Features:
 * - Meta title configuration
 * - Meta description configuration
 * - Social sharing image (Open Graph image)
 * - Image selection from media gallery
 */

'use client';

import { Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';

function SEOSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  const pageName = searchParams.get('page_name');

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);

  useEffect(() => {
    if (restaurantId && pageId) {
      fetchPageSEO();
    }
  }, [restaurantId, pageId]);

  const fetchPageSEO = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setMetaTitle(data.data.meta_title || '');
        setMetaDescription(data.data.meta_description || '');
        setKeywords(data.data.keywords || '');
        setOgImage(data.data.og_image || '');
      } else {
        toast.error('Failed to load SEO settings', {
          duration: 3000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error fetching page SEO:', error);
      toast.error('Error loading SEO settings', {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId || !pageId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_title: metaTitle,
          meta_description: metaDescription,
          keywords: keywords,
          og_image: ogImage,
          restaurant_id: restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('SEO settings saved successfully!', {
          duration: 3000,
          position: 'top-right',
        });
      } else {
        toast.error('Error saving settings: ' + data.error, {
          duration: 4000,
          position: 'top-right',
        });
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      toast.error('Error saving settings', {
        duration: 4000,
        position: 'top-right',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    if (pageName) params.set('page_name', pageName);
    router.push(`/admin/page-settings?${params.toString()}`);
  };

  const openImageGallery = () => {
    setShowImageGallery(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    setOgImage(imageUrl);
  };

  if (loading) {
    return (
      <>
        <Toaster />
        <>
          <div className="flex items-center justify-center min-h-screen">
            <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <p className="text-sm font-medium text-gray-700">Loading SEO settings...</p>
            </div>
          </div>
        </>
      </>
    );
  }

  return (
    <>
      <Toaster />
      <>
        {restaurantId && restaurantName && pageId ? (
          <>
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="mb-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Page Settings
            </button>

            {/* Page Header */}
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                  <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">SEO Settings</h1>
                  {pageName && <p className="mt-1 text-sm text-gray-600">{pageName}</p>}
                </div>
              </div>

            <div className="space-y-6">
              {/* Meta Title Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Meta Title</h2>
                    <p className="text-sm text-gray-600">Recommended: 50-60 characters</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="Your page title for search engines"
                  maxLength={60}
                />
                <div className="mt-2 text-xs text-gray-500">
                  {metaTitle.length}/60 characters
                </div>
              </div>

              {/* Meta Description Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Meta Description</h2>
                    <p className="text-sm text-gray-600">Recommended: 150-160 characters</p>
                  </div>
                </div>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="A brief description of your page content for search results"
                  maxLength={160}
                />
                <div className="mt-2 text-xs text-gray-500">
                  {metaDescription.length}/160 characters
                </div>
              </div>

              {/* Keywords Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Meta Keywords</h2>
                    <p className="text-sm text-gray-600">Comma-separated keywords for your page</p>
                  </div>
                </div>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="restaurant, food, dining, delivery, catering"
                />
                <div className="mt-2 text-xs text-gray-500">
                  {keywords ? keywords.split(',').filter(k => k.trim()).length : 0} keyword{keywords && keywords.split(',').filter(k => k.trim()).length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Social Sharing Image Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Social Sharing Image</h2>
                    <p className="text-sm text-gray-600">Open Graph image - Recommended: 1200×630px</p>
                  </div>
                </div>

                {ogImage ? (
                  <div className="space-y-4">
                    <div className="relative w-48 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                      <img
                        src={ogImage}
                        alt="Social sharing preview"
                        className="h-auto w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity hover:opacity-100" />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={openImageGallery}
                        className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        Change Image
                      </button>
                      <button
                        onClick={() => setOgImage('')}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-colors hover:border-purple-300 hover:bg-purple-50/50">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-purple-200">
                          <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                        </div>
                        <h3 className="mb-2 text-sm font-semibold text-gray-900">No image selected</h3>
                        <p className="mb-4 text-xs text-gray-600">Choose an image from your media library</p>
                        <button
                          onClick={openImageGallery}
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          Select Image from Gallery
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">SEO Preview</h2>
                    <p className="text-sm text-gray-600">How your page will appear</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Google Search Result Preview */}
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-gray-700">Google Search Result</h3>
                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                      <div className="mb-1 text-lg text-blue-600">{metaTitle || 'Page Title'}</div>
                      <div className="mb-2 text-sm text-green-600">
                        https://yourwebsite.com/{pageName?.toLowerCase().replace(/\s+/g, '-') || 'page'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {metaDescription || 'Your page description will appear here...'}
                      </div>
                    </div>
                  </div>

                  {/* Social Media Preview */}
                  <div>
                    <h3 className="mb-3 text-sm font-medium text-gray-700">Social Media Preview</h3>
                    <div className="max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white">
                      {/* Image Section */}
                      <div className="aspect-[1.91/1] flex items-center justify-center bg-gray-100">
                        {ogImage ? (
                          <img
                            src={ogImage}
                            alt="Social sharing preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-gray-400">
                            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200">
                              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                            </div>
                            <div className="text-sm">Social Sharing Image</div>
                            <div className="text-xs">1200 × 630 px</div>
                          </div>
                        )}
                      </div>
                      {/* Content Section */}
                      <div className="border-t border-gray-100 p-3">
                        <div className="mb-1 line-clamp-2 text-sm font-medium text-gray-900">
                          {metaTitle || 'Page Title'}
                        </div>
                        <div className="line-clamp-2 text-xs text-gray-600">
                          {metaDescription || 'Your page description will appear here...'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">yourwebsite.com</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Save SEO Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">Select a Restaurant & Page</h2>
              <p className="mx-auto max-w-md text-sm text-gray-600">
                Please add or select a restaurant and page from the sidebar to configure SEO settings.
              </p>
            </div>
          </div>
        )}

        <ImageGalleryModal
          isOpen={showImageGallery}
          onClose={() => setShowImageGallery(false)}
          onSelect={handleSelectImage}
          restaurantId={restaurantId || undefined}
          title="Select Social Sharing Image"
          description="Choose an image from your media library or upload new"
        />
      </>
    </>
  );
}

export default function SEOSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SEOSettingsContent />
    </Suspense>
  );
}
