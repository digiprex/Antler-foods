'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import '@/styles/page-settings-animations.css';

// Import dynamic components for previews
import DynamicHero from '@/components/dynamic-hero';
import DynamicMenu from '@/components/dynamic-menu';
import DynamicGallery from '@/components/dynamic-gallery';
import DynamicReviews from '@/components/dynamic-reviews';
import DynamicTimeline from '@/components/dynamic-timeline';
import DynamicFAQ from '@/components/dynamic-faq';
import DynamicLocation from '@/components/dynamic-location';
import DynamicScrollingText from '@/components/dynamic-scrolling-text';
import DynamicCustomCode from '@/components/dynamic-custom-code';
import DynamicForm from '@/components/dynamic-form';
import CustomSection from '@/components/custom-section';
import DynamicYouTube from '@/components/dynamic-youtube';

export default function PageSettingsSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  const pageNameParam = searchParams.get('page_name');
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

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicHero
                restaurantId={restaurantId}
                configData={heroConfigWithLayout}
                showLoading={false}
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

        const galleryConfigWithLayout = config ? {
          ...config,
          layout: galleryTemplate?.name || config.layout || 'grid'
        } : undefined;

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
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

        const faqConfigWithLayout = config ? {
          ...config,
          layout: faqTemplate?.name || config?.layout || 'accordion',
          faqs: config.faqs || []
        } : undefined;

        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
              <DynamicFAQ
                restaurantId={restaurantId}
                pageId={pageId}
                configData={faqConfigWithLayout}
                showLoading={false}
              />
            </div>
          </div>
        );
      case 'location':
        return (
          <div style={previewStyle}>
            <div style={zoomContainerStyle}>
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
              />
            </div>
          </div>
        );
      case 'customsection':
        // Get the template to extract layout from template.name
        const customSectionTemplate = sectionTemplates.get(templateId || '');
        const customSectionConfigWithLayout = config ? {
          ...config,
          layout: customSectionTemplate?.name || config.layout || 'layout-1'
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
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              🔍 SEO Settings
              <br />
              <small>Meta tags and social sharing configuration</small>
            </div>
          </div>
        );
      default:
        return (
          <div style={previewStyle}>
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              🎨 Section Preview
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
      name: 'Hero Settings',
      category: 'Hero',
      description: 'Configure hero content and media for this page',
      route: '/admin/hero-settings',
      layouts: ['Centered', 'Split', 'Full Width', 'Video Background', 'Minimal', 'Card Style']
    },
    {
      name: 'Menu Settings',
      category: 'Menu',
      description: 'Configure menu layout, categories, and items for this page',
      route: '/admin/menu-settings',
      layouts: ['Grid', 'List', 'Masonry', 'Carousel', 'Tabs', 'Accordion', 'Two Column', 'Single Column', 'Featured Grid', 'Minimal']
    },
    {
      name: 'FAQ Settings',
      category: 'FAQ',
      description: 'Manage frequently asked questions for this page',
      route: '/admin/faq-settings',
      layouts: ['Accordion', 'Grid', 'Two Column']
    },
    {
      name: 'Gallery Settings',
      category: 'Gallery',
      description: 'Configure image gallery layout and content for this page',
      route: '/admin/gallery-settings',
      layouts: ['Grid', 'Masonry', 'Carousel', 'Stacked']
    },
    {
      name: 'Review Settings',
      category: 'Reviews',
      description: 'Configure customer reviews display and layout for this page',
      route: '/admin/review-settings',
      layouts: ['Grid', 'Carousel', 'Masonry', 'List']
    },
    {
      name: 'YouTube Settings',
      category: 'YouTube',
      description: 'Configure YouTube video display and layout for this page',
      route: '/admin/youtube-settings',
      layouts: ['Single Video', 'Grid', 'Carousel']
    },
    {
      name: 'Location Settings',
      category: 'Location',
      description: 'Configure restaurant locations display and layout for this page',
      route: '/admin/location-settings',
      layouts: ['Grid', 'List', 'Map Focus']
    },
    {
      name: 'Scrolling Text',
      category: 'ScrollingText',
      description: 'Configure scrolling text banner for this page',
      route: '/admin/scrolling-text-settings',
      layouts: ['Horizontal Scroll', 'Vertical Scroll']
    },
    {
      name: 'Custom Code',
      category: 'CustomCode',
      description: 'Add custom HTML/CSS/JS or iframe embed for this page',
      route: '/admin/custom-code-settings',
      layouts: ['HTML/CSS/JS', 'iframe Embed']
    },
    {
      name: 'Timeline',
      category: 'Timeline',
      description: 'Create a visual timeline to showcase your journey and milestones',
      route: '/admin/timeline-settings',
      layouts: ['Vertical', 'Horizontal', 'Compact']
    },
    {
      name: 'Form Display',
      category: 'Form',
      description: 'Configure form display with multiple layout options',
      route: '/admin/form-settings',
      layouts: ['Centered', 'Split Right', 'Split Left', 'Image Top', 'Background Image']
    },
    {
      name: 'Custom Section',
      category: 'CustomSection',
      description: 'Create custom content sections with 32 professional layout options',
      route: '/admin/custom-section-settings',
      layouts: ['Full-width Overlay', 'Split Left', 'Video Background', 'Curved Green', 'Circular Image', 'Split Right', 'Image Left', 'Centered Content', 'Large Image', 'Centered Top Image', 'Two Column', 'Boxed Content', 'Image Grid', 'Stacked Cards', 'Asymmetric Split', 'Featured Sidebar', 'Magazine Style', 'Overlapping Blocks', 'Modern Card', 'Split with Accent', 'Hero Bottom Content', 'Zigzag Pattern', 'Centered Side Panels', 'Full Screen Video', 'Grid Showcase', 'Minimal Centered', 'Split Diagonal', 'Triple Section', 'Layered Content', 'Full Width Banner', 'Image Carousel', 'Interactive Hover']
    }
  ];

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
              // If neither field exists, or if either is not explicitly false, consider it added
              const enabled = template.config?.enabled;
              const isEnabled = template.config?.isEnabled;

              // Show section as added if:
              // 1. No enabled field exists (template exists but no enable/disable functionality)
              // 2. enabled or isEnabled is explicitly true
              // 3. enabled or isEnabled is undefined (not set yet, but template exists)
              // Only hide if explicitly set to false
              if (enabled !== false && isEnabled !== false) {
                existing.add(section.name);
                templates.push({ ...template, section });
                console.log(`✓ Added section: ${section.name} (enabled: ${enabled}, isEnabled: ${isEnabled})`);

                // Store the template config and full template data
                setSectionConfigs(prev => new Map(prev.set(`${template.template_id}`, template.config)));
                setSectionTemplates(prev => new Map(prev.set(`${template.template_id}`, template)));
              } else {
                console.log(`✗ Skipped section (disabled): ${section.name} (enabled: ${enabled}, isEnabled: ${isEnabled})`);
              }
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
  }, [fetchPageAndSections]);

  // Sort existing sections by order_index
  const existingSectionsData = allTemplates
    .map(template => ({
      ...template.section,
      order_index: template.order_index ?? 999,
      template_id: template.template_id,
      config: template.config,
      layout: template.name // Add layout name from template.name
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
      } else {
        alert('Failed to update publish status: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      alert('Error updating publish status');
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
        alert('Page information updated successfully!');
      } else {
        alert('Failed to update page information: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating page information:', error);
      alert('Error updating page information');
    } finally {
      setUpdatingPageInfo(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-8">
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (restaurantId) params.set('restaurant_id', restaurantId);
                if (restaurantName) params.set('restaurant_name', restaurantName);
                router.push(`/admin/pages?${params.toString()}`);
              }}
              className="group inline-flex items-center gap-3 text-gray-600 hover:text-indigo-600 transition-all duration-200 text-sm font-medium bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md border border-gray-200 hover:border-indigo-200"
            >
              <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Pages List</span>
            </button>
          </div>

          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8 mb-8 animate-slide-in-down">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold gradient-text mobile-text-center">
                    {pageNameParam ? `Edit ${pageNameParam}` : 'Edit Page Settings'}
                  </h1>
                  {isHomePage && (
                    <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-sm font-bold rounded-full border border-purple-200 animate-pulse-slow self-start sm:self-center">
                      🏠 Home Page
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-base lg:text-lg leading-relaxed mobile-text-center">
                  Manage sections configured for this page. Click on any section to configure it.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mobile-full">
                <button
                  onClick={togglePublish}
                  disabled={updatingPublish}
                  className={`px-6 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                    pagePublished
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                >
                  {updatingPublish ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Updating...
                    </>
                  ) : pagePublished ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                      Unpublish
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Publish
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const params = buildParams();
                    router.push(`/admin/seo-settings?${params}`);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Manage SEO
                </button>
                <button
                  onClick={() => setShowAddSectionModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Section
                </button>
              </div>
            </div>
          </div>

          {/* Page Information Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Page Information</h3>
              </div>
              {!editingPageInfo ? (
                <button
                  onClick={() => setEditingPageInfo(true)}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingPageInfo(false);
                      fetchPageAndSections();
                    }}
                    disabled={updatingPageInfo}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePageInfo}
                    disabled={updatingPageInfo}
                    className="px-4 py-2 text-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 font-semibold shadow-md hover:shadow-lg"
                  >
                    {updatingPageInfo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">Page Name</label>
                  <div className="text-lg text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                    {pageName || 'Not set'}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">URL Slug</label>
                  <div className="text-lg text-gray-900 font-mono bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                    /{pageSlug || 'not-set'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="page-name-input" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Page Name *
                  </label>
                  <input
                    id="page-name-input"
                    type="text"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="About Us"
                    required
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="page-slug-input" className="block text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    URL Slug *
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all duration-200">
                    <span className="px-4 text-lg text-gray-500 border-r border-gray-300 font-mono">/</span>
                    <input
                      id="page-slug-input"
                      type="text"
                      value={pageSlug}
                      onChange={(e) => setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 px-4 py-3 text-lg focus:outline-none font-mono"
                      placeholder="about-us"
                      pattern="[a-z0-9-]+"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Only lowercase letters, numbers, and hyphens
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Page Visibility Settings */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Page Visibility</h3>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                !pagePublished
                  ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
                  : 'cursor-pointer border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
              } group`}>
                <input
                  type="checkbox"
                  checked={showOnNavbar}
                  onChange={toggleNavbarVisibility}
                  disabled={updatingVisibility || !pagePublished}
                  className="w-5 h-5 text-purple-600 bg-white border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-700 select-none transition-colors duration-200">
                  Show in Navbar
                </span>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                !pagePublished
                  ? 'cursor-not-allowed opacity-60 border-gray-200 bg-gray-50'
                  : 'cursor-pointer border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
              } group`}>
                <input
                  type="checkbox"
                  checked={showOnFooter}
                  onChange={toggleFooterVisibility}
                  disabled={updatingVisibility || !pagePublished}
                  className="w-5 h-5 text-purple-600 bg-white border-gray-300 rounded-lg focus:ring-purple-500 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-700 select-none transition-colors duration-200">
                  Show in Footer
                </span>
              </label>
            </div>
            {!pagePublished ? (
              <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl text-amber-800 flex items-start gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-sm">Publication Required</p>
                  <p className="text-sm mt-1">
                    This page must be <strong>published</strong> before it can appear in the navbar or footer.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-4 bg-gray-50 p-3 rounded-xl">
                💡 Control where this page appears in your site navigation
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin"></div>
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Page Sections</h3>
                <p className="text-gray-600">Please wait while we fetch your page configuration...</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Existing Sections */}
            {existingSectionsData.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Active Sections</h2>
                      <p className="text-gray-600">
                        {existingSectionsData.length} section{existingSectionsData.length !== 1 ? 's' : ''} configured for this page
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-xl font-medium">
                    Drag to reorder • Click to edit
                  </div>
                </div>
                <div className="space-y-6">
                  {existingSectionsData.map((section, idx) => (
                    <div
                      key={section.template_id}
                      className="stagger-item bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 group overflow-hidden hover-lift animate-fade-in"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      {/* Section Header */}
                      <div className="p-4 lg:p-6 border-b-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <div className="font-bold text-base lg:text-lg text-gray-900">{section.name}</div>
                              <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full font-semibold flex-shrink-0 border border-green-200">
                                ✓ Active
                              </span>
                              {(() => {
                                // Count instances of this section type
                                const instanceCount = existingSectionsData.filter(s => s.category === section.category).length;
                                if (instanceCount > 1) {
                                  const instanceNumber = existingSectionsData.filter(s => s.category === section.category).findIndex(s => s.template_id === section.template_id) + 1;
                                  return (
                                    <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-full font-semibold flex-shrink-0 border border-purple-200">
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
                                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full font-semibold border border-blue-200">
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
                            <div className="text-xs text-gray-700 px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg font-bold border border-indigo-200 text-center min-w-[50px]">
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
                                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg hover-lift"
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
                            <span className="text-lg">👁️</span>
                            Live Preview
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">How it appears to your customers</p>
                        </div>
                        <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white shadow-inner">
                          {renderSectionPreview(section.category, section.config, section.template_id)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Sections Added Yet</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Get started by adding your first section to this page. Choose from our variety of pre-built components.
                  </p>
                  <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Your First Section
                  </button>
                </div>
              </div>
            )}

          </>
        )}

        {/* Add Section Modal */}
        {showAddSectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Add New Section</h2>
                      <p className="text-gray-600 mt-1">Choose from our collection of professional section types</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddSectionModal(false)}
                    className="w-10 h-10 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center justify-center"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableSectionsData.map((section, idx) => (
                    <div
                      key={idx}
                      className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:border-green-400 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => {
                        const params = buildParams();
                        router.push(`${section.route}?${params}&new_section=true`);
                        setShowAddSectionModal(false);
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-bold text-lg text-gray-900 mb-2 group-hover:text-green-700 transition-colors duration-200">
                            {section.name}
                          </div>
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {section.description}
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center group-hover:from-green-500 group-hover:to-emerald-600 transition-all duration-200">
                          <svg className="w-5 h-5 text-green-600 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {section.layouts.slice(0, 3).map((layout: string, layoutIdx: number) => (
                          <span key={layoutIdx} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium group-hover:bg-green-100 group-hover:text-green-700 transition-colors duration-200">
                            {layout}
                          </span>
                        ))}
                        {section.layouts.length > 3 && (
                          <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full font-medium">
                            +{section.layouts.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 bg-white flex justify-end">
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-200 font-medium"
                >
                  Close
                </button>
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

      </div>
    </DashboardLayout>
  );
}
