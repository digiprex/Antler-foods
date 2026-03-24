/**
 * Custom Code Settings Form
 *
 * Interface for configuring custom code settings:
 * - Enable/disable toggle
 * - Code type selection (HTML/CSS/JS or iframe)
 * - Code editors for HTML, CSS, JS
 * - iframe URL and dimensions
 * - Live preview
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCustomCodeConfig, useUpdateCustomCodeConfig } from '@/hooks/use-custom-code-config';
import type { CustomCodeType } from '@/types/custom-code.types';
import Toast from '@/components/ui/toast';

// Preview component with proper script execution
function CustomCodePreview({ htmlCode, cssCode, jsCode }: { htmlCode: string; cssCode?: string; jsCode?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Force re-render when code changes to properly execute new scripts
    setKey(prev => prev + 1);
  }, [htmlCode, cssCode, jsCode]);

  useEffect(() => {
    // Execute JavaScript code if provided
    if (jsCode && containerRef.current) {
      // Wait for HTML to be rendered first
      const timeoutId = setTimeout(() => {
        try {
          const script = document.createElement('script');
          
          // Wrap the code to ensure DOM elements are available
          const wrappedCode = `
            (function() {
              // Wait a bit more to ensure DOM elements are available
              setTimeout(function() {
                try {
                  ${jsCode}
                } catch (error) {
                  console.error('Error in custom JavaScript preview:', error);
                }
              }, 100);
            })();
          `;
          
          script.textContent = wrappedCode;
          script.async = false;
          if (containerRef.current) {
            containerRef.current.appendChild(script);
          }
        } catch (error) {
          console.error('Error executing custom JavaScript in preview:', error);
        }
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        const scripts = containerRef.current?.getElementsByTagName('script');
        if (scripts && scripts.length > 0) {
          Array.from(scripts).forEach(script => {
            if (script.parentNode) {
              script.parentNode.removeChild(script);
            }
          });
        }
      };
    }
  }, [jsCode, key]);

  return (
    <div key={key} ref={containerRef}>
      {cssCode && <style dangerouslySetInnerHTML={{ __html: cssCode }} />}
      <div dangerouslySetInnerHTML={{ __html: htmlCode }} />
    </div>
  );
}

export default function CustomCodeSettingsForm() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;

  const configApiEndpoint = useMemo(() => {
    if (isNewSection) {
      // For new sections, return empty endpoint to skip fetching
      return '';
    }
    let endpoint = `/api/custom-code-config?restaurant_id=${encodeURIComponent(restaurantId)}`;
    if (templateId) {
      endpoint += `&template_id=${encodeURIComponent(templateId)}`;
    } else if (pageId) {
      endpoint += `&page_id=${encodeURIComponent(pageId)}`;
    }
    return endpoint;
  }, [restaurantId, pageId, templateId, isNewSection]);

  const { config, loading, error: fetchError } = useCustomCodeConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateCustomCode, updating, error: updateError } = useUpdateCustomCodeConfig();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [codeType, setCodeType] = useState<CustomCodeType>('html');
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [iframeUrl, setIframeUrl] = useState('');
  const [iframeHeight, setIframeHeight] = useState('500px');
  const [iframeWidth, setIframeWidth] = useState('100%');

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setIsEnabled(config.isEnabled ?? false);
      setCodeType(config.codeType || 'html');
      setHtmlCode(config.htmlCode || '');
      setCssCode(config.cssCode || '');
      setJsCode(config.jsCode || '');
      setIframeUrl(config.iframeUrl || '');
      setIframeHeight(config.iframeHeight || '500px');
      setIframeWidth(config.iframeWidth || '100%');
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId || !pageId) {
      setToastMessage('Restaurant ID or Page ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateCustomCode({
        restaurant_id: restaurantId,
        page_id: pageId,
        template_id: templateId || undefined,
        isEnabled,
        codeType,
        htmlCode,
        cssCode,
        jsCode,
        iframeUrl,
        iframeHeight,
        iframeWidth,
      });

      setToastMessage(
        isNewSection
          ? 'Custom code section created successfully!'
          : 'Custom code settings saved successfully!'
      );
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update custom code:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

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
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNewSection ? 'Add Custom Code Section' : 'Custom Code Settings'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isNewSection
                  ? 'Create a new custom code section for this page'
                  : 'Add custom HTML/CSS/JS or embed iframe content'
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
              <p className="text-sm text-gray-600">Configure basic custom code options</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Custom Code</label>
                <p className="text-xs text-gray-500">Show/hide the custom code section</p>
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

            {/* Code Type Selection */}
            <div className="space-y-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Code Type</span>
                <span className="mt-0.5 block text-xs text-gray-500">Choose between custom code or iframe embed</span>
              </label>
              <select
                value={codeType}
                onChange={(e) => setCodeType(e.target.value as CustomCodeType)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="html">HTML/CSS/JS</option>
                <option value="iframe">iframe Embed</option>
              </select>
            </div>
          </div>
        </div>

        {/* HTML/CSS/JS Code Section */}
        {codeType === 'html' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Custom Code</h2>
                <p className="text-sm text-gray-600">Add your HTML, CSS, and JavaScript</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* HTML Code */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">HTML Code</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Your custom HTML content</span>
                </label>
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="<div>Your HTML code here...</div>"
                  rows={8}
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
              </div>

              {/* CSS Code */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">CSS Code (Optional)</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Custom styling</span>
                </label>
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder=".my-class { color: red; }"
                  rows={6}
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
              </div>

              {/* JavaScript Code */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">JavaScript Code (Optional)</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Custom scripts (will be wrapped in script tags)</span>
                </label>
                <textarea
                  value={jsCode}
                  onChange={(e) => setJsCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="console.log('Hello World');"
                  rows={6}
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* iframe Section */}
        {codeType === 'iframe' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">iframe Embed</h2>
                <p className="text-sm text-gray-600">Embed external content via iframe</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* iframe URL */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">iframe URL</span>
                  <span className="mt-0.5 block text-xs text-gray-500">The URL to embed</span>
                </label>
                <input
                  type="url"
                  value={iframeUrl}
                  onChange={(e) => setIframeUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="https://example.com"
                />
              </div>

              {/* iframe Height */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">iframe Height</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Height in pixels or percentage (e.g., 500px, 100%)</span>
                </label>
                <input
                  type="text"
                  value={iframeHeight}
                  onChange={(e) => setIframeHeight(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="500px"
                />
              </div>

              {/* iframe Width */}
              <div className="space-y-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">iframe Width</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Width in pixels or percentage (e.g., 800px, 100%)</span>
                </label>
                <input
                  type="text"
                  value={iframeWidth}
                  onChange={(e) => setIframeWidth(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="100%"
                />
              </div>
            </div>
          </div>
        )}

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
                {isNewSection ? 'Create Custom Code Section' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal */}
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
                  <h2 className="text-lg font-semibold text-gray-900">Custom Code Live Preview</h2>
                  <p className="text-xs text-gray-500">Live Preview</p>
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
                  {!isEnabled ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #e5e7eb'
                    }}>
                      Custom code is disabled
                    </div>
                  ) : codeType === 'html' && !htmlCode.trim() ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #e5e7eb'
                    }}>
                      Enter HTML code to see preview
                    </div>
                  ) : codeType === 'iframe' && !iframeUrl.trim() ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '2px dashed #e5e7eb'
                    }}>
                      Enter iframe URL to see preview
                    </div>
                  ) : codeType === 'html' ? (
                    <CustomCodePreview
                      htmlCode={htmlCode}
                      cssCode={cssCode}
                      jsCode={jsCode}
                    />
                  ) : (
                    <iframe
                      src={iframeUrl}
                      width={iframeWidth}
                      height={iframeHeight}
                      style={{ border: 'none', maxWidth: '100%' }}
                      title="Custom Code Preview"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-4">
                <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your custom code will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
