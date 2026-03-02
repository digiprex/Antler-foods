/**
 * Dynamic Menu Component
 *
 * Fetches menu configuration from API and renders the menu section
 * Similar to DynamicHero and DynamicGallery components
 */

'use client';

import { useEffect, useState } from 'react';
import Menu from '@/components/menu';
import type { MenuConfig } from '@/types/menu.types';

interface DynamicMenuProps {
  /**
   * Restaurant ID to fetch configuration for
   */
  restaurantId?: string;

  /**
   * Fallback configuration if API fails
   */
  fallbackConfig?: Partial<MenuConfig>;

  /**
   * Pre-fetched menu configuration (skips API call)
   */
  configData?: Partial<MenuConfig>;

  /**
   * Whether to show loading state
   */
  showLoading?: boolean;
}

export default function DynamicMenu({
  restaurantId,
  fallbackConfig,
  configData,
  showLoading = true
}: DynamicMenuProps) {
  const [config, setConfig] = useState<MenuConfig | null>(configData as MenuConfig || null);
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as MenuConfig);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build URL with restaurant_id if provided
        const url = new URL('/api/menu-config', window.location.origin);
        if (restaurantId) {
          url.searchParams.set('restaurant_id', restaurantId);
        }

        // Automatically detect URL slug from current page
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);
        if (pathSegments.length > 0) {
          const urlSlug = pathSegments[pathSegments.length - 1];
          url.searchParams.set('url_slug', urlSlug);
          console.log('[DynamicMenu] Auto-detected url_slug:', urlSlug);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          throw new Error(data.error || 'Failed to load menu configuration');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('[DynamicMenu] Failed to fetch config:', err);
        setError(errorMessage);

        // Use fallback config if provided
        if (fallbackConfig) {
          setConfig(fallbackConfig as MenuConfig);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!configData) {
      fetchConfig();
    }
  }, [restaurantId, configData, fallbackConfig]);

  if (loading && showLoading) {
    return (
      <div style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <div style={{
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ marginTop: '1rem', fontSize: '1rem' }}>Loading menu...</p>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div style={{
        padding: '4rem 2rem',
        textAlign: 'center',
        color: '#dc2626'
      }}>
        <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>⚠️ Failed to load menu</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return <Menu {...config} />;
}
