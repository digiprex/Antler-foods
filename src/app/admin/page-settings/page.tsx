'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

// Import dynamic components for previews
import DynamicHero from '@/components/dynamic-hero';
import DynamicGallery from '@/components/dynamic-gallery';
import DynamicReviews from '@/components/dynamic-reviews';
import DynamicTimeline from '@/components/dynamic-timeline';
import DynamicFAQ from '@/components/dynamic-faq';
import DynamicLocation from '@/components/dynamic-location';
import DynamicScrollingText from '@/components/dynamic-scrolling-text';
import DynamicCustomCode from '@/components/dynamic-custom-code';
import DynamicForm from '@/components/dynamic-form';

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
  const [loading, setLoading] = useState(true);
  const [isHomePage, setIsHomePage] = useState<boolean>(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{ name: string; templateId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pagePublished, setPagePublished] = useState<boolean>(false);
  const [updatingPublish, setUpdatingPublish] = useState(false);

  // Function to render section preview based on category
  const renderSectionPreview = (category: string) => {
    if (!restaurantId || !pageId) return null;

    const previewStyle = {
      maxHeight: '400px',
      overflow: 'auto',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#f9fafb'
    } as React.CSSProperties;

    switch (category.toLowerCase()) {
      case 'hero':
        return (
          <div style={previewStyle}>
            <DynamicHero restaurantId={restaurantId} showLoading={false} />
          </div>
        );
      case 'gallery':
        return (
          <div style={previewStyle}>
            <DynamicGallery restaurantId={restaurantId} />
          </div>
        );
      case 'reviews':
        return (
          <div style={previewStyle}>
            <DynamicReviews restaurantId={restaurantId} pageId={pageId} />
          </div>
        );
      case 'youtube':
        return (
          <div style={previewStyle}>
            {(() => {
              const config = sectionConfigs.get('YouTube Settings');
              if (config && config.videoUrl) {
                // Extract video ID from URL
                const videoId = config.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];

                if (videoId) {
                  return (
                    <div style={{
                      padding: '20px',
                      backgroundColor: config.bgColor || '#000000',
                      color: config.textColor || '#ffffff'
                    }}>
                      {config.showTitle && config.title && (
                        <div style={{
                          marginBottom: '20px',
                          textAlign: 'center'
                        }}>
                          <h2 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            margin: '0 0 8px 0'
                          }}>
                            {config.title}
                          </h2>
                          {config.description && (
                            <p style={{
                              fontSize: '14px',
                              opacity: 0.9,
                              margin: 0
                            }}>
                              {config.description}
                            </p>
                          )}
                        </div>
                      )}
                      <div style={{
                        position: 'relative',
                        paddingBottom: config.aspectRatio === '16:9' ? '56.25%' : '75%',
                        height: 0,
                        overflow: 'hidden',
                        maxWidth: config.maxWidth || '1200px',
                        margin: '0 auto',
                        borderRadius: '8px'
                      }}>
                        <iframe
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none'
                          }}
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=${config.controls ? 1 : 0}&loop=${config.loop ? 1 : 0}&mute=${config.mute ? 1 : 0}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube video preview"
                        />
                      </div>
                    </div>
                  );
                }
              }

              return (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                  🎥 YouTube Video Section
                  <br />
                  <small>Configure section to see video preview</small>
                </div>
              );
            })()}
          </div>
        );
      case 'timeline':
        return (
          <div style={previewStyle}>
            <DynamicTimeline restaurantId={restaurantId} pageId={pageId} />
          </div>
        );
      case 'faq':
        return (
          <div style={previewStyle}>
            <DynamicFAQ
              restaurantId={restaurantId}
              showLoading={false}
              fallbackConfig={{
                faqs: [
                  { id: '1', question: 'What are your opening hours?', answer: 'We are open daily from 11 AM to 10 PM.' },
                  { id: '2', question: 'Do you take reservations?', answer: 'Yes, we accept reservations. Please call us or book online.' }
                ],
                layout: 'accordion',
                title: 'Frequently Asked Questions',
                subtitle: 'Find answers to common questions'
              }}
            />
          </div>
        );
      case 'location':
        return (
          <div style={previewStyle}>
            <DynamicLocation restaurantId={restaurantId} pageId={pageId} />
          </div>
        );
      case 'scrollingtext':
        return (
          <div style={previewStyle}>
            <DynamicScrollingText restaurantId={restaurantId} pageId={pageId} showLoading={false} />
          </div>
        );
      case 'customcode':
        return (
          <div style={previewStyle}>
            <DynamicCustomCode restaurantId={restaurantId} pageId={pageId} showLoading={false} />
          </div>
        );
      case 'form':
        return (
          <div style={previewStyle}>
            <DynamicForm restaurantId={restaurantId} pageId={pageId} showLoading={false} />
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

      // Fetch page details to get published status
      try {
        const pageResponse = await fetch(`/api/web-pages/${pageId}`);
        const pageData = await pageResponse.json();
        if (pageData.success && pageData.data) {
          setPagePublished(pageData.data.published || false);
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
                console.log(`✓ Added section: ${section.name} (enabled: ${enabled}, isEnabled: ${isEnabled})`);

                // Store the template config and full template data
                setSectionConfigs(prev => new Map(prev.set(section.name, template.config)));
                setSectionTemplates(prev => new Map(prev.set(section.name, template)));
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
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }

      setExistingSections(existing);
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
  const existingSectionsData = sectionsData
    .filter(section => existingSections.has(section.name))
    .map(section => {
      const template = sectionTemplates.get(section.name);
      return {
        ...section,
        order_index: template?.order_index ?? 999,
        template_id: template?.template_id
      };
    })
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

  const availableSectionsData = sectionsData.filter(section =>
    !existingSections.has(section.name)
  );

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

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (restaurantId) params.set('restaurant_id', restaurantId);
                if (restaurantName) params.set('restaurant_name', restaurantName);
                router.push(`/admin/pages?${params.toString()}`);
              }}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              <span className="text-lg">←</span>
              <span>Back to Pages List</span>
            </button>
          </div>

          <div className="flex justify-between items-center gap-3 mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {pageNameParam ? `Edit ${pageNameParam}` : 'Edit Page Settings'}
              </h1>
              {isHomePage && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                  🏠 Home Page
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePublish}
                disabled={updatingPublish}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium ${
                  pagePublished
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {updatingPublish ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : pagePublished ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Unpublish
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Manage SEO
              </button>
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Section
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Manage sections configured for this page. Click on any section to configure it.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading sections...</div>
          </div>
        ) : (
          <>
            {/* Existing Sections */}
            {existingSectionsData.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Added Sections</h2>
                <div className="space-y-6">
                  {existingSectionsData.map((section, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-green-200 rounded-lg shadow hover:shadow-md transition-all group"
                    >
                      {/* Section Header */}
                      <div className="p-5 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-semibold text-gray-900">{section.name}</div>
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex-shrink-0">
                                ✓ Added
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-3">{section.description}</div>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-medium text-gray-500">Layout:</span>
                              {(() => {
                                const config = sectionConfigs.get(section.name);
                                console.log(`Layout debug for ${section.name}:`, config);
                                
                                // Try multiple possible layout field names
                                const selectedLayout =
                                  config?.layout ||
                                  config?.layoutType ||
                                  config?.selectedLayout ||
                                  config?.layoutStyle ||
                                  config?.displayLayout ||
                                  'Default';
                                
                                return (
                                  <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded font-medium">
                                    {selectedLayout}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {/* Order Controls */}
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveSectionUp(idx);
                                }}
                                disabled={idx === 0}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                title="Move up"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Up
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveSectionDown(idx);
                                }}
                                disabled={idx === existingSectionsData.length - 1}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                title="Move down"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Down
                              </button>
                            </div>
                            
                            {/* Order Index Display */}
                            <div className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded">
                              #{idx + 1}
                            </div>

                            {/* Action Buttons */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`${section.route}?${paramsString}`);
                              }}
                              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(section.name, section.template_id);
                              }}
                              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div className="p-5">
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span className="text-green-600">👁️</span>
                            Live Preview - How it appears to customers
                          </h4>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          {renderSectionPreview(section.category)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

        {/* Add Section Modal */}
        {showAddSectionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Add New Section</h2>
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableSectionsData.map((section, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-green-400 cursor-pointer"
                      onClick={() => {
                        const params = buildParams();
                        router.push(`${section.route}?${params}`);
                        setShowAddSectionModal(false);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">{section.name}</div>
                          <div className="text-sm text-gray-600">{section.description}</div>
                        </div>
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {section.layouts.slice(0, 3).map((layout: string, layoutIdx: number) => (
                          <span key={layoutIdx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {layout}
                          </span>
                        ))}
                        {section.layouts.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            +{section.layouts.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
                  Are you sure you want to delete <strong>{sectionToDelete.name}</strong>? This will soft delete the section and it can be restored from the database if needed.
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
