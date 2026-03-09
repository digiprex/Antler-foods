/**
 * Scrolling Text Settings Form
 *
 * Interface for configuring scrolling text settings:
 * - Enable/disable toggle
 * - Text content
 * - Colors (background and text)
 * - Scroll speed
 * - Live preview
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useScrollingTextConfig, useUpdateScrollingTextConfig } from '@/hooks/use-scrolling-text-config';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';
import { SCROLL_SPEEDS } from '@/types/scrolling-text.types';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Toast from '@/components/ui/toast';

export default function ScrollingTextSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);
  
  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

  const configApiEndpoint = useMemo(
    () => {
      // Don't fetch existing config if this is a new section
      if (isNewSection) return undefined;
      
      const params = new URLSearchParams();
      params.append('restaurant_id', restaurantId);
      params.append('page_id', pageId);
      if (templateId) params.append('template_id', templateId);
      
      return `/api/scrolling-text-config?${params.toString()}`;
    },
    [restaurantId, pageId, templateId, isNewSection],
  );

  const { config, loading, error: fetchError } = useScrollingTextConfig({
    apiEndpoint: configApiEndpoint || '',
  });
  const { updateScrollingText, updating, error: updateError } = useUpdateScrollingTextConfig();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [sectionStyle, setSectionStyle] = useState<SectionStyleConfig>(
    sectionStyleDefaults,
  );

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config (only for existing sections)
  useEffect(() => {
    if (config && !isNewSection) {
      setIsEnabled(config.isEnabled ?? false);
      setText(config.text || '');
      setBgColor(config.bgColor || '#000000');
      setTextColor(config.textColor || '#ffffff');
      setScrollSpeed(config.scrollSpeed || 'medium');
      setSectionStyle((prev) => ({
        ...sectionStyleDefaults,
        ...prev,
        ...config,
      }));
    }
  }, [config, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setSectionStyle((prev) => ({
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [sectionStyleDefaults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId || !pageId) {
      setToastMessage('Restaurant ID or Page ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateScrollingText({
        restaurant_id: restaurantId,
        page_id: pageId,
        template_id: templateId,
        isEnabled,
        text,
        bgColor,
        textColor,
        scrollSpeed,
        ...sectionStyle,
      });

      setToastMessage(isNewSection ? 'Scrolling text section created successfully!' : 'Scrolling text settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update scrolling text:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Create preview component
  const ScrollingTextPreview = () => {
    if (!isEnabled) {
      return (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#6b7280',
          fontStyle: 'italic',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #e5e7eb'
        }}>
          Scrolling text is disabled
        </div>
      );
    }

    if (!text?.trim()) {
      return (
        <div style={{
          padding: '1rem',
          textAlign: 'center',
          color: '#6b7280',
          fontStyle: 'italic',
          background: '#f9fafb',
          borderRadius: '8px',
          border: '2px dashed #e5e7eb'
        }}>
          Enter text to see preview
        </div>
      );
    }

    const speed = SCROLL_SPEEDS[scrollSpeed];

    return (
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '12px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}>
        <div style={{
          display: 'inline-flex',
          animation: `scroll-left ${100 / speed}s linear infinite`,
        }}>
          <span style={{ paddingRight: '4rem' }}>{text}</span>
          <span style={{ paddingRight: '4rem' }}>{text}</span>
          <span style={{ paddingRight: '4rem' }}>{text}</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="h-8 w-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-700">Loading settings...</span>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNewSection ? 'Add Scrolling Text Section' : 'Scrolling Text Settings'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isNewSection
                  ? 'Create a new scrolling text section for this page'
                  : 'Configure your scrolling text banner'
                }
              </p>
              {restaurantNameFromQuery && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        {/* Error Messages */}
        {fetchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-800">Error loading settings: {fetchError}</span>
            </div>
          </div>
        )}

        {updateError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-red-800">Error saving settings: {updateError}</span>
            </div>
          </div>
        )}
            {/* General Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
              <p className="text-sm text-gray-600">Configure basic scrolling text options</p>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Scrolling Text</label>
              <p className="text-xs text-gray-500">Show/hide the scrolling text banner</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
            </label>
          </div>
        </div>

        {/* Content Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content</h2>
              <p className="text-sm text-gray-600">Set the scrolling text message</p>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Scrolling Text</span>
              <span className="mt-0.5 block text-xs text-gray-500">Message that scrolls across the screen</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Welcome to our restaurant! Check out our new menu..."
              rows={3}
            />
          </div>
        </div>

        {/* Styling Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Colors & Animation</h2>
              <p className="text-sm text-gray-600">Customize appearance and scroll speed</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Background Color */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Background Color</span>
                <span className="mt-0.5 block text-xs text-gray-500">Banner background color</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="#000000"
                />
                <button
                  type="button"
                  onClick={() => setBgColor('#000000')}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scroll Speed */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Scroll Speed</span>
                <span className="mt-0.5 block text-xs text-gray-500">How fast the text scrolls</span>
              </label>
              <select
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(e.target.value as any)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
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
                  checked={sectionStyle.is_custom || false}
                  onChange={(e) =>
                    setSectionStyle((prev) => ({ ...prev, is_custom: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!sectionStyle.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Using Global Styles</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles defined in your theme settings.
                      Enable custom typography above to override these styles with section-specific options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <>
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isNewSection ? 'Create Scrolling Text Section' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-4xl mx-4 rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Scrolling Text Live Preview</h2>
                  <p className="text-xs text-gray-500">Updates in real-time</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
                <div className="overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm">
                  <ScrollingTextPreview />
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-4">
                <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your scrolling text will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
