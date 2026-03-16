'use client';

import React, { useEffect, useState } from 'react';
import type { YouTubeConfig } from '@/types/youtube.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { getSectionTypographyStyles } from '@/lib/section-style';

type PreviewViewport = 'desktop' | 'mobile';

interface YouTubeSectionProps {
  restaurantId: string;
  pageId?: string;
  templateId?: string;
  configData?: Partial<YouTubeConfig>;
  previewViewport?: PreviewViewport;
  isPreview?: boolean;
}

export default function YouTubeSection({
  restaurantId,
  pageId,
  templateId,
  configData,
  previewViewport = 'desktop',
  isPreview = false,
}: YouTubeSectionProps): JSX.Element | null {
  const [config, setConfig] = useState<YouTubeConfig | null>((configData as YouTubeConfig) || null);

  const [isLoading, setIsLoading] = useState(!configData);
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`,
    fetchOnMount: Boolean(restaurantId),
  });
  const { ref, style: revealStyle } = useSectionReveal({
    enabled: config?.enableScrollReveal,
    animation: config?.scrollRevealAnimation,
    isPreview,
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
        (data.data.videoUrl || data.data.secondaryVideoUrl)
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

  const renderVideoEmbed = (
    variant: 'featured' | 'tile' = 'featured',
    videoUrlOverride?: string,
  ) => {
    const sourceUrl = videoUrlOverride || config?.videoUrl;
    if (!sourceUrl) return null;

    const aspectRatios = {
      '16:9': '56.25%',
      '4:3': '75%',
      '21:9': '42.85%',
    };

    const paddingBottom = aspectRatios[config.aspectRatio || '16:9'];

    const isTile = variant === 'tile';
    const outerRadius = previewViewport === 'mobile' ? (isTile ? '18px' : '22px') : isTile ? '20px' : '28px';
    const innerRadius = previewViewport === 'mobile' ? (isTile ? '14px' : '18px') : isTile ? '16px' : '22px';

    if (isTile) {
      return (
        <div
          style={{
            borderRadius: outerRadius,
            border: '1px solid rgba(148, 163, 184, 0.2)',
            background: 'rgba(15, 23, 42, 0.92)',
            padding: previewViewport === 'mobile' ? '0.45rem' : '0.6rem',
            boxShadow: '0 18px 35px rgba(15, 23, 42, 0.18)',
          }}
        >
          <div
            style={{
              position: 'relative',
              paddingBottom,
              height: 0,
              overflow: 'hidden',
              borderRadius: innerRadius,
              backgroundColor: '#020617',
            }}
          >
            <iframe
              src={getEmbedUrl(sourceUrl)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: innerRadius,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={config.title || 'Video'}
            />
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: outerRadius,
          border: '1px solid rgba(148, 163, 184, 0.18)',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.42), rgba(248,250,252,0.92))',
          boxShadow: '0 26px 60px rgba(15, 23, 42, 0.14)',
          padding: previewViewport === 'mobile' ? '0.7rem' : '0.85rem',
        }}
      >
        <div
          style={{
            position: 'relative',
            paddingBottom,
            height: 0,
            overflow: 'hidden',
            borderRadius: innerRadius,
            backgroundColor: '#020617',
          }}
        >
          <iframe
            src={getEmbedUrl(sourceUrl)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: innerRadius,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={config.title || 'Video'}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!config) return null;
    const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
      config,
      globalStyles,
    );
    const isPreviewMobile = previewViewport === 'mobile';
    const primaryVideoUrl = config.videoUrl || config.secondaryVideoUrl || '';
    const secondaryVideoUrl = config.secondaryVideoUrl || config.videoUrl || '';
    const maxWidth = config.maxWidth || '1200px';
    const theaterMaxWidth = config.maxWidth || '1400px';
    const contentPadding = isPreviewMobile ? '2.75rem 1rem' : '4rem 1.5rem';
    const surfaceRadius = isPreviewMobile ? '22px' : '28px';
    const surfacePadding = isPreviewMobile ? '1.35rem' : '1.9rem';
    const textPanelStyle: React.CSSProperties = {
      borderRadius: surfaceRadius,
      border: '1px solid rgba(148, 163, 184, 0.18)',
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(248,250,252,0.92))',
      boxShadow: '0 22px 50px rgba(15, 23, 42, 0.12)',
      padding: surfacePadding,
      backdropFilter: 'blur(14px)',
    };
    const renderTextBlock = ({
      centered = false,
      panel = false,
    }: {
      centered?: boolean;
      panel?: boolean;
    }) => {
      if (config.showTitle === false || (!config.title && !config.description)) {
        return null;
      }

      return (
        <div
          style={{
            ...(panel ? textPanelStyle : {}),
            textAlign: centered ? 'center' : 'left',
            maxWidth: centered ? '780px' : undefined,
            margin: centered ? '0 auto' : undefined,
          }}
        >
          {config.title ? (
            <h2
              style={{
                marginBottom: config.description ? '0.9rem' : 0,
                ...titleStyle,
                fontSize: isPreviewMobile ? '1.75rem' : titleStyle.fontSize,
              }}
            >
              {config.title}
            </h2>
          ) : null}
          {config.description ? (
            <p
              style={{
                opacity: 0.86,
                ...bodyStyle,
                lineHeight: 1.75,
                fontSize: isPreviewMobile ? '0.95rem' : bodyStyle.fontSize,
              }}
            >
              {config.description}
            </p>
          ) : null}
        </div>
      );
    };

    const layout = config.layout || 'default';

    // Default Layout - Centered video with title above
    if (layout === 'default') {
      return (
        <div style={{ maxWidth, margin: '0 auto', padding: contentPadding }}>
          <div style={{ marginBottom: isPreviewMobile ? '1.25rem' : '1.75rem' }}>
            {renderTextBlock({ centered: true })}
          </div>
          <div
            style={{
              borderRadius: isPreviewMobile ? '20px' : '26px',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              background:
                'linear-gradient(180deg, rgba(248,250,252,0.96), rgba(241,245,249,0.96))',
              padding: isPreviewMobile ? '1rem' : '1.5rem',
              boxShadow: '0 24px 50px rgba(15, 23, 42, 0.12)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isPreviewMobile
                  ? '1fr'
                  : 'repeat(2, minmax(0, 1fr))',
                gap: isPreviewMobile ? '1rem' : '1.5rem',
              }}
            >
              {(primaryVideoUrl || secondaryVideoUrl
                ? [
                    primaryVideoUrl || secondaryVideoUrl,
                    secondaryVideoUrl || primaryVideoUrl,
                  ]
                : []
              ).map((videoUrl, index) => (
                <div key={`${videoUrl}-${index}`}>
                  {renderVideoEmbed('tile', videoUrl)}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Theater Mode - Extra wide video
    if (layout === 'theater') {
      return (
        <div style={{ maxWidth: theaterMaxWidth, margin: '0 auto', padding: contentPadding }}>
          <div style={{ marginBottom: isPreviewMobile ? '1.5rem' : '2.25rem' }}>
            {renderTextBlock({ centered: true })}
          </div>
          {renderVideoEmbed('featured', primaryVideoUrl)}
        </div>
      );
    }

    // Split Left - Video on left, content on right
    if (layout === 'split-left') {
      return (
        <div
          style={{
            maxWidth,
            margin: '0 auto',
            padding: contentPadding,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
              gap: isPreviewMobile ? '1.5rem' : '2.5rem',
              alignItems: 'center',
            }}
          >
            <div>{renderVideoEmbed('featured', primaryVideoUrl)}</div>
            {renderTextBlock({ panel: true })}
          </div>
        </div>
      );
    }

    // Split Right - Content on left, video on right
    if (layout === 'split-right') {
      return (
        <div style={{ maxWidth, margin: '0 auto', padding: contentPadding }}>
          <div style={{ display: 'grid', gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(320px, 0.9fr) minmax(0, 1.1fr)', gap: isPreviewMobile ? '1.5rem' : '2.5rem', alignItems: 'center' }}>
            {renderTextBlock({ panel: true })}
            <div>{renderVideoEmbed('featured', primaryVideoUrl)}</div>
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
            minHeight: isPreviewMobile ? '460px' : '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isPreviewMobile ? '1.75rem 1rem' : '3rem 1.5rem',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.28,
            }}
          >
            {renderVideoEmbed('featured', primaryVideoUrl)}
          </div>
          {config.showTitle !== false && (config.title || config.description) && (
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: isPreviewMobile ? '100%' : '760px',
                ...textPanelStyle,
              }}
            >
              {config.title && (
                <h2
                  style={{
                    marginBottom: config.description ? '0.9rem' : 0,
                    textAlign: 'center',
                    ...titleStyle,
                  }}
                >
                  {config.title}
                </h2>
              )}
              {config.description && (
                <p
                  style={{
                    textAlign: 'center',
                    opacity: 0.92,
                    ...subtitleStyle,
                    lineHeight: 1.75,
                  }}
                >
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
        <div style={{ maxWidth, margin: '0 auto', padding: contentPadding }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isPreviewMobile ? '1fr' : 'minmax(0, 1.25fr) minmax(320px, 0.75fr)',
              gap: isPreviewMobile ? '1.25rem' : '1.75rem',
              alignItems: 'start',
            }}
          >
            <div>{renderVideoEmbed('featured', primaryVideoUrl)}</div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {renderTextBlock({ panel: true })}
              <div style={textPanelStyle}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: '#7c3aed',
                  }}
                >
                  Video Layout
                </p>
                <div
                  style={{
                    display: 'grid',
                    gap: '0.75rem',
                    marginTop: '1rem',
                  }}
                >
                  {[
                    `Aspect ratio: ${config.aspectRatio || '16:9'}`,
                    config.controls === false ? 'Controls hidden' : 'Controls visible',
                    config.autoplay ? 'Autoplay enabled' : 'Playback starts on demand',
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        borderRadius: '16px',
                        border: '1px solid rgba(148, 163, 184, 0.18)',
                        background: 'rgba(255,255,255,0.72)',
                        padding: '0.85rem 1rem',
                        color: '#334155',
                        fontSize: '0.9rem',
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (isLoading || !config) {
    return null;
  }

  const backgroundColor =
    globalStyles?.backgroundColor || config.bgColor || '#000000';

  return (
    <section
      ref={ref}
      style={{
        backgroundColor,
        width: '100%',
        ...revealStyle,
      }}
    >
      {renderContent()}
    </section>
  );
}
