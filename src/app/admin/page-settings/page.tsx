'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function PageSettingsSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');
  const pageId = searchParams.get('page_id');
  const pageNameParam = searchParams.get('page_name');
  const [existingSections, setExistingSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pageName, setPageName] = useState<string>(pageNameParam || '');
  const [isHomePage, setIsHomePage] = useState<boolean>(false);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (restaurantId) params.set('restaurant_id', restaurantId);
    if (restaurantName) params.set('restaurant_name', restaurantName);
    if (pageId) params.set('page_id', pageId);
    if (pageName) params.set('page_name', pageName);
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
      category: 'Scrolling Text',
      description: 'Configure scrolling text banner for this page',
      route: '/admin/scrolling-text-settings',
      layouts: ['Horizontal Scroll', 'Vertical Scroll']
    },
    {
      name: 'Custom Code',
      category: 'Custom Code',
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
      name: 'SEO Settings',
      category: 'SEO',
      description: 'Configure meta title, description and social sharing image',
      route: '/admin/seo-settings',
      layouts: ['Meta Tags', 'Social Sharing', 'Open Graph']
    },
  ];

  useEffect(() => {
    const fetchPageAndSections = async () => {
      if (!restaurantId || !pageId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch page details to get page name (only if not in URL params)
        if (!pageNameParam) {
          try {
            const pageResponse = await fetch(
              `/api/web-pages?restaurant_id=${restaurantId}`
            );
            const pageData = await pageResponse.json();

            if (pageData.success && pageData.data) {
              const currentPage = pageData.data.find((page: any) => page.page_id === pageId);
              if (currentPage) {
                setPageName(currentPage.page_name || currentPage.url_slug || 'Unknown Page');
                // Check if this is the home page (url_slug is empty or '/')
                setIsHomePage(!currentPage.url_slug || currentPage.url_slug === '/' || currentPage.url_slug === '');
              }
            }
          } catch (err) {
            console.error('Error fetching page details:', err);
          }
        } else {
          // Check if it's home page by fetching page details
          try {
            const pageResponse = await fetch(
              `/api/web-pages?restaurant_id=${restaurantId}`
            );
            const pageData = await pageResponse.json();

            if (pageData.success && pageData.data) {
              const currentPage = pageData.data.find((page: any) => page.page_id === pageId);
              if (currentPage) {
                // Check if this is the home page (url_slug is empty or '/')
                setIsHomePage(!currentPage.url_slug || currentPage.url_slug === '/' || currentPage.url_slug === '');
              }
            }
          } catch (err) {
            console.error('Error fetching page details:', err);
          }
        }

        const existing = new Set<string>();

        // Fetch all templates for this page from the templates table
        try {
          const templatesResponse = await fetch(
            `/api/page-templates?restaurant_id=${restaurantId}&page_id=${pageId}`
          );
          const templatesData = await templatesResponse.json();

          if (templatesData.success && templatesData.data) {
            // Map template categories to section names
            templatesData.data.forEach((template: any) => {
              // Find matching section by category
              const section = sectionsData.find(s => s.category === template.category);
              if (section && template.config?.enabled !== false) {
                existing.add(section.name);
              }
            });
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
    };

    fetchPageAndSections();
  }, [restaurantId, pageId, pageNameParam]);

  const existingSectionsData = sectionsData.filter(section =>
    existingSections.has(section.name)
  );

  const availableSectionsData = sectionsData.filter(section =>
    !existingSections.has(section.name)
  );

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
            <h1 className="text-3xl font-bold">
              {pageName ? `Edit ${pageName}` : 'Edit Page Settings'}
            </h1>
            {isHomePage && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
                🏠 Home Page
              </span>
            )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {existingSectionsData.map((section, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white border border-green-200 rounded-lg shadow hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => router.push(`${section.route}?${paramsString}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{section.name}</div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded flex-shrink-0">
                          ✓ Added
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">{section.description}</div>
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs font-medium text-gray-500">Layouts:</span>
                        {section.layouts.map((layout, layoutIdx) => (
                          <span
                            key={layoutIdx}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded"
                          >
                            {layout}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Sections */}
            {availableSectionsData.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                  {existingSectionsData.length > 0 ? 'Available Sections' : 'Add Sections to Your Page'}
                </h2>
                {existingSectionsData.length === 0 && (
                  <p className="text-gray-600 mb-6">
                    Click on any section below to add and configure it for your page.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableSectionsData.map((section, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
                      onClick={() => router.push(`${section.route}?${paramsString}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{section.name}</div>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">{section.description}</div>
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs font-medium text-gray-500">Layouts:</span>
                        {section.layouts.map((layout, layoutIdx) => (
                          <span
                            key={layoutIdx}
                            className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded"
                          >
                            {layout}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
