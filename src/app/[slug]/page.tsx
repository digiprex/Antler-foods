/**
 * Dynamic Page Route (Server Component with Dynamic Metadata)
 *
 * Renders pages dynamically based on URL slug from web_pages table
 * Supports any page created in the admin panel (about, contact, etc.)
 * Now includes dynamic SEO metadata generation
 */

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { generateDynamicSEO, generateMetadata as generateSEOMetadata } from '@/lib/seo';
import { getUmamiWebsiteIdForDomain } from '@/lib/server/umami';
import DynamicPageClient from './page-client';

interface PageProps {
  params: { slug: string };
}

export const revalidate = 60;

/**
 * Generate metadata for the page based on slug
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = params;

  try {
    // Resolve domain from incoming request so favicon/SEO are dynamic per slug domain
    const requestHeaders = headers();
    const domain =
      requestHeaders.get('x-forwarded-host') ||
      requestHeaders.get('host') ||
      process.env.VERCEL_URL ||
      'localhost:3000';
    const protocol =
      requestHeaders.get('x-forwarded-proto') ||
      (domain.includes('localhost') ? 'http' : 'https');
    const appOrigin = `${protocol}://${domain}`;
    const canonicalPath = `/${slug}`;
    const canonicalUrl = `${appOrigin}${canonicalPath}`;

    // Fetch page details
    const pageResponse = await fetch(
      `${appOrigin}/api/page-details?domain=${encodeURIComponent(domain)}&url_slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } }
    );

    if (!pageResponse.ok) {
      const fallbackMetadata = generateSEOMetadata();
      fallbackMetadata.metadataBase = new URL(appOrigin);
      fallbackMetadata.alternates = {
        ...(fallbackMetadata.alternates || {}),
        canonical: canonicalUrl,
      };
      return fallbackMetadata;
    }

    const pageResponseData = await pageResponse.json();

    if (!pageResponseData.success || !pageResponseData.data) {
      const fallbackMetadata = generateSEOMetadata();
      fallbackMetadata.metadataBase = new URL(appOrigin);
      fallbackMetadata.alternates = {
        ...(fallbackMetadata.alternates || {}),
        canonical: canonicalUrl,
      };
      return fallbackMetadata;
    }

    const pageMetaTitle = pageResponseData.data?.page?.meta_title?.trim() || '';
    const pageMetaDescription =
      pageResponseData.data?.page?.meta_description?.trim() || '';
    const resolvedRestaurantId = pageResponseData.data?.page?.restaurant_id;
    if (!resolvedRestaurantId) {
      return generateSEOMetadata();
    }

    // Get restaurant name and favicon for SEO
    let restaurantName = '';
    try {
      const restaurantResponse = await fetch(
        `${appOrigin}/api/restaurant-info?restaurant_id=${resolvedRestaurantId}`,
        { next: { revalidate: 120 } }
      );
      
      if (restaurantResponse.ok) {
        const restaurantData = await restaurantResponse.json();
        restaurantName = restaurantData.data?.name || '';
        const faviconUrl = restaurantData.data?.favicon_url;
        const logoUrl = restaurantData.data?.logo;

        // Generate dynamic SEO with restaurant name
        const seoConfig = generateDynamicSEO(pageResponseData, restaurantName);
        const metadata = generateSEOMetadata(seoConfig);
        metadata.metadataBase = new URL(appOrigin);

        // Hard-prioritize web_pages meta fields when present
        if (pageMetaTitle) {
          metadata.title = pageMetaTitle;
          if (metadata.openGraph) metadata.openGraph.title = pageMetaTitle;
          if (metadata.twitter) metadata.twitter.title = pageMetaTitle;
        }
        if (pageMetaDescription) {
          metadata.description = pageMetaDescription;
          if (metadata.openGraph) metadata.openGraph.description = pageMetaDescription;
          if (metadata.twitter) metadata.twitter.description = pageMetaDescription;
        }

        // Dynamic icon fallback chain: favicon_url -> restaurant logo -> default favicon
        const iconUrl = faviconUrl || logoUrl || '/favicon.ico';
        metadata.icons = {
          icon: iconUrl,
          shortcut: iconUrl,
          apple: iconUrl,
        };
        metadata.alternates = {
          ...(metadata.alternates || {}),
          canonical: canonicalUrl,
        };

        return metadata;
      }
    } catch (error) {
      console.error('Error fetching restaurant info for SEO:', error);
    }

    // Fallback: Generate SEO without restaurant name if API call fails
    const seoConfig = generateDynamicSEO(pageResponseData, restaurantName);
    const metadata = generateSEOMetadata(seoConfig);
    metadata.metadataBase = new URL(appOrigin);

    // Hard-prioritize web_pages meta fields when present
    if (pageMetaTitle) {
      metadata.title = pageMetaTitle;
      if (metadata.openGraph) metadata.openGraph.title = pageMetaTitle;
      if (metadata.twitter) metadata.twitter.title = pageMetaTitle;
    }
    if (pageMetaDescription) {
      metadata.description = pageMetaDescription;
      if (metadata.openGraph) metadata.openGraph.description = pageMetaDescription;
      if (metadata.twitter) metadata.twitter.description = pageMetaDescription;
    }
    metadata.alternates = {
      ...(metadata.alternates || {}),
      canonical: canonicalUrl,
    };

    return metadata;

  } catch (error) {
    console.error('Error generating metadata:', error);
    return generateSEOMetadata();
  }
}

/**
 * Fetch page data on the server so the client can render immediately
 * without a redundant loading-spinner fetch.
 */
async function fetchPageDataOnServer(slug: string, domain: string) {
  if (!domain) return null;

  try {
    const isLocal = domain.includes('localhost') || domain.includes('127.0.0.1');
    const protocol = isLocal ? 'http' : 'https';
    const appOrigin = `${protocol}://${domain}`;

    const pageResponse = await fetch(
      `${appOrigin}/api/page-details?domain=${encodeURIComponent(domain)}&url_slug=${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );

    if (!pageResponse.ok) return null;

    const data = await pageResponse.json();
    if (!data.success || !data.data?.page?.restaurant_id) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Main page component
 */
export default async function DynamicPage({ params }: PageProps) {
  const requestHeaders = headers();
  const domain =
    requestHeaders.get('x-forwarded-host') ||
    requestHeaders.get('host') ||
    '';

  const [umamiWebsiteId, initialPageData] = await Promise.all([
    domain ? getUmamiWebsiteIdForDomain(domain) : null,
    fetchPageDataOnServer(params.slug, domain),
  ]);

  return (
    <DynamicPageClient
      slug={params.slug}
      umamiWebsiteId={umamiWebsiteId}
      initialPageData={initialPageData}
    />
  );
}
