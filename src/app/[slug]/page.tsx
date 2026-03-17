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

    // Fetch page details
    const pageResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/page-details?domain=${encodeURIComponent(domain)}&url_slug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' }
    );

    if (!pageResponse.ok) {
      return generateSEOMetadata();
    }

    const pageResponseData = await pageResponse.json();

    if (!pageResponseData.success || !pageResponseData.data) {
      return generateSEOMetadata();
    }

    const resolvedRestaurantId = pageResponseData.data?.page?.restaurant_id;
    if (!resolvedRestaurantId) {
      return generateSEOMetadata();
    }

    // Get restaurant name and favicon for SEO
    let restaurantName = '';
    try {
      const restaurantResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/restaurant-info?restaurant_id=${resolvedRestaurantId}`,
        { cache: 'no-store' }
      );
      
      if (restaurantResponse.ok) {
        const restaurantData = await restaurantResponse.json();
        restaurantName = restaurantData.data?.name || '';
        const faviconUrl = restaurantData.data?.favicon_url;

        // Generate dynamic SEO with restaurant name
        const seoConfig = generateDynamicSEO(pageResponseData, restaurantName);
        const metadata = generateSEOMetadata(seoConfig);

        // Add favicon if available
        if (faviconUrl) {
          metadata.icons = {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          };
        }

        return metadata;
      }
    } catch (error) {
      console.error('Error fetching restaurant info for SEO:', error);
    }

    // Fallback: Generate SEO without restaurant name if API call fails
    const seoConfig = generateDynamicSEO(pageResponseData, restaurantName);
    const metadata = generateSEOMetadata(seoConfig);

    return metadata;

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
