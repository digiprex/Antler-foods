/**
 * Menu Settings Form
 *
 * Enhanced interface for configuring menu section settings:
 * - Layout selection (10 different layouts)
 * - Content configuration (title, subtitle, description)
 * - Menu categories and items management
 * - Button configuration (CTA)
 * - Media settings (images, background)
 * - Styling options (colors, spacing, alignment)
 * - Display options (prices, images, descriptions)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import { useMenuConfig, useUpdateMenuConfig } from '@/hooks/use-menu-config';
import type { MenuConfig, MenuButton, MenuCategory, MenuItem } from '@/types/menu.types';
import styles from './menu-settings-form.module.css';

type MediaFieldType = 'header_image' | 'background_image';

interface MenuSettingsFormProps {
  pageId?: string;
  isNewSection?: boolean;
}

export default function MenuSettingsForm({ pageId, isNewSection }: MenuSettingsFormProps) {
  const router = useRouter();
  const { config, loading, error: fetchError, refetch } = useMenuConfig({ fetchOnMount: !isNewSection });
  const { updateMenu, updating, error: updateError } = useUpdateMenuConfig();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state
  const [formConfig, setFormConfig] = useState<MenuConfig | null>(null);

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<MediaFieldType | null>(null);

  // Get restaurant ID and other params from URL
  const searchParams = new URLSearchParams(window.location.search);
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  const pageName = searchParams.get('page_name') || '';

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
    { value: 'grid', name: 'Grid', description: 'Grid layout with cards' },
    { value: 'list', name: 'List', description: 'Simple list layout' },
    { value: 'masonry', name: 'Masonry', description: 'Pinterest-style masonry' },
    { value: 'carousel', name: 'Carousel', description: 'Carousel/slider layout' },
    { value: 'tabs', name: 'Tabs', description: 'Tabbed categories' },
    { value: 'accordion', name: 'Accordion', description: 'Collapsible categories' },
    { value: 'two-column', name: 'Two Column', description: 'Two-column layout' },
    { value: 'single-column', name: 'Single Column', description: 'Single column centered' },
    { value: 'featured-grid', name: 'Featured Grid', description: 'Featured items in grid' },
    { value: 'minimal', name: 'Minimal', description: 'Minimal text-only layout' },
  ];

  // Initialize form config when config is loaded or for new sections
  useEffect(() => {
    if (isNewSection && !formConfig) {
      // For new sections, use default empty config
      setFormConfig({
        title: '',
        subtitle: '',
        description: '',
        layout: 'grid',
        bgColor: '#ffffff',
        textColor: '#000000',
        accentColor: '#3b82f6',
        cardBgColor: '#f9fafb',
        textAlign: 'center',
        paddingTop: '4rem',
        paddingBottom: '4rem',
        columns: 3,
        showPrices: true,
        showImages: true,
        showDescriptions: true,
        showDietaryInfo: true,
        showCategoryIcons: false,
        categoryLayout: 'tabs',
        contentMaxWidth: '1200px',
        enableSearch: false,
        enableFilters: false,
        categories: [],
        featuredItems: [],
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

      await updateMenu(payload);

      setToastMessage('Menu settings saved successfully!');
      setToastType('success');
      setShowToast(true);

      // Navigate back to page settings after successful save
      setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        if (pageName) params.set('page_name', pageName);
        router.push(`/admin/page-settings?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to save menu config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<MenuConfig>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleLayoutChange = (newLayout: string) => {
    if (!formConfig) return;

    // Clear media when layout changes
    setFormConfig(prev => prev ? {
      ...prev,
      layout: newLayout as any,
      headerImage: undefined,
      backgroundImage: undefined,
    } : null);
  };

  const updateCtaButton = (updates: Partial<MenuButton>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      ctaButton: prev.ctaButton ? { ...prev.ctaButton, ...updates } : { label: '', href: '', ...updates }
    }) : null);
  };

  const addCategory = () => {
    if (!formConfig) return;
    const newCategory: MenuCategory = {
      name: 'New Category',
      description: '',
      items: [],
      icon: '🍽️',
    };
    setFormConfig(prev => prev ? ({
      ...prev,
      categories: [...(prev.categories || []), newCategory]
    }) : null);
  };

  const updateCategory = (index: number, updates: Partial<MenuCategory>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      categories: prev.categories?.map((cat, i) =>
        i === index ? { ...cat, ...updates } : cat
      )
    }) : null);
  };

  const removeCategory = (index: number) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      categories: prev.categories?.filter((_, i) => i !== index)
    }) : null);
  };

  const addItemToCategory = (categoryIndex: number) => {
    if (!formConfig) return;
    const newItem: MenuItem = {
      name: 'New Item',
      description: '',
      price: '0.00',
    };
    setFormConfig(prev => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]) {
        categories[categoryIndex] = {
          ...categories[categoryIndex],
          items: [...(categories[categoryIndex].items || []), newItem]
        };
      }
      return { ...prev, categories };
    });
  };

  const updateItem = (categoryIndex: number, itemIndex: number, updates: Partial<MenuItem>) => {
    if (!formConfig) return;
    setFormConfig(prev => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]?.items) {
        const items = [...categories[categoryIndex].items!];
        items[itemIndex] = { ...items[itemIndex], ...updates };
        categories[categoryIndex] = { ...categories[categoryIndex], items };
      }
      return { ...prev, categories };
    });
  };

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    if (!formConfig) return;
    setFormConfig(prev => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]?.items) {
        categories[categoryIndex] = {
          ...categories[categoryIndex],
          items: categories[categoryIndex].items!.filter((_, i) => i !== itemIndex)
        };
      }
      return { ...prev, categories };
    });
  };

  const handleMediaSelect = (imageUrl: string) => {
    if (!currentMediaField || !formConfig) return;

    switch (currentMediaField) {
      case 'header_image':
        updateConfig({ headerImage: imageUrl });
        break;
      case 'background_image':
        updateConfig({ backgroundImage: imageUrl });
        break;
    }

    setShowGalleryModal(false);
    setCurrentMediaField(null);
  };

  const openMediaGallery = (field: MediaFieldType) => {
    setCurrentMediaField(field);
    setShowGalleryModal(true);
  };

  const renderLayoutPreview = () => {
    if (!formConfig) return null;

    const { layout } = formConfig;

    // Wireframe previews for each layout
    const previews: Record<string, JSX.Element> = {
      grid: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
            <div className={styles.wireframeSubtitle}>Subtitle</div>
          </div>
          <div className={styles.wireframeGrid3}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={styles.wireframeCard}>
                <div className={styles.wireframeImage}></div>
                <div className={styles.wireframeCardContent}>
                  <div className={styles.wireframeText}></div>
                  <div className={styles.wireframeTextSmall}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      list: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeList}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={styles.wireframeListItem}>
                <div className={styles.wireframeText}></div>
                <div className={styles.wireframeTextSmall}></div>
                <div className={styles.wireframePrice}></div>
              </div>
            ))}
          </div>
        </div>
      ),
      masonry: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeMasonry}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={styles.wireframeMasonryCard} style={{ height: `${100 + (i % 3) * 50}px` }}>
                <div className={styles.wireframeImage} style={{ height: '60%' }}></div>
                <div className={styles.wireframeCardContent}>
                  <div className={styles.wireframeText}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      carousel: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeCarousel}>
            <div className={styles.wireframeCarouselArrow}>‹</div>
            <div className={styles.wireframeCard}>
              <div className={styles.wireframeImage}></div>
              <div className={styles.wireframeCardContent}>
                <div className={styles.wireframeText}></div>
                <div className={styles.wireframeTextSmall}></div>
              </div>
            </div>
            <div className={styles.wireframeCarouselArrow}>›</div>
          </div>
          <div className={styles.wireframeCarouselDots}>
            <div className={styles.wireframeDot}></div>
            <div className={styles.wireframeDot}></div>
            <div className={styles.wireframeDot}></div>
          </div>
        </div>
      ),
      tabs: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeTabs}>
            <div className={styles.wireframeTab}>Tab 1</div>
            <div className={styles.wireframeTab}>Tab 2</div>
            <div className={styles.wireframeTab}>Tab 3</div>
          </div>
          <div className={styles.wireframeGrid3}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.wireframeCard}>
                <div className={styles.wireframeImage}></div>
                <div className={styles.wireframeCardContent}>
                  <div className={styles.wireframeText}></div>
                  <div className={styles.wireframeTextSmall}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      accordion: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeAccordion}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.wireframeAccordionItem}>
                <div className={styles.wireframeAccordionHeader}>
                  <div className={styles.wireframeText}></div>
                  <div className={styles.wireframeIcon}>▼</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      'two-column': (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeGrid2}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.wireframeCard}>
                <div className={styles.wireframeImage}></div>
                <div className={styles.wireframeCardContent}>
                  <div className={styles.wireframeText}></div>
                  <div className={styles.wireframeTextSmall}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      'single-column': (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeSingleColumn}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.wireframeListItem}>
                <div className={styles.wireframeText}></div>
                <div className={styles.wireframeTextSmall}></div>
                <div className={styles.wireframePrice}></div>
              </div>
            ))}
          </div>
        </div>
      ),
      'featured-grid': (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Featured Items</div>
          </div>
          <div className={styles.wireframeGrid3}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.wireframeCard}>
                <div className={styles.wireframeImage}></div>
                <div className={styles.wireframeCardContent}>
                  <div className={styles.wireframeText}></div>
                  <div className={styles.wireframeTextSmall}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      minimal: (
        <div className={styles.wireframe}>
          <div className={styles.wireframeHeader}>
            <div className={styles.wireframeTitle}>Menu Title</div>
          </div>
          <div className={styles.wireframeMinimal}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={styles.wireframeMinimalItem}>
                <div className={styles.wireframeText}></div>
                <div className={styles.wireframePrice}></div>
              </div>
            ))}
          </div>
        </div>
      ),
    };

    return previews[layout || 'grid'] || previews.grid;
  };

  if (loading && !isNewSection) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading menu settings...</p>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <p>Failed to load menu configuration</p>
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

      {/* Preview Modal */}
      {showPreview && (
        <div className={styles.previewModal}>
          <div className={styles.previewModalOverlay} onClick={() => setShowPreview(false)} />
          <div className={styles.previewModalContent}>
            <div className={styles.previewModalHeader}>
              <h3 className={styles.previewModalTitle}>Layout Preview</h3>
              <div className={styles.previewModalActions}>
                <span className={styles.previewBadge}>Live Preview</span>
                <button
                  type="button"
                  className={styles.previewModalClose}
                  onClick={() => setShowPreview(false)}
                  title="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className={styles.previewModalBody}>
              <div className={styles.previewDevice}>
                <div className={styles.previewContainer}>
                  {renderLayoutPreview()}
                </div>
              </div>
              <p className={styles.previewNote}>
                This is a wireframe preview of the selected layout. Configure content and styling to see the full result.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Menu Settings</h2>
          <div className={styles.subtitle}>
            <span>Configure your menu section layout and content</span>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={styles.previewButton}
            >
              👁️ Preview Layout
            </button>
          </div>

          {/* Layout Selection */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Layout</h3>
            <div className={styles.layoutGrid}>
              {layoutOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.layoutCard} ${formConfig.layout === option.value ? styles.layoutCardActive : ''}`}
                  onClick={() => handleLayoutChange(option.value)}
                >
                  <div className={styles.layoutCardTitle}>{option.name}</div>
                  <div className={styles.layoutCardDescription}>{option.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Content Section */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Content</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={formConfig.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                placeholder="Our Menu"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Subtitle</label>
              <input
                type="text"
                className={styles.input}
                value={formConfig.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                placeholder="Discover our delicious offerings"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                placeholder="Explore our carefully curated selection of dishes"
                rows={3}
              />
            </div>
          </section>

          {/* CTA Button */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Call-to-Action Button</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Button Label</label>
              <input
                type="text"
                className={styles.input}
                value={formConfig.ctaButton?.label || ''}
                onChange={(e) => updateCtaButton({ label: e.target.value })}
                placeholder="View Full Menu"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Button Link</label>
              <input
                type="text"
                className={styles.input}
                value={formConfig.ctaButton?.href || ''}
                onChange={(e) => updateCtaButton({ href: e.target.value })}
                placeholder="#menu"
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Button Background Color</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.ctaButton?.bgColor || '#3b82f6'}
                  onChange={(e) => updateCtaButton({ bgColor: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Button Text Color</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.ctaButton?.textColor || '#ffffff'}
                  onChange={(e) => updateCtaButton({ textColor: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Media Settings */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Media</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>Header Image</label>
              {formConfig.headerImage ? (
                <div className={styles.mediaPreview}>
                  <img src={formConfig.headerImage} alt="Header" className={styles.previewImage} />
                  <div className={styles.mediaActions}>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => openMediaGallery('header_image')}
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      className={styles.buttonDanger}
                      onClick={() => updateConfig({ headerImage: undefined })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => openMediaGallery('header_image')}
                >
                  <span className={styles.uploadIcon}>📷</span>
                  <span>Upload Header Image</span>
                </button>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Background Image</label>
              {formConfig.backgroundImage ? (
                <div className={styles.mediaPreview}>
                  <img src={formConfig.backgroundImage} alt="Background" className={styles.previewImage} />
                  <div className={styles.mediaActions}>
                    <button
                      type="button"
                      className={styles.buttonSecondary}
                      onClick={() => openMediaGallery('background_image')}
                    >
                      Change Image
                    </button>
                    <button
                      type="button"
                      className={styles.buttonDanger}
                      onClick={() => updateConfig({ backgroundImage: undefined })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.uploadButton}
                  onClick={() => openMediaGallery('background_image')}
                >
                  <span className={styles.uploadIcon}>📷</span>
                  <span>Upload Background Image</span>
                </button>
              )}
            </div>
          </section>

          {/* Categories */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Menu Categories</h3>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={addCategory}
              >
                + Add Category
              </button>
            </div>

            {formConfig.categories && formConfig.categories.length > 0 ? (
              <div className={styles.categoriesList}>
                {formConfig.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className={styles.categoryCard}>
                    <div className={styles.categoryHeader}>
                      <input
                        type="text"
                        className={styles.input}
                        value={category.name}
                        onChange={(e) => updateCategory(categoryIndex, { name: e.target.value })}
                        placeholder="Category Name"
                      />
                      <button
                        type="button"
                        className={styles.buttonDanger}
                        onClick={() => removeCategory(categoryIndex)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Description</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={category.description || ''}
                        onChange={(e) => updateCategory(categoryIndex, { description: e.target.value })}
                        placeholder="Category description"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Icon (emoji)</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={category.icon || ''}
                        onChange={(e) => updateCategory(categoryIndex, { icon: e.target.value })}
                        placeholder="🍽️"
                      />
                    </div>

                    {/* Items in Category */}
                    <div className={styles.itemsSection}>
                      <div className={styles.itemsHeader}>
                        <span className={styles.itemsTitle}>Items</span>
                        <button
                          type="button"
                          className={styles.buttonSmall}
                          onClick={() => addItemToCategory(categoryIndex)}
                        >
                          + Add Item
                        </button>
                      </div>

                      {category.items && category.items.length > 0 ? (
                        <div className={styles.itemsList}>
                          {category.items.map((item, itemIndex) => (
                            <div key={itemIndex} className={styles.itemCard}>
                              <div className={styles.itemRow}>
                                <input
                                  type="text"
                                  className={styles.inputSmall}
                                  value={item.name}
                                  onChange={(e) => updateItem(categoryIndex, itemIndex, { name: e.target.value })}
                                  placeholder="Item name"
                                />
                                <input
                                  type="text"
                                  className={styles.inputSmall}
                                  value={item.price}
                                  onChange={(e) => updateItem(categoryIndex, itemIndex, { price: e.target.value })}
                                  placeholder="$0.00"
                                  style={{ width: '100px' }}
                                />
                                <button
                                  type="button"
                                  className={styles.buttonDanger}
                                  onClick={() => removeItem(categoryIndex, itemIndex)}
                                >
                                  ×
                                </button>
                              </div>
                              <textarea
                                className={styles.textareaSmall}
                                value={item.description || ''}
                                onChange={(e) => updateItem(categoryIndex, itemIndex, { description: e.target.value })}
                                placeholder="Item description"
                                rows={2}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.emptyText}>No items yet. Click "Add Item" to add one.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>No categories yet. Click "Add Category" to create one.</p>
            )}
          </section>

          {/* Display Options */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Display Options</h3>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formConfig.showPrices || false}
                  onChange={(e) => updateConfig({ showPrices: e.target.checked })}
                />
                <span>Show Prices</span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formConfig.showImages || false}
                  onChange={(e) => updateConfig({ showImages: e.target.checked })}
                />
                <span>Show Images</span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formConfig.showDescriptions || false}
                  onChange={(e) => updateConfig({ showDescriptions: e.target.checked })}
                />
                <span>Show Descriptions</span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formConfig.showDietaryInfo || false}
                  onChange={(e) => updateConfig({ showDietaryInfo: e.target.checked })}
                />
                <span>Show Dietary Info</span>
              </label>

              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={formConfig.showCategoryIcons || false}
                  onChange={(e) => updateConfig({ showCategoryIcons: e.target.checked })}
                />
                <span>Show Category Icons</span>
              </label>
            </div>
          </section>

          {/* Styling */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Styling</h3>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Background Color</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Text Color</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.textColor || '#000000'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Accent Color</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.accentColor || '#3b82f6'}
                  onChange={(e) => updateConfig({ accentColor: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Card Background</label>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={formConfig.cardBgColor || '#f9fafb'}
                  onChange={(e) => updateConfig({ cardBgColor: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className={styles.submitSection}>
            <button
              type="submit"
              className={styles.buttonPrimary}
              disabled={updating}
            >
              {updating ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Image Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          isOpen={showGalleryModal}
          restaurantId={restaurantId}
          onSelect={handleMediaSelect}
          onClose={() => {
            setShowGalleryModal(false);
            setCurrentMediaField(null);
          }}
        />
      )}
    </div>
  );
}
