'use client';

/**
 * Dynamic Page Route (Client Component - temporary fix for Next.js 15 async params issue)
 *
 * Renders pages dynamically based on URL slug from web_pages table
 * Supports any page created in the admin panel (about, contact, etc.)
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import DynamicHero from '@/components/dynamic-hero';
import DynamicFAQ from '@/components/dynamic-faq';
import DynamicGallery from '@/components/dynamic-gallery';
import DynamicReviews from '@/components/dynamic-reviews';
import DynamicLocation from '@/components/dynamic-location';
import Popup from '@/components/popup';
import YouTubeSection from '@/components/youtube-section';

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;

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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Navbar is automatically rendered by ConditionalNavbar in root layout */}

      {/* Universal Popup */}
      <Popup restaurantId={restaurantId} />

      {/* Dynamic Hero Section */}
      <DynamicHero
        restaurantId={restaurantId}
        showLoading={true}
      />

      {/* Dynamic FAQ Section */}
      <DynamicFAQ
        restaurantId={restaurantId}
        showLoading={true}
      />

      {/* Dynamic Gallery Section */}
      <DynamicGallery
        restaurantId={restaurantId}
        showLoading={true}
      />

      {/* YouTube Section */}
      <YouTubeSection restaurantId={restaurantId} />

      {/* Dynamic Location Section */}
      <DynamicLocation
        restaurantId={restaurantId}
        pageId={pageData?.data?.page?.page_id}
        showLoading={true}
      />

      {/* Dynamic Reviews Section */}
      <DynamicReviews
        restaurantId={restaurantId}
        showLoading={true}
      />
    </div>
  );
}

