/**
 * Dynamic Page Route (Server Component with Dynamic Metadata)
 *
 * Renders pages dynamically based on URL slug from web_pages table
 * Supports any page created in the admin panel (about, contact, etc.)
 * Now includes dynamic SEO metadata generation
 */

import type { Metadata } from 'next';
import { generateDynamicSEO, generateMetadata as generateSEOMetadata } from '@/lib/seo';
import DynamicPageClient from './page-client';

interface PageProps {
  params: { slug: string };
}

/**
 * Generate metadata for the page based on slug
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;

  try {
    // Get current domain (this will be available in the request headers)
    const domain = process.env.VERCEL_URL || 'localhost:3000';

    // First, resolve restaurant ID from domain
    const heroResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/hero-config?domain=${domain}&url_slug=${slug}`, {
      cache: 'no-store'
    });

    if (!heroResponse.ok) {
      return generateSEOMetadata();
    }

    const heroData = await heroResponse.json();
    if (!heroData.success) {
      return generateSEOMetadata();
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
      return generateSEOMetadata();
    }

    // Fetch page details
    const pageResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/page-details?restaurant_id=${resolvedRestaurantId}&url_slug=${slug}`,
      { cache: 'no-store' }
    );

    if (!pageResponse.ok) {
      return generateSEOMetadata();
    }

    const pageResponseData = await pageResponse.json();

    if (!pageResponseData.success || !pageResponseData.data) {
      return generateSEOMetadata();
    }

    // Get restaurant name for better SEO
    const restaurantResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/website-info?restaurant_id=${resolvedRestaurantId}`,
      { cache: 'no-store' }
    );

    let restaurantName = '';
    if (restaurantResponse.ok) {
      const restaurantData = await restaurantResponse.json();
      restaurantName = restaurantData.data?.restaurant_name || '';
    }

    // Generate dynamic SEO
    const seoConfig = generateDynamicSEO(pageResponseData, restaurantName);
    return generateSEOMetadata(seoConfig);

  } catch (error) {
    console.error('Error generating metadata:', error);
    return generateSEOMetadata();
  }
}

/**
 * Main page component
 */
export default function DynamicPage({ params }: PageProps) {
  return <DynamicPageClient slug={params.slug} />;
}
