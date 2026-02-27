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
import styles from './announcement-bar-settings-form.module.css'; // Reuse existing styles

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
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';

  const configApiEndpoint = useMemo(
    () => `/api/custom-code-config?restaurant_id=${encodeURIComponent(restaurantId)}&page_id=${encodeURIComponent(pageId)}`,
    [restaurantId, pageId],
  );

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

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

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
        isEnabled,
        codeType,
        htmlCode,
        cssCode,
        jsCode,
        iframeUrl,
        iframeHeight,
        iframeWidth,
      });

      setToastMessage('Custom code settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update custom code:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className={styles.singleLayout}>
        {/* Settings Form */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Custom Code Settings</h1>
              <p className={styles.formSubtitle}>Add custom HTML/CSS/JS or embed iframe content</p>
              {restaurantNameFromQuery && (
                <p className={styles.formSubtitle}>
                  Restaurant: {restaurantNameFromQuery}
                </p>
              )}
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={styles.previewToggleButton}
                title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
              >
                {showPreview ? '👁️‍🗨️' : '👁️'} {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>

          {fetchError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error loading settings: {fetchError}</span>
            </div>
          )}

          {updateError && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>Error saving settings: {updateError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* General Settings */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚙</span>
                General Settings
              </h3>

              {/* Enable/Disable Toggle */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Enable Custom Code
                  <span className={styles.labelHint}>Show/hide the custom code section</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {/* Code Type Selection */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Code Type
                  <span className={styles.labelHint}>Choose between custom code or iframe embed</span>
                </label>
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value as CustomCodeType)}
                  className={styles.select}
                >
                  <option value="html">HTML/CSS/JS</option>
                  <option value="iframe">iframe Embed</option>
                </select>
              </div>
            </div>

            {/* HTML/CSS/JS Code Section */}
            {codeType === 'html' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>💻</span>
                  Custom Code
                </h3>

                {/* HTML Code */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    HTML Code
                    <span className={styles.labelHint}>Your custom HTML content</span>
                  </label>
                  <textarea
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    className={styles.textarea}
                    placeholder="<div>Your HTML code here...</div>"
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: '14px' }}
                  />
                </div>

                {/* CSS Code */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    CSS Code (Optional)
                    <span className={styles.labelHint}>Custom styling</span>
                  </label>
                  <textarea
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    className={styles.textarea}
                    placeholder=".my-class { color: red; }"
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: '14px' }}
                  />
                </div>

                {/* JavaScript Code */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    JavaScript Code (Optional)
                    <span className={styles.labelHint}>Custom scripts (will be wrapped in script tags)</span>
                  </label>
                  <textarea
                    value={jsCode}
                    onChange={(e) => setJsCode(e.target.value)}
                    className={styles.textarea}
                    placeholder="console.log('Hello World');"
                    rows={6}
                    style={{ fontFamily: 'monospace', fontSize: '14px' }}
                  />
                </div>
              </div>
            )}

            {/* iframe Section */}
            {codeType === 'iframe' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>🖼️</span>
                  iframe Embed
                </h3>

                {/* iframe URL */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    iframe URL
                    <span className={styles.labelHint}>The URL to embed</span>
                  </label>
                  <input
                    type="url"
                    value={iframeUrl}
                    onChange={(e) => setIframeUrl(e.target.value)}
                    className={styles.select}
                    placeholder="https://example.com"
                  />
                </div>

                {/* iframe Height */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    iframe Height
                    <span className={styles.labelHint}>Height in pixels or percentage (e.g., 500px, 100%)</span>
                  </label>
                  <input
                    type="text"
                    value={iframeHeight}
                    onChange={(e) => setIframeHeight(e.target.value)}
                    className={styles.select}
                    placeholder="500px"
                  />
                </div>

                {/* iframe Width */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    iframe Width
                    <span className={styles.labelHint}>Width in pixels or percentage (e.g., 800px, 100%)</span>
                  </label>
                  <input
                    type="text"
                    value={iframeWidth}
                    onChange={(e) => setIframeWidth(e.target.value)}
                    className={styles.select}
                    placeholder="100%"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={updating}
                className={styles.saveButton}
              >
                {updating ? (
                  <>
                    <span className={styles.spinner}></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h2 className={styles.previewModalTitle}>Custom Code Live Preview</h2>
              <div className={styles.previewModalActions}>
                <span className={styles.previewBadge}>Live Preview</span>
                <button
                  onClick={() => setShowPreview(false)}
                  className={styles.previewModalClose}
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.previewModalBody}>
              <div className={styles.previewDevice}>
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
                    frameBorder="0"
                    style={{ border: 'none', maxWidth: '100%' }}
                    title="Custom Code Preview"
                  />
                )}
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your custom code will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
