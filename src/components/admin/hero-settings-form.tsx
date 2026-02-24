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
import Hero from '@/components/hero';
import Toast from '@/components/ui/toast';
import FileUpload from '@/components/ui/file-upload';
import { useHeroConfig, useUpdateHeroConfig } from '@/hooks/use-hero-config';
import type { HeroConfig, HeroButton, HeroFeature } from '@/types/hero.types';
import styles from './hero-settings-form.module.css';

interface MediaFile {
  id: string;
  file_id: string;
  url: string;
  name: string;
  type: string;
  size: number;
}

export default function HeroSettingsForm() {
  const { config, loading, error: fetchError, refetch } = useHeroConfig();
  const { updateHero, updating, error: updateError } = useUpdateHeroConfig();
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state - initialize from config when loaded
  const [formConfig, setFormConfig] = useState<HeroConfig | null>(null);
  
  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Static restaurant ID for testing
  const restaurantId = '92e9160e-0afa-4f78-824f-b28e32885353';

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

  // Initialize form config when config is loaded
  useEffect(() => {
    if (config && !formConfig) {
      setFormConfig(config);
    }
  }, [config, formConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formConfig) return;

    try {
      await updateHero({
        ...formConfig,
        restaurant_id: restaurantId,
      });
      
      setToastMessage('Hero settings saved successfully!');
      setToastType('success');
      setShowToast(true);
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
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => window.history.back()}
                aria-label="Close"
              >
                ✕
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
                      onClick={() => updateConfig({ layout: option.value as any })}
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

              <div className={styles.formGroup}>
                <FileUpload
                  accept="image"
                  currentUrl={formConfig.image?.url}
                  onUpload={(mediaFile: MediaFile) => {
                    updateConfig({
                      image: {
                        url: mediaFile.url,
                        alt: formConfig.image?.alt || 'Hero image'
                      }
                    });
                  }}
                  onRemove={() => updateConfig({ image: undefined })}
                  label="Hero Image"
                  description="Main hero image for your section"
                  restaurantId={restaurantId}
                />
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

              <div className={styles.formGroup}>
                <FileUpload
                  accept="video"
                  currentUrl={formConfig.videoUrl}
                  onUpload={(mediaFile: MediaFile) => {
                    updateConfig({ videoUrl: mediaFile.url });
                  }}
                  onRemove={() => updateConfig({ videoUrl: undefined })}
                  label="Background Video"
                  description="Video background for your hero section"
                  restaurantId={restaurantId}
                />
              </div>

              <div className={styles.formGroup}>
                <FileUpload
                  accept="image"
                  currentUrl={formConfig.backgroundImage}
                  onUpload={(mediaFile: MediaFile) => {
                    updateConfig({ backgroundImage: mediaFile.url });
                  }}
                  onRemove={() => updateConfig({ backgroundImage: undefined })}
                  label="Background Image"
                  description="Background image for your hero section"
                  restaurantId={restaurantId}
                />
              </div>
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
                  <Hero
                    key={`${formConfig.layout}-${formConfig.image?.url}-${formConfig.videoUrl}-${formConfig.backgroundImage}-${Date.now()}`}
                    {...formConfig}
                  />
                </div>
              </div>
              <p className={styles.previewNote}>
                <span className={styles.previewIcon}>👁</span>
                Preview shows how your hero section will appear on the website
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}