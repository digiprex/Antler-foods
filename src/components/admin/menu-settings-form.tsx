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
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { MenuConfig, MenuButton, MenuCategory, MenuItem } from '@/types/menu.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';

type MediaFieldType = 'header_image' | 'background_image';

interface MenuSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

export default function MenuSettingsForm({ pageId, templateId, isNewSection }: MenuSettingsFormProps) {
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  const pageName = searchParams.get('page_name') || '';
  const { config, loading, error: fetchError, refetch } = useMenuConfig({
    fetchOnMount: !isNewSection,
    restaurantId,
    pageId,
    templateId,
  });
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
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">Restaurant ID is required. Please provide it via URL parameter.</p>
          </div>
        </div>
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
        ...sectionStyleDefaults,
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

    // Simple wireframe preview for each layout
    const previewStyle = {
      width: '100%',
      height: '200px',
      background: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      color: '#6c757d',
    };

    return (
      <div style={previewStyle}>
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">{(layout || 'grid').charAt(0).toUpperCase() + (layout || 'grid').slice(1)} Layout</div>
          <div className="text-sm text-gray-500">Wireframe preview of {layout || 'grid'} layout</div>
        </div>
      </div>
    );
  };

  if (loading && !isNewSection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading menu settings...</p>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">Failed to load menu configuration</p>
          </div>
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Layout Preview</h2>
                <p className="mt-0.5 text-sm text-gray-600">Wireframe preview of selected layout</p>
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
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-4xl">
                {renderLayoutPreview()}
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-purple-900">
                  This is a wireframe preview of the selected layout. Configure content and styling to see the full result.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
        {/* Layout Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
              <p className="text-sm text-gray-600">Choose a menu layout style</p>
            </div>
          </div>

          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Preview Layout
            </button>
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
                  <div className="h-16 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs text-gray-500">
                    {option.name}
                  </div>
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
              <p className="text-sm text-gray-600">Set title, subtitle and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Title</span>
                <span className="text-xs font-normal text-gray-500">Main menu section title</span>
              </label>
              <input
                type="text"
                value={formConfig.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Our Menu"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subtitle</span>
                <span className="text-xs font-normal text-gray-500">Optional subtitle</span>
              </label>
              <input
                type="text"
                value={formConfig.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Discover our delicious offerings"
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
                placeholder="Explore our carefully curated selection of dishes"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call-to-Action Button</h2>
              <p className="text-sm text-gray-600">Configure action button settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Button Label</span>
                <span className="text-xs font-normal text-gray-500">Button text</span>
              </label>
              <input
                type="text"
                value={formConfig.ctaButton?.label || ''}
                onChange={(e) => updateCtaButton({ label: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900
placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="View Full Menu"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Button Link</span>
                <span className="text-xs font-normal text-gray-500">Button URL or anchor</span>
              </label>
              <input
                type="text"
                value={formConfig.ctaButton?.href || ''}
                onChange={(e) => updateCtaButton({ href: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="#menu"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>Background Color</span>
                </label>
                <input
                  type="color"
                  value={formConfig.ctaButton?.bgColor || '#3b82f6'}
                  onChange={(e) => updateCtaButton({ bgColor: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-300 cursor-pointer"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>Text Color</span>
                </label>
                <input
                  type="color"
                  value={formConfig.ctaButton?.textColor || '#ffffff'}
                  onChange={(e) => updateCtaButton({ textColor: e.target.value })}
                  className="h-11 w-full rounded-lg border border-gray-300 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
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
                Save Menu Settings
              </>
            )}
          </button>
        </div>
      </form>

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
    </>
  );
}
