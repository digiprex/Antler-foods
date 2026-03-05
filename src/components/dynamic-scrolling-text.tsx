/**
 * Dynamic Scrolling Text Component
 * 
 * Fetches scrolling text configuration from API and renders the scrolling text section
 */

'use client';

import { useEffect, useState } from 'react';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';

interface ScrollingTextConfig extends SectionStyleConfig {
  isEnabled?: boolean;
  text?: string;
  bgColor?: string;
  textColor?: string;
  scrollSpeed?: string;
}

interface DynamicScrollingTextProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<ScrollingTextConfig>;
}

export default function DynamicScrollingText({
  restaurantId,
  pageId,
  templateId,
  showLoading = true,
  configData
}: DynamicScrollingTextProps) {
  const [config, setConfig] = useState<ScrollingTextConfig | null>(configData || null);
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as ScrollingTextConfig);
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      try {
        // Build API URL with appropriate parameters
        let url = `/api/scrolling-text-config?restaurant_id=${restaurantId}`;

        // If templateId is provided, use it for specific template fetch
        if (templateId) {
          url += `&template_id=${templateId}`;
          console.log('[ScrollingText] Fetching by template_id:', templateId);
        } else if (pageId) {
          url += `&page_id=${pageId}`;
          console.log('[ScrollingText] Fetching by page_id:', pageId);
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig(data.data);
        } else {
          setError('Failed to load scrolling text configuration');
        }
      } catch (err) {
        console.error('Error fetching scrolling text config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [restaurantId, pageId, templateId, configData]);

  // Show loading state
  if (loading && showLoading) {
    return (
      <div style={{
        minHeight: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <p>Loading scrolling text...</p>
        </div>
      </div>
    );
  }

  // Show error state or if disabled
  if (error || !config || !config.isEnabled) {
    return null;
  }

  // Render scrolling text
  const {
    text = 'Sample scrolling text',
    bgColor = '#000000',
    textColor = '#ffffff',
    scrollSpeed = 'medium'
  } = config;

  const getAnimationDuration = () => {
    switch (scrollSpeed) {
      case 'slow': return '20s';
      case 'fast': return '8s';
      default: return '12s';
    }
  };

  const { bodyStyle } = getSectionTypographyStyles(config, globalStyles);

  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: '12px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
        ...bodyStyle,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          animation: `scroll-left ${getAnimationDuration()} linear infinite`,
          paddingLeft: '100%'
        }}
      >
        {text}
      </div>
      
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translate3d(100%, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
