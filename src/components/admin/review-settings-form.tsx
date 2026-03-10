/**
 * Review Settings Form
 *
 * Enhanced interface for configuring review section settings:
 * - Layout selection (grid, masonry, slider, list)
 * - Content configuration (title, subtitle, description)
 * - Display options (avatar, rating, date, source)
 * - Styling options (colors, typography)
 * - Live preview functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Reviews from '@/components/reviews';
import Toast from '@/components/ui/toast';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { ReviewConfig, Review } from '@/types/review.types';
import { DEFAULT_REVIEW_CONFIG } from '@/types/review.types';

interface ReviewSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

export default function ReviewSettingsForm({ pageId, templateId, isNewSection }: ReviewSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  
  // Get section style defaults
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [config, setConfig] = useState<ReviewConfig>({
    ...DEFAULT_REVIEW_CONFIG,
    ...sectionStyleDefaults,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-red-900">Error</h2>
          <p className="mt-1 text-sm text-red-700">Restaurant ID is required. Please provide it via URL parameter.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (restaurantId) {
      fetchReviewConfig();
      fetchReviews();
    }
  }, [restaurantId, pageId, templateId, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    if (!isNewSection) return;
    setConfig((prev) => ({
      ...DEFAULT_REVIEW_CONFIG,
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [isNewSection, sectionStyleDefaults]);

  const fetchReviewConfig = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (restaurantId) params.append('restaurant_id', restaurantId);
      if (pageId) params.append('page_id', pageId);
      if (templateId) params.append('template_id', templateId);
      if (isNewSection) params.append('new_section', 'true');
      
      const url = `/api/review-config?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig({
          ...DEFAULT_REVIEW_CONFIG,
          ...sectionStyleDefaults,
          ...data.data,
        });
      }
    } catch (error) {
      console.error('Error fetching review config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!restaurantId) return;

    try {
      const url = `/api/reviews?restaurant_id=${restaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const response = await fetch('/api/review-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          restaurant_id: restaurantId,
          page_id: pageId || null,
          template_id: templateId || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(isNewSection ? 'Review section created successfully!' : 'Review settings saved successfully!');
        setToastType('success');
        setShowToast(true);

        // Navigate back to page settings after successful save
        setTimeout(() => {
          const params = new URLSearchParams();
          if (restaurantId) params.set('restaurant_id', restaurantId);
          if (restaurantName) params.set('restaurant_name', restaurantName);
          if (pageId) params.set('page_id', pageId);
          router.replace(`/admin/page-settings?${params.toString()}`);
        }, 1500);
      } else {
        setToastMessage('Error saving settings: ' + data.error);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error saving review config:', error);
      setToastMessage('Error saving settings');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<ReviewConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleTypographyChange = (field: keyof ReviewConfig, value: string | number) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
      is_custom: true,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading review settings...</p>
        </div>
      </div>
    );
  }

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
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNewSection ? 'Add New Review Section' : 'Review Section Settings'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {isNewSection
                ? 'Create a new review section for this page'
                : 'Customize how customer reviews are displayed on your website'
              }
            </p>
            {restaurantName && (
              <p className="mt-1 text-sm text-gray-500">
                Restaurant: {restaurantName}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout Settings Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
              <p className="text-sm text-gray-600">Choose display style and configuration</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-3 text-sm font-medium text-gray-700">Layout Type</label>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { value: 'grid', name: 'Grid', description: 'Card layout' },
                  { value: 'masonry', name: 'Masonry', description: 'Varied heights' },
                  { value: 'slider', name: 'Slider', description: 'Carousel with navigation' },
                  { value: 'list', name: 'List', description: 'Horizontal cards' }
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() => updateConfig({ layout: option.value as ReviewConfig['layout'] })}
                    className={`group cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      config.layout === option.value
                        ? 'border-purple-500 bg-purple-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="mb-2 overflow-hidden rounded border border-gray-200 bg-gray-50 p-2">
                      <div className="h-16 w-full">
                        {option.value === 'grid' && (
                          <div className="grid grid-cols-2 gap-1 h-full">
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                            </div>
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                            </div>
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-4/5"></div>
                            </div>
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-1/2"></div>
                            </div>
                          </div>
                        )}
                        {option.value === 'masonry' && (
                          <div className="grid grid-cols-3 gap-1 h-full">
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-3 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1 bg-gray-300 rounded w-full"></div>
                            </div>
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1 bg-gray-300 rounded w-2/3"></div>
                            </div>
                            <div className="border border-gray-300 rounded p-1">
                              <div className="h-4 bg-gray-400 rounded w-full mb-0.5"></div>
                              <div className="h-1 bg-gray-300 rounded w-3/4"></div>
                            </div>
                          </div>
                        )}
                        {option.value === 'slider' && (
                          <div className="relative h-full">
                            <div className="flex gap-1 h-full">
                              <div className="border border-gray-300 rounded p-1 flex-1">
                                <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                                <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                              </div>
                              <div className="border border-gray-300 rounded p-1 flex-1 opacity-60">
                                <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                                <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                              </div>
                            </div>
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                            </div>
                          </div>
                        )}
                        {option.value === 'list' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 border border-gray-300 rounded p-1">
                              <div className="w-3 h-3 bg-gray-400 rounded"></div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-gray-400 rounded w-2/3 mb-0.5"></div>
                                <div className="h-1 bg-gray-300 rounded w-full"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 border border-gray-300 rounded p-1">
                              <div className="w-3 h-3 bg-gray-400 rounded"></div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-gray-400 rounded w-3/4 mb-0.5"></div>
                                <div className="h-1 bg-gray-300 rounded w-4/5"></div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 border border-gray-300 rounded p-1">
                              <div className="w-3 h-3 bg-gray-400 rounded"></div>
                              <div className="flex-1">
                                <div className="h-1.5 bg-gray-400 rounded w-1/2 mb-0.5"></div>
                                <div className="h-1 bg-gray-300 rounded w-2/3"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      config.layout === option.value ? 'text-purple-700' : 'text-gray-900'
                    }`}>
                      {option.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Columns</span>
                <span className="text-xs font-normal text-gray-500">Number of columns</span>
              </label>
              <select
                value={config.columns}
                onChange={(e) => updateConfig({ columns: Number(e.target.value) as ReviewConfig['columns'] })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="2">2 Columns</option>
                <option value="3">3 Columns</option>
                <option value="4">4 Columns</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Max Reviews</span>
                <span className="text-xs font-normal text-gray-500">Maximum number to display</span>
              </label>
              <input
                type="number"
                value={config.maxReviews || 6}
                onChange={(e) => updateConfig({ maxReviews: parseInt(e.target.value) || 6 })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                min="1"
                max="50"
              />
            </div>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
              <p className="text-sm text-gray-600">Set section title, subtitle and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Title</span>
                <span className="text-xs font-normal text-gray-500">Section title</span>
              </label>
              <input
                type="text"
                value={config.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Customer Reviews"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subtitle</span>
                <span className="text-xs font-normal text-gray-500">Optional subtitle text</span>
              </label>
              <input
                type="text"
                value={config.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="What our customers say"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">Optional description text</span>
              </label>
              <textarea
                value={config.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Read what our satisfied customers have to say..."
              />
            </div>
          </div>
        </div>

        {/* Display Options Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Display Options</h2>
              <p className="text-sm text-gray-600">Configure what elements to show in reviews</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'showAvatar', label: 'Show Avatar', description: 'Display reviewer profile pictures' },
              { key: 'showRating', label: 'Show Rating', description: 'Display star ratings' },
              { key: 'showDate', label: 'Show Date', description: 'Display review date' },
              { key: 'showSource', label: 'Show Source', description: 'Display review source (e.g., Google)' },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={config[key as keyof ReviewConfig] as boolean}
                    onChange={(e) => updateConfig({ [key]: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Styling Options Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Styling Options</h2>
              <p className="text-sm text-gray-600">Customize colors and appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'bgColor', label: 'Background Color', description: 'Section background color', defaultValue: '#f9fafb' },
              { key: 'textColor', label: 'Text Color', description: 'Title and text color', defaultValue: '#000000' },
              { key: 'cardBgColor', label: 'Card Background', description: 'Review card background color', defaultValue: '#ffffff' },
              { key: 'starColor', label: 'Star Color', description: 'Rating star color', defaultValue: '#fbbf24' },
            ].map(({ key, label, description, defaultValue }) => (
              <div key={key}>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>{label}</span>
                  <span className="text-xs font-normal text-gray-500">{description}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config[key as keyof ReviewConfig] as string || defaultValue}
                    onChange={(e) => updateConfig({ [key]: e.target.value })}
                    className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                  />
                  <input
                    type="text"
                    value={config[key as keyof ReviewConfig] as string || defaultValue}
                    onChange={(e) => updateConfig({ [key]: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder={defaultValue}
                  />
                  <button
                    type="button"
                    onClick={() => updateConfig({ [key]: defaultValue })}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    title="Reset to default"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Typography & Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Typography & Buttons</h2>
              <p className="text-sm text-gray-600">Customize text styles and button appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Custom Typography & Styles</label>
                <p className="text-xs text-gray-500">Override global CSS with custom styling options</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.is_custom || false}
                  onChange={(e) => updateConfig({ is_custom: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {config.is_custom && (
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Button Style Source</span>
                    <span className="text-xs font-normal text-gray-500">Use global primary or secondary button style</span>
                  </label>
                  <select
                    value={config.buttonStyleVariant || 'primary'}
                    onChange={(e) => updateConfig({
                      buttonStyleVariant: e.target.value === 'secondary' ? 'secondary' : 'primary',
                    })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  >
                    <option value="primary">Global Primary Button</option>
                    <option value="secondary">Global Secondary Button</option>
                  </select>
                </div>
                <SectionTypographyControls
                  value={config}
                  onChange={(updates) => updateConfig(updates)}
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
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isNewSection ? 'Create Review Section' : 'Save Review Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Reviews Preview</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Preview how your reviews will appear on the website
                  {reviews.length === 0 && (
                    <span className="ml-1 text-purple-600">(showing sample reviews)</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div className="mx-auto max-w-[1240px] overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>Preview</span>
                  <span>Live Review Section</span>
                </div>
                <div className="bg-white">
                  <Reviews
                    {...config}
                    reviews={reviews.length > 0 ? reviews : [
                      {
                        review_id: 'sample-1',
                        restaurant_id: restaurantId,
                        author_name: 'Sarah Johnson',
                        rating: 5,
                        review_text: 'Absolutely amazing experience! The food was incredible and the service was top-notch. Would highly recommend to anyone looking for a great dining experience.',
                        published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=a855f7&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                      {
                        review_id: 'sample-2',
                        restaurant_id: restaurantId,
                        author_name: 'Michael Chen',
                        rating: 5,
                        review_text: 'Best restaurant in town! The atmosphere is wonderful and every dish we tried was perfection. Can\'t wait to come back!',
                        published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=Michael+Chen&background=8b5cf6&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                      {
                        review_id: 'sample-3',
                        restaurant_id: restaurantId,
                        author_name: 'Emily Rodriguez',
                        rating: 4,
                        review_text: 'Great food and lovely ambiance. The menu has something for everyone. Service was friendly and attentive.',
                        published_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=7c3aed&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                      {
                        review_id: 'sample-4',
                        restaurant_id: restaurantId,
                        author_name: 'David Thompson',
                        rating: 5,
                        review_text: 'Outstanding in every way! From the moment we walked in, we were treated like family. The chef really knows how to create memorable dishes.',
                        published_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=David+Thompson&background=6d28d9&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                      {
                        review_id: 'sample-5',
                        restaurant_id: restaurantId,
                        author_name: 'Jessica Martinez',
                        rating: 5,
                        review_text: 'Exceptional dining experience! Fresh ingredients, creative menu, and impeccable presentation. A must-visit for food lovers.',
                        published_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=Jessica+Martinez&background=5b21b6&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                      {
                        review_id: 'sample-6',
                        restaurant_id: restaurantId,
                        author_name: 'Robert Wilson',
                        rating: 4,
                        review_text: 'Very impressed with the quality and taste. Portions are generous and prices are reasonable. Will definitely be returning soon!',
                        published_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                        source: 'Google',
                        avatar_url: 'https://ui-avatars.com/api/?name=Robert+Wilson&background=4c1d95&color=fff',
                        is_hidden: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_deleted: false,
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Live preview reflects your current review section configuration and styling changes.
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
