'use client';

/**
 * Dynamic Page Client Component
 *
 * Client-side logic for dynamic pages, separated from the server component
 * to allow for dynamic metadata generation while maintaining client functionality
 */

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import DynamicHero from '@/components/dynamic-hero';
import DynamicCustomCode from '@/components/dynamic-custom-code';
import DynamicFAQ from '@/components/dynamic-faq';
import DynamicGallery from '@/components/dynamic-gallery';
import DynamicReviews from '@/components/dynamic-reviews';
import DynamicLocation from '@/components/dynamic-location';
import DynamicScrollingText from '@/components/dynamic-scrolling-text';
import DynamicTimeline from '@/components/dynamic-timeline';
import DynamicForm from '@/components/dynamic-form';
import Popup from '@/components/popup';
import YouTubeSection from '@/components/youtube-section';

interface DynamicPageClientProps {
  slug: string;
}

export default function DynamicPageClient({ slug }: DynamicPageClientProps) {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        setLoading(true);

        // Get current domain
        const domain = window.location.host;

        // First, resolve restaurant ID from domain
        const heroResponse = await fetch(`/api/hero-config?domain=${domain}&url_slug=${slug}`);

        if (!heroResponse.ok) {
          throw new Error('Failed to resolve restaurant from domain');
        }

        const heroData = await heroResponse.json();

        if (!heroData.success) {
          throw new Error(heroData.error || 'Failed to get restaurant configuration');
        }

        let resolvedRestaurantId = heroData.data?.restaurant_id;

        // Development fallback for localhost
        if (!resolvedRestaurantId && domain.includes('localhost')) {
          // Add your restaurant ID here for local development
          const FALLBACK_RESTAURANT_ID = ''; // TODO: Add restaurant ID from database
          if (FALLBACK_RESTAURANT_ID) {
            resolvedRestaurantId = FALLBACK_RESTAURANT_ID;
          }
        }

        if (!resolvedRestaurantId) {
          throw new Error('No restaurant found for this domain');
        }
        setRestaurantId(resolvedRestaurantId);

        // Fetch page details
        const pageResponse = await fetch(
          `/api/page-details?restaurant_id=${resolvedRestaurantId}&url_slug=${slug}`
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
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !pageData || !restaurantId) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
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
          }}>⚠️</div>
          <h2 style={{
            color: '#111827',
            marginBottom: '16px',
            fontSize: '24px',
            fontWeight: '600'
          }}>Unable to Load Page</h2>
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
                <strong>Option 1: Configure Staging Domain</strong>
                <ol style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                  <li>Go to Admin Panel → Location Settings</li>
                  <li>Set staging domain to: <code style={{ backgroundColor: '#fcd34d', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}</code></li>
                  <li>Save changes</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <div>
                <strong>Option 2: Use Admin View Button</strong>
                <ul style={{ marginTop: '8px', marginLeft: '20px', lineHeight: '1.8' }}>
                  <li>Access pages through Admin Panel → Pages → View button</li>
                  <li>This automatically uses your configured staging domain</li>
                </ul>
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
      </div>
    );
  }

  // Get templates array and sort by order_index
  const templates = pageData?.data?.templates || [];
  const sortedTemplates = templates.sort((a: any, b: any) => (a.order_index ?? 999) - (b.order_index ?? 999));

  console.log('[Page Client] Total templates:', templates.length);
  console.log('[Page Client] Templates:', templates.map((t: any) => ({
    id: t.template_id,
    category: t.category,
    name: t.name,
    order_index: t.order_index,
    has_config: !!t.config
  })));

  // Render component based on category
  const renderSection = (template: any) => {
    const pageId = pageData?.data?.page?.page_id;
    const category = template.category;

    const uniqueKey = template.template_id || `${category}-${template.order_index || 0}`;

    switch (category.toLowerCase()) {
      case 'hero':
        console.log('[Page Client] Rendering hero with template:', {
          template_id: template.template_id,
          name: template.name,
          config: template.config,
          order_index: template.order_index
        });
        return <DynamicHero
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={template.config ? { ...template.config, layout: template.name } : undefined}
          showLoading={true}
        />;
      case 'customcode':
        return <DynamicCustomCode
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          showLoading={true}
        />;
      case 'scrollingtext':
        return <DynamicScrollingText
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          showLoading={true}
        />;
      case 'timeline':
        return <DynamicTimeline
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          showLoading={true}
        />;
      case 'faq':
        return <DynamicFAQ
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={template.config}
          showLoading={true}
        />;
      case 'gallery':
        return <DynamicGallery
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={template.config}
          showLoading={true}
        />;
      case 'youtube':
        return <YouTubeSection key={uniqueKey} restaurantId={restaurantId} />;
      case 'location':
        return <DynamicLocation
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          showLoading={true}
        />;
      case 'reviews':
        return <DynamicReviews
          key={uniqueKey}
          restaurantId={restaurantId}
          configData={template.config}
          showLoading={true}
        />;
      case 'form':
        return <DynamicForm
          key={uniqueKey}
          restaurantId={restaurantId}
          pageId={pageId}
          showLoading={true}
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}

      {/* Universal Popup - Only show on homepage */}
      {slug === 'home' && <Popup restaurantId={restaurantId} />}

      {/* Render sections in order based on order_index */}
      {sortedTemplates.length > 0 ? (
        sortedTemplates.map((template: any) => renderSection(template))
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', margin: '20px', borderRadius: '8px' }}>
          <h3>No sections found for this page</h3>
          <p>This page doesn't have any sections configured yet.</p>
          <p>Page ID: {pageData?.data?.page?.page_id}</p>
          <p>Restaurant ID: {restaurantId}</p>
        </div>
      )}
    </div>
  );
}