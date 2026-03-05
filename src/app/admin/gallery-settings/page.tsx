/**
 * Gallery Settings Page
 *
 * Dashboard-integrated interface for configuring gallery section settings.
 * Access: /admin/gallery-settings
 *
 * Features:
 * - Dashboard layout with sidebar and navbar
 * - Restaurant selection requirement
 * - Layout selection (grid, masonry, carousel)
 * - Image management (upload, reorder, captions)
 * - Styling options (columns, gap, aspect ratio, colors)
 * - Live preview
 * - Media library integration
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useState, useEffect } from 'react';
import type { GalleryConfig } from '@/types/gallery.types';
import { DEFAULT_GALLERY_CONFIG } from '@/types/gallery.types';
import styles from '@/components/admin/gallery-settings-form.module.css';
import Gallery from '@/components/gallery';

export default function GallerySettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  
  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;

  const [config, setConfig] = useState<GalleryConfig>(DEFAULT_GALLERY_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (restaurantId && !isNewSection) {
      fetchGalleryConfig();
    }
  }, [restaurantId, pageId, templateId, isNewSection]);

  const fetchGalleryConfig = async () => {
    // Don't fetch existing config if this is a new section
    if (isNewSection) return;
    
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
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching gallery config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaFiles = async () => {
    if (!restaurantId) return;

    setLoadingMedia(true);
    try {
      // Try without type filter first to see if any media exists
      const url = `/api/media?restaurant_id=${restaurantId}`;

      const response = await fetch(url);
      const data = await response.json();


      if (data.success) {

        // Filter for images on the client side if needed
        const allMedia = data.data || [];

        // Add some test data if no media is found for debugging
        if (allMedia.length === 0) {
        }

        // For now, show all media files
        setMediaFiles(allMedia);
      } else {
        console.error('Error fetching media files:', data.error);
        if (data.details) {
          console.error('Error details:', data.details);
        }
        // Don't show alert, just log the error
        console.error('Error loading media files: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
      // Don't show alert, just log the error
      console.error('Error loading media files: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/gallery-config', {
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
        setToast({
          message: isNewSection ? 'Gallery section created successfully!' : 'Gallery settings saved successfully!',
          type: 'success'
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ message: 'Error saving settings: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('Error saving gallery config:', error);
      setToast({ message: 'Error saving settings', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    router.push(`/admin/page-settings?${params.toString()}`);
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
    const selectedFiles = mediaFiles.filter(media => selectedMedia.has(media.id));
    const newImages = selectedFiles.map(media => ({
      url: media.file?.url || '',
      alt: media.file?.name || '',
      title: '',
      description: '',
    }));

    setConfig({
      ...config,
      images: [...config.images, ...newImages],
    });

    closeMediaModal();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !restaurantId) return;

    setUploading(true);
    const uploadedMedia: any[] = [];

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('restaurant_id', restaurantId);
        formData.append('type', 'image');

        try {
          const response = await fetch('/api/media/upload', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();

          if (data.success) {
            console.log('[Gallery Settings] File uploaded successfully:', data.data);
            uploadedMedia.push(data.data);
            setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          } else {
            console.error('[Gallery Settings] Upload failed:', data.error);
            alert(`Failed to upload ${file.name}: ${data.error}`);
          }
        } catch (error) {
          console.error('[Gallery Settings] Upload error:', error);
          alert(`Error uploading ${file.name}`);
        }
      }

      // Refresh media list
      if (uploadedMedia.length > 0) {
        await fetchMediaFiles();
      }

    } finally {
      setUploading(false);
      setUploadProgress({});
      // Reset file input
      event.target.value = '';
    }
  };

  const updateImage = (index: number, field: string, value: string) => {
    const newImages = [...config.images];
    newImages[index] = { ...newImages[index], [field]: value };
    setConfig({ ...config, images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = config.images.filter((_, i) => i !== index);
    setConfig({ ...config, images: newImages });
  };

  return (
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

              <div className={styles.formHeader}>
                <div>
                  <h1 className={styles.formTitle}>
                    {isNewSection ? 'Add New Gallery Section' : 'Edit Gallery Settings'}
                  </h1>
                  <p className={styles.formSubtitle}>
                    {isNewSection
                      ? 'Create a new gallery section for this page'
                      : 'Customize your website gallery section'
                    }
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
                  disabled={config.images.length === 0}
                >
                  👁️ Preview Gallery
                </button>
              </div>

              {loading ? (
                <div className={styles.loading}>Loading...</div>
              ) : (
                <div className={styles.form}>
                  {/* Basic Info */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>📝</span>
                      Basic Information
                    </h3>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Title
                        <span className={styles.labelHint}>Gallery section title</span>
                      </label>
                      <input
                        type="text"
                        value={config.title || ''}
                        onChange={(e) => setConfig({ ...config, title: e.target.value })}
                        className={styles.textInput}
                        placeholder="Our Gallery"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Sub Heading
                        <span className={styles.labelHint}>Optional subtitle text</span>
                      </label>
                      <input
                        type="text"
                        value={config.subtitle || ''}
                        onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                        className={styles.textInput}
                        placeholder="Explore our collection"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Description
                        <span className={styles.labelHint}>Optional description text</span>
                      </label>
                      <textarea
                        value={config.description || ''}
                        onChange={(e) => setConfig({ ...config, description: e.target.value })}
                        rows={3}
                        className={styles.textArea}
                        placeholder="Explore our beautiful collection of images..."
                      />
                    </div>
                  </div>

                  {/* Layout Settings */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>⚙️</span>
                      Layout Settings
                    </h3>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Layout Type
                        <span className={styles.labelHint}>Choose display style</span>
                      </label>
                      <select
                        value={config.layout}
                        onChange={(e) => setConfig({ ...config, layout: e.target.value as any })}
                        className={styles.select}
                      >
                        <option value="grid">Grid - Uniform layout</option>
                        <option value="masonry">Masonry - Pinterest style</option>
                        <option value="carousel">Carousel - Sliding gallery</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Columns
                        <span className={styles.labelHint}>Number of columns</span>
                      </label>
                      <select
                        value={config.columns}
                        onChange={(e) => setConfig({ ...config, columns: Number(e.target.value) as any })}
                        className={styles.select}
                      >
                        <option value="2">2 Columns</option>
                        <option value="3">3 Columns</option>
                        <option value="4">4 Columns</option>
                        <option value="5">5 Columns</option>
                        <option value="6">6 Columns</option>
                      </select>
                    </div>
                  </div>

                  {/* Styling Options */}
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>🎨</span>
                      Styling Options
                    </h3>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Background Color
                        <span className={styles.labelHint}>Gallery background color</span>
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
                        <span className={styles.labelHint}>Title and text color</span>
                      </label>
                      <input
                        type="color"
                        value={config.textColor || '#000000'}
                        onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                        className={styles.textInput}
                        style={{ height: '50px', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Images */}
                  <div className={styles.section}>
                    <div className={styles.formGroup}>
                      <h3 className={styles.sectionTitle}>
                        <span className={styles.sectionIcon}>🖼️</span>
                        Images ({config.images.length})
                      </h3>
                      <button
                        onClick={openMediaModal}
                        className={`${styles.button} ${styles.primaryButton}`}
                      >
                        + Add Images
                      </button>
                    </div>

                    <div className={styles.imagesGrid}>
                      {config.images.map((image, index) => (
                        <div key={index} className={styles.imageCard}>
                          <div className={styles.imageCardHeader}>
                            <button
                              onClick={() => removeImage(index)}
                              className={`${styles.button} ${styles.dangerButton}`}
                            >
                              ×
                            </button>
                          </div>
                          {image.url && (
                            <img
                              src={image.url}
                              alt={image.alt}
                              className={styles.imagePreview}
                            />
                          )}
                          <div className={styles.imageInputs}>
                            <input
                              type="text"
                              placeholder="Alt text (optional)"
                              value={image.alt}
                              onChange={(e) => updateImage(index, 'alt', e.target.value)}
                              className={styles.textInput}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className={styles.formActions}>
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
                          {isNewSection ? 'Create Gallery Section' : 'Save Gallery Settings'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>🖼️</div>
          <h2 className={styles.emptyStateTitle}>
            Select a Restaurant
          </h2>
          <p className={styles.emptyStateDescription}>
            Please select a restaurant from the sidebar.
          </p>
        </div>
      )}

      {/* Media Library Modal */}
      {showMediaModal && (
        <div className={styles.modal} onClick={closeMediaModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Select Images from Media Library
              </h2>
              <button
                onClick={closeMediaModal}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
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
                  <h3 className={styles.emptyStateTitle}>No images found in media library</h3>
                  <p className={styles.emptyStateDescription}>
                    Upload images to your media library first, then they will appear here for selection.
                  </p>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem', textAlign: 'left' }}>
                    <p><strong>Debug Info:</strong></p>
                    <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                      <li>Restaurant ID: {restaurantId}</li>
                      <li>Check browser console for API details</li>
                      <li>Ensure images are uploaded to the medias table</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className={styles.mediaGrid}>
                  {mediaFiles.map((media) => {
                    console.log('[Gallery Settings] Rendering media:', {
                      id: media.id,
                      hasFile: !!media.file,
                      url: media.file?.url,
                      name: media.file?.name
                    });
                    return (
                      <div
                        key={media.id}
                        onClick={() => toggleMediaSelection(media.id)}
                        className={`${styles.mediaItem} ${selectedMedia.has(media.id) ? styles.selected : ''}`}
                      >
                        {media.file?.url ? (
                          <img
                            src={media.file.url}
                            alt={media.file.name || 'Image'}
                            className={styles.mediaImage}
                            onError={(e) => {
                              console.error('[Gallery Settings] Image failed to load:', media.file.url);
                              const target = e.target as HTMLImageElement;
                              
                              // Try alternative URLs if available
                              if (media.file.urlWithAuth && target.src !== media.file.urlWithAuth) {
                                target.src = media.file.urlWithAuth;
                                return;
                              }
                              
                              if (media.file.directUrl && target.src !== media.file.directUrl) {
                                target.src = media.file.directUrl;
                                return;
                              }
                              
                              // If all URLs fail, show error placeholder
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.error-placeholder')) {
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'error-placeholder';
                                errorDiv.style.cssText = `
                                  width: 100%;
                                  height: 100%;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  color: #9ca3af;
                                  font-size: 0.75rem;
                                  background: #f3f4f6;
                                  flex-direction: column;
                                  gap: 0.25rem;
                                `;
                                errorDiv.innerHTML = `
                                  <div>🖼️</div>
                                  <div>Failed to load</div>
                                  <div style="font-size: 0.6rem; opacity: 0.7;">${media.file.name || 'Unknown'}</div>
                                `;
                                parent.appendChild(errorDiv);
                              }
                            }}
                            onLoad={() => {
                              console.log('[Gallery Settings] Image loaded successfully:', media.file.url);
                            }}
                          />
                        ) : (
                          <div className={styles.mediaPlaceholder}>
                            <div>📁</div>
                            <div>No URL</div>
                          </div>
                        )}
                        {selectedMedia.has(media.id) && (
                          <div className={styles.mediaCheckmark}>
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter} style={{ justifyContent: 'space-between' }}>
              {/* Left side - Upload button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="media-file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="media-file-upload"
                  className={`${styles.button} ${styles.secondaryButton}`}
                  style={{
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {uploading ? (
                    <>
                      <span className={styles.spinner}></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      📤 Upload Images
                    </>
                  )}
                </label>
              </div>

              {/* Right side - Action buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={closeMediaModal}
                  className={`${styles.button} ${styles.secondaryButton}`}
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedMedia}
                  disabled={selectedMedia.size === 0}
                  className={`${styles.button} ${styles.primaryButton}`}
                >
                  Add Selected ({selectedMedia.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className={styles.modal} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1400px' }}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Gallery Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <Gallery {...config} />
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                onClick={() => setShowPreview(false)}
                className={`${styles.button} ${styles.secondaryButton}`}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
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
