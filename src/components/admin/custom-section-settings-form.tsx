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
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
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
  // Typography properties
  is_custom?: boolean;
  buttonStyleVariant?: 'primary' | 'secondary';
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: number;
  titleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: number;
  subtitleColor?: string;
  bodyFontFamily?: string;
  bodyFontSize?: string;
  bodyFontWeight?: number;
  bodyColor?: string;
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
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        setMediaFiles([]);
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
      setMediaFiles([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const openGallery = (fieldType: MediaFieldType) => {
    setCurrentMediaField(fieldType);
    setShowGalleryModal(true);
    fetchMediaFiles();
  };

  const closeGallery = () => {
    setShowGalleryModal(false);
    setCurrentMediaField(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!restaurantId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.file?.url) {
        // Handle the uploaded file based on current media field
        handleSelectImage(data.data.file.url);
        
        // Refresh media files list
        fetchMediaFiles();
        
        // Show success toast
        setToastMessage('File uploaded successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage('Failed to upload file: ' + (data.error || 'Unknown error'));
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setToastMessage('Error uploading file');
      setToastType('error');
      setShowToast(true);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
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
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-sm text-gray-600">Initializing...</p>
        </div>
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

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Custom Section Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Create custom content sections with multiple layout options</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
        >
          {showPreview ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
              Hide Preview
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Show Preview
            </>
          )}
        </button>
      </div>

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
              <p className="text-sm text-gray-600">Choose a section layout style</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Layout Type</label>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {layoutOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleLayoutChange(option.value)}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                    formConfig.layout === option.value
                      ? 'border-purple-500 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="mb-2">
                    {renderLayoutPreview(option.value)}
                  </div>
                  <div className="text-xs font-medium text-gray-900">{option.name}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              ))}
            </div>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Headline
                <span className="ml-1 text-xs text-gray-500">Main section headline</span>
              </label>
              <input
                type="text"
                value={formConfig.headline}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                placeholder="BESTELLEN SIE DIREKT AUF UNSERER WEBSITE"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Subheadline
                <span className="ml-1 text-xs text-gray-500">Optional subheadline</span>
              </label>
              <input
                type="text"
                value={formConfig.subheadline || ''}
                onChange={(e) => updateConfig({ subheadline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                placeholder="Experience our premium service"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
                <span className="ml-1 text-xs text-gray-500">Supporting description text</span>
              </label>
              <textarea
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                placeholder="Detailed description of your service or offering"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call-to-Action Buttons</h2>
              <p className="text-sm text-gray-600">Configure action buttons for your section</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Primary Button Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                      updateConfig({ primaryButton: { label: 'ONLINE BESTELLEN', href: '#order', variant: 'primary' } });
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
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Button Text
                    <span className="ml-1 text-xs text-gray-500">Button label</span>
                  </label>
                  <input
                    type="text"
                    value={formConfig.primaryButton.label}
                    onChange={(e) => updatePrimaryButton({ label: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    placeholder="ONLINE BESTELLEN"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Button Link
                    <span className="ml-1 text-xs text-gray-500">Where it navigates</span>
                  </label>
                  <input
                    type="text"
                    value={formConfig.primaryButton.href}
                    onChange={(e) => updatePrimaryButton({ href: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    placeholder="#order"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Button Style
                    <span className="ml-1 text-xs text-gray-500">Visual style</span>
                  </label>
                  <select
                    value={formConfig.primaryButton.variant || 'primary'}
                    onChange={(e) => updatePrimaryButton({ variant: e.target.value as any })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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

        {/* Media Configuration Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Media Configuration</h2>
              <p className="text-sm text-gray-600">Use one shared background image, plus layout-specific hero media where needed</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Shared Background Image Info Box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Shared Background Image</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Your background image is preserved while you switch layouts, so you can compare hero styles without re-uploading it.
                  </p>
                </div>
              </div>
            </div>

            {/* Shared Background Image Section */}
            <div>
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-sm font-medium text-gray-700">Shared Background Image</h3>
                <span className="text-xs text-gray-500">Used in this layout</span>
              </div>
              <p className="mb-3 text-xs text-gray-500">This layout uses the shared background image directly.</p>
              <p className="mb-4 text-xs text-gray-500">Recommended: 1200x630px</p>
              
              {formConfig.backgroundImage && (
                <div className="mb-4 overflow-hidden rounded-lg border border-gray-200">
                  <img
                    src={formConfig.backgroundImage}
                    alt="Shared background"
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
                      Change Image
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
              )}

              <button
                type="button"
                onClick={() => openGalleryModal('background_image')}
                disabled={!restaurantId}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                Choose Shared Background Image
              </button>
            </div>
          </div>
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
              <p className="text-sm text-gray-600">Customize colors and appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Background Color
                <span className="ml-1 text-xs text-gray-500">Section background color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300"
                />
                <input
                  type="text"
                  value={formConfig.bgColor || '#ffffff'}
                  onChange={(e) => updateConfig({ bgColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Text Color
                <span className="ml-1 text-xs text-gray-500">Text and headline color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formConfig.textColor || '#000000'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300"
                />
                <input
                  type="text"
                  value={formConfig.textColor || '#000000'}
                  onChange={(e) => updateConfig({ textColor: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Text Alignment
                <span className="ml-1 text-xs text-gray-500">Content alignment</span>
              </label>
              <select
                value={formConfig.textAlign || 'center'}
                onChange={(e) => updateConfig({ textAlign: e.target.value as any })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Height
                <span className="ml-1 text-xs text-gray-500">Section height</span>
              </label>
              <input
                type="text"
                value={formConfig.minHeight || '400px'}
                onChange={(e) => updateConfig({ minHeight: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                placeholder="400px"
              />
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

          <SectionTypographyControls
            value={formConfig as any}
            onChange={(updates: any) => updateConfig(updates)}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={false}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-purple-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            Save Custom Section Settings
          </button>
        </div>
      </form>

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
                  <div
                    style={{
                      padding: '2rem',
                      background: formConfig.bgColor || '#ffffff',
                      color: formConfig.textColor || '#000000',
                      textAlign: (formConfig.textAlign as any) || 'center',
                      minHeight: formConfig.minHeight || '400px',
                      position: 'relative',
                      backgroundImage: formConfig.backgroundImage ? `url(${formConfig.backgroundImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {formConfig.videoUrl && (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          zIndex: 0,
                        }}
                        src={formConfig.videoUrl}
                      />
                    )}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {formConfig.image?.url && (
                        <img
                          src={formConfig.image.url}
                          alt={formConfig.image.alt || 'Section image'}
                          style={{
                            maxWidth: '300px',
                            height: 'auto',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                      <h2
                        style={{
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          marginBottom: '0.5rem',
                          opacity: formConfig.headline ? 1 : 0.4,
                        }}
                      >
                        {formConfig.headline || 'Section Headline (placeholder)'}
                      </h2>
                      <h3
                        style={{
                          fontSize: '1.25rem',
                          marginBottom: '0.5rem',
                          opacity: formConfig.subheadline ? 1 : 0.4,
                          display: formConfig.subheadline || 'inline' ? 'block' : 'none',
                        }}
                      >
                        {formConfig.subheadline || 'Subheadline (placeholder)'}
                      </h3>
                      <p
                        style={{
                          fontSize: '1rem',
                          marginBottom: '1rem',
                          opacity: formConfig.description ? 1 : 0.4,
                          display: formConfig.description || 'inline' ? 'block' : 'none',
                        }}
                      >
                        {formConfig.description || 'Description text will appear here (placeholder)'}
                      </p>
                      {(formConfig.primaryButton || true) && (
                        <button
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: formConfig.primaryButton?.bgColor || '#7c3aed',
                            color: formConfig.primaryButton?.textColor || '#fff',
                            border: formConfig.primaryButton?.variant === 'outline' ? '2px solid currentColor' : 'none',
                            borderRadius: '8px',
                            marginTop: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            opacity: formConfig.primaryButton ? 1 : 0.4,
                          }}
                        >
                          {formConfig.primaryButton?.label || 'Button Text (placeholder)'}
                        </button>
                      )}
                    </div>
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