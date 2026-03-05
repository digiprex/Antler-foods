/**
 * Custom Section Settings Form
 * Enhanced version with layout previews and popup modal
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CustomSection from '@/components/custom-section';
import type { CustomSectionConfig } from '@/types/custom-section.types';
import { ImageGalleryModal } from './image-gallery-modal';
import styles from './gallery-settings-form.module.css';

interface CustomSectionSettingsFormProps {
  pageId?: string;
  isNewSection?: boolean;
}

type LayoutType = 'layout-1' | 'layout-2' | 'layout-3' | 'layout-4' | 'layout-5' | 'layout-6' | 'layout-7' | 'layout-8' | 'layout-9' |
                  'layout-10' | 'layout-11' | 'layout-12' | 'layout-13' | 'layout-14' | 'layout-15' | 'layout-16' | 'layout-17' | 'layout-18' |
                  'layout-19' | 'layout-20' | 'layout-21' | 'layout-22' | 'layout-23' | 'layout-24' | 'layout-25' | 'layout-26' | 'layout-27' |
                  'layout-28' | 'layout-29' | 'layout-30' | 'layout-31' | 'layout-32';

export default function CustomSectionSettingsForm({ pageId, isNewSection }: CustomSectionSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';

  const [formData, setFormData] = useState<Partial<CustomSectionConfig>>({
    headline: '',
    subheadline: '',
    description: '',
    layout: 'layout-1' as LayoutType,
    bgColor: '#ffffff',
    textColor: '#000000',
    paddingTop: '4rem',
    paddingBottom: '4rem',
    minHeight: '400px',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageFieldType, setImageFieldType] = useState<'image' | 'background'>('image');

  // Helper function to determine what media is needed for each layout
  const getMediaRequirements = (layout: LayoutType) => {
    const requirements = {
      needsImage: false,
      needsVideo: false,
      needsBackgroundImage: false,
      imageLabel: 'Section Image',
      imageHint: 'Upload an image for this layout',
    };

    switch (layout) {
      // Background image layouts (overlay text)
      case 'layout-1':
        requirements.needsBackgroundImage = true;
        requirements.imageLabel = 'Background Image';
        requirements.imageHint = 'Full-width background image with overlay text';
        break;

      // Regular image layouts
      case 'layout-2':
        requirements.needsImage = true;
        requirements.imageLabel = 'Left Side Image';
        requirements.imageHint = 'Image displayed on the left side';
        break;

      case 'layout-4':
      case 'layout-5':
        requirements.needsImage = true;
        requirements.imageLabel = 'Section Image';
        requirements.imageHint = 'Image displayed with curved/circular styling';
        break;

      case 'layout-6':
        requirements.needsImage = true;
        requirements.imageLabel = 'Right Side Image';
        requirements.imageHint = 'Image displayed on the right side';
        break;

      case 'layout-7':
        requirements.needsImage = true;
        requirements.imageLabel = 'Left Side Image';
        requirements.imageHint = 'Image displayed on the left with spacing';
        break;

      case 'layout-8':
        requirements.needsImage = true;
        requirements.imageLabel = 'Side Images';
        requirements.imageHint = 'Images for left and right sides (use same image for both)';
        break;

      case 'layout-9':
      case 'layout-10':
        requirements.needsImage = true;
        requirements.imageLabel = 'Top Image';
        requirements.imageHint = 'Large image displayed at the top';
        break;

      case 'layout-11':
        requirements.needsImage = true;
        requirements.imageLabel = 'Column Images';
        requirements.imageHint = 'Images for two-column split layout';
        break;

      case 'layout-12':
        requirements.needsImage = true;
        requirements.imageLabel = 'Side Image';
        requirements.imageHint = 'Image displayed beside boxed content';
        break;

      case 'layout-13':
        requirements.needsImage = true;
        requirements.imageLabel = 'Grid Images';
        requirements.imageHint = 'Images for grid layout with center content';
        break;

      case 'layout-15':
        requirements.needsImage = true;
        requirements.imageLabel = 'Large Column Image';
        requirements.imageHint = 'Image for the larger asymmetric column';
        break;

      case 'layout-16':
        requirements.needsImage = true;
        requirements.imageLabel = 'Featured Image';
        requirements.imageHint = 'Large featured image with sidebar';
        break;

      case 'layout-17':
        requirements.needsImage = true;
        requirements.imageLabel = 'Magazine Image';
        requirements.imageHint = 'Image for magazine-style layout';
        break;

      case 'layout-18':
        requirements.needsImage = true;
        requirements.imageLabel = 'Background Image';
        requirements.imageHint = 'Image for overlapping content blocks';
        break;

      case 'layout-20':
        requirements.needsImage = true;
        requirements.imageLabel = 'Section Image';
        requirements.imageHint = 'Image for split with background accent';
        break;

      case 'layout-21':
        requirements.needsImage = true;
        requirements.imageLabel = 'Hero Image';
        requirements.imageHint = 'Large hero-style image at the top';
        break;

      case 'layout-22':
        requirements.needsImage = true;
        requirements.imageLabel = 'Zigzag Images';
        requirements.imageHint = 'Images for zigzag pattern layout';
        break;

      case 'layout-25':
        requirements.needsImage = true;
        requirements.imageLabel = 'Grid Showcase Images';
        requirements.imageHint = 'Multiple images for grid showcase';
        break;

      case 'layout-27':
        requirements.needsImage = true;
        requirements.imageLabel = 'Diagonal Section Image';
        requirements.imageHint = 'Image for diagonal split layout';
        break;

      case 'layout-29':
        requirements.needsImage = true;
        requirements.imageLabel = 'Layered Background Image';
        requirements.imageHint = 'Image for layered content background';
        break;

      case 'layout-31':
        requirements.needsImage = true;
        requirements.imageLabel = 'Carousel Images';
        requirements.imageHint = 'Images for carousel layout';
        break;

      case 'layout-32':
        requirements.needsImage = true;
        requirements.imageLabel = 'Interactive Image';
        requirements.imageHint = 'Image with hover interaction';
        break;

      // Video layouts
      case 'layout-3':
      case 'layout-24':
        requirements.needsVideo = true;
        break;

      // Text-only layouts (no media needed)
      case 'layout-14':
      case 'layout-19':
      case 'layout-23':
      case 'layout-26':
      case 'layout-28':
      case 'layout-30':
        // No media needed
        break;
    }

    return requirements;
  };

  const mediaRequirements = getMediaRequirements(formData.layout || 'layout-1');

  // Fetch existing custom section data when editing
  useEffect(() => {
    const fetchCustomSectionData = async () => {
      if (isNewSection || !restaurantId) return;

      try {
        const params = new URLSearchParams();
        params.set('restaurant_id', restaurantId);
        if (pageId) {
          params.set('page_id', pageId);
        }

        const response = await fetch(`/api/custom-section-config?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          const config = data.data;
          setFormData({
            headline: config.headline || '',
            subheadline: config.subheadline || '',
            description: config.description || '',
            layout: config.layout || 'layout-1',
            bgColor: config.bgColor || '#ffffff',
            textColor: config.textColor || '#000000',
            paddingTop: config.paddingTop || '4rem',
            paddingBottom: config.paddingBottom || '4rem',
            minHeight: config.minHeight || '400px',
            image: config.image,
            videoUrl: config.videoUrl,
            backgroundImage: config.backgroundImage,
            primaryButton: config.primaryButton,
            secondaryButton: config.secondaryButton,
            overlayColor: config.overlayColor,
            overlayOpacity: config.overlayOpacity,
            textAlign: config.textAlign,
            contentMaxWidth: config.contentMaxWidth,
          });
        }
      } catch (error) {
        console.error('Error fetching custom section data:', error);
      }
    };

    fetchCustomSectionData();
  }, [isNewSection, restaurantId, pageId]);

  const handleOpenImageGallery = (type: 'image' | 'background') => {
    setImageFieldType(type);
    setShowImageGallery(true);
  };

  const handleImageSelect = (imageUrl: string) => {
    if (imageFieldType === 'background') {
      setFormData(prev => ({ ...prev, backgroundImage: imageUrl }));
    } else {
      setFormData(prev => ({
        ...prev,
        image: {
          url: imageUrl,
          alt: prev.image?.alt || 'Section image'
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToast({ message: 'Restaurant ID is required', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        ...formData,
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

      console.log('[Custom Section] Saving:', payload);

      const response = await fetch('/api/custom-section-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setToast({
          message: isNewSection ? 'Custom section created successfully!' : 'Custom section updated successfully!',
          type: 'success'
        });

        // Navigate back to page settings after a short delay
        setTimeout(() => {
          const params = new URLSearchParams();
          if (restaurantId) params.set('restaurant_id', restaurantId);
          if (restaurantName) params.set('restaurant_name', restaurantName);
          if (pageId) params.set('page_id', pageId);
          router.replace(`/admin/page-settings?${params.toString()}`);
        }, 1500);
      } else {
        setToast({ message: 'Error saving custom section: ' + data.error, type: 'error' });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (error) {
      console.error('Error saving custom section:', error);
      setToast({ message: 'Error saving custom section. Please try again.', type: 'error' });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const layoutOptions: Array<{ value: LayoutType; name: string; description: string }> = [
    { value: 'layout-1', name: 'Layout 1', description: 'Full-width image with overlay text' },
    { value: 'layout-2', name: 'Layout 2', description: 'Split image left, content right' },
    { value: 'layout-3', name: 'Layout 3', description: 'Video background with centered content' },
    { value: 'layout-4', name: 'Layout 4', description: 'Curved green background with image' },
    { value: 'layout-5', name: 'Layout 5', description: 'Circular image with green background' },
    { value: 'layout-6', name: 'Layout 6', description: 'Image right, content left' },
    { value: 'layout-7', name: 'Layout 7', description: 'Image left, content right with spacing' },
    { value: 'layout-8', name: 'Layout 8', description: 'Centered content with side images' },
    { value: 'layout-9', name: 'Layout 9', description: 'Large image with bottom content' },
    { value: 'layout-10', name: 'Layout 10', description: 'Centered content with top image' },
    { value: 'layout-11', name: 'Layout 11', description: 'Two column split with images' },
    { value: 'layout-12', name: 'Layout 12', description: 'Boxed content with side image' },
    { value: 'layout-13', name: 'Layout 13', description: 'Image grid with center content' },
    { value: 'layout-14', name: 'Layout 14', description: 'Stacked cards layout' },
    { value: 'layout-15', name: 'Layout 15', description: 'Asymmetric split layout' },
    { value: 'layout-16', name: 'Layout 16', description: 'Featured image with sidebar' },
    { value: 'layout-17', name: 'Layout 17', description: 'Magazine style layout' },
    { value: 'layout-18', name: 'Layout 18', description: 'Overlapping content blocks' },
    { value: 'layout-19', name: 'Layout 19', description: 'Modern card style' },
    { value: 'layout-20', name: 'Layout 20', description: 'Split with background accent' },
    { value: 'layout-21', name: 'Layout 21', description: 'Hero style with bottom content' },
    { value: 'layout-22', name: 'Layout 22', description: 'Zigzag pattern layout' },
    { value: 'layout-23', name: 'Layout 23', description: 'Centered with side panels' },
    { value: 'layout-24', name: 'Layout 24', description: 'Full screen video layout' },
    { value: 'layout-25', name: 'Layout 25', description: 'Grid showcase layout' },
    { value: 'layout-26', name: 'Layout 26', description: 'Minimal centered layout' },
    { value: 'layout-27', name: 'Layout 27', description: 'Split diagonal layout' },
    { value: 'layout-28', name: 'Layout 28', description: 'Triple section layout' },
    { value: 'layout-29', name: 'Layout 29', description: 'Layered content layout' },
    { value: 'layout-30', name: 'Layout 30', description: 'Full width banner style' },
    { value: 'layout-31', name: 'Layout 31', description: 'Image carousel layout' },
    { value: 'layout-32', name: 'Layout 32', description: 'Interactive hover layout' },
  ];

  // Render layout preview thumbnails
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
      case 'layout-1':
        return (
          <div style={{...previewStyle, background: '#343a40', color: '#fff'}}>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.2)', width: '60%'}}></div>
          </div>
        );

      case 'layout-2':
        return (
          <div style={previewStyle}>
            <div style={imageBlock}>📷</div>
            <div style={textBlock}></div>
          </div>
        );

      case 'layout-3':
        return (
          <div style={{...previewStyle, background: '#343a40', color: '#fff'}}>
            <div style={{position: 'absolute', top: '2px', right: '2px', fontSize: '10px'}}>🎥</div>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.2)'}}></div>
          </div>
        );

      case 'layout-4':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #a8e6cf 0%, #56ab2f 100%)'}}>
            <div style={textBlock}></div>
            <div style={imageBlock}>📷</div>
          </div>
        );

      case 'layout-5':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #a8e6cf 0%, #56ab2f 100%)'}}>
            <div style={{...imageBlock, borderRadius: '50%', width: '35px', height: '35px'}}>📷</div>
            <div style={textBlock}></div>
          </div>
        );

      case 'layout-6':
        return (
          <div style={previewStyle}>
            <div style={textBlock}></div>
            <div style={imageBlock}>📷</div>
          </div>
        );

      case 'layout-7':
        return (
          <div style={previewStyle}>
            <div style={imageBlock}>📷</div>
            <div style={{...textBlock, width: '45%'}}></div>
          </div>
        );

      case 'layout-8':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '20%', height: '30px'}}>📷</div>
            <div style={{...textBlock, width: '35%'}}></div>
            <div style={{...imageBlock, width: '20%', height: '30px'}}>📷</div>
          </div>
        );

      case 'layout-9':
        return (
          <div style={{...previewStyle, flexDirection: 'column', gap: '2px'}}>
            <div style={{...imageBlock, width: '80%', height: '25px'}}>📷</div>
            <div style={{...textBlock, width: '70%', height: '15px'}}></div>
          </div>
        );

      case 'layout-10':
        return (
          <div style={{...previewStyle, flexDirection: 'column', gap: '2px'}}>
            <div style={{...imageBlock, width: '90%', height: '20px'}}>📷</div>
            <div style={{...textBlock, width: '60%', height: '18px'}}></div>
          </div>
        );

      case 'layout-11':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '45%'}}>📷</div>
            <div style={{...imageBlock, width: '45%'}}>📷</div>
          </div>
        );

      case 'layout-12':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '55%', height: '40px', border: '1px solid #adb5bd'}}></div>
            <div style={{...imageBlock, width: '35%'}}>📷</div>
          </div>
        );

      case 'layout-13':
        return (
          <div style={{...previewStyle, flexWrap: 'wrap', gap: '1px'}}>
            <div style={{...imageBlock, width: '30%', height: '20px', margin: '1px'}}>📷</div>
            <div style={{...textBlock, width: '35%', margin: '1px'}}></div>
            <div style={{...imageBlock, width: '30%', height: '20px', margin: '1px'}}>📷</div>
          </div>
        );

      case 'layout-14':
        return (
          <div style={{...previewStyle, flexDirection: 'column', gap: '1px'}}>
            <div style={{...textBlock, width: '90%', height: '12px'}}></div>
            <div style={{...textBlock, width: '90%', height: '12px'}}></div>
            <div style={{...textBlock, width: '90%', height: '12px'}}></div>
          </div>
        );

      case 'layout-15':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '35%', height: '40px'}}></div>
            <div style={{...imageBlock, width: '55%', height: '50px'}}>📷</div>
          </div>
        );

      case 'layout-16':
        return (
          <div style={previewStyle}>
            <div style={{...imageBlock, width: '65%', height: '50px'}}>📷</div>
            <div style={{...textBlock, width: '30%', height: '40px'}}></div>
          </div>
        );

      case 'layout-17':
        return (
          <div style={{...previewStyle, flexDirection: 'column'}}>
            <div style={{display: 'flex', width: '100%', gap: '2px'}}>
              <div style={{...imageBlock, width: '50%', height: '25px'}}>📷</div>
              <div style={{...textBlock, width: '45%', height: '25px'}}></div>
            </div>
          </div>
        );

      case 'layout-18':
        return (
          <div style={{...previewStyle, position: 'relative'}}>
            <div style={{...imageBlock, position: 'absolute', left: '5px', top: '5px', width: '45%', height: '35px'}}>📷</div>
            <div style={{...textBlock, position: 'absolute', right: '5px', bottom: '5px', width: '45%', height: '30px'}}></div>
          </div>
        );

      case 'layout-19':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '80%', height: '45px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}></div>
          </div>
        );

      case 'layout-20':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, transparent 50%)'}}>
            <div style={{...textBlock, width: '40%'}}></div>
            <div style={{...imageBlock, width: '35%'}}>📷</div>
          </div>
        );

      case 'layout-21':
        return (
          <div style={{...previewStyle, flexDirection: 'column', background: '#343a40'}}>
            <div style={{...imageBlock, width: '100%', height: '30px', background: 'rgba(173,181,189,0.5)'}}>📷</div>
            <div style={{...textBlock, width: '70%', height: '15px', background: 'rgba(255,255,255,0.2)'}}></div>
          </div>
        );

      case 'layout-22':
        return (
          <div style={{...previewStyle, flexDirection: 'column', gap: '1px'}}>
            <div style={{display: 'flex', gap: '2px', width: '100%'}}>
              <div style={{...imageBlock, width: '40%', height: '15px'}}>📷</div>
              <div style={{...textBlock, width: '55%', height: '15px'}}></div>
            </div>
            <div style={{display: 'flex', gap: '2px', width: '100%', flexDirection: 'row-reverse'}}>
              <div style={{...imageBlock, width: '40%', height: '15px'}}>📷</div>
              <div style={{...textBlock, width: '55%', height: '15px'}}></div>
            </div>
          </div>
        );

      case 'layout-23':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '20%', height: '40px'}}></div>
            <div style={{...textBlock, width: '50%', height: '45px', background: '#667eea'}}></div>
            <div style={{...textBlock, width: '20%', height: '40px'}}></div>
          </div>
        );

      case 'layout-24':
        return (
          <div style={{...previewStyle, background: '#000'}}>
            <div style={{position: 'absolute', top: '2px', left: '2px', fontSize: '16px'}}>▶️</div>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.3)', width: '50%'}}></div>
          </div>
        );

      case 'layout-25':
        return (
          <div style={{...previewStyle, flexWrap: 'wrap', gap: '2px'}}>
            <div style={{...imageBlock, width: '30%', height: '18px'}}>📷</div>
            <div style={{...imageBlock, width: '30%', height: '18px'}}>📷</div>
            <div style={{...imageBlock, width: '30%', height: '18px'}}>📷</div>
            <div style={{...imageBlock, width: '30%', height: '18px'}}>📷</div>
          </div>
        );

      case 'layout-26':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(to bottom, #fff 0%, #f8f9fa 100%)'}}>
            <div style={{...textBlock, width: '40%', height: '15px'}}></div>
          </div>
        );

      case 'layout-27':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(45deg, #667eea 0%, #667eea 45%, transparent 45%, transparent 55%, #f8f9fa 55%)'}}>
            <div style={{...textBlock, width: '35%'}}></div>
            <div style={{...imageBlock, width: '30%'}}>📷</div>
          </div>
        );

      case 'layout-28':
        return (
          <div style={previewStyle}>
            <div style={{...textBlock, width: '30%', height: '40px'}}></div>
            <div style={{...textBlock, width: '30%', height: '40px'}}></div>
            <div style={{...textBlock, width: '30%', height: '40px'}}></div>
          </div>
        );

      case 'layout-29':
        return (
          <div style={{...previewStyle, position: 'relative'}}>
            <div style={{...imageBlock, position: 'absolute', left: '5px', top: '8px', width: '50%', height: '30px', opacity: 0.7}}>📷</div>
            <div style={{...textBlock, position: 'absolute', right: '5px', top: '15px', width: '50%', height: '25px'}}></div>
          </div>
        );

      case 'layout-30':
        return (
          <div style={{...previewStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
            <div style={{...textBlock, background: 'rgba(255,255,255,0.3)', width: '80%', height: '18px'}}></div>
          </div>
        );

      case 'layout-31':
        return (
          <div style={{...previewStyle, position: 'relative'}}>
            <div style={{...imageBlock, width: '70%', height: '45px'}}>🎠</div>
            <div style={{position: 'absolute', right: '5px', fontSize: '10px'}}>‹ ›</div>
          </div>
        );

      case 'layout-32':
        return (
          <div style={{...previewStyle, position: 'relative'}}>
            <div style={{...imageBlock, width: '45%', height: '40px', border: '2px dashed #adb5bd'}}>🖱️</div>
            <div style={{...textBlock, width: '40%', height: '35px'}}></div>
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

  return (
    <div>
      <div className={styles.formHeader}>
        <div>
          <h1 className={styles.formTitle}>
            {isNewSection ? 'Add New Custom Section' : 'Edit Custom Section'}
          </h1>
          <p className={styles.formSubtitle}>
            {isNewSection
              ? 'Create a new custom section for this page'
              : 'Customize your custom content section'
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
        >
          👁️ Preview Section
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Layout Section */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🎨</span>
            Layout Configuration
          </h3>

          <div className={styles.formGroup} style={{ flexDirection: 'column' }}>
            <label className={styles.label}>
              Layout Type
              <span className={styles.labelHint}>All 32 available layouts - click to select your preferred design</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.875rem',
              marginTop: '1rem',
              width: '100%'
            }}>
              {layoutOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setFormData(prev => ({ ...prev, layout: option.value }))}
                  style={{
                    padding: '1rem',
                    border: formData.layout === option.value ? '3px solid #667eea' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    backgroundColor: formData.layout === option.value ? 'rgba(102, 126, 234, 0.08)' : 'white',
                    transition: 'all 0.2s ease',
                    boxShadow: formData.layout === option.value ? '0 4px 12px rgba(102, 126, 234, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                  onMouseEnter={(e) => {
                    if (formData.layout !== option.value) {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.layout !== option.value) {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ marginBottom: '0.75rem', position: 'relative' }}>
                    {renderLayoutPreview(option.value)}
                    {formData.layout === option.value && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.25rem', textAlign: 'center', color: '#1f2937' }}>
                    {option.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', lineHeight: '1.3' }}>
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Configuration */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>📝</span>
            Content Configuration
          </h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Headline
              <span className={styles.labelHint}>Main heading text</span>
            </label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
              placeholder="Enter your headline"
              className={styles.textInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Subheadline
              <span className={styles.labelHint}>Optional subtitle</span>
            </label>
            <input
              type="text"
              value={formData.subheadline}
              onChange={(e) => setFormData(prev => ({ ...prev, subheadline: e.target.value }))}
              placeholder="Enter your subheadline"
              className={styles.textInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Description
              <span className={styles.labelHint}>Detailed description text</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter your description"
              rows={4}
              className={styles.textArea}
            />
          </div>
        </div>

        {/* Media Configuration - Conditional based on layout */}
        {(mediaRequirements.needsImage || mediaRequirements.needsVideo || mediaRequirements.needsBackgroundImage) && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📷</span>
              Media Configuration
            </h3>

            {/* Image Upload */}
            {(mediaRequirements.needsImage || mediaRequirements.needsBackgroundImage) && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  {mediaRequirements.imageLabel}
                  <span className={styles.labelHint}>{mediaRequirements.imageHint}</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenImageGallery(mediaRequirements.needsBackgroundImage ? 'background' : 'image')}
                  className={`${styles.button} ${styles.secondaryButton}`}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1.5rem',
                    justifyContent: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  📷 Select Image from Gallery
                </button>
                {formData.image?.url || formData.backgroundImage ? (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Selected Image:
                    </div>
                    <img
                      src={mediaRequirements.needsBackgroundImage ? formData.backgroundImage : formData.image?.url}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '4px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '1.5rem',
                    border: '2px dashed #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    No image selected. Click the button above to choose an image.
                  </div>
                )}
              </div>
            )}

            {/* Video URL */}
            {mediaRequirements.needsVideo && (
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Video URL
                  <span className={styles.labelHint}>YouTube, Vimeo, or direct video file URL</span>
                </label>
                <input
                  type="url"
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                  className={styles.textInput}
                />
                {formData.videoUrl && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    <strong style={{ color: '#374151' }}>Note:</strong> Video will play as background. For YouTube/Vimeo, use embed URL format.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Button Configuration */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🔘</span>
            Button Configuration (Optional)
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Primary Button Label
                <span className={styles.labelHint}>Text displayed on the primary button</span>
              </label>
              <input
                type="text"
                value={formData.primaryButton?.label || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  primaryButton: {
                    ...prev.primaryButton,
                    label: e.target.value,
                    href: prev.primaryButton?.href || '',
                    variant: prev.primaryButton?.variant || 'primary',
                  }
                }))}
                placeholder="e.g., Learn More, Get Started, Order Now"
                className={styles.textInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Primary Button Link
                <span className={styles.labelHint}>URL or page path where button navigates</span>
              </label>
              <input
                type="text"
                value={formData.primaryButton?.href || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  primaryButton: {
                    ...prev.primaryButton,
                    label: prev.primaryButton?.label || '',
                    href: e.target.value,
                    variant: prev.primaryButton?.variant || 'primary',
                  }
                }))}
                placeholder="https://example.com or /menu"
                className={styles.textInput}
              />
            </div>
          </div>

          <div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Secondary Button Label
                <span className={styles.labelHint}>Text for optional secondary button</span>
              </label>
              <input
                type="text"
                value={formData.secondaryButton?.label || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  secondaryButton: {
                    ...prev.secondaryButton,
                    label: e.target.value,
                    href: prev.secondaryButton?.href || '',
                    variant: prev.secondaryButton?.variant || 'secondary',
                  }
                }))}
                placeholder="e.g., View Menu, Contact Us"
                className={styles.textInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Secondary Button Link
                <span className={styles.labelHint}>URL or page path for secondary button</span>
              </label>
              <input
                type="text"
                value={formData.secondaryButton?.href || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  secondaryButton: {
                    ...prev.secondaryButton,
                    label: prev.secondaryButton?.label || '',
                    href: e.target.value,
                    variant: prev.secondaryButton?.variant || 'secondary',
                  }
                }))}
                placeholder="https://example.com or /contact"
                className={styles.textInput}
              />
            </div>
          </div>
        </div>

        {/* Colors & Styling */}
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
            <input
              type="color"
              value={formData.bgColor}
              onChange={(e) => setFormData(prev => ({ ...prev, bgColor: e.target.value }))}
              className={styles.textInput}
              style={{ height: '50px', cursor: 'pointer' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Text Color
              <span className={styles.labelHint}>Text and heading color</span>
            </label>
            <input
              type="color"
              value={formData.textColor}
              onChange={(e) => setFormData(prev => ({ ...prev, textColor: e.target.value }))}
              className={styles.textInput}
              style={{ height: '50px', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              <>
                <span>💾</span>
                {isNewSection ? 'Create Custom Section' : 'Save Custom Section Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.success : styles.error}`}>
          <span style={{ fontSize: '1.25rem' }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          {toast.message}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className={styles.modal} onClick={() => setShowPreview(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px' }}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Custom Section Preview
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
              {formData.headline ||
               formData.subheadline ||
               formData.description ||
               formData.image?.url ||
               formData.backgroundImage ||
               formData.videoUrl ||
               formData.primaryButton?.label ||
               formData.secondaryButton?.label ? (
                <CustomSection {...formData} />
              ) : (
                <div style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    No Content Yet
                  </h3>
                  <p style={{ fontSize: '0.875rem' }}>
                    Add content, images, or buttons to see the preview
                  </p>
                </div>
              )}
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

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelect={handleImageSelect}
        restaurantId={restaurantId}
        title="Select Image"
        description="Choose an image from your media library"
      />
    </div>
  );
}