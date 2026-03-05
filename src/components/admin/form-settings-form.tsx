/**
 * Form Settings Form
 *
 * Interface for configuring form display settings:
 * - Form selection from available forms
 * - Layout selection (multiple display layouts)
 * - Content configuration (title, subtitle, description)
 * - Styling options (background color, text color)
 * - Live preview
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';
import styles from './hero-settings-form.module.css';
import galleryStyles from './gallery-settings-form.module.css';

interface Form {
  form_id: string;
  title: string;
  email: string;
  fields: any[];
  created_at: string;
}

interface FormSettingsConfig {
  form_id: string;
  layout: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  imageUrl?: string;
  showImage: boolean;
  imagePosition: 'left' | 'right' | 'top' | 'background';
  isEnabled: boolean;
}

interface FormSettingsFormProps {
  pageId?: string;
  restaurantId: string;
}

export default function FormSettingsForm({ pageId, restaurantId }: FormSettingsFormProps) {
  const searchParams = useSearchParams();

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Available forms
  const [forms, setForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);

  // Form state
  const [config, setConfig] = useState<FormSettingsConfig>({
    form_id: '',
    layout: 'centered',
    title: 'Get in Touch',
    subtitle: 'We\'d love to hear from you',
    description: 'Fill out the form below and we\'ll get back to you as soon as possible.',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    showImage: false,
    imagePosition: 'right',
    isEnabled: true,
  });

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  
  // Image gallery state
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [availableImages, setAvailableImages] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Layout options with descriptions
  const layoutOptions = [
    {
      value: 'centered',
      name: 'Centered',
      description: 'Title, subtitle, and form centered on page',
      icon: '📝',
    },
    {
      value: 'split-right',
      name: 'Split - Image Right',
      description: 'Form on left, image on right',
      icon: '↔️',
    },
    {
      value: 'split-left',
      name: 'Split - Image Left',
      description: 'Image on left, form on right',
      icon: '↔️',
    },
    {
      value: 'image-top',
      name: 'Image Top',
      description: 'Hero image above form',
      icon: '⬆️',
    },
    {
      value: 'background-image',
      name: 'Background Image',
      description: 'Form over background image',
      icon: '🖼️',
    },
    {
      value: 'card',
      name: 'Card Layout',
      description: 'Form in elevated card',
      icon: '🎴',
    },
    {
      value: 'two-column',
      name: 'Two Column',
      description: 'Content left, form right with divider',
      icon: '📑',
    },
    {
      value: 'minimal',
      name: 'Minimal',
      description: 'Clean minimal design',
      icon: '✨',
    },
  ];

  // Fetch available forms
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoadingForms(true);
        const response = await fetch(`/api/forms?restaurant_id=${restaurantId}`);
        const data = await response.json();

        if (data.success) {
          setForms(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching forms:', error);
        setToastMessage('Failed to load forms');
        setToastType('error');
        setShowToast(true);
      } finally {
        setLoadingForms(false);
      }
    };

    if (restaurantId) {
      fetchForms();
    }
  }, [restaurantId]);

  // Update selected form when form_id changes
  useEffect(() => {
    if (config.form_id && forms.length > 0) {
      const form = forms.find((f) => f.form_id === config.form_id);
      setSelectedForm(form || null);
    } else {
      setSelectedForm(null);
    }
  }, [config.form_id, forms]);

  // Load existing configuration
  useEffect(() => {
    // Skip fetching if this is a new section
    if (isNewSection) {
      return;
    }

    const fetchConfig = async () => {
      try {
        const params = new URLSearchParams({
          restaurant_id: restaurantId,
        });

        // Add template_id or page_id
        if (templateId) {
          params.append('template_id', templateId);
        } else if (pageId) {
          params.append('page_id', pageId);
        }

        const response = await fetch(`/api/form-settings?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig({
            ...config,
            ...data.data,
          });
        }
      } catch (error) {
        console.error('Error loading form settings:', error);
      }
    };

    if (restaurantId) {
      fetchConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, pageId, templateId, isNewSection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config.form_id) {
      setToastMessage('Please select a form');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const response = await fetch('/api/form-settings', {
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
        setToastMessage(
          isNewSection
            ? 'Form section created successfully!'
            : 'Form settings saved successfully!'
        );
        setToastType('success');
        setShowToast(true);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('Failed to save form settings:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<FormSettingsConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data) {
        // The API returns the URL at data.data.file.url
        const imageUrl = data.data.file?.url || data.data.url;
        updateConfig({ imageUrl });
        setToastMessage('Image uploaded successfully!');
        setToastType('success');
        setShowToast(true);

        // Refresh the available images list to include the newly uploaded image
        await fetchAvailableImages();
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setToastMessage('Failed to upload image. Please try again.');
      setToastType('error');
      setShowToast(true);
    } finally {
      setUploadingImage(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  // Fetch available images
  const fetchAvailableImages = async () => {
    try {
      const response = await fetch(`/api/media?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        setAvailableImages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  // Load images when gallery is opened
  useEffect(() => {
    if (showImageGallery && availableImages.length === 0) {
      fetchAvailableImages();
    }
  }, [showImageGallery]);

  if (loadingForms) {
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
              <h1 className={styles.formTitle}>
                {isNewSection ? 'Add New Form Section' : 'Edit Form Display Settings'}
              </h1>
              <p className={styles.formSubtitle}>
                {isNewSection
                  ? 'Create a new form display section for this page'
                  : 'Configure how your form will be displayed on your website'
                }
              </p>
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

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Enable/Disable Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚡</span>
                Form Status
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Enable Form Display
                  <span className={styles.labelHint}>Turn form display on or off</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={config.isEnabled}
                    onChange={(e) => updateConfig({ isEnabled: e.target.checked })}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>

            {/* Form Selection */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📋</span>
                Form Selection
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Choose Form
                  <span className={styles.labelHint}>Select which form to display</span>
                </label>
                {forms.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No forms available.</p>
                    <a
                      href={`/admin/forms/builder?restaurant_id=${restaurantId}`}
                      className={styles.link}
                    >
                      Create your first form →
                    </a>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    maxWidth: '100%'
                  }}>
                    {forms.map((form) => (
                      <div
                        key={form.form_id}
                        style={{
                          background: config.form_id === form.form_id ? '#eff6ff' : 'white',
                          border: config.form_id === form.form_id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          boxShadow: config.form_id === form.form_id ? '0 4px 12px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                        onClick={() => updateConfig({ form_id: form.form_id })}
                        onMouseEnter={(e) => {
                          if (config.form_id !== form.form_id) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (config.form_id !== form.form_id) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
                        <h3 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#111827',
                          margin: '0 0 0.25rem 0',
                          lineHeight: '1.2'
                        }}>
                          {form.title}
                        </h3>
                        <p style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          margin: '0'
                        }}>
                          {form.fields?.length || 0} fields
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Layout Selection */}
            {config.form_id && (
              <>
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🎨</span>
                    Layout Configuration
                  </h3>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Layout Type
                      <span className={styles.labelHint}>Choose a form layout style</span>
                    </label>
                    <div className={styles.layoutGrid}>
                      {layoutOptions.map((layout) => (
                        <div
                          key={layout.value}
                          className={`${styles.layoutOption} ${
                            config.layout === layout.value ? styles.selected : ''
                          }`}
                          onClick={() => updateConfig({ layout: layout.value })}
                        >
                          <div className={styles.layoutPreview}>
                            {/* Visual preview based on layout type */}
                            {layout.value === 'centered' && (
                              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                <div style={{ width: '80%', height: '3px', backgroundColor: '#3b82f6', borderRadius: '1px' }} />
                                <div style={{ width: '60%', height: '2px', backgroundColor: '#9ca3af', borderRadius: '1px' }} />
                                <div style={{ width: '100%', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                </div>
                              </div>
                            )}
                            {layout.value === 'split-right' && (
                              <div style={{ padding: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                  <div style={{ width: '80%', height: '2px', backgroundColor: '#3b82f6', borderRadius: '1px' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px', marginTop: '0.15rem' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                  📷
                                </div>
                              </div>
                            )}
                            {layout.value === 'split-left' && (
                              <div style={{ padding: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                <div style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                  📷
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                  <div style={{ width: '80%', height: '2px', backgroundColor: '#3b82f6', borderRadius: '1px' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px', marginTop: '0.15rem' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                </div>
                              </div>
                            )}
                            {layout.value === 'image-top' && (
                              <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ width: '100%', height: '20px', backgroundColor: '#f3f4f6', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                                  📷
                                </div>
                                <div style={{ width: '80%', height: '2px', backgroundColor: '#3b82f6', borderRadius: '1px', alignSelf: 'center' }} />
                                <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                              </div>
                            )}
                            {layout.value === 'background-image' && (
                              <div style={{ padding: '0.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f3f4f6', opacity: 0.3, borderRadius: '2px' }} />
                                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'center', padding: '0.5rem' }}>
                                  <div style={{ width: '80%', height: '3px', backgroundColor: '#3b82f6', borderRadius: '1px' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px', marginTop: '0.15rem' }} />
                                  <div style={{ width: '100%', height: '5px', backgroundColor: '#e5e7eb', borderRadius: '1px' }} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className={styles.layoutName}>{layout.name}</div>
                          <div className={styles.layoutDescription}>{layout.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Settings */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>📝</span>
                    Content Configuration
                  </h3>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Title
                      <span className={styles.labelHint}>Main form title</span>
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => updateConfig({ title: e.target.value })}
                      className={styles.textInput}
                      placeholder="Get in Touch"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Subtitle
                      <span className={styles.labelHint}>Optional subtitle</span>
                    </label>
                    <input
                      type="text"
                      value={config.subtitle}
                      onChange={(e) => updateConfig({ subtitle: e.target.value })}
                      className={styles.textInput}
                      placeholder="We'd love to hear from you"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Description
                      <span className={styles.labelHint}>Supporting description text</span>
                    </label>
                    <textarea
                      value={config.description}
                      onChange={(e) => updateConfig({ description: e.target.value })}
                      className={styles.textarea}
                      placeholder="Fill out the form below and we'll get back to you as soon as possible."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Image Settings */}
                {['split-right', 'split-left', 'image-top', 'background-image'].includes(
                  config.layout
                ) && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>
                      <span className={styles.sectionIcon}>🖼️</span>
                      Image Configuration
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '4px'
                      }}>
                        Required
                      </span>
                    </h3>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>
                        Form Image *
                        <span className={styles.labelHint}>Choose an image to display with your form (required for this layout)</span>
                      </label>
                      
                      {/* Image Preview */}
                      {config.imageUrl ? (
                        <div style={{
                          marginBottom: '1rem',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          position: 'relative',
                          maxWidth: '300px'
                        }}>
                          <img
                            src={config.imageUrl}
                            alt="Selected form image"
                            style={{
                              width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => updateConfig({ imageUrl: '' })}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove image"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{
                          marginBottom: '1rem',
                          border: '2px dashed #d1d5db',
                          borderRadius: '8px',
                          padding: '2rem',
                          textAlign: 'center',
                          backgroundColor: '#f9fafb',
                          maxWidth: '300px'
                        }}>
                          <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.5 }}>
                            📷
                          </div>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                            No image selected
                          </p>
                        </div>
                      )}

                      {/* Image Selection Button */}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setShowImageGallery(true)}
                          className={config.imageUrl ? styles.secondaryButton : styles.button}
                          style={{
                            fontSize: '0.875rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: config.imageUrl ? undefined : '#3b82f6',
                            color: config.imageUrl ? undefined : 'white',
                            border: config.imageUrl ? undefined : 'none'
                          }}
                        >
                          📁 {config.imageUrl ? 'Change Image' : 'Choose from Gallery'}
                        </button>
                        {!config.imageUrl && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            fontWeight: '500'
                          }}>
                            ⚠️ Image required for this layout
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* Styling */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <span className={styles.sectionIcon}>🎨</span>
                    Colors & Styling
                  </h3>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Background Color
                      <span className={styles.labelHint}>Form background color</span>
                    </label>
                    <div className={styles.colorInputGroup}>
                      <input
                        type="color"
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        className={styles.colorInput}
                      />
                      <input
                        type="text"
                        value={config.backgroundColor}
                        onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                        className={styles.colorHexInput}
                        placeholder="#ffffff"
                      />
                      <button
                        type="button"
                        onClick={() => updateConfig({ backgroundColor: '#ffffff' })}
                        className={styles.clearButton}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Text Color
                      <span className={styles.labelHint}>Text and title color</span>
                    </label>
                    <div className={styles.colorInputGroup}>
                      <input
                        type="color"
                        value={config.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        className={styles.colorInput}
                      />
                      <input
                        type="text"
                        value={config.textColor}
                        onChange={(e) => updateConfig({ textColor: e.target.value })}
                        className={styles.colorHexInput}
                        placeholder="#111827"
                      />
                      <button
                        type="button"
                        onClick={() => updateConfig({ textColor: '#111827' })}
                        className={styles.clearButton}
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.saveButton}
              >
                <span>💾</span>
                {isNewSection ? 'Create Form Section' : 'Save Form Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal Popup */}
      {showPreview && selectedForm && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h2 className={styles.previewModalTitle}>Form Preview</h2>
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
                <div className={styles.previewContainer}>
                  <div
                    style={{
                      backgroundColor: config.backgroundColor,
                      color: config.textColor,
                      padding: '2rem',
                      minHeight: '300px',
                    }}
                  >
                    {/* Render different layouts */}
                    {config.layout === 'split-right' ? (
                      // Split layout - Form left, Image right
                      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                              {config.title}
                            </h3>
                            {config.subtitle && (
                              <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem' }}>
                                {config.subtitle}
                              </p>
                            )}
                            {config.description && (
                              <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {config.description}
                              </p>
                            )}
                          </div>
                          {/* Form content */}
                          <form>
                            {selectedForm.fields && selectedForm.fields
                              .sort((a, b) => a.order - b.order)
                              .slice(0, 3) // Show only first 3 fields for preview
                              .map((field, index) => (
                                <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                    color: config.textColor
                                  }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              ))}
                            <button
                              type="submit"
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Submit
                            </button>
                          </form>
                        </div>
                        <div style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '200px',
                          fontSize: '3rem',
                          overflow: 'hidden'
                        }}>
                          {config.imageUrl ? (
                            <img
                              src={config.imageUrl}
                              alt="Form image"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            '📷'
                          )}
                        </div>
                      </div>
                    ) : config.layout === 'split-left' ? (
                      // Split layout - Image left, Form right
                      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                        <div style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '200px',
                          fontSize: '3rem',
                          overflow: 'hidden'
                        }}>
                          {config.imageUrl ? (
                            <img
                              src={config.imageUrl}
                              alt="Form image"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            '📷'
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                              {config.title}
                            </h3>
                            {config.subtitle && (
                              <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem' }}>
                                {config.subtitle}
                              </p>
                            )}
                            {config.description && (
                              <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {config.description}
                              </p>
                            )}
                          </div>
                          {/* Form content */}
                          <form>
                            {selectedForm.fields && selectedForm.fields
                              .sort((a, b) => a.order - b.order)
                              .slice(0, 3)
                              .map((field, index) => (
                                <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                    color: config.textColor
                                  }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              ))}
                            <button
                              type="submit"
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Submit
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : config.layout === 'image-top' ? (
                      // Image top layout
                      <div>
                        <div style={{
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '120px',
                          fontSize: '3rem',
                          marginBottom: '1.5rem',
                          overflow: 'hidden'
                        }}>
                          {config.imageUrl ? (
                            <img
                              src={config.imageUrl}
                              alt="Form image"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                minHeight: '120px'
                              }}
                            />
                          ) : (
                            '📷'
                          )}
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {config.title}
                          </h3>
                          {config.subtitle && (
                            <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem' }}>
                              {config.subtitle}
                            </p>
                          )}
                          {config.description && (
                            <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                              {config.description}
                            </p>
                          )}
                        </div>
                        <form style={{ maxWidth: '400px', margin: '0 auto' }}>
                          {selectedForm.fields && selectedForm.fields
                            .sort((a, b) => a.order - b.order)
                            .slice(0, 3)
                            .map((field, index) => (
                              <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                <label style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  marginBottom: '0.5rem',
                                  color: config.textColor
                                }}>
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  placeholder={field.placeholder || ''}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </div>
                            ))}
                          <button
                            type="submit"
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'block',
                              margin: '0 auto'
                            }}
                          >
                            Submit
                          </button>
                        </form>
                      </div>
                    ) : config.layout === 'background-image' ? (
                      // Background image layout
                      <div style={{
                        backgroundImage: config.imageUrl ? `url(${config.imageUrl})` : 'none',
                        backgroundColor: config.imageUrl ? 'transparent' : '#f3f4f6',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        minHeight: '400px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        borderRadius: '0.5rem',
                        overflow: 'hidden'
                      }}>
                        {/* Overlay for better text readability */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          zIndex: 0
                        }} />

                        <div style={{
                          position: 'relative',
                          zIndex: 1,
                          maxWidth: '500px',
                          width: '100%',
                          padding: '2rem',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          borderRadius: '1rem',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold', color: config.textColor }}>
                              {config.title}
                            </h3>
                            {config.subtitle && (
                              <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem', color: config.textColor }}>
                                {config.subtitle}
                              </p>
                            )}
                            {config.description && (
                              <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5, color: config.textColor }}>
                                {config.description}
                              </p>
                            )}
                          </div>
                          <form>
                            {selectedForm.fields && selectedForm.fields
                              .sort((a, b) => a.order - b.order)
                              .slice(0, 3)
                              .map((field, index) => (
                                <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                    color: config.textColor
                                  }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              ))}
                            <button
                              type="submit"
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              Submit
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : config.layout === 'card' ? (
                      // Card layout
                      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                        <div style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          padding: '2rem',
                          borderRadius: '1rem',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                              {config.title}
                            </h3>
                            {config.subtitle && (
                              <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem' }}>
                                {config.subtitle}
                              </p>
                            )}
                            {config.description && (
                              <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {config.description}
                              </p>
                            )}
                          </div>
                          <form>
                            {selectedForm.fields && selectedForm.fields
                              .sort((a, b) => a.order - b.order)
                              .slice(0, 3)
                              .map((field, index) => (
                                <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                  <label style={{
                                    display: 'block',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                    color: config.textColor
                                  }}>
                                    {field.label}
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.5rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>
                              ))}
                            <button
                              type="submit"
                              style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                width: '100%'
                              }}
                            >
                              Submit
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : (
                      // Default centered layout
                      <div className={styles.previewContent}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            {config.title}
                          </h3>
                          {config.subtitle && (
                            <p style={{ marginBottom: '0.5rem', opacity: 0.8, fontSize: '1.1rem' }}>
                              {config.subtitle}
                            </p>
                          )}
                          {config.description && (
                            <p style={{ marginBottom: '0', opacity: 0.7, fontSize: '0.9rem', lineHeight: 1.5 }}>
                              {config.description}
                            </p>
                          )}
                        </div>
                        
                        <form style={{ maxWidth: '500px', margin: '0 auto' }}>
                          {selectedForm.fields && selectedForm.fields
                            .sort((a, b) => a.order - b.order)
                            .slice(0, 4) // Show more fields for centered layout
                            .map((field, index) => (
                              <div key={field.id || index} style={{ marginBottom: '1rem' }}>
                                <label style={{
                                  display: 'block',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  marginBottom: '0.5rem',
                                  color: config.textColor
                                }}>
                                  {field.label}
                                  {field.required && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
                                </label>
                                
                                {field.type === 'textarea' ? (
                                  <textarea
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      fontFamily: 'inherit',
                                      resize: 'vertical',
                                      minHeight: '80px',
                                      boxSizing: 'border-box'
                                    }}
                                    rows={3}
                                  />
                                ) : field.type === 'select' ? (
                                  <select style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: 'white',
                                    boxSizing: 'border-box'
                                  }}>
                                    <option value="">Select an option...</option>
                                    {field.options?.map((option: string, i: number) => (
                                      <option key={i} value={option}>{option}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={field.type}
                                    placeholder={field.placeholder || ''}
                                    style={{
                                      width: '100%',
                                      padding: '0.75rem',
                                      border: '1px solid #d1d5db',
                                      borderRadius: '0.375rem',
                                      fontSize: '0.875rem',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          
                          <button
                            type="submit"
                            style={{
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              padding: '0.75rem 1.5rem',
                              border: 'none',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              marginTop: '1rem',
                              display: 'block',
                              margin: '1rem auto 0'
                            }}
                          >
                            Submit Form
                          </button>
                        </form>
                      </div>
                    )}
                    
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      opacity: 0.7,
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: '0 0 0.25rem 0' }}>
                        <strong>Form:</strong> {selectedForm.title} ({selectedForm.fields?.length || 0} fields)
                      </p>
                      <p style={{ margin: '0' }}>
                        <strong>Layout:</strong> {layoutOptions.find((l) => l.value === config.layout)?.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your form section will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className={galleryStyles.modal} onClick={() => setShowImageGallery(false)}>
          <div className={galleryStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={galleryStyles.modalHeader}>
              <h2 className={galleryStyles.modalTitle}>
                Select Image from Media Library
              </h2>
              <button
                onClick={() => setShowImageGallery(false)}
                className={galleryStyles.modalCloseButton}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className={galleryStyles.modalBody}>
              {/* Upload Progress */}
              {uploadingImage && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>Uploading...</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #d1d5db',
                      borderTop: '2px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '0.875rem' }}>Uploading image...</span>
                  </div>
                </div>
              )}

              {availableImages.length === 0 ? (
                <div className={galleryStyles.emptyState}>
                  <div className={galleryStyles.emptyStateIcon}>📁</div>
                  <h3 className={galleryStyles.emptyStateTitle}>No images found in media library</h3>
                  <p className={galleryStyles.emptyStateDescription}>
                    Upload images to your media library first, then they will appear here for selection.
                  </p>
                </div>
              ) : (
                <div className={galleryStyles.mediaGrid}>
                  {availableImages.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => {
                        updateConfig({ imageUrl: media.file?.url || media.url });
                        setShowImageGallery(false);
                        setToastMessage('Image selected successfully!');
                        setToastType('success');
                        setShowToast(true);
                      }}
                      className={`${galleryStyles.mediaItem} ${config.imageUrl === (media.file?.url || media.url) ? galleryStyles.selected : ''}`}
                    >
                      {(media.file?.url || media.url) ? (
                        <img
                          src={media.file?.url || media.url}
                          alt={media.file?.name || media.name || 'Image'}
                          className={galleryStyles.mediaImage}
                          onError={(e) => {
                            console.error('Image failed to load:', media.file?.url || media.url);
                            const target = e.target as HTMLImageElement;
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
                                <div style="font-size: 0.6rem; opacity: 0.7;">${media.file?.name || media.name || 'Unknown'}</div>
                              `;
                              parent.appendChild(errorDiv);
                            }
                          }}
                        />
                      ) : (
                        <div className={galleryStyles.mediaPlaceholder}>
                          <div>📁</div>
                          <div>No URL</div>
                        </div>
                      )}
                      {config.imageUrl === (media.file?.url || media.url) && (
                        <div className={galleryStyles.mediaCheckmark}>
                          ✓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={galleryStyles.modalFooter} style={{ justifyContent: 'space-between' }}>
              {/* Left side - Upload button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="form-image-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="form-image-upload"
                  className={`${galleryStyles.button} ${galleryStyles.secondaryButton}`}
                  style={{
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    opacity: uploadingImage ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {uploadingImage ? (
                    <>
                      <span className={galleryStyles.spinner}></span>
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
                  onClick={() => setShowImageGallery(false)}
                  className={`${galleryStyles.button} ${galleryStyles.secondaryButton}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
