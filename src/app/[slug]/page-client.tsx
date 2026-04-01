'use client';

/**
 * Dynamic Page Client Component
 *
 * Client-side logic for dynamic pages, separated from the server component
 * to allow for dynamic metadata generation while maintaining client functionality
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import UmamiAnalytics from '@/components/umami-analytics';
import { CUSTOM_SECTION_LAYOUT_VALUES } from '@/types/custom-section.types';

const DynamicHero = dynamic(() => import('@/components/dynamic-hero'));
const DynamicMenu = dynamic(() => import('@/components/dynamic-menu'));
const DynamicCustomCode = dynamic(() => import('@/components/dynamic-custom-code'));
const DynamicFAQ = dynamic(() => import('@/components/dynamic-faq'));
const DynamicGallery = dynamic(() => import('@/components/dynamic-gallery'), { ssr: false });
const DynamicReviews = dynamic(() => import('@/components/dynamic-reviews'));
const DynamicLocation = dynamic(() => import('@/components/dynamic-location'), { ssr: false });
const DynamicScrollingText = dynamic(() => import('@/components/dynamic-scrolling-text'));
const DynamicTimeline = dynamic(() => import('@/components/dynamic-timeline'));
const DynamicForm = dynamic(() => import('@/components/dynamic-form'));
const Popup = dynamic(() => import('@/components/popup'), { ssr: false });
const YouTubeSection = dynamic(() => import('@/components/youtube-section'), { ssr: false });
const CustomSection = dynamic(() => import('@/components/custom-section'));

interface DynamicPageClientProps {
  slug: string;
  umamiWebsiteId?: string | null;
}

export default function DynamicPageClient({ slug, umamiWebsiteId = null }: DynamicPageClientProps) {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [topSpacing, setTopSpacing] = useState<string>('0px');

  // Calculate dynamic top spacing based on navbar and announcement bar
  useEffect(() => {
    const calculateSpacing = () => {
      const navbarHeight = getComputedStyle(document.documentElement).getPropertyValue('--navbar-height').trim();
      const announcementHeight = getComputedStyle(document.documentElement).getPropertyValue('--announcement-bar-height').trim();
      
      // Parse values and provide fallbacks
      const navbarPx = navbarHeight && navbarHeight !== '0px' ? navbarHeight : '0px';
      const announcementPx = announcementHeight && announcementHeight !== '0px' ? announcementHeight : '0px';
      
      // If both are 0px, no spacing needed
      if (navbarPx === '0px' && announcementPx === '0px') {
        setTopSpacing('0px');
      } else {
        // Use CSS calc to add them together
        setTopSpacing(`calc(${navbarPx} + ${announcementPx})`);
      }
    };

    // Calculate initially
    calculateSpacing();

    // Recalculate when CSS variables change (debounced via rAF)
    let rafId = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateSpacing);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true);

        // Get current domain (includes port for localhost, e.g., localhost:3000)
        const domain = window.location.host;
        const encodedDomain = encodeURIComponent(domain);
        // Fetch page details directly by domain + slug (single request path)
        const pageResponse = await fetch(
          `/api/page-details?domain=${encodedDomain}&url_slug=${encodeURIComponent(slug)}`,
          { cache: 'no-store' }
        );

        if (pageResponse.status === 404) {
          notFound();
          return;
        }

        if (!pageResponse.ok) {
          throw new Error('Failed to fetch page data');
        }

        const pageResponseData = await pageResponse.json();

        if (!pageResponseData.success || !pageResponseData.data) {
          notFound();
          return;
        }

        const resolvedRestaurantId = pageResponseData.data?.page?.restaurant_id;
        if (!resolvedRestaurantId) {
          throw new Error('No restaurant found for this domain');
        }
        setRestaurantId(resolvedRestaurantId);

        // Check if page is published
        const page = pageResponseData.data?.page;
        if (page && page.published === false) {
          throw new Error('This page is not published yet. Please publish it from the admin panel to make it visible.');
        }

        setPageData(pageResponseData);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPageData();
    }
  }, [slug]);

  // Show loading state
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading page content"
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <style>{`
          @keyframes basicSpinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .basic-loader {
            text-align: center;
          }
          .basic-loader-spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto 12px;
            border-radius: 999px;
            border: 3px solid #d1d5db;
            border-top-color: #111827;
            animation: basicSpinner 0.8s linear infinite;
          }
          .basic-loader-text {
            color: #374151;
            font-size: 14px;
            font-weight: 500;
          }
        `}</style>

        <div className="basic-loader">
          <div className="basic-loader-spinner" aria-hidden="true" />
          <div className="basic-loader-text">
            Loading your restaurant site...
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !pageData || !restaurantId) {
    return (
      <main
        role="alert"
        aria-live="assertive"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div style={{
          textAlign: 'center',
          maxWidth: '600px',
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }} aria-hidden="true">⚠️</div>
          <h1 style={{
            color: '#111827',
            marginBottom: '16px',
            fontSize: '24px',
            fontWeight: '600'
          }}>Unable to Load Page</h1>
          <p style={{
            color: '#6b7280',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>{error || 'Failed to load page'}</p>
          {error === 'No restaurant found for this domain' && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'left',
              fontSize: '14px',
              color: '#92400e',
              marginTop: '20px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>
                🔧 How to Fix This
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>Step 1: Configure Staging Domain</strong>
                <ol style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                  <li>Go to Admin Panel → Location Settings</li>
                  <li>Set <strong>staging_domain</strong> to: <code style={{ backgroundColor: '#fcd34d', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}</code></li>
                  <li>Click "Save Changes"</li>
                  <li>Come back to this page and refresh</li>
                </ol>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#fff9e6', borderRadius: '6px', fontSize: '13px', marginTop: '12px' }}>
                <strong>📍 Current Domain:</strong> <code style={{ backgroundColor: '#fcd34d', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}</code>
                <br /><br />
                The staging_domain in your restaurant settings must <strong>exactly match</strong> this domain (including port number for localhost).
              </div>
            </div>
          )}
          {error === 'This page is not published yet. Please publish it from the admin panel to make it visible.' && (
            <div style={{
              backgroundColor: '#dbeafe',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'left',
              fontSize: '14px',
              color: '#1e40af',
              marginTop: '20px'
            }}>
              <strong>📝 Page Not Published</strong>
              <p style={{ marginTop: '8px', lineHeight: '1.6' }}>
                This page is currently in draft mode. To make it visible:
              </p>
              <ol style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                <li>Go to Admin Panel → Pages</li>
                <li>Find this page in the list</li>
                <li>Click the "Publish" button</li>
              </ol>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Get templates array and sort by order_index (spread to avoid mutating original)
  const sortedTemplates = [...(pageData?.data?.templates || [])].sort((a: any, b: any) => (a.order_index ?? 999) - (b.order_index ?? 999));

  // Render component based on category
  const renderSection = (template: any) => {
    const pageId = pageData?.data?.page?.page_id;
    const category = template.category;

    const uniqueKey = template.template_id || `${category}-${template.order_index || 0}`;

    switch (category.toLowerCase()) {
      case 'hero':
        return <DynamicHero
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={template.config ? { ...template.config, layout: template.name, restaurant_id: restaurantId } : undefined}
          showLoading={true}
        />;
      case 'menu':
        const isMenuPage = slug?.toLowerCase() === 'menu';
        const menuConfigData = template.config
          ? {
              ...template.config,
              layout: template.name,
              restaurant_id: restaurantId,
              categories:
                template.menu_items?.categories ||
                template.config?.categories ||
                [],
              featuredItems:
                template.menu_items?.featuredItems ||
                template.config?.featuredItems ||
                [],
              ...(isMenuPage
                ? {
                    sectionMaxWidth: '1440px',
                    sectionPaddingX: '2.5rem',
                    mobileSectionPaddingX: '1rem',
                    title: '',
                    subtitle: '',
                    description: '',
                  }
                : {}),
            }
          : undefined;

        return <DynamicMenu
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={menuConfigData}
          showLoading={true}
        />;
      case 'customcode':
        // Pass template_id to fetch specific instance of custom code
        // This ensures each section loads its own unique data
        return <DynamicCustomCode
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          showLoading={true}
        />;
      case 'scrollingtext':
        // Pass template_id to fetch specific instance of scrolling text
        // This ensures each section loads its own unique data
        return <DynamicScrollingText
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          showLoading={true}
        />;
      case 'timeline':
        // Pass template_id to fetch specific instance of timeline
        // This ensures each section loads its own unique data
        return <DynamicTimeline
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          showLoading={true}
        />;
      case 'faq':
        // Transform template data to match FAQ config format
        const faqConfigData = template.config ? {
          ...template.config,
          layout: template.name || 'accordion',
          faqs: template.menu_items || [],
          restaurant_id: restaurantId,
        } : undefined;

        return <DynamicFAQ
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          configData={faqConfigData}
          showLoading={true}
        />;
      case 'gallery':
        // Transform template data to match Gallery config format
        const galleryConfigData = template.config ? {
          ...template.config,
          layout: template.name || 'grid',
          restaurant_id: restaurantId,
        } : undefined;

        return <DynamicGallery
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          configData={galleryConfigData}
          showLoading={true}
        />;
      case 'youtube':
        // Pass template_id to fetch specific instance of YouTube section
        // This ensures each section loads its own unique data
        return <YouTubeSection
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
        />;
      case 'location':
        // Pass template_id to fetch specific instance of location
        // This ensures each section loads its own unique data
        return <DynamicLocation
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          showLoading={true}
        />;
      case 'reviews':
        // Transform template data to match Review config format
        const reviewConfigData = template.config ? {
          ...template.config,
          layout: template.name || 'grid',
          restaurant_id: restaurantId,
        } : undefined;

        return <DynamicReviews
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          configData={reviewConfigData}
          showLoading={true}
        />;
      case 'form':
        // Transform template data to match Form config format (similar to other sections)
        const formConfigData = template.config ? {
          ...template.config,
          layout: template.name,
          restaurant_id: restaurantId,
        } : undefined;

        return <DynamicForm
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          templateId={template.template_id}
          configData={formConfigData}
          showLoading={true}
          isPreview={false}
        />;
      case 'customsection':
        // Resolve layout safely: prefer config.layout, then template.name only if valid.
        const customSectionLayoutCandidate = [
          template?.config?.layout,
          template?.name,
        ].find((value) =>
          typeof value === 'string' &&
          CUSTOM_SECTION_LAYOUT_VALUES.includes(value as any),
        ) as string | undefined;

        // Transform template data to match CustomSection config format
        const customSectionConfigData = template.config ? {
          ...template.config,
          layout: customSectionLayoutCandidate || 'layout-1'
        } : undefined;

        return <CustomSection
          key={uniqueKey}
          {...customSectionConfigData}
          restaurant_id={restaurantId}
        />;
      default:
        console.warn('Unknown section category:', category);
        return (
          <div key={uniqueKey} style={{ padding: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', margin: '10px 0' }}>
            <h3>Unknown Section: {category}</h3>
            <p>This section type is not yet supported. Template data:</p>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{JSON.stringify(template, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <UmamiAnalytics websiteId={umamiWebsiteId} />
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}

      {/* Dynamic top spacing to prevent navbar overlap - only when navbar is fixed or absolute */}
      <div style={{
        paddingTop: slug?.toLowerCase() === 'menu' ? '0px' : topSpacing
      }}>
        {/* Universal Popup - Only show on homepage */}
        {slug === 'home' && <Popup restaurantId={restaurantId} />}

        {/* Render sections in order based on order_index */}
        {sortedTemplates.length > 0 ? (
          sortedTemplates.map((template: any) => (
            <section key={template.template_id || `${template.category}-${template.order_index || 0}`} style={{ contentVisibility: 'auto' }}>
              {renderSection(template)}
            </section>
          ))
        ) : (
          <div style={{
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: 'white',
            margin: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }} aria-hidden="true">📝</div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '12px'
            }}>
              Page Content Coming Soon
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              This page is ready but doesn't have any content sections yet.
            </p>
            <p style={{
              fontSize: '14px',
              color: '#9ca3af',
              fontStyle: 'italic'
            }}>
              Please edit your site from the dashboard to add content sections.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

