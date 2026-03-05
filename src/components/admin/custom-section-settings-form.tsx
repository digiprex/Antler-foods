/**
 * Custom Section Settings Form
 *
 * Enhanced interface for configuring custom content sections:
 * - Layout selection (32 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Live preview on the right side
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import styles from './gallery-settings-form.module.css';

// Type definitions
interface CustomSectionImage {
  url: string;
  alt: string;
}

interface CustomSectionButton {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

interface CustomSectionConfig {
  headline: string;
  subheadline?: string;
  description?: string;
  primaryButton?: CustomSectionButton;
  secondaryButton?: CustomSectionButton;
  image?: CustomSectionImage;
  videoUrl?: string;
  backgroundImage?: string;
  layout: 'layout-1' | 'layout-2' | 'layout-3' | 'layout-4' | 'layout-5' | 'layout-6' | 'layout-7' | 'layout-8' | 'layout-9' | 'layout-10' | 'layout-11' | 'layout-12' | 'layout-13' | 'layout-14' | 'layout-15' | 'layout-16' | 'layout-17' | 'layout-18' | 'layout-19' | 'layout-20' | 'layout-21' | 'layout-22' | 'layout-23' | 'layout-24' | 'layout-25' | 'layout-26' | 'layout-27' | 'layout-28' | 'layout-29' | 'layout-30' | 'layout-31' | 'layout-32';
  bgColor?: string;
  textColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  paddingTop?: string;
  paddingBottom?: string;
  minHeight?: string;
  contentMaxWidth?: string;
  restaurant_id?: string;
}

type MediaFieldType = 'section_image' | 'background_video' | 'background_image';

interface CustomSectionSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

export default function CustomSectionSettingsForm({ pageId, templateId, isNewSection }: CustomSectionSettingsFormProps) {
  const router = useRouter();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state
  const [formConfig, setFormConfig] = useState<CustomSectionConfig | null>(null);

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<MediaFieldType | null>(null);

  // Get restaurant ID and other params from URL
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter.</p>
      </div>
    );
  }

  // Layout options - 32 different layouts
  const layoutOptions = [
    { value: 'layout-1', name: 'Layout 1', description: 'Full-width image with overlay text' },
    { value: 'layout-2', name: 'Layout 2', description: 'Split image left, content right' },
    { value: 'layout-3', name: 'Layout 3', description: 'Video background with centered content' },
    { value: 'layout-4', name: 'Layout 4', description: 'Curved green background with image' },
    { value: 'layout-5', name: 'Layout 5', description: 'Circular image with green background' },
    { value: 'layout-6', name: 'Layout 6', description: 'Image right, content left' },
    { value: 'layout-7', name: 'Layout 7', description: 'Image left, content right with spacing' },
    { value: 'layout-8', name: 'Layout 8', description: 'Centered content with side images' },
    { value: 'layout-9', name: 'Layout 9', description: 'Large image with bottom content' },
    { value: 'layout-10', name: 'Layout 10', description: 'Content left, image right' },
    { value: 'layout-11', name: 'Layout 11', description: 'Two column split layout' },
    { value: 'layout-12', name: 'Layout 12', description: 'Image top, content bottom' },
    { value: 'layout-13', name: 'Layout 13', description: 'Content top, image bottom' },
    { value: 'layout-14', name: 'Layout 14', description: 'Centered with background image' },
    { value: 'layout-15', name: 'Layout 15', description: 'Side by side equal width' },
    { value: 'layout-16', name: 'Layout 16', description: 'Stacked vertical layout' },
    { value: 'layout-17', name: 'Layout 17', description: 'Asymmetric split layout' },
    { value: 'layout-18', name: 'Layout 18', description: 'Image with text overlay' },
    { value: 'layout-19', name: 'Layout 19', description: 'Grid style layout' },
    { value: 'layout-20', name: 'Layout 20', description: 'Diagonal split design' },
    { value: 'layout-21', name: 'Layout 21', description: 'Circular content frame' },
    { value: 'layout-22', name: 'Layout 22', description: 'Offset content blocks' },
    { value: 'layout-23', name: 'Layout 23', description: 'Wide content narrow image' },
    { value: 'layout-24', name: 'Layout 24', description: 'Narrow content wide image' },
    { value: 'layout-25', name: 'Layout 25', description: 'Triple column layout' },
    { value: 'layout-26', name: 'Layout 26', description: 'Magazine style layout' },
    { value: 'layout-27', name: 'Layout 27', description: 'Layered content design' },
    { value: 'layout-28', name: 'Layout 28', description: 'Floating card layout' },
    { value: 'layout-29', name: 'Layout 29', description: 'Banner style layout' },
    { value: 'layout-30', name: 'Layout 30', description: 'Compact hero layout' },
    { value: 'layout-31', name: 'Layout 31', description: 'Extended hero layout' },
    { value: 'layout-32', name: 'Layout 32', description: 'Custom flexible layout' },
  ];

  // Fetch existing config when editing, or initialize for new sections
  useEffect(() => {
    const fetchConfig = async () => {
      // For new sections, initialize with default config
      if (isNewSection && !formConfig) {
        setFormConfig({
          headline: '',
          subheadline: '',
          description: '',
          layout: 'layout-1',
          bgColor: '#ffffff',
          textColor: '#000000',
          textAlign: 'center',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          minHeight: '400px',
          contentMaxWidth: '1200px',
        });
        return;
      }

      // For editing existing sections, fetch the config
      if (!isNewSection && templateId && restaurantId && !formConfig) {
        try {
          const params = new URLSearchParams();
          params.append('restaurant_id', restaurantId);
          params.append('template_id', templateId);

          // TODO: Add API endpoint for fetching custom section config
          // const response = await fetch(`/api/custom-section-config?${params.toString()}`);
          // const data = await response.json();
          // if (data.success && data.data) {
          //   setFormConfig(data.data);
          // }
        } catch (error) {
          console.error('Error fetching custom section config:', error);
        }
      }
    };

    fetchConfig();
  }, [formConfig, isNewSection, templateId, restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formConfig) return;

    try {
      const payload: any = {
        ...formConfig,
        restaurant_id: restaurantId,
      };

      // Add page_id if available
      if (pageId) {
        payload.page_id = pageId;
      }

      // Add template_id if available (for editing existing sections)
      if (templateId) {
        payload.template_id = templateId;
      }

      // Add new_section flag to indicate this should be inserted, not replaced
      if (isNewSection) {
        payload.new_section = true;
      }

      // TODO: Implement API call to save custom section config
      console.log('Saving custom section config:', payload);

      setToastMessage('Custom section settings saved successfully!');
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
    } catch (err) {
      console.error('Failed to save custom section config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<CustomSectionConfig>) => {
    if (!formConfig) return;
    setFormConfig((prev: CustomSectionConfig | null) => prev ? { ...prev, ...updates } : null);
  };

  const handleLayoutChange = (newLayout: string) => {
    if (!formConfig) return;

    // Clear all media when layout changes
    setFormConfig((prev: CustomSectionConfig | null) => prev ? {
      ...prev,
      layout: newLayout as any,
      image: undefined,
      backgroundImage: undefined,
      videoUrl: undefined,
    } : null);
  };

  const updatePrimaryButton = (updates: Partial<CustomSectionButton>) => {
    if (!formConfig) return;
    setFormConfig((prev: CustomSectionConfig | null) => prev ? ({
      ...prev,
      primaryButton: prev.primaryButton ? { ...prev.primaryButton, ...updates } : { label: '', href: '', ...updates }
    }) : null);
  };

  const openGalleryModal = (fieldType: MediaFieldType) => {
    setCurrentMediaField(fieldType);
    setShowGalleryModal(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (!formConfig || !currentMediaField) return;

    switch (currentMediaField) {
      case 'section_image':
        updateConfig({
          image: {
            url: imageUrl,
            alt: formConfig.image?.alt || 'Section image'
          }
        });
        break;
      case 'background_video':
        updateConfig({ videoUrl: imageUrl });
        break;
      case 'background_image':
        updateConfig({ backgroundImage: imageUrl });
        break;
    }

    setShowGalleryModal(false);
    setCurrentMediaField(null);
  };

  // Determine which media fields to show based on layout
  const getMediaFieldsForLayout = (layout: string) => {
    const fields = {
      showSectionImage: false,
      showBackgroundVideo: false,
      showBackgroundImage: false,
    };

    switch (layout) {
      case 'layout-1':
      case 'layout-2':
      case 'layout-6':
      case 'layout-7':
      case 'layout-8':
      case 'layout-9':
        fields.showSectionImage = true;
        break;
      case 'layout-3':
        fields.showBackgroundVideo = true;
        break;
      case 'layout-4':
      case 'layout-5':
        fields.showSectionImage = true;
        fields.showBackgroundImage = true;
        break;
      default:
        fields.showSectionImage = true;
        break;
    }

    return fields;
  };

  // Render layout preview with placeholder content
  const renderLayoutPreview = (layoutType: string) => {
    const previewStyle = {
      width: '100%',
      height: '80px',
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '8px',
      color: '#6c757d',
      position: 'relative' as const,
      overflow: 'hidden' as const,
    };

    const textBlock = {
      width: '35%',
      height: '15px',
      background: '#dee2e6',
      borderRadius: '2px',
      margin: '2px',
    };

    const imageBlock = {
      width: '40%',
      height: '50px',
      background: '#adb5bd',
      borderRadius: '2px',
      margin: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
    };

    const buttonBlock = {
      width: '20%',
      height: '8px',
      background: '#dc3545',
      borderRadius: '2px',
      margin: '2px',
    };

    switch (layoutType) {
      case 'layout-1':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23adb5bd\'/%3E%3C/svg%3E")', backgroundSize: 'cover', color: '#fff', flexDirection: 'column'}}>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.8)', width: '60%'}}></div>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.6)', width: '40%'}}></div>
            <div style={{...buttonBlock, background: '#fff', width: '25%'}}></div>
          </div>
        );
      
      case 'layout-2':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '45%'}}>📷</div>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
              <div style={{...textBlock, width: '80%'}}></div>
              <div style={{...textBlock, width: '70%'}}></div>
              <div style={{...buttonBlock, width: '40%'}}></div>
            </div>
          </div>
        );
      
      case 'layout-3':
        return (
          <div style={{...previewStyle, background: '#343a40', color: '#fff'}}>
            <div style={{position: 'absolute', top: '2px', right: '2px', fontSize: '12px'}}>🎥</div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
              <div style={{...textBlock, background: 'rgba(255,255,255,0.3)', width: '50%'}}></div>
              <div style={{...textBlock, background: 'rgba(255,255,255,0.2)', width: '40%'}}></div>
              <div style={{...buttonBlock, background: 'rgba(255,255,255,0.4)', width: '30%'}}></div>
            </div>
          </div>
        );
      
      case 'layout-4':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px', width: '100%'}}>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px'}}>
                <div style={{...textBlock, background: 'rgba(255,255,255,0.9)', width: '70%'}}></div>
                <div style={{...textBlock, background: 'rgba(255,255,255,0.7)', width: '60%'}}></div>
                <div style={{...buttonBlock, background: '#fff', width: '40%'}}></div>
              </div>
              <div style={{...imageBlock, width: '40%', borderRadius: '8px'}}>📷</div>
            </div>
          </div>
        );
      
      case 'layout-5':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px', width: '100%'}}>
              <div style={{...imageBlock, width: '35%', borderRadius: '50%', height: '45px'}}>📷</div>
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px'}}>
                <div style={{...textBlock, background: 'rgba(255,255,255,0.9)', width: '80%'}}></div>
                <div style={{...textBlock, background: 'rgba(255,255,255,0.7)', width: '70%'}}></div>
                <div style={{...buttonBlock, background: '#fff', width: '50%'}}></div>
              </div>
            </div>
          </div>
        );
      
      case 'layout-6':
        return (
          <div style={previewStyle}>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
              <div style={{...textBlock, width: '80%'}}></div>
              <div style={{...textBlock, width: '70%'}}></div>
              <div style={{...buttonBlock, width: '40%'}}></div>
            </div>
            <div style={{...imageBlock, width: '45%'}}>📷</div>
          </div>
        );
      
      case 'layout-7':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '35%'}}>📷</div>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px'}}>
              <div style={{...textBlock, width: '90%'}}></div>
              <div style={{...textBlock, width: '80%'}}></div>
              <div style={{...buttonBlock, width: '50%'}}></div>
            </div>
          </div>
        );
      
      case 'layout-8':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '25%', height: '40px'}}>📷</div>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'}}>
              <div style={{...textBlock, width: '70%'}}></div>
              <div style={{...textBlock, width: '60%'}}></div>
              <div style={{...buttonBlock, width: '35%'}}></div>
            </div>
            <div style={{...imageBlock, width: '25%', height: '40px'}}>📷</div>
          </div>
        );
      
      case 'layout-9':
        return (
          <div style={{...previewStyle, flexDirection: 'column'}}>
            <div style={{...imageBlock, width: '90%', height: '35px', marginBottom: '4px'}}>📷</div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px'}}>
              <div style={{...textBlock, width: '70%'}}></div>
              <div style={{...textBlock, width: '60%'}}></div>
              <div style={{...buttonBlock, width: '30%'}}></div>
            </div>
          </div>
        );

      case 'layout-10':
      case 'layout-11':
      case 'layout-12':
      case 'layout-13':
      case 'layout-14':
      case 'layout-15':
      case 'layout-16':
      case 'layout-17':
      case 'layout-18':
      case 'layout-19':
      case 'layout-20':
      case 'layout-21':
      case 'layout-22':
      case 'layout-23':
      case 'layout-24':
      case 'layout-25':
      case 'layout-26':
      case 'layout-27':
      case 'layout-28':
      case 'layout-29':
      case 'layout-30':
      case 'layout-31':
      case 'layout-32':
        return (
          <div style={{...previewStyle, flexDirection: 'column', justifyContent: 'center'}}>
            <div style={{...textBlock, width: '70%', marginBottom: '4px'}}></div>
            <div style={{...imageBlock, width: '60%', height: '30px'}}>📷</div>
          </div>
        );

      default:
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '60%', height: '18px'}}></div>
          </div>
        );
    }
  };

  if (!formConfig) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Initializing...</div>
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
              <h1 className={styles.formTitle}>Custom Section Settings</h1>
              <p className={styles.formSubtitle}>Create custom content sections with multiple layout options</p>
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
            {/* Layout Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Layout Configuration
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Layout Type
                  <span className={styles.labelHint}>Choose a section layout style</span>
                </label>
                <div className={styles.layoutGrid}>
                  {layoutOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`${styles.layoutOption} ${formConfig.layout === option.value ? styles.selected : ''}`}
                      onClick={() => handleLayoutChange(option.value)}
                    >
                      <div className={styles.layoutPreview}>
                        {renderLayoutPreview(option.value)}
                      </div>
                      <div className={styles.layoutName}>{option.name}</div>
                      <div className={styles.layoutDescription}>{option.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Content Configuration
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Headline
                  <span className={styles.labelHint}>Main section headline</span>
                </label>
                <input
                  type="text"
                  value={formConfig.headline}
                  onChange={(e) => updateConfig({ headline: e.target.value })}
                  className={styles.textInput}
                  placeholder="BESTELLEN SIE DIREKT AUF UNSERER WEBSITE"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Subheadline
                  <span className={styles.labelHint}>Optional subheadline</span>
                </label>
                <input
                  type="text"
                  value={formConfig.subheadline || ''}
                  onChange={(e) => updateConfig({ subheadline: e.target.value })}
                  className={styles.textInput}
                  placeholder="Experience our premium service"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Description
                  <span className={styles.labelHint}>Supporting description text</span>
                </label>
                <textarea
                  value={formConfig.description || ''}
                  onChange={(e) => updateConfig({ description: e.target.value })}
                  className={styles.textarea}
                  placeholder="Detailed description of your service or offering"
                  rows={3}
                />
              </div>
            </div>

            {/* Buttons Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🔘</span>
                Call-to-Action Buttons
              </h3>

              {/* Primary Button */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Primary Button
                  <span className={styles.labelHint}>Main action button</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={!!formConfig.primaryButton}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig({ primaryButton: { label: 'ONLINE BESTELLEN', href: '#order', variant: 'primary' } });
                      } else {
                        updateConfig({ primaryButton: undefined });
                      }
                    }}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {formConfig.primaryButton && (
                <div className={styles.buttonConfigSection}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Text
                      <span className={styles.labelHint}>Button label</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.primaryButton.label}
                      onChange={(e) => updatePrimaryButton({ label: e.target.value })}
                      className={styles.textInput}
                      placeholder="ONLINE BESTELLEN"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Link
                      <span className={styles.labelHint}>Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.primaryButton.href}
                      onChange={(e) => updatePrimaryButton({ href: e.target.value })}
                      className={styles.textInput}
                      placeholder="#order"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Style
                      <span className={styles.labelHint}>Visual style</span>
                    </label>
                    <select
                      value={formConfig.primaryButton.variant || 'primary'}
                      onChange={(e) => updatePrimaryButton({ variant: e.target.value as any })}
                      className={styles.select}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Media Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🖼️</span>
                Media Configuration
              </h3>

              {(() => {
                const mediaFields = getMediaFieldsForLayout(formConfig.layout || 'layout-1');

                return (
                  <>
                    {/* Section Image */}
                    {mediaFields.showSectionImage && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Section Image
                          <span className={styles.labelHint}>Main image for your section</span>
                        </label>
                        <div className={styles.mediaUploadContainer}>
                          {formConfig.image?.url ? (
                            <div className={styles.mediaPreview}>
                              <img
                                src={formConfig.image.url}
                                alt={formConfig.image.alt || 'Section image'}
                                className={styles.mediaPreviewImage}
                              />
                              <div className={styles.mediaActions}>
                                <button
                                  type="button"
                                  onClick={() => openGalleryModal('section_image')}
                                  className={styles.changeMediaButton}
                                >
                                  Change Image
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateConfig({ image: undefined })}
                                  className={styles.removeMediaButton}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openGalleryModal('section_image')}
                              className={styles.uploadButton}
                              disabled={!restaurantId}
                            >
                              <span className={styles.uploadIcon}>📷</span>
                              Choose Section Image
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Background Video */}
                    {mediaFields.showBackgroundVideo && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Background Video
                          <span className={styles.labelHint}>Video background for your section</span>
                        </label>
                        <div className={styles.mediaUploadContainer}>
                          {formConfig.videoUrl ? (
                            <div className={styles.mediaPreview}>
                              <video
                                src={formConfig.videoUrl}
                                className={styles.mediaPreviewImage}
                                muted
                                playsInline
                              />
                              <div className={styles.mediaActions}>
                                <button
                                  type="button"
                                  onClick={() => openGalleryModal('background_video')}
                                  className={styles.changeMediaButton}
                                >
                                  Change Video
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateConfig({ videoUrl: undefined })}
                                  className={styles.removeMediaButton}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openGalleryModal('background_video')}
                              className={styles.uploadButton}
                              disabled={!restaurantId}
                            >
                              <span className={styles.uploadIcon}>🎥</span>
                              Choose Background Video
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Background Image */}
                    {mediaFields.showBackgroundImage && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Background Image
                          <span className={styles.labelHint}>Background image for your section</span>
                        </label>
                        <div className={styles.mediaUploadContainer}>
                          {formConfig.backgroundImage ? (
                            <div className={styles.mediaPreview}>
                              <img
                                src={formConfig.backgroundImage}
                                alt="Background"
                                className={styles.mediaPreviewImage}
                              />
                              <div className={styles.mediaActions}>
                                <button
                                  type="button"
                                  onClick={() => openGalleryModal('background_image')}
                                  className={styles.changeMediaButton}
                                >
                                  Change Image
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateConfig({ backgroundImage: undefined })}
                                  className={styles.removeMediaButton}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openGalleryModal('background_image')}
                              className={styles.uploadButton}
                              disabled={!restaurantId}
                            >
                              <span className={styles.uploadIcon}>📁</span>
                              Choose Background Image
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Styling Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎨</span>
                Colors & Styling
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Background Color
                  <span className={styles.labelHint}>Section background color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={formConfig.bgColor || '#ffffff'}
                    onChange={(e) => updateConfig({ bgColor: e.target.value })}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={formConfig.bgColor || '#ffffff'}
                    onChange={(e) => updateConfig({ bgColor: e.target.value })}
                    className={styles.colorHexInput}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Color
                  <span className={styles.labelHint}>Text and headline color</span>
                </label>
                <div className={styles.colorInputGroup}>
                  <input
                    type="color"
                    value={formConfig.textColor || '#000000'}
                    onChange={(e) => updateConfig({ textColor: e.target.value })}
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={formConfig.textColor || '#000000'}
                    onChange={(e) => updateConfig({ textColor: e.target.value })}
                    className={styles.colorHexInput}
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Text Alignment
                  <span className={styles.labelHint}>Content alignment</span>
                </label>
                <select
                  value={formConfig.textAlign || 'center'}
                  onChange={(e) => updateConfig({ textAlign: e.target.value as any })}
                  className={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Minimum Height
                  <span className={styles.labelHint}>Section height</span>
                </label>
                <input
                  type="text"
                  value={formConfig.minHeight || '400px'}
                  onChange={(e) => updateConfig({ minHeight: e.target.value })}
                  className={styles.textInput}
                  placeholder="400px"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={false}
                className={styles.saveButton}
              >
                <span>💾</span>
                Save Custom Section Settings
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
              <h2 className={styles.previewModalTitle}>Live Preview</h2>
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
                  {/* TODO: Add CustomSection component preview */}
                  <div style={{
                    padding: '2rem',
                    background: formConfig.bgColor,
                    color: formConfig.textColor,
                    textAlign: formConfig.textAlign as any,
                    minHeight: formConfig.minHeight
                  }}>
                    <h2>{formConfig.headline || 'Custom Section Headline'}</h2>
                    {formConfig.subheadline && <h3>{formConfig.subheadline}</h3>}
                    {formConfig.description && <p>{formConfig.description}</p>}
                    {formConfig.primaryButton && (
                      <button style={{
                        padding: '0.75rem 1.5rem',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        marginTop: '1rem'
                      }}>
                        {formConfig.primaryButton.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your custom section will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showGalleryModal}
        onClose={() => {
          setShowGalleryModal(false);
          setCurrentMediaField(null);
        }}
        onSelect={handleSelectImage}
        restaurantId={restaurantId}
        title={
          currentMediaField === 'section_image'
            ? 'Select Section Image'
            : currentMediaField === 'background_video'
            ? 'Select Background Video'
            : 'Select Background Image'
        }
        description="Choose from your media library or upload new"
      />
    </div>
  );
}