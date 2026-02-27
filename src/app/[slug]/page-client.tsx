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
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#dc2626' }}>
          <h2>Error</h2>
          <p>{error || 'Failed to load page'}</p>
        </div>
      </div>
    );
  }

  // Get templates and sort by order_index
  const templates = pageData?.data?.templates || {};
  const sortedTemplates = Object.entries(templates)
    .map(([category, template]: [string, any]) => ({
      category,
      ...template
    }))
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999));

  // Render component based on category
  const renderSection = (category: string) => {
    const pageId = pageData?.data?.page?.page_id;

    switch (category.toLowerCase()) {
      case 'hero':
        return <DynamicHero key={category} restaurantId={restaurantId} showLoading={true} />;
      case 'customcode':
        return <DynamicCustomCode key={category} restaurantId={restaurantId} pageId={pageId} showLoading={true} />;
      case 'scrollingtext':
        return <DynamicScrollingText key={category} restaurantId={restaurantId} pageId={pageId} showLoading={true} />;
      case 'timeline':
        return <DynamicTimeline key={category} restaurantId={restaurantId} pageId={pageId} showLoading={true} />;
      case 'faq':
        return <DynamicFAQ key={category} restaurantId={restaurantId} showLoading={true} />;
      case 'gallery':
        return <DynamicGallery key={category} restaurantId={restaurantId} showLoading={true} />;
      case 'youtube':
        return <YouTubeSection key={category} restaurantId={restaurantId} />;
      case 'location':
        return <DynamicLocation key={category} restaurantId={restaurantId} pageId={pageId} showLoading={true} />;
      case 'reviews':
        return <DynamicReviews key={category} restaurantId={restaurantId} showLoading={true} />;
      case 'form':
        return <DynamicForm key={category} restaurantId={restaurantId} pageId={pageId} showLoading={true} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}

      {/* Universal Popup */}
      <Popup restaurantId={restaurantId} />

      {/* Render sections in order based on order_index */}
      {sortedTemplates.map((template) => renderSection(template.category))}
    </div>
  );
}