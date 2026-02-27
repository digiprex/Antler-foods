/**
 * SEO Utilities
 * 
 * Provides default SEO metadata and helper functions for consistent SEO implementation
 * across all pages in the application.
 */

import type { Metadata } from 'next';

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
  canonical?: string;
}

/**
 * Default SEO configuration
 */
export const DEFAULT_SEO: Required<Omit<SEOConfig, 'canonical'>> = {
  title: 'Antler Foods - Restaurant Management Platform',
  description: 'Comprehensive restaurant management platform for modern food businesses. Manage your restaurant operations, menu, orders, and customer relationships all in one place.',
  keywords: [
    'restaurant management',
    'food business',
    'restaurant software',
    'menu management',
    'order management',
    'restaurant platform',
    'food service',
    'restaurant technology'
  ],
  ogImage: '/images/dashboard-preview.svg',
  noIndex: false,
};

/**
 * Generate metadata object for Next.js pages
 */
export function generateMetadata(config: SEOConfig = {}): Metadata {
  const {
    title = DEFAULT_SEO.title,
    description = DEFAULT_SEO.description,
    keywords = DEFAULT_SEO.keywords,
    ogImage = DEFAULT_SEO.ogImage,
    noIndex = DEFAULT_SEO.noIndex,
    canonical
  } = config;

  const metadata: Metadata = {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };

  if (noIndex) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  }

  if (canonical) {
    metadata.alternates = {
      canonical,
    };
  }

  return metadata;
}

/**
 * Generate page-specific SEO configuration
 */
export function getPageSEO(pageType: string, customConfig: SEOConfig = {}): SEOConfig {
  const baseConfig = { ...DEFAULT_SEO };

  switch (pageType) {
    case 'login':
      return {
        ...baseConfig,
        title: 'Login - Antler Foods',
        description: 'Sign in to your Antler Foods restaurant management account. Access your dashboard, manage your restaurant operations, and grow your food business.',
        noIndex: true,
        ...customConfig,
      };

    case 'signup':
      return {
        ...baseConfig,
        title: 'Sign Up - Antler Foods',
        description: 'Create your Antler Foods account and start managing your restaurant business today. Join thousands of successful food businesses using our platform.',
        noIndex: true,
        ...customConfig,
      };

    case 'dashboard':
      return {
        ...baseConfig,
        title: 'Dashboard - Antler Foods',
        description: 'Your restaurant management dashboard. Monitor performance, manage operations, and grow your food business with comprehensive analytics and tools.',
        noIndex: true,
        ...customConfig,
      };

    case 'admin':
      return {
        ...baseConfig,
        title: 'Admin Panel - Antler Foods',
        description: 'Restaurant administration panel for managing settings, configurations, and advanced features of your food business platform.',
        noIndex: true,
        ...customConfig,
      };

    case 'not-found':
      return {
        ...baseConfig,
        title: 'Page Not Found - Antler Foods',
        description: 'The page you are looking for could not be found. Return to your restaurant management dashboard or explore our platform features.',
        noIndex: true,
        ...customConfig,
      };

    default:
      return {
        ...baseConfig,
        ...customConfig,
      };
  }
}

/**
 * Generate dynamic SEO from page data (for [slug] pages)
 */
export function generateDynamicSEO(pageData: any, restaurantName?: string): SEOConfig {
  const page = pageData?.data?.page;
  
  if (!page) {
    return getPageSEO('default');
  }

  const title = page.meta_title || 
    (page.name && restaurantName ? `${page.name} - ${restaurantName}` : page.name) ||
    DEFAULT_SEO.title;

  const description = page.meta_description || 
    `Learn more about ${page.name || 'our services'}${restaurantName ? ` at ${restaurantName}` : ''}. ${DEFAULT_SEO.description}`;

  return {
    title,
    description,
    keywords: page.keywords ? page.keywords.split(',').map((k: string) => k.trim()) : DEFAULT_SEO.keywords,
    ogImage: page.og_image || DEFAULT_SEO.ogImage,
  };
}