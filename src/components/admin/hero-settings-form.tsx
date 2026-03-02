/**
 * Hero Settings Form
 *
 * Enhanced interface for configuring hero section settings:
 * - Layout selection (10 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Feature cards management
 * - Live preview on the right side
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Hero from '@/components/hero';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import { useHeroConfig, useUpdateHeroConfig } from '@/hooks/use-hero-config';
import type { HeroConfig, HeroButton, HeroFeature } from '@/types/hero.types';
import styles from './hero-settings-form.module.css';

type MediaFieldType = 'hero_image' | 'background_video' | 'background_image';

interface HeroSettingsFormProps {
  pageId?: string;
  isNewSection?: boolean;
}

export default function HeroSettingsForm({ pageId, isNewSection }: HeroSettingsFormProps) {
  const router = useRouter();
  const { config, loading, error: fetchError, refetch } = useHeroConfig({ fetchOnMount: !isNewSection });
  const { updateHero, updating, error: updateError } = useUpdateHeroConfig();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state - initialize from config when loaded
  const [formConfig, setFormConfig] = useState<HeroConfig | null>(null);

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<MediaFieldType | null>(null);

  // Get restaurant ID and other params from URL
  const searchParams = new URLSearchParams(window.location.search);
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

  // Layout options
  const layoutOptions = [
    { value: 'default', name: 'Default', description: 'Standard centered content' },
    { value: 'centered-large', name: 'Centered Large', description: 'Large centered hero' },
    { value: 'split', name: 'Split', description: 'Text left, image right' },
    { value: 'split-reverse', name: 'Split Reverse', description: 'Image left, text right' },
    { value: 'minimal', name: 'Minimal', description: 'Minimalist centered text' },
    { value: 'video-background', name: 'Video Background', description: 'Full-screen video background' },
    { value: 'side-by-side', name: 'Side by Side', description: 'Two equal columns' },
    { value: 'offset', name: 'Offset', description: 'Offset text with image' },
    { value: 'full-height', name: 'Full Height', description: 'Full viewport height' },
    { value: 'with-features', name: 'With Features', description: 'Hero with feature cards' },
  ];

  // Initialize form config when config is loaded or for new sections
  useEffect(() => {
    if (isNewSection && !formConfig) {
      // For new sections, use default empty config
      setFormConfig({
        headline: '',
        subheadline: '',
        description: '',
        layout: 'centered-large',
        bgColor: '#ffffff',
        textColor: '#000000',
        textAlign: 'center',
        paddingTop: '6rem',
        paddingBottom: '6rem',
        minHeight: '600px',
        showScrollIndicator: false,
        contentMaxWidth: '1200px',
      });
    } else if (config && !formConfig) {
      setFormConfig(config);
    }
  }, [config, formConfig, isNewSection]);

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

      // Add new_section flag to indicate this should be inserted, not replaced
      if (isNewSection) {
        payload.new_section = true;
      }

      await updateHero(payload);

      setToastMessage('Hero settings saved successfully!');
      setToastType('success');
      setShowToast(true);

      // Navigate back to page settings after successful save
      setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        router.push(`/admin/page-settings?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to save hero config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<HeroConfig>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleLayoutChange = (newLayout: string) => {
    if (!formConfig) return;

    // Clear all media when layout changes
    setFormConfig(prev => prev ? {
      ...prev,
      layout: newLayout as any,
      image: undefined,
      backgroundImage: undefined,
      videoUrl: undefined,
    } : null);
  };

  const updatePrimaryButton = (updates: Partial<HeroButton>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      primaryButton: prev.primaryButton ? { ...prev.primaryButton, ...updates } : { label: '', href: '', ...updates }
    }) : null);
  };

  const updateSecondaryButton = (updates: Partial<HeroButton>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      secondaryButton: prev.secondaryButton ? { ...prev.secondaryButton, ...updates } : { label: '', href: '', ...updates }
    }) : null);
  };

  const addFeature = () => {
    if (!formConfig) return;
    const newFeature: HeroFeature = {
      icon: '⭐',
      title: 'New Feature',
      description: 'Feature description'
    };
    setFormConfig(prev => prev ? ({
      ...prev,
      features: [...(prev.features || []), newFeature]
    }) : null);
  };

  const updateFeature = (index: number, updates: Partial<HeroFeature>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      features: prev.features?.map((feature, i) => 
        i === index ? { ...feature, ...updates } : feature
      ) || []
    }) : null);
  };

  const removeFeature = (index: number) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    }) : null);
  };

  const openGalleryModal = (fieldType: MediaFieldType) => {
    setCurrentMediaField(fieldType);
    setShowGalleryModal(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (!formConfig || !currentMediaField) return;

    switch (currentMediaField) {
      case 'hero_image':
        updateConfig({
          image: {
            url: imageUrl,
            alt: formConfig.image?.alt || 'Hero image'
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
      showHeroImage: false,
      showBackgroundVideo: false,
      showBackgroundImage: false,
    };

    switch (layout) {
      case 'split':
      case 'split-reverse':
      case 'side-by-side':
      case 'offset':
      case 'with-features':
        // These layouts use a hero image
        fields.showHeroImage = true;
        break;

      case 'video-background':
        // This layout uses background video
        fields.showBackgroundVideo = true;
        break;

      case 'minimal':
      case 'full-height':
        // These layouts use background image
        fields.showBackgroundImage = true;
        break;

      case 'default':
      case 'centered-large':
        // Default and centered-large layouts use only background image, no hero image
        fields.showBackgroundImage = true;
        break;

      default:
        // Other layouts can use both hero image and background image
        fields.showHeroImage = true;
        fields.showBackgroundImage = true;
        break;
    }

    return fields;
  };

  // Render layout preview with placeholder content
  const renderLayoutPreview = (layoutType: string) => {
    const previewStyle = {
      width: '100%',
      height: '60px',
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
      width: '40%',
      height: '20px',
      background: '#dee2e6',
      borderRadius: '2px',
      margin: '2px',
    };

    const imageBlock = {
      width: '30%',
      height: '35px',
      background: '#adb5bd',
      borderRadius: '2px',
      margin: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
    };

    switch (layoutType) {
      case 'split':
        return (
          <div style={previewStyle}>
            <div style={textBlock}></div>
            <div style={imageBlock}>📷</div>
          </div>
        );
      
      case 'split-reverse':
        return (
          <div style={previewStyle}>
            <div style={imageBlock}>📷</div>
            <div style={textBlock}></div>
          </div>
        );
      
      case 'video-background':
        return (
          <div style={{...previewStyle, background: '#343a40', color: '#fff'}}>
            <div style={{position: 'absolute', top: '2px', right: '2px', fontSize: '10px'}}>🎥</div>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.2)'}}></div>
          </div>
        );
      
      case 'side-by-side':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '45%'}}></div>
            <div style={{...imageBlock, width: '45%'}}>📷</div>
          </div>
        );
      
      case 'offset':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, position: 'absolute', left: '5px', top: '10px', width: '35%'}}></div>
            <div style={{...imageBlock, position: 'absolute', right: '5px', top: '15px', width: '40%'}}>📷</div>
          </div>
        );
      
      case 'with-features':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '60%', height: '15px'}}></div>
            <div style={{display: 'flex', gap: '2px', marginTop: '2px'}}>
              <div style={{width: '15px', height: '8px', background: '#ffc107', borderRadius: '1px'}}></div>
              <div style={{width: '15px', height: '8px', background: '#ffc107', borderRadius: '1px'}}></div>
              <div style={{width: '15px', height: '8px', background: '#ffc107', borderRadius: '1px'}}></div>
            </div>
          </div>
        );
      
      case 'minimal':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '50%', height: '12px'}}></div>
          </div>
        );
      
      case 'full-height':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff'}}>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.3)', width: '50%'}}></div>
            <div style={{position: 'absolute', bottom: '2px', right: '2px', fontSize: '8px'}}>⬇</div>
          </div>
        );
      
      case 'centered-large':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '70%', height: '25px'}}></div>
          </div>
        );
      
      case 'default':
      default:
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '60%', height: '18px'}}></div>
          </div>
        );
    }
  };

  // Render full-size placeholder preview for modal
  const renderFullLayoutPreview = (layoutType: string) => {
    if (!formConfig) return null;

    const placeholderStyles = {
      container: {
        width: '100%',
        minHeight: '400px',
        background: formConfig.bgColor || '#ffffff',
        color: formConfig.textColor || '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        position: 'relative' as const,
        overflow: 'hidden' as const,
      },
      headline: {
        fontSize: '2.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        background: '#e2e8f0',
        height: '3rem',
        borderRadius: '8px',
      },
      subheadline: {
        fontSize: '1.25rem',
        marginBottom: '1rem',
        background: '#e2e8f0',
        height: '1.5rem',
        borderRadius: '6px',
      },
      description: {
        fontSize: '1rem',
        marginBottom: '2rem',
        background: '#e2e8f0',
        height: '4rem',
        borderRadius: '6px',
      },
      button: {
        padding: '0.75rem 2rem',
        background: '#cbd5e1',
        borderRadius: '6px',
        marginRight: '1rem',
        display: 'inline-block',
        width: '150px',
        height: '3rem',
      },
      imageBox: {
        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '3rem',
        color: '#64748b',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
    };

    const hasContent = formConfig.headline || formConfig.subheadline || formConfig.description;

    // Show actual content if available, otherwise show placeholder
    if (hasContent) {
      return <Hero {...formConfig} />;
    }

    // Show placeholder layout preview
    switch (layoutType) {
      case 'split':
        return (
          <div style={{...placeholderStyles.container, flexDirection: 'row', gap: '3rem', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '300px'}}>
              <div style={{...placeholderStyles.headline, width: '80%'}} />
              <div style={{...placeholderStyles.subheadline, width: '70%'}} />
              <div style={{...placeholderStyles.description, width: '90%'}} />
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={placeholderStyles.button} />
                <div style={placeholderStyles.button} />
              </div>
            </div>
            <div style={{...placeholderStyles.imageBox, flex: 1, minWidth: '300px', minHeight: '300px'}}>
              📷
            </div>
          </div>
        );

      case 'split-reverse':
        return (
          <div style={{...placeholderStyles.container, flexDirection: 'row-reverse', gap: '3rem', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '300px'}}>
              <div style={{...placeholderStyles.headline, width: '80%'}} />
              <div style={{...placeholderStyles.subheadline, width: '70%'}} />
              <div style={{...placeholderStyles.description, width: '90%'}} />
              <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={placeholderStyles.button} />
                <div style={placeholderStyles.button} />
              </div>
            </div>
            <div style={{...placeholderStyles.imageBox, flex: 1, minWidth: '300px', minHeight: '300px'}}>
              📷
            </div>
          </div>
        );

      case 'video-background':
        return (
          <div style={{...placeholderStyles.container, background: 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))', color: '#fff', minHeight: '500px'}}>
            <div style={{position: 'absolute', top: '20px', right: '20px', fontSize: '2rem', opacity: 0.5}}>🎥 Video Background</div>
            <div style={{textAlign: 'center', maxWidth: '800px'}}>
              <div style={{...placeholderStyles.headline, background: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.subheadline, background: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.description, background: 'rgba(255,255,255,0.2)', margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={{...placeholderStyles.button, background: 'rgba(255,255,255,0.3)'}} />
                <div style={{...placeholderStyles.button, background: 'rgba(255,255,255,0.3)'}} />
              </div>
            </div>
          </div>
        );

      case 'side-by-side':
        return (
          <div style={{...placeholderStyles.container, gap: '2rem', flexWrap: 'wrap'}}>
            <div style={{flex: 1, minWidth: '300px'}}>
              <div style={{...placeholderStyles.headline, width: '90%'}} />
              <div style={{...placeholderStyles.description, width: '85%'}} />
              <div style={placeholderStyles.button} />
            </div>
            <div style={{...placeholderStyles.imageBox, flex: 1, minWidth: '300px', minHeight: '300px'}}>
              📷
            </div>
          </div>
        );

      case 'with-features':
        return (
          <div style={{...placeholderStyles.container, flexDirection: 'column'}}>
            <div style={{textAlign: 'center', marginBottom: '3rem', maxWidth: '800px', width: '100%'}}>
              <div style={{...placeholderStyles.headline, margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.description, margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={placeholderStyles.button} />
                <div style={placeholderStyles.button} />
              </div>
            </div>
            <div style={{display: 'flex', gap: '2rem', width: '100%', maxWidth: '1000px', flexWrap: 'wrap'}}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{flex: 1, minWidth: '200px', background: '#fef3c7', padding: '2rem', borderRadius: '12px', textAlign: 'center'}}>
                  <div style={{fontSize: '2rem', marginBottom: '1rem'}}>✨</div>
                  <div style={{background: '#fbbf24', height: '1.5rem', borderRadius: '4px', marginBottom: '0.5rem'}} />
                  <div style={{background: '#fbbf24', height: '3rem', borderRadius: '4px', opacity: 0.6}} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div style={{...placeholderStyles.container, minHeight: '300px'}}>
            <div style={{textAlign: 'center', maxWidth: '600px', width: '100%'}}>
              <div style={{...placeholderStyles.headline, width: '80%', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.subheadline, width: '60%', margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={placeholderStyles.button} />
              </div>
            </div>
          </div>
        );

      case 'full-height':
        return (
          <div style={{...placeholderStyles.container, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', minHeight: '600px'}}>
            <div style={{textAlign: 'center', maxWidth: '800px', width: '100%'}}>
              <div style={{...placeholderStyles.headline, background: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.subheadline, background: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.description, background: 'rgba(255,255,255,0.2)', margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={{...placeholderStyles.button, background: 'rgba(255,255,255,0.3)'}} />
              </div>
            </div>
            <div style={{position: 'absolute', bottom: '30px', fontSize: '2rem'}}>⬇ Scroll Down</div>
          </div>
        );

      case 'offset':
        return (
          <div style={{...placeholderStyles.container, position: 'relative', minHeight: '450px'}}>
            <div style={{position: 'absolute', left: '5%', top: '15%', zIndex: 2, maxWidth: '45%', minWidth: '280px'}}>
              <div style={{...placeholderStyles.headline, width: '90%'}} />
              <div style={{...placeholderStyles.subheadline, width: '80%'}} />
              <div style={{...placeholderStyles.description, width: '85%'}} />
              <div style={placeholderStyles.button} />
            </div>
            <div style={{...placeholderStyles.imageBox, position: 'absolute', right: '5%', top: '25%', width: '45%', minWidth: '280px', height: '280px'}}>
              📷
            </div>
          </div>
        );

      case 'centered-large':
        return (
          <div style={{...placeholderStyles.container, minHeight: '500px'}}>
            <div style={{textAlign: 'center', maxWidth: '900px', width: '100%'}}>
              <div style={{...placeholderStyles.headline, height: '4rem', margin: '0 auto 1.5rem'}} />
              <div style={{...placeholderStyles.subheadline, width: '70%', margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.description, width: '85%', margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={placeholderStyles.button} />
                <div style={placeholderStyles.button} />
              </div>
            </div>
          </div>
        );

      case 'default':
      default:
        return (
          <div style={{...placeholderStyles.container}}>
            <div style={{textAlign: 'center', maxWidth: '700px', width: '100%'}}>
              <div style={{...placeholderStyles.headline, margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.subheadline, margin: '0 auto 1rem'}} />
              <div style={{...placeholderStyles.description, margin: '0 auto 2rem'}} />
              <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={placeholderStyles.button} />
                <div style={placeholderStyles.button} />
              </div>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading hero settings...</div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Initializing...</div>
      </div>
    );
  }

  const error = fetchError || updateError;

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
        {/* Settings Form - Left Side */}
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <div>
              <h1 className={styles.formTitle}>Hero Section Settings</h1>
              <p className={styles.formSubtitle}>Customize your website hero section</p>
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

          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠</span>
              <span>{error}</span>
            </div>
          )}

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
                  <span className={styles.labelHint}>Choose a hero layout style</span>
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
                  <span className={styles.labelHint}>Main hero headline</span>
                </label>
                <input
                  type="text"
                  value={formConfig.headline}
                  onChange={(e) => updateConfig({ headline: e.target.value })}
                  className={styles.textInput}
                  placeholder="Welcome to Our Restaurant"
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
                  placeholder="Experience culinary excellence"
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
                  placeholder="Discover exceptional dining with fresh ingredients and innovative flavors"
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
                        updateConfig({ primaryButton: { label: 'View Menu', href: '#menu', variant: 'primary' } });
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
                      placeholder="View Menu"
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
                      placeholder="#menu"
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

              {/* Secondary Button */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Secondary Button
                  <span className={styles.labelHint}>Optional second button</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={!!formConfig.secondaryButton}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig({ secondaryButton: { label: 'Book a Table', href: '#reservations', variant: 'outline' } });
                      } else {
                        updateConfig({ secondaryButton: undefined });
                      }
                    }}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>

              {formConfig.secondaryButton && (
                <div className={styles.buttonConfigSection}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Text
                      <span className={styles.labelHint}>Button label</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.secondaryButton.label}
                      onChange={(e) => updateSecondaryButton({ label: e.target.value })}
                      className={styles.textInput}
                      placeholder="Book a Table"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Link
                      <span className={styles.labelHint}>Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.secondaryButton.href}
                      onChange={(e) => updateSecondaryButton({ href: e.target.value })}
                      className={styles.textInput}
                      placeholder="#reservations"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Button Style
                      <span className={styles.labelHint}>Visual style</span>
                    </label>
                    <select
                      value={formConfig.secondaryButton.variant || 'outline'}
                      onChange={(e) => updateSecondaryButton({ variant: e.target.value as any })}
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
                const mediaFields = getMediaFieldsForLayout(formConfig.layout || 'default');

                return (
                  <>
                    {/* Hero Image */}
                    {mediaFields.showHeroImage && (
                      <>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>
                            Hero Image
                            <span className={styles.labelHint}>Main hero image for your section</span>
                          </label>
                          <div className={styles.mediaUploadContainer}>
                            {formConfig.image?.url ? (
                              <div className={styles.mediaPreview}>
                                <img
                                  src={formConfig.image.url}
                                  alt={formConfig.image.alt || 'Hero image'}
                                  className={styles.mediaPreviewImage}
                                />
                                <div className={styles.mediaActions}>
                                  <button
                                    type="button"
                                    onClick={() => openGalleryModal('hero_image')}
                                    className={styles.changeMediaButton}
                                  >
                                    <svg style={{width: '18px', height: '18px', marginRight: '6px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Change Image
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateConfig({ image: undefined })}
                                    className={styles.removeMediaButton}
                                  >
                                    <svg style={{width: '18px', height: '18px', marginRight: '6px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openGalleryModal('hero_image')}
                                className={styles.uploadButton}
                                disabled={!restaurantId}
                              >
                                <svg style={{width: '64px', height: '64px', marginBottom: '12px', color: '#667eea'}} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span style={{fontSize: '1.125rem', fontWeight: '700', marginBottom: '6px'}}>Choose Hero Image</span>
                                <span style={{fontSize: '0.875rem', fontWeight: '400', opacity: '0.7'}}>Browse your media gallery or upload new</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {formConfig.image && (
                          <div className={styles.formGroup}>
                            <label className={styles.label}>
                              Image Alt Text
                              <span className={styles.labelHint}>Accessibility description</span>
                            </label>
                            <input
                              type="text"
                              value={formConfig.image.alt}
                              onChange={(e) => updateConfig({
                                image: formConfig.image ? { ...formConfig.image, alt: e.target.value } : undefined
                              })}
                              className={styles.textInput}
                              placeholder="Hero image description"
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Background Video */}
                    {mediaFields.showBackgroundVideo && (
                      <div className={styles.formGroup}>
                        <label className={styles.label}>
                          Background Video
                          <span className={styles.labelHint}>Video background for your hero section</span>
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
                              Choose from Gallery
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
                          <span className={styles.labelHint}>Background image for your hero section</span>
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
                              Choose from Gallery
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
                  <span className={styles.labelHint}>Hero background color</span>
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
                  <button
                    type="button"
                    onClick={() => updateConfig({ bgColor: '#ffffff' })}
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
                  <button
                    type="button"
                    onClick={() => updateConfig({ textColor: '#000000' })}
                    className={styles.clearButton}
                    title="Reset to default"
                  >
                    ↺
                  </button>
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
                  <span className={styles.labelHint}>Hero section height</span>
                </label>
                <input
                  type="text"
                  value={formConfig.minHeight || '600px'}
                  onChange={(e) => updateConfig({ minHeight: e.target.value })}
                  className={styles.textInput}
                  placeholder="600px"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Show Scroll Indicator
                  <span className={styles.labelHint}>Animated scroll arrow</span>
                </label>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={formConfig.showScrollIndicator || false}
                    onChange={(e) => updateConfig({ showScrollIndicator: e.target.checked })}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>

            {/* Features Section */}
            {formConfig.layout === 'with-features' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}>⭐</span>
                  Feature Cards
                </h3>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Features
                    <span className={styles.labelHint}>Highlight key features</span>
                  </label>
                  <div className={styles.featuresContainer}>
                    {formConfig.features?.map((feature, index) => (
                      <div key={index} className={styles.featureCard}>
                        <div className={styles.featureInputs}>
                          <div className={styles.featureInputRow}>
                            <input
                              type="text"
                              value={feature.icon || ''}
                              onChange={(e) => updateFeature(index, { icon: e.target.value })}
                              className={styles.featureInput}
                              placeholder="🍽️"
                              style={{ width: '60px' }}
                            />
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) => updateFeature(index, { title: e.target.value })}
                              className={styles.featureInput}
                              placeholder="Feature Title"
                            />
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className={styles.removeFeatureButton}
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={feature.description || ''}
                            onChange={(e) => updateFeature(index, { description: e.target.value })}
                            className={styles.featureInput}
                            placeholder="Feature description"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addFeature}
                      className={styles.addFeatureButton}
                    >
                      <span>+</span>
                      Add Feature
                    </button>
                  </div>
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
                    Save Hero Settings
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
                  {renderFullLayoutPreview(formConfig.layout || 'default')}
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                {formConfig.headline || formConfig.subheadline || formConfig.description
                  ? 'Preview shows how your hero section will appear on the website'
                  : 'Placeholder layout preview - Add content to see actual preview'}
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
          currentMediaField === 'hero_image'
            ? 'Select Hero Image'
            : currentMediaField === 'background_video'
            ? 'Select Background Video'
            : 'Select Background Image'
        }
        description="Choose from your media library or upload new"
      />
    </div>
  );
}