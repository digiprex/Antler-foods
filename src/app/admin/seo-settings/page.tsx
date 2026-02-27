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

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import styles from '@/components/admin/gallery-settings-form.module.css';
import toast, { Toaster } from 'react-hot-toast';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';

export default function SEOSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  const pageName = searchParams.get('page_name');

  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);

  const fetchPageSEO = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setMetaTitle(data.data.meta_title || '');
        setMetaDescription(data.data.meta_description || '');
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
  }, [pageId]);

  useEffect(() => {
    if (restaurantId && pageId) {
      fetchPageSEO();
    }
  }, [restaurantId, pageId, fetchPageSEO]);

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

  return (
    <>
      <Toaster />
      <DashboardLayout>
      {restaurantId && restaurantName ? (
        <div className={styles.container}>
          <div className={styles.singleLayout}>
            <div className={styles.formSection}>
              <button
                onClick={handleBack}
                className={`${styles.button} ${styles.secondaryButton} ${styles.backButton}`}
              >
                ← Back to Page Settings
              </button>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">SEO Settings</h1>
                  {pageName && <p className="text-sm text-gray-600 mt-1">{pageName}</p>}
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500">Loading SEO settings...</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Meta Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Title
                        <span className="text-gray-500 font-normal ml-2">(Recommended: 50-60 characters)</span>
                      </label>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your page title for search engines"
                        maxLength={60}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {metaTitle.length}/60 characters
                      </div>
                    </div>

                    {/* Meta Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Meta Description
                        <span className="text-gray-500 font-normal ml-2">(Recommended: 150-160 characters)</span>
                      </label>
                      <textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="A brief description of your page content for search results"
                        maxLength={160}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {metaDescription.length}/160 characters
                      </div>
                    </div>

                    {/* Social Sharing Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Social Sharing Image (Open Graph)
                        <span className="text-gray-500 font-normal ml-2">(Recommended: 1200x630px)</span>
                      </label>
                      <div className="space-y-3">
                        {ogImage && (
                          <div className="relative inline-block">
                            <Image
                              src={ogImage}
                              alt="Social sharing preview"
                              width={400}
                              height={210}
                              className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                            />
                            <button
                              onClick={() => setOgImage('')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}
                        <button
                          onClick={openImageGallery}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          📁 {ogImage ? 'Change Image' : 'Select Image from Gallery'}
                        </button>
                      </div>
                    </div>

                    {/* Preview Cards */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">SEO Preview</h3>
                      
                      {/* Google Search Result Preview */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Google Search Result</h4>
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <div className="text-blue-600 text-lg mb-1">{metaTitle || 'Page Title'}</div>
                          <div className="text-green-600 text-sm mb-2">https://yourwebsite.com/{pageName || 'page'}</div>
                          <div className="text-gray-600 text-sm">{metaDescription || 'Your page description will appear here...'}</div>
                        </div>
                      </div>

                      {/* Social Media Preview */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Social Media Preview</h4>
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-md">
                          {/* Image Section */}
                          <div className="aspect-[1.91/1] bg-gray-100 flex items-center justify-center">
                            {ogImage ? (
                              <Image
                                src={ogImage}
                                alt="Social sharing preview"
                                width={1200}
                                height={630}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center text-gray-400">
                                <div className="text-4xl mb-2">🖼️</div>
                                <div className="text-sm">Social Sharing Image</div>
                                <div className="text-xs">1200 × 630 px</div>
                              </div>
                            )}
                          </div>
                          {/* Content Section */}
                          <div className="p-3 border-t border-gray-100">
                            <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                              {metaTitle || 'Page Title'}
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2">
                              {metaDescription || 'Your page description will appear here...'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              yourwebsite.com
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        onClick={handleBack}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save SEO Settings'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-[#111827] mb-2">
              Select a Restaurant
            </h2>
            <p className="text-[#6b7280] max-w-md">
              Please add or select a restaurant from the sidebar.
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
    </DashboardLayout>
    </>
  );
}
