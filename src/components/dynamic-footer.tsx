/**
 * Dynamic Footer Component
 * 
 * This component fetches footer configuration from a database/API and renders
 * the footer with dynamic content, links, and styling.
 * 
 * Features:
 * - Automatically detects restaurant_id from website domain
 * - Dynamic logo and restaurant name
 * - Dynamic social media links
 * - Dynamic contact information
 * - Dynamic columns with links
 * - All styling and layout options configurable via API
 * - Fallback to default values if API fails
 * - Loading state handling
 */

'use client';

import { useEffect, useState } from 'react';
import Footer from './footer';
import { FooterConfig, DEFAULT_FOOTER_CONFIG } from '@/types/footer.types';

interface DynamicFooterProps {
  /**
   * API endpoint to fetch footer configuration
   * Default: '/api/footer-config'
   */
  apiEndpoint?: string;
  
  /**
   * Whether to show loading state
   * Default: false (renders nothing while loading)
   */
  showLoadingSkeleton?: boolean;
  
  /**
   * Override configuration (useful for testing or static pages)
   */
  overrideConfig?: Partial<FooterConfig>;
}

export default function DynamicFooter({
  apiEndpoint = '/api/footer-config',
  showLoadingSkeleton = false,
  overrideConfig,
}: DynamicFooterProps) {
  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      setConfig({ ...DEFAULT_FOOTER_CONFIG, ...overrideConfig });
      setLoading(false);
      return;
    }

    // Fetch footer configuration from API
    async function fetchFooterConfig() {
      try {
        // Get current domain for dynamic restaurant resolution
        const domain = window.location.host;

        // Fetch footer config using domain (API will resolve restaurant_id)
        const footerResponse = await fetch(`${apiEndpoint}?domain=${domain}`, {
          cache: 'no-store',
        });

        // Treat 404 as "no footer template" - don't render footer
        if (footerResponse.status === 404) {
          setConfig(null);
          setLoading(false);
          return;
        }

        if (!footerResponse.ok) {
          throw new Error(`API returned ${footerResponse.status}: ${footerResponse.statusText}`);
        }

        const footerData = await footerResponse.json();

        // Validate response structure
        if (footerData.success && footerData.data) {
          // Merge with defaults to ensure all required fields are present
          setConfig({ ...DEFAULT_FOOTER_CONFIG, ...footerData.data });
        } else {
          throw new Error(footerData.error || 'Invalid API response structure');
        }
      } catch (err) {
        console.error('Failed to fetch footer config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Don't render footer if there's an error
        setConfig(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFooterConfig();
  }, [apiEndpoint, overrideConfig]);

  // Loading state
  if (loading) {
    if (showLoadingSkeleton) {
      return (
        <div 
          style={{
            height: '300px',
            backgroundColor: '#1f2937',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      );
    }
    return null;
  }

  // Error state (still render with defaults)
  if (error) {
    console.warn('Footer using default configuration due to error:', error);
  }

  // Render footer with fetched or default configuration
  if (!config) {
    return null;
  }

  return (
    <Footer
      restaurantName={config.restaurantName}
      logoUrl={config.logoUrl}
      aboutContent={config.aboutContent}
      email={config.email}
      phone={config.phone}
      address={config.address}
      socialLinks={config.socialLinks}
      columns={config.columns}
      copyrightText={config.copyrightText}
      showPoweredBy={config.showPoweredBy}
      showSocialMedia={config.showSocialMedia}
      showLocations={config.showLocations}
      showNewsletter={config.showNewsletter}
      newsletterTitle={config.newsletterTitle}
      newsletterPlaceholder={config.newsletterPlaceholder}
      layout={config.layout}
      bgColor={config.bgColor}
      textColor={config.textColor}
      linkColor={config.textColor}
      copyrightBgColor={config.copyrightBgColor}
      copyrightTextColor={config.copyrightTextColor}
      fontFamily={config.fontFamily}
      fontSize={config.fontSize}
      fontWeight={config.fontWeight}
      textTransform={config.textTransform}
      headingFontFamily={config.headingFontFamily}
      headingFontSize={config.headingFontSize}
      headingFontWeight={config.headingFontWeight}
      headingTextTransform={config.headingTextTransform}
      copyrightFontFamily={config.copyrightFontFamily}
      copyrightFontSize={config.copyrightFontSize}
      copyrightFontWeight={config.copyrightFontWeight}
    />
  );
}
