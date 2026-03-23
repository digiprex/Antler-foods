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

interface RestaurantInfo {
  restaurant_id: string;
  name: string;
  favicon_url?: string;
  logo?: string;
  custom_domain?: string;
  staging_domain?: string;
  is_published?: boolean;
  is_deleted?: boolean;
}

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
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
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
          let menuConfig = data.data;
          
          // Fetch restaurant information to get real brand details
          try {
            const restaurantUrl = new URL('/api/restaurant-info', window.location.origin);
            if (menuConfig.restaurant_id) {
              restaurantUrl.searchParams.set('restaurant_id', menuConfig.restaurant_id);
            } else {
              // Use domain-based lookup
              restaurantUrl.searchParams.set('domain', window.location.host);
            }

            console.log('[DynamicMenu] Fetching restaurant info from:', restaurantUrl.toString());
            const restaurantResponse = await fetch(restaurantUrl.toString());
            
            if (restaurantResponse.ok) {
              const restaurantData = await restaurantResponse.json();
              if (restaurantData.success && restaurantData.data) {
                setRestaurantInfo(restaurantData.data);
                
                // Update menu config with real restaurant name
                if (restaurantData.data.name) {
                  menuConfig = {
                    ...menuConfig,
                    title: restaurantData.data.name,
                  };
                  console.log('[DynamicMenu] Updated menu title with restaurant name:', restaurantData.data.name);
                }
              }
            } else {
              console.warn('[DynamicMenu] Failed to fetch restaurant info:', restaurantResponse.status);
            }
          } catch (restaurantError) {
            console.error('[DynamicMenu] Error fetching restaurant info:', restaurantError);
          }
          
          setConfig(menuConfig);
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
