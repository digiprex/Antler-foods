'use client';

import React, { useEffect, useState } from 'react';
import type { YouTubeConfig } from '@/types/youtube.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';

interface YouTubeSectionProps {
  restaurantId: string;
  pageId?: string;
  templateId?: string;
  configData?: Partial<YouTubeConfig>;
}

export default function YouTubeSection({ restaurantId, pageId, templateId, configData }: YouTubeSectionProps): JSX.Element | null {
  const [config, setConfig] = useState<YouTubeConfig | null>((configData as YouTubeConfig) || null);

  const [isLoading, setIsLoading] = useState(!configData);
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    fetchOnMount: Boolean(restaurantId),
  });

  useEffect(() => {
    // If configData is provided, use it directly
    if (configData) {
      setConfig(configData as YouTubeConfig);
      setIsLoading(false);
      return;
    }

    // Otherwise fetch from API
    fetchYouTubeConfig();
  }, [restaurantId, pageId, templateId, configData]);

  const fetchYouTubeConfig = async () => {
    try {
      // Build API endpoint with restaurant_id and appropriate identifier
      let apiEndpoint = `/api/youtube-config?restaurant_id=${restaurantId}`;

      // If templateId is provided, use it for specific template fetch
      if (templateId) {
        apiEndpoint += `&template_id=${templateId}`;
        console.log('[YouTube] Fetching by template_id:', templateId);
      } else if (pageId) {
        // If pageId is provided, use it directly
        apiEndpoint += `&page_id=${pageId}`;
        console.log('[YouTube] Fetching by page_id:', pageId);
      } else {
        // Fallback to url_slug detection for backward compatibility
        const currentPath =
          typeof window !== 'undefined' ? window.location.pathname : '';
        const pathSegments = currentPath.split('/').filter(Boolean);
        const urlSlug =
          pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

        if (urlSlug && urlSlug !== restaurantId) {
          apiEndpoint += `&url_slug=${urlSlug}`;
          console.log('[YouTube] Fetching by url_slug:', urlSlug);
        }
      }

      const response = await fetch(apiEndpoint);
      const data = await response.json();

      if (
        data.success &&
        data.data &&
        data.data.enabled &&
        data.data.videoUrl
      ) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching YouTube config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractVideoId = (url: string): string => {
    if (!url) return '';

    // If it's already just an ID
    if (url.length === 11 && !url.includes('/') && !url.includes('=')) {
      return url;
    }

    // Extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  };

  const getEmbedUrl = (videoUrl: string): string => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return '';

    const params = new URLSearchParams();
    if (config?.autoplay) params.append('autoplay', '1');
    if (config?.mute) params.append('mute', '1');
    if (config?.loop) params.append('loop', '1');
    if (config?.loop) params.append('playlist', videoId); // Required for loop
    if (config?.controls === false) params.append('controls', '0');

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const renderVideoEmbed = () => {
    if (!config?.videoUrl) return null;

    const aspectRatios = {
      '16:9': '56.25%',
      '4:3': '75%',
      '21:9': '42.85%',
    };

    const paddingBottom = aspectRatios[config.aspectRatio || '16:9'];

    return (
      <div
        style={{
          position: 'relative',
          paddingBottom,
          height: 0,
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <iframe
          src={getEmbedUrl(config.videoUrl)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '12px',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={config.title || 'Video'}
        />
      </div>
    );
  };

  const renderContent = () => {
    if (!config) return null;
    const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
      config,
      globalStyles,
    );

    const layout = config.layout || 'default';

    // Default Layout - Centered video with title above
    if (layout === 'default') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ marginBottom: '1rem', ...titleStyle }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ opacity: 0.9, maxWidth: '800px', margin: '0 auto', ...bodyStyle }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          {renderVideoEmbed()}
        </div>
      );
    }

    // Theater Mode - Extra wide video
    if (layout === 'theater') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1400px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ marginBottom: '1rem', ...titleStyle }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ opacity: 0.9, ...bodyStyle }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          {renderVideoEmbed()}
        </div>
      );
    }

    // Split Left - Video on left, content on right
    if (layout === 'split-left') {
      return (
        <div
          style={{
            maxWidth: config.maxWidth || '1200px',
            margin: '0 auto',
            padding: '4rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center',
            }}
          >
            <div>{renderVideoEmbed()}</div>
            {config.showTitle !== false &&
              (config.title || config.description) && (
                <div>
                  {config.title && (
                    <h2 style={{ marginBottom: '1.5rem', ...titleStyle }}>
                      {config.title}
                    </h2>
                  )}
                  {config.description && (
                    <p
                      style={{ lineHeight: '1.75', opacity: 0.9, ...bodyStyle }}
                    >
                      {config.description}
                    </p>
                  )}
                </div>
              )}
          </div>
        </div>
      );
    }

    // Split Right - Content on left, video on right
    if (layout === 'split-right') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            {config.showTitle !== false && (config.title || config.description) && (
              <div>
                {config.title && (
                  <h2 style={{ marginBottom: '1.5rem', ...titleStyle }}>
                    {config.title}
                  </h2>
                )}
                {config.description && (
                  <p style={{ lineHeight: '1.75', opacity: 0.9, ...bodyStyle }}>
                    {config.description}
                  </p>
                )}
              </div>
            )}
            <div>{renderVideoEmbed()}</div>
          </div>
        </div>
      );
    }

    // Background - Video takes full width with overlay content
    if (layout === 'background') {
      return (
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.3,
            }}
          >
            {renderVideoEmbed()}
          </div>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '2rem', maxWidth: '800px' }}>
              {config.title && (
                <h2 style={{ marginBottom: '1.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.5)', ...titleStyle }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ opacity: 0.9, textShadow: '0 2px 10px rgba(0,0,0,0.5)', ...subtitleStyle }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    // Grid - Multiple videos (for future enhancement)
    if (layout === 'grid') {
      return (
        <div style={{ maxWidth: config.maxWidth || '1200px', margin: '0 auto', padding: '4rem 1.5rem' }}>
          {config.showTitle !== false && (config.title || config.description) && (
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
              {config.title && (
                <h2 style={{ marginBottom: '1rem', ...titleStyle }}>
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p style={{ opacity: 0.9, ...bodyStyle }}>
                  {config.description}
                </p>
              )}
            </div>
          )}
          {renderVideoEmbed()}
        </div>
      );
    }

    return null;
  };

  if (isLoading || !config) {
    return null;
  }

  return (
    <section
      style={{
        backgroundColor: config.bgColor || '#000000',
        width: '100%',
      }}
    >
      {renderContent()}
    </section>
  );
}
