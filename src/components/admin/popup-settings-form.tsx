/**
 * Popup Settings Form Component
 * 
 * Form component for configuring popup settings within the dashboard layout
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
  const [showPreview, setShowPreview] = useState(false);

  const fetchPopupConfig = useCallback(async () => {
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
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      fetchPopupConfig();
    }
  }, [restaurantId, fetchPopupConfig]);

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
            <div style={{ marginBottom: '1.5rem', position: 'relative', width: '100%', height: '300px' }}>
              <Image
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                fill
                style={{
                  borderRadius: '12px 12px 0 0',
                  objectFit: 'cover',
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

    // Add other layouts as needed...
    return null;
  };

  if (!restaurantId) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>🔔</div>
        <h2 className={styles.emptyStateTitle}>No Restaurant Selected</h2>
        <p className={styles.emptyStateDescription}>
          Please select a restaurant from the sidebar to configure popup settings.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.singleLayout}>
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Popup Settings</h1>
              <p className={styles.formSubtitle}>
                Configure site-wide popup that appears when users visit your website
              </p>
              {restaurantName && (
                <p className={styles.formSubtitle}>
                  Restaurant: {restaurantName}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowPreview(true)}
              className={`${styles.button} ${styles.secondaryButton}`}
              type="button"
              style={{ whiteSpace: 'nowrap' }}
            >
              <span>👁️</span>
              Preview Popup
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : (
            <div className={styles.form}>
              {/* Enable/Disable */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>⚙️</span>
                  Display Settings
                </h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Enable Popup
                    <span className={styles.labelHint}>Show popup on website</span>
                  </label>
                  <select
                    value={config.enabled ? 'true' : 'false'}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.value === 'true' })}
                    className={styles.select}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Show on Page Load
                    <span className={styles.labelHint}>Display popup when page loads</span>
                  </label>
                  <select
                    value={config.showOnLoad ? 'true' : 'false'}
                    onChange={(e) => setConfig({ ...config, showOnLoad: e.target.value === 'true' })}
                    className={styles.select}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Delay (seconds)
                    <span className={styles.labelHint}>Wait time before showing popup</span>
                  </label>
                  <input
                    type="number"
                    value={config.delay || 2}
                    onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 2 })}
                    className={styles.textInput}
                    min="0"
                    max="60"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Frequency
                    <span className={styles.labelHint}>How often to show popup</span>
                  </label>
                  <select
                    value={config.frequency}
                    onChange={(e) => setConfig({ ...config, frequency: e.target.value as PopupConfig['frequency'] })}
                    className={styles.select}
                  >
                    <option value="always">Always</option>
                    <option value="once">Once per session</option>
                    <option value="daily">Once per day</option>
                    <option value="weekly">Once per week</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Layout
                    <span className={styles.labelHint}>Popup layout style</span>
                  </label>
                  <select
                    value={config.layout || 'default'}
                    onChange={(e) => setConfig({ ...config, layout: e.target.value as PopupConfig['layout'] })}
                    className={styles.select}
                  >
                    <option value="default">Default (Image Top)</option>
                    <option value="image-left">Image Left</option>
                    <option value="image-right">Image Right</option>
                    <option value="image-bg">Background Image</option>
                    <option value="image-only">Image Only</option>
                    <option value="newsletter-image">Newsletter with Image</option>
                    <option value="newsletter-text">Newsletter (Text Only)</option>
                  </select>
                </div>
              </div>

              {/* Content */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>📝</span>
                  Content
                </h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Title
                    <span className={styles.labelHint}>Popup heading</span>
                  </label>
                  <input
                    type="text"
                    value={config.title || ''}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    className={styles.textInput}
                    placeholder="Welcome!"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Description
                    <span className={styles.labelHint}>Popup message</span>
                  </label>
                  <textarea
                    value={config.description || ''}
                    onChange={(e) => setConfig({ ...config, description: e.target.value })}
                    rows={3}
                    className={styles.textArea}
                    placeholder="Check out our latest offers and specials"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Show Button
                    <span className={styles.labelHint}>Display call-to-action button</span>
                  </label>
                  <select
                    value={config.showButton !== false ? 'true' : 'false'}
                    onChange={(e) => setConfig({ ...config, showButton: e.target.value === 'true' })}
                    className={styles.select}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                {config.showButton !== false && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Button Text
                        <span className={styles.labelHint}>Call-to-action button label</span>
                      </label>
                      <input
                        type="text"
                        value={config.buttonText || ''}
                        onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                        className={styles.textInput}
                        placeholder="View Menu"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Button URL
                        <span className={styles.labelHint}>Where the button links to</span>
                      </label>
                      <input
                        type="text"
                        value={config.buttonUrl || ''}
                        onChange={(e) => setConfig({ ...config, buttonUrl: e.target.value })}
                        className={styles.textInput}
                        placeholder="#menu"
                      />
                    </div>
                  </>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Popup Image
                    <span className={styles.labelHint}>Optional popup image</span>
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
                      <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                        <Image
                          src={config.imageUrl}
                          alt="Popup preview"
                          fill
                          style={{
                            objectFit: 'cover',
                            borderRadius: '0.5rem',
                            border: '2px solid #e5e7eb',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={openMediaModal}
                          className={`${styles.button} ${styles.secondaryButton}`}
                          type="button"
                          style={{ padding: '0.5rem 1rem', flex: 1 }}
                        >
                          Change Image
                        </button>
                        <button
                          onClick={() => setConfig({ ...config, imageUrl: '' })}
                          className={`${styles.button} ${styles.secondaryButton}`}
                          type="button"
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={openMediaModal}
                      className={`${styles.button} ${styles.primaryButton}`}
                      type="button"
                    >
                      📁 Select Image from Media Library
                    </button>
                  )}
                </div>
              </div>

              {/* Styling */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>🎨</span>
                  Styling
                </h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Background Color
                    <span className={styles.labelHint}>Popup background</span>
                  </label>
                  <input
                    type="color"
                    value={config.bgColor || '#ffffff'}
                    onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                    className={styles.textInput}
                    style={{ height: '50px', cursor: 'pointer' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Text Color
                    <span className={styles.labelHint}>Content text color</span>
                  </label>
                  <input
                    type="color"
                    value={config.textColor || '#000000'}
                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                    className={styles.textInput}
                    style={{ height: '50px', cursor: 'pointer' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Button Background
                    <span className={styles.labelHint}>Button background color</span>
                  </label>
                  <input
                    type="color"
                    value={config.buttonBgColor || '#000000'}
                    onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                    className={styles.textInput}
                    style={{ height: '50px', cursor: 'pointer' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Button Text Color
                    <span className={styles.labelHint}>Button text color</span>
                  </label>
                  <input
                    type="color"
                    value={config.buttonTextColor || '#ffffff'}
                    onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                    className={styles.textInput}
                    style={{ height: '50px', cursor: 'pointer' }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Max Width
                    <span className={styles.labelHint}>Maximum popup width</span>
                  </label>
                  <input
                    type="text"
                    value={config.maxWidth || '500px'}
                    onChange={(e) => setConfig({ ...config, maxWidth: e.target.value })}
                    className={styles.textInput}
                    placeholder="500px"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className={styles.formActions} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={styles.saveButton}
                >
                  {saving ? (
                    <>
                      <span className={styles.spinner}></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      Save Popup Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
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
          <span style={{ fontSize: '1.25rem' }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}