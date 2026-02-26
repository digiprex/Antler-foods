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
import Toast from '@/components/ui/toast';
import styles from './announcement-bar-settings-form.module.css'; // Reuse existing styles

export default function ScrollingTextSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const restaurantNameFromQuery = searchParams.get('restaurant_name')?.trim() ?? '';
  const pageIdFromQuery = searchParams.get('page_id')?.trim() ?? '';
  const restaurantId = restaurantIdFromQuery || '';
  const pageId = pageIdFromQuery || '';

  if (!restaurantId || !pageId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID and Page ID are required. Please provide them via URL parameters.</p>
      </div>
    );
  }

  const configApiEndpoint = useMemo(
    () => `/api/scrolling-text-config?restaurant_id=${encodeURIComponent(restaurantId)}&page_id=${encodeURIComponent(pageId)}`,
    [restaurantId, pageId],
  );

  const { config, loading, error: fetchError } = useScrollingTextConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateScrollingText, updating, error: updateError } = useUpdateScrollingTextConfig();

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

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
      setText(config.text || '');
      setBgColor(config.bgColor || '#000000');
      setTextColor(config.textColor || '#ffffff');
      setScrollSpeed(config.scrollSpeed || 'medium');
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
      await updateScrollingText({
        restaurant_id: restaurantId,
        page_id: pageId,
        isEnabled,
        text,
        bgColor,
        textColor,
        scrollSpeed,
      });

      setToastMessage('Scrolling text settings saved successfully!');
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
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.singleLayout}>
        {/* Settings Form */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Scrolling Text Settings</h1>
              <p className={styles.formSubtitle}>Configure your scrolling text banner</p>
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
                  Enable Scrolling Text
                  <span className={styles.labelHint}>Show/hide the scrolling text banner</span>
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
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Content
              </h3>

              {/* Text Content */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Scrolling Text
                  <span className={styles.labelHint}>Message that scrolls across the screen</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className={styles.textarea}
                  placeholder="Welcome to our restaurant! Check out our new menu..."
                  rows={3}
                />
              </div>
            </div>

            {/* Styling Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colors & Animation
              </h3>

              {/* Background Color */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>Banner background color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#000000"
                  />
                  <button
                    type="button"
                    onClick={() => setBgColor('#000000')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              {/* Text Color */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Color
                  <span className={styles.labelHint}>Scrolling text color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                  <button
                    type="button"
                    onClick={() => setTextColor('#ffffff')}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
                </div>
              </div>

              {/* Scroll Speed */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Scroll Speed
                  <span className={styles.labelHint}>How fast the text scrolls</span>
                </label>
                <select
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

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

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h2 className={styles.previewModalTitle}>Scrolling Text Live Preview</h2>
              <div className={styles.previewModalActions}>
                <span className={styles.previewBadge}>Updates in real-time</span>
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
                <div className={styles.previewContainer}>
                  <ScrollingTextPreview />
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your scrolling text will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
