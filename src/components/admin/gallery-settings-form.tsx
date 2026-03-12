/**
 * Gallery Settings Form
 *
 * Enhanced interface for configuring gallery section settings:
 * - Layout selection (grid, masonry, carousel)
 * - Image management (add, edit, delete)
 * - Color customization
 * - Live preview modal
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/toast';
import type { GalleryConfig } from '@/types/gallery.types';
import { DEFAULT_GALLERY_CONFIG } from '@/types/gallery.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { GalleryPreviewModal } from '@/components/admin/gallery-preview-modal';
import {
  GALLERY_LAYOUT_OPTIONS,
  normalizeGalleryLayout,
} from '@/components/gallery-layouts/gallery-layout-options';
import { GalleryLayoutPreview } from '@/components/gallery-layouts/gallery-layout-preview';

type PreviewViewport = 'desktop' | 'mobile';

interface GallerySettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
  restaurantId: string;
  restaurantName?: string;
  pageName?: string;
}

export default function GallerySettingsForm({
  pageId,
  templateId,
  isNewSection,
  restaurantId,
  restaurantName,
  pageName,
}: GallerySettingsFormProps) {
  const router = useRouter();
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  // Local form state
  const [formConfig, setFormConfig] = useState<GalleryConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>('desktop');
  const [responsiveEditorViewport, setResponsiveEditorViewport] =
    useState<PreviewViewport>('desktop');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">
              Restaurant ID is required. Please provide it via URL parameter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Initialize form config
  useEffect(() => {
    if (isNewSection && !formConfig) {
      setFormConfig({
        ...DEFAULT_GALLERY_CONFIG,
        ...sectionStyleDefaults,
        restaurant_id: restaurantId,
      });
    } else if (!isNewSection && !formConfig) {
      fetchGalleryConfig();
    }
  }, [isNewSection, sectionStyleDefaults, restaurantId]);

  const fetchGalleryConfig = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurant_id', restaurantId);
      if (pageId) params.append('page_id', pageId);
      if (templateId) params.append('template_id', templateId);

      const url = `/api/gallery-config?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setFormConfig({
          ...DEFAULT_GALLERY_CONFIG,
          ...sectionStyleDefaults,
          ...data.data,
          restaurant_id: restaurantId,
        });
      } else {
        setFormConfig({
          ...DEFAULT_GALLERY_CONFIG,
          ...sectionStyleDefaults,
          restaurant_id: restaurantId,
        });
      }
    } catch (error) {
      console.error('Error fetching gallery config:', error);
      setFormConfig({
        ...DEFAULT_GALLERY_CONFIG,
        ...sectionStyleDefaults,
        restaurant_id: restaurantId,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formConfig) return;

    setSaving(true);
    try {
      const payload = {
        ...formConfig,
        restaurant_id: restaurantId,
        page_id: pageId || null,
        template_id: templateId || null,
      };

      const response = await fetch('/api/gallery-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Gallery settings saved successfully!');
        setToastType('success');
        setShowToast(true);

        // Navigate back to page settings after successful save
        setTimeout(() => {
          const params = new URLSearchParams();
          if (restaurantId) params.set('restaurant_id', restaurantId);
          if (restaurantName) params.set('restaurant_name', restaurantName);
          if (pageId) params.set('page_id', pageId);
          if (pageName) params.set('page_name', pageName);
          router.push(`/admin/page-settings?${params.toString()}`);
        }, 1500);
      } else {
        setToastMessage('Failed to save settings. Please try again.');
        setToastType('error');
        setShowToast(true);
      }
    } catch (err) {
      console.error('Failed to save gallery config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<GalleryConfig>) => {
    if (!formConfig) return;
    setFormConfig((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const fetchMediaFiles = async () => {
    if (!restaurantId) return;

    setLoadingMedia(true);
    try {
      const url = `/api/media?restaurant_id=${restaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setMediaFiles(data.data || []);
      } else {
        console.error('Error fetching media files:', data.error);
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const openMediaModal = () => {
    setShowMediaModal(true);
    setSelectedMedia(new Set());
    fetchMediaFiles();
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
    setSelectedMedia(new Set());
  };

  const toggleMediaSelection = (mediaId: string) => {
    const newSelection = new Set(selectedMedia);
    if (newSelection.has(mediaId)) {
      newSelection.delete(mediaId);
    } else {
      newSelection.add(mediaId);
    }
    setSelectedMedia(newSelection);
  };

  const addSelectedMedia = () => {
    if (!formConfig) return;

    const selectedFiles = mediaFiles.filter((media) =>
      selectedMedia.has(media.id),
    );
    const newImages = selectedFiles.map((media) => ({
      url: media.file?.url || '',
      alt: media.file?.name || '',
      title: '',
      description: '',
    }));

    updateConfig({
      images: [...formConfig.images, ...newImages],
    });

    closeMediaModal();
  };

  const updateImage = (index: number, field: string, value: string) => {
    if (!formConfig) return;
    const newImages = [...formConfig.images];
    newImages[index] = { ...newImages[index], [field]: value };
    updateConfig({ images: newImages });
  };

  const removeImage = (index: number) => {
    if (!formConfig) return;
    const newImages = formConfig.images.filter((_, i) => i !== index);
    updateConfig({ images: newImages });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">
            Loading gallery settings...
          </p>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">
              Failed to load gallery configuration
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedLayout = normalizeGalleryLayout(formConfig.layout);
  const isMobileEditorViewport = responsiveEditorViewport === 'mobile';
  const handleResponsiveEditorViewportChange = (
    viewport: PreviewViewport,
  ) => {
    setResponsiveEditorViewport(viewport);
    setPreviewViewport(viewport);
  };
  const renderResponsiveEditorTabs = (scope: string) => (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {(['desktop', 'mobile'] as PreviewViewport[]).map((viewport) => (
        <button
          key={`${scope}-viewport-${viewport}`}
          type="button"
          onClick={() => handleResponsiveEditorViewportChange(viewport)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            responsiveEditorViewport === viewport
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gallery Settings
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your gallery section layout, motion, and responsive
              typography
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-40">
        {/* Layout Configuration */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-lg shadow-gray-900/5 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Layout Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Choose your preferred gallery display style
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-5 block text-sm font-semibold text-gray-700">
                Layout Type
              </label>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {GALLERY_LAYOUT_OPTIONS.map((option) => {
                  const isSelected = selectedLayout === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updateConfig({ layout: option.value as any })
                      }
                      className={`group relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 ${
                        isSelected
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-lg hover:scale-[1.01]'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 shadow-lg">
                          <svg
                            className="h-3.5 w-3.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Preview */}
                      <div className="mb-4 h-36 overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-3 shadow-inner transition-all duration-300 group-hover:border-purple-200">
                        <GalleryLayoutPreview
                          layout={option.value}
                          size="card"
                        />
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div
                          className={`text-base font-bold transition-colors ${
                            isSelected
                              ? 'text-purple-700'
                              : 'text-gray-900 group-hover:text-purple-600'
                          }`}
                        >
                          {option.name}
                        </div>
                        <div className="text-xs text-gray-500 leading-relaxed">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-3 flex items-baseline justify-between text-sm font-semibold text-gray-700">
                <span>Columns</span>
                <span className="text-xs font-normal text-gray-500">
                  Number of columns for layout
                </span>
              </label>
              <select
                value={formConfig.columns}
                onChange={(e) =>
                  updateConfig({ columns: Number(e.target.value) as any })
                }
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 hover:border-gray-300"
              >
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
                <option value="5">5 Columns</option>
                <option value="6">6 Columns</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Configuration */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-lg shadow-gray-900/5 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 715.25 6H10"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Content Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Set title, subtitle and description
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-baseline justify-between text-sm font-semibold text-gray-700">
                <span>Title</span>
                <span className="text-xs font-normal text-gray-500">
                  Gallery section title
                </span>
              </label>
              <input
                type="text"
                value={formConfig.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 hover:border-gray-300"
                placeholder="Our Gallery"
              />
            </div>

            <div>
              <label className="mb-2 flex items-baseline justify-between text-sm font-semibold text-gray-700">
                <span>Subtitle</span>
                <span className="text-xs font-normal text-gray-500">
                  Optional subtitle text
                </span>
              </label>
              <input
                type="text"
                value={formConfig.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 hover:border-gray-300"
                placeholder="Explore our collection"
              />
            </div>

            <div>
              <label className="mb-2 flex items-baseline justify-between text-sm font-semibold text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">
                  Optional description text
                </span>
              </label>
              <textarea
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-all duration-200 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 hover:border-gray-300"
                placeholder="Explore our beautiful collection of images..."
              />
            </div>
          </div>
        </div>

        {/* Image Management */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-8 shadow-lg shadow-gray-900/5 transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/8">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Image Management
                </h2>
                <p className="text-sm text-gray-600">
                  Add and manage gallery images ({formConfig.images.length})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openMediaModal}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all duration-200 hover:from-purple-700 hover:to-purple-800 hover:shadow-purple-500/40 hover:scale-105 active:scale-100"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add Images
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formConfig.images.map((image, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-lg"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">
                    Image {index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:scale-105 active:scale-100"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 713.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Remove
                  </button>
                </div>
                {image.url && (
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="mb-3 h-32 w-full rounded-lg border border-gray-200 object-cover"
                  />
                )}
                <div>
                  <label className="mb-1.5 text-sm font-medium text-gray-700">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    placeholder="Alt text (optional)"
                    value={image.alt}
                    onChange={(e) => updateImage(index, 'alt', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colors & Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 711.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Colors & Styling
              </h2>
              <p className="text-sm text-gray-600">
                Customize colors and appearance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Scroll Animation
                </label>
                <p className="text-xs text-gray-500">
                  Fade the gallery in with a fast upward motion and stagger the
                  images as the section enters the viewport.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formConfig.enableScrollAnimation || false}
                  onChange={(e) =>
                    updateConfig({ enableScrollAnimation: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Width</span>
                <span className="text-xs font-normal text-gray-500">
                  Content container max width
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formConfig.maxWidth || '1200px'}
                  onChange={(e) => updateConfig({ maxWidth: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="1200px"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ maxWidth: '1200px' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Padding</span>
                <span className="text-xs font-normal text-gray-500">
                  Inner spacing around the gallery
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formConfig.padding || '4rem 2rem'}
                  onChange={(e) => updateConfig({ padding: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="4rem 2rem"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ padding: '4rem 2rem' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Margin</span>
                <span className="text-xs font-normal text-gray-500">
                  Outer spacing around the full section
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formConfig.margin || '0'}
                  onChange={(e) => updateConfig({ margin: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ margin: '0' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">
                  Gallery background color
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ bgColor: '#ffffff' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Title Color</span>
                <span className="text-xs font-normal text-gray-500">
                  Gallery title color
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.titleColor || '#000000'}
                  onChange={(e) => updateConfig({ titleColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={formConfig.titleColor || '#000000'}
                  onChange={(e) => updateConfig({ titleColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#000000"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ titleColor: '#000000' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Text Color</span>
                <span className="text-xs font-normal text-gray-500">
                  Description text color
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.textColor || '#666666'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={formConfig.textColor || '#666666'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#666666"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ textColor: '#666666' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Custom Styles */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Typography & Custom Styles
                </h2>
                <p className="text-sm text-gray-600">
                  Customize fonts and text styling
                </p>
              </div>
            </div>
            {renderResponsiveEditorTabs('gallery-typography')}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Custom Typography & Styles
                </label>
                <p className="text-xs text-gray-500">
                  Override global CSS with custom styling options
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formConfig.is_custom || false}
                  onChange={(e) =>
                    updateConfig({ is_custom: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!formConfig.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Using Global Styles
                    </h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles
                      defined in your theme settings. Enable custom typography
                      above to override these styles with section-specific
                      options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                  {isMobileEditorViewport
                    ? 'Mobile tab unlocks the mobile typography overrides used by the live preview. Use "Use Desktop Settings" inside any group to clear mobile-only values.'
                    : 'Desktop tab defines the main typography system. Mobile keeps using these values until you override them in the mobile tab.'}
                </div>
                <SectionTypographyControls
                  value={formConfig}
                  onChange={(updates) => updateConfig(updates)}
                  showAdvancedControls
                  viewport={responsiveEditorViewport}
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                Save Gallery Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {false &&
        `
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-950/78 backdrop-blur-xl"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 flex h-[min(94vh,1020px)] w-full max-w-[min(96vw,1540px)] flex-col overflow-hidden rounded-[32px] border border-white/35 bg-white/88 shadow-[0_45px_140px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
            <div className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88)_48%,rgba(245,243,255,0.92))] px-6 py-5 sm:px-8 sm:py-6">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-64 bg-[radial-gradient(circle_at_left,rgba(168,85,247,0.16),transparent_70%)]" />
              <div className="pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_72%)]" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
                    Live Canvas
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
                    Gallery Preview
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
                    Preview your gallery layout in a polished presentation frame.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white/80 text-slate-400 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              ref={previewBodyRef}
              className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,#ffffff,#f8fafc_48%,#eef2ff_100%)] p-4 sm:p-8"
            >
              <div className="mx-auto max-w-[1400px] rounded-[30px] border border-white/70 bg-white/72 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
                {formConfig.images.length > 0 ? (
                  <div className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    <Gallery {...formConfig} />
                  </div>
                ) : (
                  <div
                    className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88)_46%,rgba(245,243,255,0.92))] px-5 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-8 sm:py-10"
                    style={{
                      color: formConfig.textColor || '#000000',
                    }}
                  >
                    <div className="mx-auto mb-10 max-w-3xl">
                      {formConfig.title && (
                        <h2
                          style={{
                            fontSize: 'clamp(2rem, 4vw, 3.3rem)',
                            fontWeight: '700',
                            marginBottom: '0.75rem',
                            color:
                              formConfig.titleColor ||
                              formConfig.textColor ||
                              '#000000',
                            letterSpacing: '-0.04em',
                          }}
                        >
                          {formConfig.title}
                        </h2>
                      )}
                      {formConfig.subtitle && (
                        <p
                          style={{
                            fontSize: '1rem',
                            marginBottom: '0.85rem',
                            color: formConfig.textColor || '#000000',
                            opacity: 0.82,
                            textTransform: 'uppercase',
                            letterSpacing: '0.16em',
                            fontWeight: 600,
                          }}
                        >
                          {formConfig.subtitle}
                        </p>
                      )}
                      {formConfig.description && (
                        <p
                          style={{
                            fontSize: '1rem',
                            color: formConfig.textColor || '#000000',
                            opacity: 0.7,
                            maxWidth: '42rem',
                            margin: '0 auto',
                            lineHeight: 1.7,
                          }}
                        >
                          {formConfig.description}
                        </p>
                      )}
                    </div>

                    {/* Preview Layout */}
                    <GalleryLayoutPreview
                      layout={formConfig.layout}
                      columns={formConfig.columns}
                      size="panel"
                    />
                    legacy-preview-placeholder-start

                            📷

                            📷

                          📷
                        </div>
                        
                              📷
                            </div>
                          ))}
                        </div>
                        

                    legacy-preview-placeholder-end
                </div>
              )}
            </div>
          </div>
        </div>
      `}

      {/* Floating Preview Button */}
      {!showPreview ? (
        <button
          type="button"
          onClick={() => {
            setPreviewViewport(responsiveEditorViewport);
            setShowPreview(true);
          }}
          className="fixed bottom-24 right-6 z-40 inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/95 px-5 py-3 text-sm font-semibold text-purple-700 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white"
          aria-label="Open gallery preview"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span className="text-xs font-medium text-purple-500">
              {responsiveEditorViewport === 'mobile'
                ? 'Open mobile preview'
                : 'Open desktop preview'}
            </span>
          </span>
        </button>
      ) : null}

      <GalleryPreviewModal
        open={showPreview}
        config={formConfig}
        previewViewport={previewViewport}
        onPreviewViewportChange={setPreviewViewport}
        onClose={() => setShowPreview(false)}
      />

      {/* Media Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeMediaModal}
          />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Select Images from Media Library
                </h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  Choose images for your gallery
                </p>
              </div>
              <button
                onClick={closeMediaModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {loadingMedia ? (
                <div className="flex h-full items-center justify-center">
                  <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                    <p className="text-sm font-medium text-gray-700">
                      Loading media...
                    </p>
                  </div>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No media files
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload some images to your media library first.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {mediaFiles.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => toggleMediaSelection(media.id)}
                      className={`group relative cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                        selectedMedia.has(media.id)
                          ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-purple-300 hover:shadow-md hover:scale-102'
                      }`}
                    >
                      <div className="aspect-square overflow-hidden rounded-lg">
                        {media.file?.url ? (
                          <img
                            src={media.file.url}
                            alt={media.file.name || 'Image'}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                            <svg
                              className="h-8 w-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 713.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 713.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Selection indicator */}
                      {selectedMedia.has(media.id) && (
                        <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 shadow-lg">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}

                      {/* Image name overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-xs font-medium text-white truncate">
                          {media.file?.name || 'Untitled'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-700">
                  {selectedMedia.size}{' '}
                  {selectedMedia.size === 1 ? 'image' : 'images'} selected
                </p>
                {selectedMedia.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(new Set())}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeMediaModal}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addSelectedMedia}
                  disabled={selectedMedia.size === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Add {selectedMedia.size > 0 ? `${selectedMedia.size} ` : ''}
                  Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
