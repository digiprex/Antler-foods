'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import {
  getSectionContainerStyles,
  getSectionTypographyStyles,
  type SectionViewport,
} from '@/lib/section-style';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';
import { DEFAULT_SCROLLING_TEXT_CONFIG } from '@/types/scrolling-text.types';

interface DynamicScrollingTextProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<ScrollingTextConfig>;
  isPreview?: boolean;
  previewViewport?: SectionViewport;
}

const PREVIEW_MESSAGES = [
  'Fresh pasta rolled every morning',
  'Happy hour cocktails from 4 PM to 6 PM',
  'Weekend brunch reservations now open',
];

function resolveViewportColor(
  desktopColor: string | undefined,
  mobileColor: string | undefined,
  viewport: SectionViewport,
  fallback: string,
) {
  if (viewport === 'mobile') {
    return mobileColor || desktopColor || fallback;
  }

  return desktopColor || fallback;
}

export default function DynamicScrollingText({
  restaurantId,
  pageId,
  templateId,
  showLoading = true,
  configData,
  isPreview = false,
  previewViewport,
}: DynamicScrollingTextProps) {
  const [config, setConfig] = useState<ScrollingTextConfig | null>(
    configData ? { ...DEFAULT_SCROLLING_TEXT_CONFIG, ...configData } : null,
  );
  const [loading, setLoading] = useState(!configData);
  const [error, setError] = useState<string | null>(null);
  const viewport = useSectionViewport(previewViewport);
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  useEffect(() => {
    if (configData) {
      setConfig({
        ...DEFAULT_SCROLLING_TEXT_CONFIG,
        ...configData,
      });
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      if (!restaurantId || (!pageId && !templateId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let url = `/api/scrolling-text-config?restaurant_id=${encodeURIComponent(restaurantId)}`;
        if (templateId) {
          url += `&template_id=${encodeURIComponent(templateId)}`;
        } else if (pageId) {
          url += `&page_id=${encodeURIComponent(pageId)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load scrolling text configuration');
        }

        setConfig(
          data.success && data.data
            ? { ...DEFAULT_SCROLLING_TEXT_CONFIG, ...data.data }
            : null,
        );
      } catch (fetchError) {
        console.error('Error fetching scrolling text config:', fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unknown error occurred',
        );
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [configData, pageId, restaurantId, templateId]);

  const displayConfig = useMemo(() => {
    if (!config) {
      return isPreview ? { ...DEFAULT_SCROLLING_TEXT_CONFIG, isEnabled: true } : null;
    }

    if (isPreview && !config.text?.trim()) {
      return {
        ...config,
        isEnabled: true,
        text: PREVIEW_MESSAGES.join('  •  '),
      };
    }

    return config;
  }, [config, isPreview]);

  const isDisabled = displayConfig?.isEnabled === false;

  const { bodyStyle } = getSectionTypographyStyles(
    displayConfig,
    globalStyles,
    viewport,
  );
  const { sectionStyle, contentStyle, surfaceStyle, layoutConfig } =
    getSectionContainerStyles(displayConfig, viewport);
  const { ref, style: revealStyle } = useSectionReveal({
    enabled: displayConfig?.enableScrollReveal,
    animation: displayConfig?.scrollRevealAnimation,
    isPreview,
  });

  const globalBackground = globalStyles?.backgroundColor;
  const globalText = globalStyles?.textColor;
  const globalAccent =
    globalStyles?.accentColor || globalStyles?.primaryColor;
  const backgroundColor =
    globalBackground
    || resolveViewportColor(
      displayConfig?.bgColor,
      displayConfig?.mobileBgColor,
      viewport,
      '#0f172a',
    );
  const textColor =
    globalText
    || resolveViewportColor(
      displayConfig?.textColor,
      displayConfig?.mobileTextColor,
      viewport,
      '#ffffff',
    );
  const accentColor =
    globalAccent
    || resolveViewportColor(
      displayConfig?.accentColor,
      displayConfig?.mobileAccentColor,
      viewport,
      '#f59e0b',
    );
  const trackText = displayConfig?.text?.trim() || PREVIEW_MESSAGES.join('  •  ');
  const trackItems = [trackText, trackText, trackText, trackText];
  const textGap = displayConfig?.textGap || '3rem';
  const animationDuration =
    displayConfig?.scrollSpeed === 'slow'
      ? '24s'
      : displayConfig?.scrollSpeed === 'fast'
        ? '11s'
        : '16s';

  if (loading && showLoading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
        Loading scrolling text...
      </div>
    );
  }

  if ((error || !displayConfig || isDisabled) && !isPreview) {
    return null;
  }

  if (!displayConfig) {
    return null;
  }

  if (!isPreview && !displayConfig.text?.trim()) {
    return null;
  }

  if (isPreview && isDisabled) {
    return (
      <section
        ref={ref}
        style={{ ...sectionStyle, ...revealStyle }}
        className="bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]"
      >
        <div style={contentStyle}>
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-10 text-center shadow-inner">
            <p className="text-sm font-semibold text-slate-700">Scrolling text is currently disabled</p>
            <p className="mt-2 text-sm text-slate-500">
              Enable the section to preview the live marquee treatment.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isVertical = displayConfig.layout === 'vertical';

  return (
    <section
      ref={ref}
      style={{
        ...sectionStyle,
        ...revealStyle,
        background:
          viewport === 'mobile'
            ? 'linear-gradient(180deg, rgba(248,250,252,0.98), rgba(255,255,255,0.98))'
            : 'linear-gradient(180deg, rgba(248,250,252,0.94), rgba(255,255,255,0.98))',
      }}
    >
      <div style={contentStyle}>
        <div
          className="relative overflow-hidden border border-white/50"
          style={{
            ...surfaceStyle,
            background: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor}DD 100%)`,
            boxShadow:
              surfaceStyle.boxShadow === 'none'
                ? 'none'
                : `${surfaceStyle.boxShadow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <div
              className="absolute -left-10 top-0 h-full w-40 blur-3xl"
              style={{ background: `${accentColor}2e` }}
            />
            <div
              className="absolute right-0 top-0 h-full w-48 blur-3xl"
              style={{ background: `${accentColor}22` }}
            />
          </div>

          {isVertical ? (
            <div className="relative mx-auto flex h-[168px] max-w-3xl items-center justify-center overflow-hidden px-4 py-6 sm:h-[184px] sm:px-8">
              <div
                className="flex flex-col items-center"
                style={{
                  ...bodyStyle,
                  gap: textGap,
                  animation: `scroll-text-vertical ${animationDuration} linear infinite`,
                  color: textColor,
                  textAlign: layoutConfig.sectionTextAlign,
                }}
              >
                {[...PREVIEW_MESSAGES, ...PREVIEW_MESSAGES].map((message, index) => (
                  <div
                    key={`${message}-${index}`}
                    className="flex items-center gap-3 whitespace-nowrap"
                    style={{
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span>{message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden px-4 py-5 sm:px-6">
              <div
                className="inline-flex min-w-full items-center"
                style={{
                  ...bodyStyle,
                  gap: textGap,
                  animation: `scroll-text-horizontal ${animationDuration} linear infinite`,
                  color: textColor,
                  textAlign: layoutConfig.sectionTextAlign,
                }}
              >
                {trackItems.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex shrink-0 items-center gap-4 whitespace-nowrap"
                    style={{
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>{item}</span>
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-text-horizontal {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }

        @keyframes scroll-text-vertical {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(0, -50%, 0);
          }
        }
      `}</style>
    </section>
  );
}
