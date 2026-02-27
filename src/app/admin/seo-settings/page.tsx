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
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import styles from '@/components/admin/gallery-settings-form.module.css';
import toast, { Toaster } from 'react-hot-toast';

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
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  useEffect(() => {
    if (restaurantId && pageId) {
      fetchPageSEO();
    }
  }, [restaurantId, pageId]);

  const fetchPageSEO = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/web-pages?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (data.success && data.data) {
        const currentPage = data.data.find((page: any) => page.page_id === pageId);
        if (currentPage) {
          setMetaTitle(currentPage.meta_title || '');
          setMetaDescription(currentPage.meta_description || '');
          setOgImage(currentPage.og_image || '');
        }
      }
    } catch (error) {
      console.error('Error fetching page SEO:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaFiles = async () => {
    if (!restaurantId) return;

    setLoadingMedia(true);
    try {
      const response = await fetch(`/api/media?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        setMediaFiles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
    } finally {
      setLoadingMedia(false);
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
    fetchMediaFiles();
  };

  const selectImage = (imageUrl: string) => {
    setOgImage(imageUrl);
    setShowImageGallery(false);
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
                            <img
                              src={ogImage}
                              alt="Social sharing preview"
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

                    {/* Preview Card */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview (Google Search Result)</h3>
                      <div className="bg-white p-4 rounded border border-gray-200">
                        <div className="text-blue-600 text-lg mb-1">{metaTitle || 'Page Title'}</div>
                        <div className="text-green-600 text-sm mb-2">https://yourwebsite.com/{pageName || 'page'}</div>
                        <div className="text-gray-600 text-sm">{metaDescription || 'Your page description will appear here...'}</div>
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

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          onClick={() => setShowImageGallery(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Select Social Sharing Image</h2>
              <button
                onClick={() => setShowImageGallery(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {loadingMedia ? (
                <div className="text-center py-12">
                  <p>Loading images...</p>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="text-xl font-semibold mb-2">No images found</h3>
                  <p className="text-gray-600">Upload images to your media library first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaFiles.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => selectImage(media.file?.url || '')}
                      className="relative cursor-pointer group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all"
                    >
                      <img
                        src={media.file?.url}
                        alt={media.file?.name || 'Image'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4">
              <button
                onClick={() => setShowImageGallery(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </>
  );
}
