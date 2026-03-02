/**
 * Dynamic Navbar Component
 * 
 * This component fetches navbar configuration from a database/API and renders
 * the navbar with dynamic logo, menu items, and CTA button.
 * 
 * Features:
 * - Automatically detects restaurant_id from website domain
 * - Dynamic logo (URL or restaurant name initials)
 * - Dynamic menu items (left and right navigation)
 * - Dynamic CTA button (e.g., "Order Online")
 * - All styling and layout options configurable via API
 * - Fallback to default values if API fails
 * - Loading state handling
 */

'use client';

import { useEffect, useState } from 'react';
import Navbar from './navbar';
import { NavbarConfig, DEFAULT_NAVBAR_CONFIG } from '@/types/navbar.types';

interface DynamicNavbarProps {
  /**
   * API endpoint to fetch navbar configuration
   * Default: '/api/navbar-config'
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
  overrideConfig?: Partial<NavbarConfig>;
}

export default function DynamicNavbar({
  apiEndpoint = '/api/navbar-config',
  showLoadingSkeleton = false,
  overrideConfig,
}: DynamicNavbarProps) {
  const [config, setConfig] = useState<NavbarConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If override config is provided, use it directly
    if (overrideConfig) {
      setConfig({ ...DEFAULT_NAVBAR_CONFIG, ...overrideConfig });
      setLoading(false);
      return;
    }

    // Fetch navbar configuration from API
    async function fetchNavbarConfig() {
      try {
        // Get current domain for dynamic restaurant resolution
        const domain = window.location.host;

        // Fetch navbar config using domain (API will resolve restaurant_id)
        const navbarResponse = await fetch(`${apiEndpoint}?domain=${domain}`, {
          cache: 'no-store',
        });

        // Treat 404 as "no navbar template" - don't render navbar
        if (navbarResponse.status === 404) {
          setConfig(null);
          setLoading(false);
          return;
        }

        if (!navbarResponse.ok) {
          throw new Error(`API returned ${navbarResponse.status}: ${navbarResponse.statusText}`);
        }

        const navbarData = await navbarResponse.json();

        // Validate response structure
        if (navbarData.success && navbarData.data) {
          // Merge with defaults to ensure all required fields are present
          setConfig({ ...DEFAULT_NAVBAR_CONFIG, ...navbarData.data });
        } else {
          throw new Error(navbarData.error || 'Invalid API response structure');
        }
      } catch (err) {
        console.error('Failed to fetch navbar config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');

        // Don't render navbar if there's an error
        setConfig(null);
      } finally {
        setLoading(false);
      }
    }

    fetchNavbarConfig();
  }, [apiEndpoint, overrideConfig]);

  // Set CSS variable when navbar position changes
  useEffect(() => {
    if (config?.position === 'fixed') {
      document.documentElement.style.setProperty('--navbar-is-fixed', '1');
      document.documentElement.style.setProperty('--navbar-height', '80px'); // Adjust as needed
    } else {
      document.documentElement.style.setProperty('--navbar-is-fixed', '0');
      document.documentElement.style.setProperty('--navbar-height', '0px');
    }
  }, [config?.position]);

  // Loading state
  if (loading) {
    if (showLoadingSkeleton) {
      return (
        <div 
          style={{
            height: '80px',
            backgroundColor: '#f3f4f6',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
      );
    }
    return null;
  }

  // Error state (still render with defaults)
  if (error) {
    console.warn('Navbar using default configuration due to error:', error);
  }

  // Render navbar with fetched or default configuration
  if (!config) {
    return null;
  }

  return (
    <Navbar
      logoUrl={config.logoUrl}
      logoSize={config.logoSize}
      restaurantName={config.restaurantName}
      leftNavItems={config.leftNavItems}
      rightNavItems={config.rightNavItems}
      ctaButton={config.ctaButton}
      layout={config.layout}
      position={config.position}
      zIndex={config.zIndex}
      bgColor={config.bgColor}
      textColor={config.textColor}
      buttonBgColor={config.buttonBgColor}
      buttonTextColor={config.buttonTextColor}
      borderColor={config.borderColor}
      borderWidth={config.borderWidth}
      bagCount={config.bagCount}
      additionalText={config.additionalText}
    />
  );
}
