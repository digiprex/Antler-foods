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
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';

interface Form {
  form_id: string;
  title: string;
  email: string;
  fields: any[];
  created_at: string;
}

interface FormSettingsConfig extends SectionStyleConfig {
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
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

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
    ...sectionStyleDefaults,
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
          setConfig((prev) => ({
            ...sectionStyleDefaults,
            ...prev,
            ...data.data,
          }));
        }
      } catch (error) {
        console.error('Error loading form settings:', error);
      }
    };

    if (restaurantId) {
      fetchConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, pageId, templateId, isNewSection, sectionStyleDefaults]);

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

  useEffect(() => {
    setConfig((prev) => ({
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [sectionStyleDefaults]);

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
      <div className="flex items-center justify-center p-8">
        <svg className="h-8 w-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="ml-2 text-gray-700">Loading forms...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isNewSection ? 'Add New Form Section' : 'Form Display Settings'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {isNewSection
                  ? 'Create a new form display section for this page'
                  : 'Configure how your form will be displayed on your website'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!selectedForm}
            title={!selectedForm ? 'Select a form to preview' : showPreview ? 'Hide Preview' : 'Show Live Preview'}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
              !selectedForm
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-purple-200 bg-white text-purple-700 hover:border-purple-300 hover:bg-purple-50'
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
        {/* Enable/Disable Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Form Status</h2>
              <p className="text-sm text-gray-600">Enable or disable form display</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Form Display</label>
              <p className="text-xs text-gray-500">Turn form display on or off</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => updateConfig({ isEnabled: e.target.checked })}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
            </label>
          </div>
        </div>

        {/* Form Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Form Selection</h2>
              <p className="text-sm text-gray-600">Choose which form to display</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Choose Form</span>
              <span className="mt-0.5 block text-xs text-gray-500">Select which form to display</span>
            </label>
            {forms.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No forms available.</p>
                <a
                  href={`/admin/forms/builder?restaurant_id=${restaurantId}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Create your first form →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {forms.map((form) => (
                  <button
                    key={form.form_id}
                    type="button"
                    onClick={() => updateConfig({ form_id: form.form_id })}
                    className={`group relative rounded-lg border-2 p-4 text-center transition-all ${
                      config.form_id === form.form_id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    {config.form_id === form.form_id && (
                      <div className="absolute right-3 top-3">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="text-3xl mb-2">📋</div>
                    <h3 className={`text-sm font-semibold ${
                      config.form_id === form.form_id ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      {form.title}
                    </h3>
                    <p className={`mt-1 text-xs ${
                      config.form_id === form.form_id ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      {form.fields?.length || 0} fields
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Layout Selection */}
        {config.form_id && (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
                  <p className="text-sm text-gray-600">Choose a form layout style</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Layout Type</span>
                  <span className="mt-0.5 block text-xs text-gray-500">Choose a form layout style</span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {layoutOptions.map((layout) => (
                    <button
                      key={layout.value}
                      type="button"
                      onClick={() => updateConfig({ layout: layout.value })}
                      className={`group relative rounded-lg border-2 p-3 text-left transition-all ${
                        config.layout === layout.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      {config.layout === layout.value && (
                        <div className="absolute right-2 top-2">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-500">
                            <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="mb-2 overflow-hidden rounded border border-gray-200 bg-gray-50" style={{ height: '60px' }}>
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
                      <div className={`text-xs font-semibold ${
                        config.layout === layout.value ? 'text-purple-900' : 'text-gray-900'
                      }`}>
                        {layout.name}
                      </div>
                      <div className={`mt-0.5 text-xs ${
                        config.layout === layout.value ? 'text-purple-700' : 'text-gray-600'
                      }`}>
                        {layout.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Settings */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
                  <p className="text-sm text-gray-600">Form title, subtitle, and description</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Title</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Main form title</span>
                  </label>
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => updateConfig({ title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Get in Touch"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Subtitle</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Optional subtitle</span>
                  </label>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={(e) => updateConfig({ subtitle: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="We'd love to hear from you"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Description</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Supporting description text</span>
                  </label>
                  <textarea
                    value={config.description}
                    onChange={(e) => updateConfig({ description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Fill out the form below and we'll get back to you as soon as possible."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Image Settings */}
            {['split-right', 'split-left', 'image-top', 'background-image'].includes(
              config.layout
            ) && (
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900">Image Configuration</h2>
                      <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Required
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Image display for this layout</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">Form Image *</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Choose an image to display with your form (required for this layout)</span>
                  </label>

                  {/* Image Preview */}
                  {config.imageUrl ? (
                    <div className="relative max-w-sm overflow-hidden rounded-lg border-2 border-gray-200">
                      <img
                        src={config.imageUrl}
                        alt="Selected form image"
                        className="block h-40 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => updateConfig({ imageUrl: '' })}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white transition-colors hover:bg-black"
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-sm rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                      <div className="mb-2 text-5xl opacity-50">📷</div>
                      <p className="text-sm text-gray-600">No image selected</p>
                    </div>
                  )}

                  {/* Image Selection Button */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowImageGallery(true)}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
                        config.imageUrl
                          ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      {config.imageUrl ? 'Change Image' : 'Choose from Gallery'}
                    </button>
                    {!config.imageUrl && (
                      <span className="text-xs font-medium text-red-600">
                        ⚠️ Image required for this layout
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Styling */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Colors & Styling</h2>
                  <p className="text-sm text-gray-600">Customize form colors</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Background Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 shadow-sm"
                    />
                    <input
                      type="text"
                      value={config.backgroundColor}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

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
                  checked={config.is_custom || false}
                  onChange={(e) => updateConfig({ is_custom: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!config.is_custom ? (
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
                  value={config}
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
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {isNewSection ? 'Create Form Section' : 'Save Form Settings'}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Form Live Preview</h2>
                  <p className="text-xs text-gray-500">Live Preview</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-inner">
                <div className="overflow-hidden rounded-lg border-2 border-gray-300 bg-white shadow-sm">
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
                      <div>
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
              <div className="flex items-start gap-3 rounded-lg border border-purple-100 bg-purple-50 p-4 mt-4">
                <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your form section will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowImageGallery(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Image from Media Library
                </h2>
              </div>
              <button
                onClick={() => setShowImageGallery(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {/* Upload Progress */}
              {uploadingImage && (
                <div className="mb-4 rounded-lg bg-gray-100 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">Uploading...</h4>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm text-gray-700">Uploading image...</span>
                  </div>
                </div>
              )}

              {availableImages.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <div className="mx-auto mb-4 text-6xl">📁</div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">No images found in media library</h3>
                  <p className="text-sm text-gray-600">
                    Upload images to your media library first, then they will appear here for selection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {availableImages.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => {
                        updateConfig({ imageUrl: media.file?.url || media.url });
                        setShowImageGallery(false);
                        setToastMessage('Image selected successfully!');
                        setToastType('success');
                        setShowToast(true);
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        config.imageUrl === (media.file?.url || media.url)
                          ? 'border-purple-500 ring-2 ring-purple-500'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {(media.file?.url || media.url) ? (
                        <img
                          src={media.file?.url || media.url}
                          alt={media.file?.name || media.name || 'Image'}
                          className="h-full w-full object-cover"
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
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 text-xs text-gray-500">
                          <div className="text-2xl">📁</div>
                          <div>No URL</div>
                        </div>
                      )}
                      {config.imageUrl === (media.file?.url || media.url) && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
              {/* Left side - Upload button */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="form-image-upload"
                  disabled={uploadingImage}
                />
                <label
                  htmlFor="form-image-upload"
                  className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 ${
                    uploadingImage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  }`}
                >
                  {uploadingImage ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload Images
                    </>
                  )}
                </label>
              </div>

              {/* Right side - Action buttons */}
              <button
                onClick={() => setShowImageGallery(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
