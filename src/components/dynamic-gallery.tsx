/**
 * Dynamic Gallery Component
 *
 * Fetches gallery configuration from API and renders the gallery section
 * Similar to DynamicHero and DynamicFAQ components
 */

'use client';

import { useEffect, useState } from 'react';
import Gallery from '@/components/gallery';
import type { GalleryConfig } from '@/types/gallery.types';

interface DynamicGalleryProps {
  /**
   * Restaurant ID to fetch configuration for
   */
  restaurantId?: string;

  /**
   * Page ID to fetch configuration for
   */
  pageId?: string;

  /**
   * Fallback configuration if API fails
   */
  fallbackConfig?: Partial<GalleryConfig>;

  /**
   * Pre-fetched gallery configuration (skips API call)
   */
  configData?: Partial<GalleryConfig>;

  /**
   * Whether to show loading state
   */
  showLoading?: boolean;
}

export default function DynamicGallery({
  restaurantId,
  pageId,
  fallbackConfig,
  configData,
  showLoading = true
}: DynamicGalleryProps) {
  const [config, setConfig] = useState<GalleryConfig | null>(configData as GalleryConfig || null);
  const hasInitialImages = Boolean(
    configData &&
      Array.isArray((configData as any).images) &&
      (configData as any).images.length > 0,
  );
  const [loading, setLoading] = useState(!configData || !hasInitialImages);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);

      try {
        const hasImagesInConfigData = Boolean(
          configData &&
            Array.isArray((configData as any).images) &&
            (configData as any).images.length > 0,
        );

        // If configData already has images, use it directly
        if (configData && hasImagesInConfigData) {
          setConfig(configData as GalleryConfig);
          setLoading(false);
          return;
        }

        // If configData is present but has no images, try to hydrate from media API first
        if (configData && restaurantId) {
          const mediaResponse = await fetch(
            `/api/media?restaurant_id=${encodeURIComponent(restaurantId)}&type=image`,
          );
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json();
            const mediaImages = Array.isArray(mediaData?.data)
              ? mediaData.data
                  .slice(0, 12)
                  .map((item: any, index: number) => {
                    const imageUrl =
                      item?.file?.url ||
                      (item?.file_id
                        ? `/api/image-proxy?fileId=${item.file_id}`
                        : null);
                    if (!imageUrl) {
                      return null;
                    }
                    const alt = item?.file?.name || `Gallery image ${index + 1}`;
                    return {
                      id: item?.id || item?.file_id || `media-${index}`,
                      url: imageUrl,
                      alt,
                      title: alt,
                      order: index,
                    };
                  })
                  .filter(Boolean)
              : [];

            if (mediaImages.length > 0) {
              setConfig({
                ...(configData as GalleryConfig),
                images: mediaImages,
              });
              setLoading(false);
              return;
            }
          }
        }

        // Build URL with restaurant_id if provided
        const url = new URL('/api/gallery-config', window.location.origin);
        if (restaurantId) {
          url.searchParams.set('restaurant_id', restaurantId);
        }

        // If pageId is provided, use it directly
        if (pageId) {
          url.searchParams.set('page_id', pageId);
        } else {
          // Fallback to auto-detecting URL slug from current page
          const currentPath = window.location.pathname;
          const pathSegments = currentPath.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            const urlSlug = pathSegments[pathSegments.length - 1];
            url.searchParams.set('url_slug', urlSlug);
            console.log('[DynamicGallery] Auto-detected url_slug:', urlSlug);
          }
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          throw new Error(data.error || 'Invalid API response structure');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to fetch gallery config:', err);
        setError(errorMessage);

        // Use fallback configuration if provided
        if (fallbackConfig) {
          setConfig(fallbackConfig as GalleryConfig);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [restaurantId, pageId, fallbackConfig, configData]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  // Don't show error state, just don't render if there's an error or no config
  if (error || !config || !config.images || config.images.length === 0) {
    return null;
  }

  // Render gallery with fetched configuration
  return <Gallery {...config} />;
}
