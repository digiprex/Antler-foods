/**
 * Popup Settings Page
 *
 * Dashboard-integrated interface for configuring site-wide popup settings.
 * Access: /admin/popup-settings
 */

'use client';

import { Suspense } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useState, useEffect } from 'react';
import type { PopupConfig } from '@/types/popup.types';
import { DEFAULT_POPUP_CONFIG } from '@/types/popup.types';
import styles from '@/components/admin/gallery-settings-form.module.css';

function PopupSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  const [config, setConfig] = useState<PopupConfig>(DEFAULT_POPUP_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
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
    fetchMediaFiles();
  };

  const closeMediaModal = () => {
    setShowMediaModal(false);
  };

  const selectMedia = (media: any) => {
    setConfig({
      ...config,
      imageUrl: media.file?.url || '',
    });
    closeMediaModal();
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

      // Refresh media library
      await fetchMediaFiles();

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

  const handleBack = () => {
    router.push('/admin/dashboard');
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
            <div style={{ marginBottom: '1.5rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', padding: '2rem' }}>
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
                  minHeight: '250px',
                }}
              />
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: '2rem', padding: '2rem' }}>
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
                  minHeight: '250px',
                }}
              />
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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

    // Background Image Layout
    if (layout === 'image-bg') {
      return (
        <div
          style={{
            backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            padding: '3rem 2rem',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
              <p style={{ fontSize: '1.125rem', lineHeight: '1.75', marginBottom: '1.5rem', color: '#ffffff', opacity: 0.9 }}>
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
      return (
        <div style={{ padding: 0 }}>
          {config.imageUrl && (
            <img
              src={config.imageUrl}
              alt={config.title || 'Popup'}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                objectFit: 'cover',
                maxHeight: '500px',
              }}
            />
          )}
        </div>
      );
    }

    // Newsletter with Image
    if (layout === 'newsletter-image') {
      return (
        <div style={{ padding: '2rem' }}>
          {config.imageUrl && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <img
                src={config.imageUrl}
                alt={config.title || 'Popup'}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  margin: '0 auto',
                }}
              />
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
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
                padding: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '1rem',
                marginBottom: '1rem',
              }}
            />
            {renderButton()}
          </div>
        </div>
      );
    }

    // Newsletter Text Only
    if (layout === 'newsletter-text') {
      return (
        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
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
              padding: '0.875rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '1rem',
              marginBottom: '1rem',
            }}
          />
          {renderButton()}
        </div>
      );
    }

    return null;
  };

  if (!restaurantId) {
    return (
      <DashboardLayout>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🔔</div>
          <h2 className={styles.emptyStateTitle}>No Restaurant Selected</h2>
          <p className={styles.emptyStateDescription}>
            Please select a restaurant from the dashboard to configure popup settings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
                      onChange={(e) => setConfig({ ...config, frequency: e.target.value as any })}
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
                      onChange={(e) => setConfig({ ...config, layout: e.target.value as any })}
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
      </div>

      {/* Media Library Modal */}
      {showMediaModal && (
        <div className={styles.modal} onClick={closeMediaModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Select Image from Media Library
              </h2>
              <button
                onClick={closeMediaModal}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Upload Progress */}
              {Object.keys(uploadProgress).length > 0 && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Uploading...</h4>
                  {Object.entries(uploadProgress).map(([fileName, progress]) => (
                    <div key={fileName} style={{ marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span>{fileName}</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#667eea', width: `${progress}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loadingMedia ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Loading media files...</p>
                </div>
              ) : mediaFiles.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📁</div>
                  <h3 className={styles.emptyStateTitle}>No images found</h3>
                  <p className={styles.emptyStateDescription}>
                    Upload images using the button above.
                  </p>
                </div>
              ) : (
                <div className={styles.mediaGrid}>
                  {mediaFiles.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => selectMedia(media)}
                      className={styles.mediaItem}
                      style={{ cursor: 'pointer' }}
                    >
                      {media.file?.url ? (
                        <img
                          src={media.file.url}
                          alt={media.file.name || 'Image'}
                          className={styles.mediaImage}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '200px',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          No preview
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <label className={`${styles.button} ${styles.primaryButton}`} style={{ marginBottom: 0, cursor: 'pointer' }}>
                📤 Upload New Images
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={closeMediaModal}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
    </DashboardLayout>
  );
}

export default function PopupSettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PopupSettingsContent />
    </Suspense>
  );
}
