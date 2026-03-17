'use client';

import { Suspense } from 'react';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import Toast from '@/components/ui/toast';
import '@/styles/page-settings-animations.css';
import {
  GALLERY_LAYOUT_OPTIONS,
  normalizeGalleryLayout,
} from '@/components/gallery-layouts/gallery-layout-options';
import { CUSTOM_SECTION_LAYOUT_VALUES } from '@/types/custom-section.types';

// Dynamically import preview components for better performance
// These are only loaded when section previews are needed
const DynamicHero = dynamic(() => import('@/components/dynamic-hero'), { ssr: false });
const DynamicMenu = dynamic(() => import('@/components/dynamic-menu'), { ssr: false });
const DynamicGallery = dynamic(() => import('@/components/dynamic-gallery'), { ssr: false });
const DynamicReviews = dynamic(() => import('@/components/dynamic-reviews'), { ssr: false });
const DynamicTimeline = dynamic(() => import('@/components/dynamic-timeline'), { ssr: false });
const DynamicFAQ = dynamic(() => import('@/components/dynamic-faq'), { ssr: false });
const DynamicLocation = dynamic(() => import('@/components/dynamic-location'), { ssr: false });
const DynamicScrollingText = dynamic(() => import('@/components/dynamic-scrolling-text'), { ssr: false });
const DynamicCustomCode = dynamic(() => import('@/components/dynamic-custom-code'), { ssr: false });
const DynamicForm = dynamic(() => import('@/components/dynamic-form'), { ssr: false });
const CustomSection = dynamic(() => import('@/components/custom-section'), { ssr: false });
const DynamicYouTube = dynamic(() => import('@/components/dynamic-youtube'), { ssr: false });

function PageSettingsSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id');
  const restaurantName = searchParams?.get('restaurant_name');
  const pageId = searchParams?.get('page_id');
  const pageNameParam = searchParams?.get('page_name');
  const [existingSections, setExistingSections] = useState<Set<string>>(new Set());
  const [sectionConfigs, setSectionConfigs] = useState<Map<string, any>>(new Map());
  const [sectionTemplates, setSectionTemplates] = useState<Map<string, any>>(new Map());
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHomePage, setIsHomePage] = useState<boolean>(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{ name: string; templateId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagePublished, setPagePublished] = useState<boolean>(false);
  const [updatingPublish, setUpdatingPublish] = useState(false);
  const [showOnNavbar, setShowOnNavbar] = useState<boolean>(false);
  const [showOnFooter, setShowOnFooter] = useState<boolean>(false);
  const [updatingVisibility, setUpdatingVisibility] = useState(false);
  const [pageName, setPageName] = useState<string>('');
  const [pageSlug, setPageSlug] = useState<string>('');
  const [editingPageInfo, setEditingPageInfo] = useState(false);
  const [updatingPageInfo, setUpdatingPageInfo] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState('');
  const [publishStatus, setPublishStatus] = useState<{
    hasUnpublishedSections: boolean;
    hasCustomDomain: boolean;
    showPublishButton: boolean;
  } | null>(null);
  const [publishingChanges, setPublishingChanges] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  // Function to render section preview based on category
  const renderSectionPreview = (category: string, config?: any, templateId?: string) => {
    if (!restaurantId || !pageId) return null;

    const previewStyle = {
      maxHeight: '400px',
      overflow: 'hidden',
      width: '100%',
      borderRadius: '8px',
    } as React.CSSProperties;

    const zoomContainerStyle = {
      transform: 'scale(0.65)',
      transformOrigin: 'top left',
      width: '153.85%', // 100% / 0.65 to compensate for scale
      height: 'auto',
    } as React.CSSProperties;

    const createScaledPreviewStyle = (scale: number) => ({
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      width: `${(100 / scale).toFixed(2)}%`,
      height: 'auto',
    } as React.CSSProperties);

    const previewViewportHeight = 720;
    const resolvePreviewHeightPx = (value: unknown, fallbackPx: number) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value !== 'string') {
        return fallbackPx;
      }

      const normalizedValue = value.trim().toLowerCase();
      const match = normalizedValue.match(/^(-?\d*\.?\d+)(px|rem|vh|svh|dvh|lvh)?$/);

      if (!match) {
        return fallbackPx;
      }

      const amount = Number(match[1]);
      const unit = match[2] || 'px';

      if (!Number.isFinite(amount)) {
        return fallbackPx;
      }

      if (unit === 'px') {
        return amount;
      }

      if (unit === 'rem') {
        return amount * 16;
      }

      if (unit === 'vh' || unit === 'svh' || unit === 'dvh' || unit === 'lvh') {
        return (amount / 100) * previewViewportHeight;
      }

      return fallbackPx;
    };

    switch (category.toLowerCase()) {
      case 'hero':
        // Get the template to extract layout from template.name
        const heroTemplate = sectionTemplates.get(templateId || '');

        // Debug logging
        console.log('Hero Preview Debug:', {
          templateId,
          hasTemplate: !!heroTemplate,
          templateName: heroTemplate?.name,
          configLayout: config?.layout,
          finalLayout: heroTemplate?.name || config?.layout
        });

        const heroConfigWithLayout = config ? {
          ...config,
          layout: heroTemplate?.name || config.layout
        } : undefined;

        const heroLayout = (heroTemplate?.name || config?.layout || 'default').toLowerCase();
        const usesFullViewportHero =
          heroLayout === 'video-background' || heroLayout === 'full-height';
        const heroMinHeightPx = resolvePreviewHeightPx(
          heroConfigWithLayout?.minHeight || config?.minHeight || '600px',
          600,
        );
        const heroRawHeight = usesFullViewportHero
          ? Math.max(heroMinHeightPx, previewViewportHeight)
          : heroMinHeightPx;
        const targetHeroPreviewHeight = usesFullViewportHero ? 360 : 340;
        const heroPreviewScale = Math.min(0.6, targetHeroPreviewHeight / heroRawHeight);
        const heroPreviewHeight = Math.max(
          220,
          Math.round(heroRawHeight * heroPreviewScale),
        );
        const heroPreviewStyle = {
          ...previewStyle,
          height: `${heroPreviewHeight}px`,
          maxHeight: `${heroPreviewHeight}px`,
          overflow: 'hidden',
        } as React.CSSProperties;
        const heroZoomContainerStyle = createScaledPreviewStyle(heroPreviewScale);

        return (
          <div style={heroPreviewStyle}>
            <div style={heroZoomContainerStyle}>
              <DynamicHero
                restaurantId={restaurantId}
                configData={heroConfigWithLayout}
                showLoading={false}
                previewMode="desktop"
              />
            </div>
          </div>
        );
      case 'menu':
        // Get the template to extract layout from template.name
        const menuTemplate = sectionTemplates.get(templateId || '');

        // Debug logging
        console.log('Menu Preview Debug:', {
          templateId,
          hasTemplate: !!menuTemplate,
          templateName: menuTemplate?.name,
          configLayout: config?.layout,
          finalLayout: menuTemplate?.name || config?.layout
        });

        const menuConfigWithLayout = config ? {
          ...config,
          layout: menuTemplate?.name || config.layout
        } : undefined;

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicMenu
                restaurantId={restaurantId}
                configData={menuConfigWithLayout}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'gallery':
        // Get the template to extract layout from template.name
        const galleryTemplate = sectionTemplates.get(templateId || '');

        // Debug logging
        console.log('Gallery Preview Debug:', {
          templateId,
          hasTemplate: !!galleryTemplate,
          templateName: galleryTemplate?.name,
          configLayout: config?.layout,
          finalLayout: galleryTemplate?.name || config?.layout || 'grid'
        });

        const finalGalleryLayout = normalizeGalleryLayout(
          (galleryTemplate?.name || config?.layout || 'grid') as any,
        );
        const galleryConfigWithLayout = config ? {
          ...config,
          layout: finalGalleryLayout
        } : undefined;

        const galleryPreviewHeights: Record<string, string> = {
          showcase: '560px',
          masonry: '560px',
          mosaic: '540px',
          editorial: '520px',
          spotlight: '520px',
          filmstrip: '500px',
        };

        const galleryPreviewScales: Record<string, number> = {
          showcase: 0.58,
          grid: 0.65,
          masonry: 0.58,
          carousel: 0.64,
          spotlight: 0.6,
          mosaic: 0.58,
          editorial: 0.6,
          filmstrip: 0.61,
        };

        const galleryPreviewStyle = {
          ...previewStyle,
          maxHeight: galleryPreviewHeights[finalGalleryLayout] || previewStyle.maxHeight,
          overflowY: galleryPreviewHeights[finalGalleryLayout] ? 'auto' : 'hidden',
          overflowX: 'hidden',
        } as React.CSSProperties;

        const galleryZoomScale = galleryPreviewScales[finalGalleryLayout] || 0.65;
        const galleryZoomContainerStyle = {
          transform: `scale(${galleryZoomScale})`,
          transformOrigin: 'top left',
          width: `${(100 / galleryZoomScale).toFixed(2)}%`,
          height: 'auto',
        } as React.CSSProperties;

        return (
          <div style={galleryPreviewStyle}>
            <div style={galleryZoomContainerStyle}>
              <DynamicGallery
                restaurantId={restaurantId}
                pageId={pageId}
                configData={galleryConfigWithLayout}
              />
            </div>
          </div>
        );
      case 'reviews':
        // Get the template to extract layout from template.name
        const reviewsTemplate = sectionTemplates.get(templateId || '');

        // Debug logging
        console.log('Reviews Preview Debug:', {
          templateId,
          hasTemplate: !!reviewsTemplate,
          templateName: reviewsTemplate?.name,
          configLayout: config?.layout,
          finalLayout: reviewsTemplate?.name || config?.layout || 'grid'
        });

        const reviewsConfigWithLayout = config ? {
          ...config,
          layout: reviewsTemplate?.name || config?.layout || 'grid'
        } : undefined;

        return (
          <div style={previewStyle}>
            <DynamicReviews
              restaurantId={restaurantId}
              pageId={pageId}
              templateId={templateId}
              configData={reviewsConfigWithLayout}
            />
            <div style={zoomContainerStyle}>
              <DynamicReviews
                restaurantId={restaurantId}
                pageId={pageId}
                configData={reviewsConfigWithLayout}
              />
            </div>
          </div>
        );
      case 'youtube':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicYouTube
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                configData={config}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'timeline':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicTimeline
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'faq':
        // Get the template to extract layout from template.name
        const faqTemplate = sectionTemplates.get(templateId || '');

        // Debug logging
        console.log('FAQ Preview Debug:', {
          templateId,
          hasTemplate: !!faqTemplate,
          templateName: faqTemplate?.name,
          configLayout: config?.layout,
          finalLayout: faqTemplate?.name || config?.layout || 'accordion',
          faqsCount: config?.faqs?.length || 0
        });

        const faqConfigWithLayout = faqTemplate ? {
          ...(config || {}),
          layout: faqTemplate?.name || config?.layout || 'accordion',
          faqs: config?.faqs || faqTemplate?.menu_items || []
        } : undefined;

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicFAQ
                restaurantId={restaurantId}
                pageId={pageId}
                configData={faqConfigWithLayout}
                showLoading={false}
                showPlaceholderWhenEmpty
                previewMode
              />
            </div>
          </div>
        );
      case 'location':
        const locationTemplate = sectionTemplates.get(templateId || '');
        const finalLocationLayout = (
          locationTemplate?.name ||
          config?.layout ||
          'default'
        ).toLowerCase();
        const locationPreviewHeights: Record<string, string> = {
          default: '460px',
          grid: '480px',
          list: '500px',
          map: '500px',
          cards: '470px',
          compact: '440px',
          sidebar: '500px',
          fullscreen: '560px',
        };
        const locationPreviewScales: Record<string, number> = {
          default: 0.52,
          grid: 0.56,
          list: 0.5,
          map: 0.54,
          cards: 0.56,
          compact: 0.58,
          sidebar: 0.52,
          fullscreen: 0.42,
        };
        const locationPreviewStyle = {
          ...previewStyle,
          maxHeight: locationPreviewHeights[finalLocationLayout] || '480px',
          overflowY: 'auto',
          overflowX: 'hidden',
        } as React.CSSProperties;
        const locationZoomContainerStyle = createScaledPreviewStyle(
          locationPreviewScales[finalLocationLayout] || 0.56,
        );

        return (
          <div style={locationPreviewStyle}>
            <div style={locationZoomContainerStyle}>
              <DynamicLocation
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'scrollingtext':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicScrollingText
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'customcode':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicCustomCode
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'form':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicForm
                restaurantId={restaurantId}
                pageId={pageId}
                templateId={templateId}
                showLoading={false}
                isPreview={true}
              />
            </div>
          </div>
        );
      case 'customsection':
        // Get the template to extract layout from template.name
        const customSectionTemplate = sectionTemplates.get(templateId || '');
        const customSectionLayoutCandidate = [
          config?.layout,
          customSectionTemplate?.name,
        ].find((value) =>
          typeof value === 'string' &&
          CUSTOM_SECTION_LAYOUT_VALUES.includes(value as any),
        ) as string | undefined;
        const customSectionConfigWithLayout = config ? {
          ...config,
          layout: customSectionLayoutCandidate || 'layout-1'
        } : undefined;

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <CustomSection
                {...customSectionConfigWithLayout}
                restaurant_id={restaurantId}
              />
            </div>
          </div>
        );
      case 'seo':
        return (
          <div style={previewStyle}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <svg style={{ width: '20px', height: '20px' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              SEO Settings
              <br />
              <small>Meta tags and social sharing configuration</small>
            </div>
          </div>
        );
      default:
        return (
          <div style={previewStyle}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <svg className="inline-block w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
              Section Preview
              <br />
              <small>Configure section to see preview</small>
            </div>
          </div>
        );
    }
  };

  const buildParams = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    if (pageNameParam) params.set('page_name', pageNameParam);
    return params.toString();
  };

  const paramsString = buildParams();

  const sectionsData = [
    {
      name: 'Hero',
      category: 'Hero',
      description: 'Configure hero content and media for this page',
      route: '/admin/hero-settings',
      layouts: ['Centered', 'Split', 'Full Width', 'Video Background', 'Minimal', 'Card Style']
    },
    {
      name: 'Customizable',
      category: 'CustomSection',
      description: 'Create custom content sections with 32 professional layout options',
      route: '/admin/custom-section-settings',
      layouts: ['Full-width Overlay', 'Split Left', 'Video Background', 'Curved Green', 'Circular Image', 'Split Right', 'Image Left', 'Centered Content', 'Large Image', 'Centered Top Image', 'Two Column', 'Boxed Content', 'Image Grid', 'Stacked Cards', 'Asymmetric Split', 'Featured Sidebar', 'Magazine Style', 'Overlapping Blocks', 'Modern Card', 'Split with Accent', 'Hero Bottom Content', 'Zigzag Pattern', 'Centered Side Panels', 'Full Screen Video', 'Grid Showcase', 'Minimal Centered', 'Split Diagonal', 'Triple Section', 'Layered Content', 'Full Width Banner', 'Image Carousel', 'Interactive Hover']
    },
    {
      name: 'Menu',
      category: 'Menu',
      description: 'Configure menu layout, categories, and items for this page',
      route: '/admin/menu-settings',
      layouts: ['Grid', 'List', 'Masonry', 'Carousel', 'Tabs', 'Accordion', 'Two Column', 'Single Column', 'Featured Grid', 'Minimal']
    },
    {
      name: 'Gallery',
      category: 'Gallery',
      description: 'Configure image gallery layout and content for this page',
      route: '/admin/gallery-settings',
      layouts: GALLERY_LAYOUT_OPTIONS.map((option) => option.name)
    },
    {
      name: 'Location Tracker',
      category: 'Location',
      description: 'Configure restaurant locations display and layout for this page',
      route: '/admin/location-settings',
      layouts: ['Grid', 'List', 'Map Focus']
    },
    {
      name: 'Google Review',
      category: 'Reviews',
      description: 'Configure customer reviews display and layout for this page',
      route: '/admin/review-settings',
      layouts: ['Grid', 'Carousel', 'Masonry', 'List']
    },
    {
      name: 'YouTube',
      category: 'YouTube',
      description: 'Configure YouTube video display and layout for this page',
      route: '/admin/youtube-settings',
      layouts: ['Single Video', 'Grid', 'Carousel']
    },
    {
      name: 'Custom Code/iFrame',
      category: 'CustomCode',
      description: 'Add custom HTML/CSS/JS or iframe embed for this page',
      route: '/admin/custom-code-settings',
      layouts: ['HTML/CSS/JS', 'iframe Embed']
    },
    {
      name: 'FAQ',
      category: 'FAQ',
      description: 'Manage frequently asked questions for this page',
      route: '/admin/faq-settings',
      layouts: ['Accordion', 'Grid', 'Two Column']
    },
    {
      name: 'Scrolling Text',
      category: 'ScrollingText',
      description: 'Configure scrolling text banner for this page',
      route: '/admin/scrolling-text-settings',
      layouts: ['Horizontal Scroll', 'Vertical Scroll']
    },
    {
      name: 'Timeline',
      category: 'Timeline',
      description: 'Create a visual timeline to showcase your journey and milestones',
      route: '/admin/timeline-settings',
      layouts: ['Alternating', 'Left Aligned', 'Right Aligned', 'Center']
    },
    {
      name: 'Form Display',
      category: 'Form',
      description: 'Configure form display with multiple layout options',
      route: '/admin/form-settings',
      layouts: ['Centered', 'Split Right', 'Split Left', 'Image Top', 'Background Image']
    },

  ];

  // Function to fetch publish status
  const fetchPublishStatus = useCallback(async () => {
    if (!restaurantId) return;

    try {
      const response = await fetch(`/api/publish-status?restaurant_id=${restaurantId}`);
      const data = await response.json();
      if (data.success) {
        setPublishStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching publish status:', error);
    }
  }, [restaurantId]);

  // Function to publish all changes
  const publishAllChanges = async () => {
    if (!restaurantId) return;

    setPublishingChanges(true);
    try {
      const response = await fetch('/api/publish-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });

      const data = await response.json();
      if (data.success) {
        setToastMessage(data.data.message);
        setToastType('success');
        setShowToast(true);
        // Refresh publish status
        await fetchPublishStatus();
      } else {
        setToastMessage('Failed to publish changes: ' + data.error);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error publishing changes:', error);
      setToastMessage('Error publishing changes');
      setToastType('error');
      setShowToast(true);
    } finally {
      setPublishingChanges(false);
    }
  };

  // Function to fetch page and sections data
  const fetchPageAndSections = useCallback(async () => {
    if (!restaurantId || !pageId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch page details to get published status and visibility
      try {
        const pageResponse = await fetch(`/api/web-pages/${pageId}`);
        const pageData = await pageResponse.json();
        if (pageData.success && pageData.data) {
          setPagePublished(pageData.data.published || false);
          setShowOnNavbar(pageData.data.show_on_navbar || false);
          setShowOnFooter(pageData.data.show_on_footer || false);
          setPageName(pageData.data.name || '');
          setPageSlug(pageData.data.url_slug || '');
        }
      } catch (err) {
        console.error('Error fetching page details:', err);
      }

      // Set page name from URL param or default
      if (pageNameParam) {
        // Check if it's the home page based on URL slug pattern
        // Home page typically has empty slug, '/', or 'home'
        const isHome = pageNameParam.toLowerCase() === 'home' ||
          pageNameParam === '/' ||
          pageNameParam === '';
        setIsHomePage(isHome);
      }

      const existing = new Set<string>();
      const templates: any[] = [];

      // Fetch all templates for this page from the templates table
      try {
        const templatesResponse = await fetch(
          `/api/page-templates?restaurant_id=${restaurantId}&page_id=${pageId}`
        );
        const templatesData = await templatesResponse.json();

        if (templatesData.success && templatesData.data) {
          console.log('Fetched templates:', templatesData.data.length);
          console.log('Available section categories:', sectionsData.map(s => s.category));

          // Map template categories to section names
          templatesData.data.forEach((template: any) => {
            console.log('Processing template:', {
              category: template.category,
              name: template.name,
              config: template.config,
              enabled: template.config?.enabled,
              isEnabled: template.config?.isEnabled
            });

            // Find matching section by category (case-insensitive match)
            const section = sectionsData.find(s =>
              s.category.toLowerCase() === template.category.toLowerCase()
            );

            if (section) {
              console.log(`Found matching section: ${section.name} for category: ${template.category}`);

              // Check both 'enabled' and 'isEnabled' fields (different sections use different field names)
              // Keep every configured template visible in the admin builder.
              // Frontend visibility still depends on enabled/isEnabled, but hiding it here
              // makes disabled sections impossible to find and re-enable.
              const enabled = template.config?.enabled;
              const isEnabled = template.config?.isEnabled;
              existing.add(section.name);
              templates.push({ ...template, section });
              console.log(`✓ Added section: ${section.name} (enabled: ${enabled}, isEnabled: ${isEnabled})`);

              // Store the template config and full template data
              setSectionConfigs(prev => new Map(prev.set(`${template.template_id}`, template.config)));
              setSectionTemplates(prev => new Map(prev.set(`${template.template_id}`, template)));
            } else {
              console.log(`✗ No matching section found for category: "${template.category}"`);
              console.log('Available categories:', sectionsData.map(s => `"${s.category}"`));
            }
          });

          console.log('Total sections added:', existing.size);
          console.log('Added sections:', Array.from(existing));
          console.log('Total templates:', templates.length);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }

      setExistingSections(existing);
      setAllTemplates(templates);
    } catch (error) {
      console.error('Error fetching page and sections:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, pageId, pageNameParam]);

  useEffect(() => {
    fetchPageAndSections();
    fetchPublishStatus();
  }, [fetchPageAndSections, fetchPublishStatus]);

  // Sort existing sections by order_index
  const existingSectionsData = allTemplates
    .map(template => ({
      ...template.section,
      order_index: template.order_index ?? 999,
      template_id: template.template_id,
      config: template.config,
      layout:
        (typeof template?.config?.layout === 'string' &&
          CUSTOM_SECTION_LAYOUT_VALUES.includes(template.config.layout as any))
          ? template.config.layout
          : template.name
    }))
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

  // All section types are always available (allow multiple instances)
  const availableSectionsData = sectionsData;

  // Function to update section order
  const updateSectionOrder = useCallback(async (templateId: string, newOrderIndex: number) => {
    const response = await fetch('/api/page-templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        order_index: newOrderIndex
      })
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to update section order');
    }
    return data;
  }, []);

  // Function to reorder all sections sequentially
  const reorderAllSections = useCallback(async (sections: any[]) => {
    try {
      // Update all sections with sequential order indices (1, 2, 3, 4...)
      const updates = sections.map((section, index) =>
        updateSectionOrder(section.template_id, index + 1)
      );
      await Promise.all(updates);

      // Refetch data to show new order
      await fetchPageAndSections();
    } catch (error) {
      console.error('Error reordering sections:', error);
      alert('Error updating section order');
    }
  }, [updateSectionOrder, fetchPageAndSections]);

  // Function to move section up
  const moveSectionUp = useCallback(async (sectionIndex: number) => {
    if (sectionIndex === 0) return; // Already at top

    // Create a new array with swapped positions
    const reorderedSections = [...existingSectionsData];
    const temp = reorderedSections[sectionIndex];
    reorderedSections[sectionIndex] = reorderedSections[sectionIndex - 1];
    reorderedSections[sectionIndex - 1] = temp;

    // Update all sections with sequential order indices
    await reorderAllSections(reorderedSections);
  }, [existingSectionsData, reorderAllSections]);

  // Function to move section down
  const moveSectionDown = useCallback(async (sectionIndex: number) => {
    if (sectionIndex === existingSectionsData.length - 1) return; // Already at bottom

    // Create a new array with swapped positions
    const reorderedSections = [...existingSectionsData];
    const temp = reorderedSections[sectionIndex];
    reorderedSections[sectionIndex] = reorderedSections[sectionIndex + 1];
    reorderedSections[sectionIndex + 1] = temp;

    // Update all sections with sequential order indices
    await reorderAllSections(reorderedSections);
  }, [existingSectionsData, reorderAllSections]);

  // Function to handle delete click
  const handleDeleteClick = (sectionName: string, templateId: string) => {
    setSectionToDelete({ name: sectionName, templateId });
    setShowDeleteModal(true);
  };

  // Function to confirm delete
  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/page-templates?template_id=${sectionToDelete.templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // Refresh sections list
        await fetchPageAndSections();
        setShowDeleteModal(false);
        setSectionToDelete(null);
      } else {
        alert('Failed to delete section: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Error deleting section');
    } finally {
      setDeleting(false);
    }
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSectionToDelete(null);
  };

  // Function to toggle publish status
  const togglePublish = async () => {
    if (!pageId) return;

    setUpdatingPublish(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: !pagePublished,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPagePublished(!pagePublished);
        setToastMessage(`Page ${!pagePublished ? 'published' : 'unpublished'} successfully`);
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage('Failed to update publish status: ' + data.error);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      setToastMessage('Error updating publish status');
      setToastType('error');
      setShowToast(true);
    } finally {
      setUpdatingPublish(false);
    }
  };

  const toggleNavbarVisibility = async () => {
    if (!pageId) return;

    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_on_navbar: !showOnNavbar,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowOnNavbar(!showOnNavbar);
      } else {
        alert('Failed to update navbar visibility: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating navbar visibility:', error);
      alert('Error updating navbar visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const toggleFooterVisibility = async () => {
    if (!pageId) return;

    setUpdatingVisibility(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_on_footer: !showOnFooter,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowOnFooter(!showOnFooter);
      } else {
        alert('Failed to update footer visibility: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating footer visibility:', error);
      alert('Error updating footer visibility');
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const handleSavePageInfo = async () => {
    if (!pageId) return;

    // Validate slug format
    const slugPattern = /^[a-z0-9-]+$/;
    if (pageSlug && !slugPattern.test(pageSlug)) {
      alert('URL slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    if (!pageName.trim()) {
      alert('Page name is required');
      return;
    }

    setUpdatingPageInfo(true);
    try {
      const response = await fetch(`/api/web-pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pageName.trim(),
          url_slug: pageSlug.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditingPageInfo(false);
        setToastMessage('Page information updated successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage('Failed to update page information: ' + data.error);
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error updating page information:', error);
      setToastMessage('Error updating page information');
      setToastType('error');
      setShowToast(true);
    } finally {
      setUpdatingPageInfo(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-700">Loading page settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {pageNameParam ? `Edit ${pageNameParam}` : 'Edit Page Settings'}
              </h1>
              {isHomePage && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Home Page
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">Manage and configure page sections</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (restaurantId) params.set('restaurant_id', restaurantId);
              if (restaurantName) params.set('restaurant_name', restaurantName);
              router.push(`/admin/pages?${params.toString()}`);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
            title="Back to Pages"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <button
            onClick={() => {
              const params = buildParams();
              router.push(`/admin/seo-settings?${params}`);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
            title="Manage SEO Settings"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            SEO
          </button>
          <button
            onClick={togglePublish}
            disabled={updatingPublish}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${pagePublished
              ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              : 'border border-purple-200 bg-white text-purple-700 hover:border-purple-300 hover:bg-purple-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={pagePublished ? 'Unpublish page' : 'Publish page'}
          >
            {updatingPublish ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                Updating...
              </>
            ) : pagePublished ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
                Unpublish
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </>
            )}
          </button>
          {publishStatus?.showPublishButton && (
            <button
              onClick={publishAllChanges}
              disabled={publishingChanges}
              className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Publish all unpublished changes"
            >
              {publishingChanges ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Publishing...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Publish Live
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowAddSectionModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
            title="Add Section"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Section
          </button>
        </div>
      </div>

      {/* Page Information Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Page Information</h3>
              <p className="mt-0.5 text-sm text-gray-600">Basic page details and URL</p>
            </div>
          </div>
          {!editingPageInfo ? (
            <button
              onClick={() => setEditingPageInfo(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingPageInfo(false);
                  fetchPageAndSections();
                }}
                disabled={updatingPageInfo}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePageInfo}
                disabled={updatingPageInfo}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700 disabled:opacity-50"
              >
                {updatingPageInfo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        {!editingPageInfo ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">Page Name</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900">
                {pageName || 'Not set'}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-900">URL Slug</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-900">
                /{pageSlug || 'not-set'}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="page-name-input" className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">Page Name</span>
                <span className="mt-0.5 block text-xs text-gray-600">Display name of the page</span>
              </label>
              <input
                id="page-name-input"
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500 cursor-not-allowed"
                placeholder="About Us"
                required
                disabled
              />
            </div>
            <div>
              <label htmlFor="page-slug-input" className="mb-2 block">
                <span className="text-sm font-semibold text-gray-900">URL Slug</span>
                <span className="mt-0.5 block text-xs text-gray-600">Appears in the page URL</span>
              </label>
              <div className="flex items-center rounded-lg border border-gray-300 bg-white transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500">
                <span className="border-r border-gray-300 px-3 font-mono text-sm text-gray-500">/</span>
                <input
                  id="page-slug-input"
                  type="text"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 px-4 py-2.5 font-mono text-sm focus:outline-none"
                  placeholder="about-us"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Page Visibility Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Page Visibility</h3>
            <p className="mt-0.5 text-sm text-gray-600">Control where this page appears</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${!pagePublished
            ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
            : 'hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50'
            }`}>
            <input
              type="checkbox"
              checked={showOnNavbar}
              onChange={toggleNavbarVisibility}
              disabled={updatingVisibility || !pagePublished}
              className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Show in Navbar</div>
              <div className="text-xs text-gray-600">Display link in navigation menu</div>
            </div>
          </label>
          <label className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${!pagePublished
            ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
            : 'hover:bg-purple-50/50 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50'
            }`}>
            <input
              type="checkbox"
              checked={showOnFooter}
              onChange={toggleFooterVisibility}
              disabled={updatingVisibility || !pagePublished}
              className="h-4 w-4 border-gray-300 text-purple-600 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Show in Footer</div>
              <div className="text-xs text-gray-600">Display link in footer menu</div>
            </div>
          </label>
        </div>
        {!pagePublished && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <svg className="h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">Publication Required</h4>
              <p className="mt-1 text-sm text-amber-700">
                This page must be published before it can appear in the navbar or footer.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Existing Sections */}
      {existingSectionsData.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Active Sections</h3>
              <p className="mt-0.5 text-sm text-gray-600">
                {existingSectionsData.length} section{existingSectionsData.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {existingSectionsData.map((section, idx) => {
              return (() => {
                const isVisibleOnPage =
                  section.config?.enabled !== false &&
                  section.config?.isEnabled !== false;

                return (
                  <div
                    key={section.template_id}
                    className="stagger-item bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all duration-300 group overflow-hidden hover-lift animate-fade-in"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {/* Section Header */}
                    <div className="p-4 lg:p-6 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <div className="font-bold text-base lg:text-lg text-gray-900">{section.name}</div>
                            <span
                              className={`text-xs px-3 py-1.5 rounded-full font-semibold flex-shrink-0 border flex items-center gap-1 ${
                                isVisibleOnPage
                                  ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-gradient-to-r from-amber-50 to-orange-100 text-orange-700 border-orange-200'
                              }`}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                {isVisibleOnPage ? (
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                ) : (
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.78-10.72a.75.75 0 10-1.06-1.06L10 8.94 7.28 6.22a.75.75 0 10-1.06 1.06L8.94 10l-2.72 2.72a.75.75 0 101.06 1.06L10 11.06l2.72 2.72a.75.75 0 001.06-1.06L11.06 10l2.72-2.72z" clipRule="evenodd" />
                                )}
                              </svg>
                              {isVisibleOnPage ? 'Active' : 'Hidden on page'}
                            </span>
                            {(() => {
                              // Count instances of this section type
                              const instanceCount = existingSectionsData.filter(s => s.category === section.category).length;
                              if (instanceCount > 1) {
                                const instanceNumber = existingSectionsData.filter(s => s.category === section.category).findIndex(s => s.template_id === section.template_id) + 1;
                                return (
                                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full font-semibold flex-shrink-0 border border-purple-200">
                                    Instance #{instanceNumber}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-sm text-gray-600 mb-3">{section.description}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Layout:</span>
                            {(() => {
                              // Layout is stored in template.name (section.layout)
                              // Fallback to config fields for backwards compatibility
                              const selectedLayout =
                                section.layout ||
                                section.config?.layout ||
                                section.config?.layoutType ||
                                section.config?.selectedLayout ||
                                section.config?.layoutStyle ||
                                section.config?.displayLayout ||
                                'Default';

                              return (
                                <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 rounded-full font-semibold border border-purple-200">
                                  {selectedLayout}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Order Controls */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionUp(idx);
                              }}
                              disabled={idx === 0}
                              className="px-2 py-1 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 font-medium shadow-sm min-w-[60px]"
                              title="Move up"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                              </svg>
                              <span className="hidden sm:inline">Up</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionDown(idx);
                              }}
                              disabled={idx === existingSectionsData.length - 1}
                              className="px-2 py-1 text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 font-medium shadow-sm min-w-[60px]"
                              title="Move down"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                              <span className="hidden sm:inline">Down</span>
                            </button>
                          </div>

                          {/* Order Index Display */}
                          <div className="text-xs text-gray-700 px-3 py-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg font-bold border border-purple-200 text-center min-w-[50px]">
                            #{idx + 1}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const editParams = new URLSearchParams(paramsString);
                                editParams.set('template_id', section.template_id);
                                router.push(`${section.route}?${editParams.toString()}`);
                              }}
                              className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg hover-lift"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(section.name, section.template_id);
                              }}
                              className="px-4 py-2 text-sm bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg hover-lift"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="p-6 bg-gray-50">
                      <div className="mb-4">
                        <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Show Preview
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {isVisibleOnPage
                            ? 'How it appears to your customers'
                            : 'Stored in the page builder, but currently hidden on the live page'}
                        </p>
                      </div>
                      <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner">
                        {renderSectionPreview(section.category, section.config, section.template_id)}
                      </div>
                    </div>
                  </div>
                );
              })();
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">No Sections Added Yet</h3>
            <p className="mx-auto max-w-md mb-6 text-sm text-gray-600">
              Get started by adding your first section to this page. Choose from our variety of pre-built components.
            </p>
            <button
              onClick={() => setShowAddSectionModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-purple-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Section
            </button>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Section</h2>
                    <p className="text-sm text-gray-600 mt-0.5">Choose from available section types</p>
                  </div>
                </div>
                <button
                  onClick={() => !navigating && setShowAddSectionModal(false)}
                  disabled={navigating}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableSectionsData.map((section, idx) => (
                  (() => {
                    const featuredCard =
                      section.category === 'ScrollingText' ||
                      section.category === 'Timeline' ||
                      section.category === 'Form';

                    const handleClick = () => {
                      if (navigating) return;
                      const params = buildParams();
                      const targetUrl = `${section.route}?${params}&new_section=true`;
                      setNavigationTarget(section.name);
                      setNavigating(true);
                      router.push(targetUrl);
                    };

                    return (
                      <div
                        key={idx}
                        className={`group text-left transition-all ${
                          featuredCard
                            ? `rounded-[26px] border bg-white p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] ${
                                navigating
                                  ? 'cursor-not-allowed border-slate-200 opacity-50'
                                  : 'cursor-pointer border-slate-200 hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_28px_80px_rgba(109,40,217,0.14)]'
                              }`
                            : `rounded-lg border-2 border-gray-200 bg-white p-6 ${
                                navigating
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer hover:border-purple-300 hover:bg-purple-50/50'
                              }`
                        }`}
                        onClick={handleClick}
                      >
                        {featuredCard ? (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">
                                  {section.name}
                                </div>
                                <div className="mt-1 text-xs leading-relaxed text-slate-600">
                                  {section.description}
                                </div>
                              </div>
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {section.layouts.slice(0, 3).map((layout: string, layoutIdx: number) => (
                                <span key={layoutIdx} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {layout}
                                </span>
                              ))}
                              {section.layouts.length > 3 ? (
                                <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                                  +{section.layouts.length - 3}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="mb-1 text-sm font-semibold text-gray-900">
                                  {section.name}
                                </div>
                                <div className="text-xs leading-relaxed text-gray-600">
                                  {section.description}
                                </div>
                              </div>
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 transition-colors group-hover:bg-purple-600">
                                <svg className="h-4 w-4 text-purple-600 transition-colors group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {section.layouts.slice(0, 3).map((layout: string, layoutIdx: number) => (
                                <span key={layoutIdx} className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                  {layout}
                                </span>
                              ))}
                              {section.layouts.length > 3 ? (
                                <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                                  +{section.layouts.length - 3}
                                </span>
                              ) : null}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()
                ))}
              </div>

              {/* Hidden prefetch links for faster navigation */}
              <div className="hidden">
                {availableSectionsData.map((section, idx) => {
                  const params = buildParams();
                  return (
                    <Link
                      key={idx}
                      href={`${section.route}?${params}&new_section=true`}
                      prefetch={true}
                    >
                      {section.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-white flex justify-end">
              <button
                onClick={() => !navigating && setShowAddSectionModal(false)}
                disabled={navigating}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Loading Overlay */}
      {navigating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 min-w-[300px]">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-1">
                Opening {navigationTarget}
              </p>
              <p className="text-sm text-gray-600">
                Please wait...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && sectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={cancelDelete} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-[#111827]">Delete Section</h3>
              </div>
              <p className="text-sm text-[#556678] leading-relaxed">
                Are you sure you want to delete <strong>{sectionToDelete.name}</strong>?
              </p>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  disabled={deleting}
                  className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#f7fafc] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Section'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </DashboardLayout>
  );
}

export default function PageSettingsSelectorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageSettingsSelector />
    </Suspense>
  );
}
