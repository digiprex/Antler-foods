/**
 * Popup Settings Form Component
 * 
 * Form component for configuring popup settings within the dashboard layout
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { PopupConfig } from '@/types/popup.types';
import { DEFAULT_POPUP_CONFIG } from '@/types/popup.types';
import styles from '@/components/admin/gallery-settings-form.module.css';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';

export default function PopupSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [config, setConfig] = useState<PopupConfig>(DEFAULT_POPUP_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      fetchPopupConfig();
    }
  }, [restaurantId]);

  // Auto-enable submit button for newsletter layouts
  useEffect(() => {
    const isNewsletterLayout = config.layout === 'newsletter-image' || config.layout === 'newsletter-text';
    if (isNewsletterLayout) {
      setConfig(prevConfig => ({
        ...prevConfig,
        showButton: true,
        buttonText: prevConfig.buttonText === 'View Menu' || !prevConfig.buttonText ? 'Submit' : prevConfig.buttonText
      }));
    }
  }, [config.layout]);

  const fetchPopupConfig = async () => {
    setLoading(true);
    try {
      const url = `/api/popup-config?restaurant_id=${restaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching popup config:', error);
    } finally {
      setLoading(false);
    }
  };

  const openMediaModal = () => {
    setShowMediaModal(true);
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
  };

  const handleSelectImage = (imageUrl: string) => {
    setConfig({
      ...config,
      imageUrl: imageUrl,
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !restaurantId) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('restaurant_id', restaurantId);
        formData.append('type', 'image');

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        } else {
          console.error('Error uploading file:', data.error);
        }
      }

      // Refresh media library (handled by ImageGalleryModal)
      // await fetchMediaFiles();

      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress({});
      }, 1000);
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/popup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          restaurant_id: restaurantId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: 'Popup settings saved successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ message: 'Error saving settings: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error saving popup config:', error);
      setToast({ message: 'Error saving settings', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const renderPopupContent = () => {
    const layout = config.layout || 'default';

    // Common button component
    const renderButton = () => {
      if (config.showButton === false || !config.buttonText) return null;
      return (
        <button
          onClick={() => setShowPreview(false)}
          style={{
            backgroundColor: config.buttonBgColor || '#000000',
            color: config.buttonTextColor || '#ffffff',
            padding: '0.875rem 2rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          {config.buttonText}
        </button>
      );
    };

    // Default Layout - Image on top
    if (layout === 'default') {
      return (
        <>
          {config.imageUrl && (
            <div>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px 12px 0 0',
                  objectFit: 'cover',
                  maxHeight: '300px',
                }}
              />
            </div>
          )}
          <div style={{ padding: config.imageUrl ? '0 2rem 2rem' : '3rem 2rem 2rem' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </>
      );
    }

    // Image Left Layout
    if (layout === 'image-left') {
      return (
        <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
          {config.imageUrl && (
            <div style={{ flex: '0 0 40%' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  minHeight: '200px',
                }}
              />
            </div>
          )}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </div>
      );
    }

    // Image Right Layout
    if (layout === 'image-right') {
      return (
        <div style={{ display: 'flex', gap: '2rem', padding: '2rem' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
          {config.imageUrl && (
            <div style={{ flex: '0 0 40%' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  minHeight: '200px',
                }}
              />
            </div>
          )}
        </div>
      );
    }

    // Background Image Layout
    if (layout === 'image-bg') {
      return (
        <div
          style={{
            backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '3rem 2rem',
            position: 'relative',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              padding: '2rem',
              borderRadius: '8px',
            }}
          >
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: '#ffffff' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: '#ffffff', opacity: 0.95 }}>
                {config.description}
              </p>
            )}
            {renderButton()}
          </div>
        </div>
      );
    }

    // Image Only Layout
    if (layout === 'image-only') {
      return config.imageUrl ? (
        <img
          src={config.imageUrl}
          alt={config.title || 'Popup'}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '12px',
            objectFit: 'cover',
            maxHeight: '80vh',
          }}
        />
      ) : (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <p style={{ color: config.textColor || '#000000' }}>Please add an image to preview this layout</p>
        </div>
      );
    }

    // Newsletter with Image Layout
    if (layout === 'newsletter-image') {
      return (
        <>
          {config.imageUrl && (
            <div>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '100%',
                  height: 'auto',
                  borderRadius: '12px 12px 0 0',
                  objectFit: 'cover',
                  maxHeight: '250px',
                }}
              />
            </div>
          )}
          <div style={{ padding: '2rem' }}>
            {config.title && (
              <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
                {config.title}
              </h2>
            )}
            {config.description && (
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
                {config.description}
              </p>
            )}
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '1rem',
              }}
            />
            {renderButton()}
          </div>
        </>
      );
    }

    // Newsletter Text Only Layout
    if (layout === 'newsletter-text') {
      return (
        <div style={{ padding: '3rem 2rem' }}>
          {config.title && (
            <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
              {config.title}
            </h2>
          )}
          {config.description && (
            <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
              {config.description}
            </p>
          )}
          <input
            type="email"
            placeholder="Enter your email"
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '1rem',
            }}
          />
          {renderButton()}
        </div>
      );
    }

    // Fallback for any unhandled layout
    return (
      <div style={{ padding: '3rem 2rem 2rem' }}>
        {config.title && (
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '1rem', color: config.textColor || '#000000' }}>
            {config.title || 'Preview Popup'}
          </h2>
        )}
        {config.description && (
          <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: config.textColor || '#000000', opacity: 0.9 }}>
            {config.description || 'This is a preview of your popup. Add title and description in the content section.'}
          </p>
        )}
        {renderButton()}
      </div>
    );
  };

  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">
            No Restaurant Selected
          </h2>
          <p className="mx-auto max-w-md text-sm text-gray-600">
            Please select a restaurant from the sidebar to configure popup settings.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading popup settings...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Popup Settings</h1>
                  <p className="mt-1 text-sm text-gray-600">Customize your website popup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
                title="Show Preview"
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
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Show Preview
              </button>
            </div>

            {/* Settings Form */}
            <div className="space-y-6">
              {/* Enable/Disable */}
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Display Settings</h3>
                    <p className="mt-0.5 text-sm text-gray-600">Control when and how the popup appears</p>
                  </div>
                </div>

                <div className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Enable Popup</label>
                    <p className="mt-0.5 text-xs text-gray-600">Show popup on website</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      config.enabled ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Show on Page Load</label>
                    <p className="mt-0.5 text-xs text-gray-600">Display popup when page loads</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, showOnLoad: !config.showOnLoad })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      config.showOnLoad ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showOnLoad ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Delay (seconds)
                    <span className="ml-2 text-xs font-normal text-gray-500">Wait time before showing popup</span>
                  </label>
                  <input
                    type="number"
                    value={config.delay || 2}
                    onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 2 })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="0"
                    max="60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Frequency
                    <span className="ml-2 text-xs font-normal text-gray-500">How often to show popup</span>
                  </label>
                  <select
                    value={config.frequency}
                    onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="always">Always</option>
                    <option value="once">Once per session</option>
                    <option value="daily">Once per day</option>
                    <option value="weekly">Once per week</option>
                  </select>
                </div>

                <div>
                  <label className="mb-3 block">
                    <span className="text-sm font-semibold text-gray-900">Layout Type</span>
                    <span className="mt-0.5 block text-xs text-gray-600">Choose a popup style</span>
                  </label>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {/* Default Layout */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        (config.layout || 'default') === 'default'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'default' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="mb-1 h-4 w-full rounded bg-gray-400"></div>
                        <div className="space-y-0.5">
                          <div className="h-1.5 w-full rounded bg-gray-300"></div>
                          <div className="h-1.5 w-3/4 rounded bg-gray-300"></div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Image Top</div>
                      {(config.layout || 'default') === 'default' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Image Left */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'image-left'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'image-left' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="flex gap-1">
                          <div className="h-6 w-2/5 rounded bg-gray-400"></div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-1.5 w-full rounded bg-gray-300"></div>
                            <div className="h-1.5 w-3/4 rounded bg-gray-300"></div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Image Left</div>
                      {config.layout === 'image-left' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Image Right */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'image-right'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'image-right' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="flex gap-1">
                          <div className="flex-1 space-y-0.5">
                            <div className="h-1.5 w-full rounded bg-gray-300"></div>
                            <div className="h-1.5 w-3/4 rounded bg-gray-300"></div>
                          </div>
                          <div className="h-6 w-2/5 rounded bg-gray-400"></div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Image Right</div>
                      {config.layout === 'image-right' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Background Image */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'image-bg'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'image-bg' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gradient-to-br from-gray-400 to-gray-500 p-2">
                        <div className="space-y-0.5">
                          <div className="h-1.5 w-full rounded bg-white/80"></div>
                          <div className="h-1.5 w-3/4 rounded bg-white/80"></div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Background</div>
                      {config.layout === 'image-bg' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Image Only */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'image-only'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'image-only' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="h-8 w-full rounded bg-gray-400"></div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Image Only</div>
                      {config.layout === 'image-only' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Newsletter with Image */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'newsletter-image'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'newsletter-image' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="mb-1 h-3 w-full rounded bg-gray-400"></div>
                        <div className="h-2 w-full rounded-sm border border-gray-300 bg-white"></div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Newsletter+Img</div>
                      {config.layout === 'newsletter-image' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>

                    {/* Newsletter Text Only */}
                    <button
                      type="button"
                      className={`group relative cursor-pointer rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === 'newsletter-text'
                          ? 'border-purple-500 bg-purple-50 shadow-md'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => setConfig({ ...config, layout: 'newsletter-text' })}
                    >
                      <div className="mb-2 rounded border border-gray-300 bg-gray-50 p-2">
                        <div className="mb-1 space-y-0.5">
                          <div className="h-1.5 w-full rounded bg-gray-300"></div>
                          <div className="h-1.5 w-3/4 rounded bg-gray-300"></div>
                        </div>
                        <div className="h-2 w-full rounded-sm border border-gray-300 bg-white"></div>
                      </div>
                      <div className="text-xs font-semibold text-gray-900">Newsletter</div>
                      {config.layout === 'newsletter-text' && (
                        <div className="absolute right-2 top-2">
                          <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
                </div>
              </div>

              {/* Content */}
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Content</h3>
                    <p className="mt-0.5 text-sm text-gray-600">Configure popup text, image, and button</p>
                  </div>
                </div>

                <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title
                    <span className="ml-2 text-xs font-normal text-gray-500">Popup heading</span>
                  </label>
                  <input
                    type="text"
                    value={config.title || ''}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Welcome!"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                    <span className="ml-2 text-xs font-normal text-gray-500">Popup message</span>
                  </label>
                  <textarea
                    value={config.description || ''}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Check out our latest offers and specials"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Show Button</label>
                    <p className="mt-0.5 text-xs text-gray-600">Display call-to-action button</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, showButton: config.showButton === false ? true : false })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      config.showButton !== false ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.showButton !== false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {config.showButton !== false && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Button Text
                        <span className="ml-2 text-xs font-normal text-gray-500">Call-to-action button label</span>
                      </label>
                      <input
                        type="text"
                        value={config.buttonText || ''}
                        onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="View Menu"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Button URL
                        <span className="ml-2 text-xs font-normal text-gray-500">Where the button links to</span>
                      </label>
                      <input
                        type="text"
                        value={config.buttonUrl || ''}
                        onChange={(e) => setConfig({ ...config, buttonUrl: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="/menu"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Popup Image
                    <span className="ml-2 text-xs font-normal text-gray-500">Optional popup image</span>
                  </label>
                  {config.imageUrl ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb'
                    }}>
                      <img
                        src={config.imageUrl}
                        alt="Popup preview"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '200px',
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          border: '2px solid #e5e7eb',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={openMediaModal}
                          className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          type="button"
                        >
                          Change Image
                        </button>
                        <button
                          onClick={() => setConfig({ ...config, imageUrl: '' })}
                          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={openMediaModal}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:from-purple-700 hover:to-purple-800"
                      type="button"
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
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      Select Image from Media Library
                    </button>
                  )}
                </div>
                </div>
              </div>

              {/* Styling */}
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
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Styling</h3>
                    <p className="mt-0.5 text-sm text-gray-600">Customize colors and appearance</p>
                  </div>
                </div>

                <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Background Color
                    <span className="ml-2 text-xs font-normal text-gray-500">Popup background</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.bgColor || '#ffffff'}
                      onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                      className="h-12 w-full cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, bgColor: '#ffffff' })}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                      title="Reset to default"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Text Color
                    <span className="ml-2 text-xs font-normal text-gray-500">Content text color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.textColor || '#000000'}
                      onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                      className="h-12 w-full cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, textColor: '#000000' })}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                      title="Reset to default"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Button Background
                    <span className="ml-2 text-xs font-normal text-gray-500">Button background color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.buttonBgColor || '#000000'}
                      onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                      className="h-12 w-full cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, buttonBgColor: '#000000' })}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                      title="Reset to default"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Button Text Color
                    <span className="ml-2 text-xs font-normal text-gray-500">Button text color</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.buttonTextColor || '#ffffff'}
                      onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                      className="h-12 w-full cursor-pointer rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, buttonTextColor: '#ffffff' })}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                      title="Reset to default"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Max Width
                    <span className="ml-2 text-xs font-normal text-gray-500">Maximum popup width</span>
                  </label>
                  <input
                    type="text"
                    value={config.maxWidth || '500px'}
                    onChange={(e) => setConfig({ ...config, maxWidth: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="500px"
                  />
                </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3"
                        />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

      <ImageGalleryModal
        isOpen={showMediaModal}
        onClose={closeMediaModal}
        onSelect={handleSelectImage}
        restaurantId={restaurantId || undefined}
        title="Select Image from Media Library"
        description="Choose an image from your media library or upload new"
      />

      {/* Preview Modal */}
      {showPreview && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: config.overlayColor || 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              animation: 'fadeIn 0.3s ease-in-out',
            }}
            onClick={() => setShowPreview(false)}
          >
            {/* Popup Content */}
            <div
              style={{
                backgroundColor: config.bgColor || '#ffffff',
                color: config.textColor || '#000000',
                borderRadius: '12px',
                maxWidth: config.maxWidth || '500px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'slideUp 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: config.layout === 'image-bg' ? '#ffffff' : config.textColor || '#000000',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background-color 0.2s',
                  zIndex: 10,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>

              {/* Dynamic Content Based on Layout */}
              {renderPopupContent()}
            </div>
          </div>

          {/* Animations */}
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }

            @keyframes slideUp {
              from {
                transform: translateY(30px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
          {toast.type === 'success' ? (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}