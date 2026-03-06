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
import { useRouter, useSearchParams } from 'next/navigation';
import Hero from '@/components/hero';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import { useHeroConfig, useUpdateHeroConfig } from '@/hooks/use-hero-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { HeroConfig, HeroButton, HeroFeature } from '@/types/hero.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';

type MediaFieldType = 'hero_image' | 'background_video' | 'background_image';

interface HeroSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

export default function HeroSettingsForm({ pageId, templateId, isNewSection }: HeroSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  const {
    config,
    loading,
    error: fetchError,
    refetch,
  } = useHeroConfig({
    fetchOnMount: !isNewSection,
    restaurantId,
    pageId,
    templateId,
  });
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
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

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
        ...sectionStyleDefaults,
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
      setFormConfig({ ...sectionStyleDefaults, ...config });
    }
  }, [config, formConfig, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setFormConfig((prev) =>
      prev
        ? {
            ...sectionStyleDefaults,
            ...prev,
          }
        : prev,
    );
  }, [sectionStyleDefaults]);

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
      } else if (templateId) {
        payload.template_id = templateId;
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
        router.replace(`/admin/page-settings?${params.toString()}`);
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading hero settings...</p>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Initializing...</p>
        </div>
      </div>
    );
  }

  const error = fetchError || updateError;

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hero Section Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Customize your website hero section</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
              <p className="text-sm text-gray-600">Choose a hero layout style</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {layoutOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleLayoutChange(option.value)}
                className={`group cursor-pointer rounded-lg border-2 p-3 transition-all ${
                  formConfig.layout === option.value
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="mb-2 overflow-hidden rounded border border-gray-200 bg-gray-50">
                  {renderLayoutPreview(option.value)}
                </div>
                <div className={`text-sm font-medium ${
                  formConfig.layout === option.value ? 'text-purple-700' : 'text-gray-900'
                }`}>
                  {option.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
              </div>
            ))}
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
              <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
              <p className="text-sm text-gray-600">Set headline, subheadline and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Headline</span>
                <span className="text-xs font-normal text-gray-500">Main hero headline</span>
              </label>
              <input
                type="text"
                value={formConfig.headline}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Welcome to Our Restaurant"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subheadline</span>
                <span className="text-xs font-normal text-gray-500">Optional subheadline</span>
              </label>
              <input
                type="text"
                value={formConfig.subheadline || ''}
                onChange={(e) => updateConfig({ subheadline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Experience culinary excellence"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">Supporting description text</span>
              </label>
              <textarea
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Discover exceptional dining with fresh ingredients and innovative flavors"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Features Section */}
        {formConfig.layout === 'with-features' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Feature Cards</h2>
                <p className="text-sm text-gray-600">Highlight key features of your service</p>
              </div>
            </div>

            <div className="space-y-3">
              {formConfig.features?.map((feature, index) => (
                <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={feature.icon || ''}
                      onChange={(e) => updateFeature(index, { icon: e.target.value })}
                      className="w-16 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="🍽️"
                    />
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, { title: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Feature Title"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={feature.description || ''}
                    onChange={(e) => updateFeature(index, { description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="Feature description"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addFeature}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Feature
              </button>
            </div>
          </div>
        )}

        {/* Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call-to-Action Buttons</h2>
              <p className="text-sm text-gray-600">Configure primary and secondary action buttons</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Button */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Button</label>
                  <p className="text-xs text-gray-500">Main action button</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
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
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>

              {formConfig.primaryButton && (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Text</span>
                      <span className="text-xs font-normal text-gray-500">Button label</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.primaryButton.label}
                      onChange={(e) => updatePrimaryButton({ label: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="View Menu"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Link</span>
                      <span className="text-xs font-normal text-gray-500">Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.primaryButton.href}
                      onChange={(e) => updatePrimaryButton({ href: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="#menu"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Style</span>
                      <span className="text-xs font-normal text-gray-500">Visual style</span>
                    </label>
                    <select
                      value={formConfig.primaryButton.variant || 'primary'}
                      onChange={(e) => updatePrimaryButton({ variant: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Button */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Secondary Button</label>
                  <p className="text-xs text-gray-500">Optional second button</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
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
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>

              {formConfig.secondaryButton && (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Text</span>
                      <span className="text-xs font-normal text-gray-500">Button label</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.secondaryButton.label}
                      onChange={(e) => updateSecondaryButton({ label: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Book a Table"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Link</span>
                      <span className="text-xs font-normal text-gray-500">Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={formConfig.secondaryButton.href}
                      onChange={(e) => updateSecondaryButton({ href: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="#reservations"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Style</span>
                      <span className="text-xs font-normal text-gray-500">Visual style</span>
                    </label>
                    <select
                      value={formConfig.secondaryButton.variant || 'outline'}
                      onChange={(e) => updateSecondaryButton({ variant: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Media Configuration</h2>
              <p className="text-sm text-gray-600">Add images and videos based on layout</p>
            </div>
          </div>

          {(() => {
            const mediaFields = getMediaFieldsForLayout(formConfig.layout || 'default');

            return (
              <div className="space-y-6">
                {/* Hero Image */}
                {mediaFields.showHeroImage && (
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Hero Image</span>
                      <span className="text-xs font-normal text-gray-500">Main hero image for your section</span>
                    </label>
                    {formConfig.image?.url ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={formConfig.image.url}
                          alt={formConfig.image.alt || 'Hero image'}
                          className="h-48 w-full object-cover"
                        />
                        <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                          <button
                            type="button"
                            onClick={() => openGalleryModal('hero_image')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConfig({ image: undefined })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Recommended: 1200x630px</p>
                        <button
                          type="button"
                          onClick={() => openGalleryModal('hero_image')}
                          disabled={!restaurantId}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          Choose Image from Gallery
                        </button>
                      </div>
                    )}

                    {formConfig.image && (
                      <div className="mt-3">
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Image Alt Text</span>
                          <span className="text-xs font-normal text-gray-500">Accessibility description</span>
                        </label>
                        <input
                          type="text"
                          value={formConfig.image.alt}
                          onChange={(e) => updateConfig({
                            image: formConfig.image ? { ...formConfig.image, alt: e.target.value } : undefined
                          })}
                          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder="Hero image description"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Background Video */}
                {mediaFields.showBackgroundVideo && (
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Background Video</span>
                      <span className="text-xs font-normal text-gray-500">Video background for your hero section</span>
                    </label>
                    {formConfig.videoUrl ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <video
                          src={formConfig.videoUrl}
                          className="h-48 w-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                          <button
                            type="button"
                            onClick={() => openGalleryModal('background_video')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                            </svg>
                            Change Video
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConfig({ videoUrl: undefined })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Recommended: MP4 format, max 10MB</p>
                        <button
                          type="button"
                          onClick={() => openGalleryModal('background_video')}
                          disabled={!restaurantId}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                          </svg>
                          Choose Video from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Background Image */}
                {mediaFields.showBackgroundImage && (
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Background Image</span>
                      <span className="text-xs font-normal text-gray-500">Background image for your hero section</span>
                    </label>
                    {formConfig.backgroundImage ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={formConfig.backgroundImage}
                          alt="Background"
                          className="h-48 w-full object-cover"
                        />
                        <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                          <button
                            type="button"
                            onClick={() => openGalleryModal('background_image')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConfig({ backgroundImage: undefined })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Recommended: 1200x630px</p>
                        <button
                          type="button"
                          onClick={() => openGalleryModal('background_image')}
                          disabled={!restaurantId}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          Choose Image from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
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
              <h2 className="text-lg font-semibold text-gray-900">Colors & Styling</h2>
              <p className="text-sm text-gray-600">Customize colors, alignment and dimensions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">Hero background color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => updateConfig({ bgColor: '#ffffff' })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Text Alignment</span>
                <span className="text-xs font-normal text-gray-500">Content alignment</span>
              </label>
              <select
                value={formConfig.textAlign || 'center'}
                onChange={(e) => updateConfig({ textAlign: e.target.value as any })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Minimum Height</span>
                <span className="text-xs font-normal text-gray-500">Hero section height</span>
              </label>
              <input
                type="text"
                value={formConfig.minHeight || '600px'}
                onChange={(e) => updateConfig({ minHeight: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="600px"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Show Scroll Indicator</label>
                  <p className="text-xs text-gray-500">Animated scroll arrow</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={formConfig.showScrollIndicator || false}
                    onChange={(e) => updateConfig({ showScrollIndicator: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Buttons Section */}
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
                  checked={formConfig.is_custom || false}
                  onChange={(e) => updateConfig({ is_custom: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!formConfig.is_custom ? (
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
                  value={formConfig}
                  onChange={(updates) => updateConfig(updates)}
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
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                Save Hero Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Live Preview</h2>
                <p className="mt-0.5 text-sm text-gray-600">Updates in real-time</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="bg-white">
                <Hero {...formConfig} restaurant_id={restaurantId} />
              </div>
              <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Live preview updates as you make changes
                </div>
              </div>
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
    </>
  );
}
