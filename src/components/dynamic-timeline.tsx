'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import {
  getSectionContainerStyles,
  getSectionTypographyStyles,
  type SectionViewport,
} from '@/lib/section-style';
import type { TimelineConfig, TimelineItem, TimelineLayout } from '@/types/timeline.types';

interface DynamicTimelineProps {
  restaurantId?: string;
  pageId?: string;
  templateId?: string;
  showLoading?: boolean;
  configData?: Partial<TimelineConfig>;
  isPreview?: boolean;
  previewViewport?: SectionViewport;
}

const PREVIEW_ITEMS: TimelineItem[] = [
  {
    id: 'origin',
    date: '2018',
    title: 'Neighborhood Opening',
    description: 'Our first dining room opens with a focused menu and a loyal local following.',
    order: 0,
  },
  {
    id: 'growth',
    date: '2021',
    title: 'Expanded Kitchen',
    description: 'A larger kitchen unlocks seasonal tasting menus, private events, and faster service.',
    order: 1,
  },
  {
    id: 'today',
    date: 'Today',
    title: 'Modern Hospitality',
    description: 'Online orders, chef collaborations, and community-led programming shape the next chapter.',
    order: 2,
  },
];

type ResolvedTimelineLayout =
  | 'alternating'
  | 'left'
  | 'right'
  | 'center'
  | 'horizontal'
  | 'compact';

function normalizeTimelineLayout(layout: TimelineLayout | undefined): ResolvedTimelineLayout {
  switch (layout) {
    case 'horizontal':
      return 'horizontal';
    case 'compact':
      return 'compact';
    case 'left':
      return 'left';
    case 'right':
      return 'right';
    case 'center':
      return 'center';
    case 'alternating':
      return 'alternating';
    case 'vertical':
    default:
      return 'alternating';
  }
}

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

export default function DynamicTimeline({
  restaurantId,
  pageId,
  templateId,
  showLoading = false,
  configData,
  isPreview = false,
  previewViewport,
}: DynamicTimelineProps) {
  const [timelineConfig, setTimelineConfig] = useState<TimelineConfig | null>(
    (configData as TimelineConfig) || null,
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
      setTimelineConfig(configData as TimelineConfig);
      setLoading(false);
      return;
    }

    const fetchTimelineConfig = async () => {
      if (!restaurantId || (!pageId && !templateId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let url = `/api/timeline-config?restaurant_id=${encodeURIComponent(restaurantId)}`;
        if (templateId) {
          url += `&template_id=${encodeURIComponent(templateId)}`;
        } else if (pageId) {
          url += `&page_id=${encodeURIComponent(pageId)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load timeline configuration');
        }

        setTimelineConfig(data.success && data.data ? data.data : null);
      } catch (fetchError) {
        console.error('Error fetching timeline config:', fetchError);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unknown error occurred',
        );
        setTimelineConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineConfig();
  }, [configData, pageId, restaurantId, templateId]);

  const displayConfig = useMemo(() => {
    if (!timelineConfig) {
      return isPreview
        ? {
            restaurant_id: restaurantId || '',
            page_id: pageId || '',
            isEnabled: true,
            layout: 'alternating' as const,
            title: 'Our Journey',
            subtitle: 'The milestones that shaped the brand.',
            items: PREVIEW_ITEMS,
            backgroundColor: '#f8fafc',
            textColor: '#0f172a',
            accentColor: '#7c3aed',
            lineColor: '#cbd5e1',
            cardBackgroundColor: '#ffffff',
          }
        : null;
    }

    if (isPreview && (!timelineConfig.items || timelineConfig.items.length === 0)) {
      return {
        ...timelineConfig,
        isEnabled: true,
        items: PREVIEW_ITEMS,
      };
    }

    return timelineConfig;
  }, [isPreview, pageId, restaurantId, timelineConfig]);

  const isDisabled = displayConfig?.isEnabled === false;
  const items =
    displayConfig?.items && displayConfig.items.length > 0
      ? [...displayConfig.items].sort((a, b) => a.order - b.order)
      : PREVIEW_ITEMS;
  const layout = normalizeTimelineLayout(displayConfig?.layout);

  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
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

  const backgroundColor = resolveViewportColor(
    displayConfig?.backgroundColor,
    displayConfig?.mobileBackgroundColor,
    viewport,
    '#f8fafc',
  );
  const textColor = resolveViewportColor(
    displayConfig?.textColor,
    displayConfig?.mobileTextColor,
    viewport,
    '#0f172a',
  );
  const accentColor = resolveViewportColor(
    displayConfig?.accentColor,
    displayConfig?.mobileAccentColor,
    viewport,
    '#7c3aed',
  );
  const lineColor = resolveViewportColor(
    displayConfig?.lineColor,
    displayConfig?.mobileLineColor,
    viewport,
    '#cbd5e1',
  );
  const cardBackgroundColor = resolveViewportColor(
    displayConfig?.cardBackgroundColor,
    displayConfig?.mobileCardBackgroundColor,
    viewport,
    '#ffffff',
  );

  if (loading && showLoading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-600 shadow-sm">
        Loading timeline...
      </div>
    );
  }

  if ((loading || error || !displayConfig || isDisabled) && !isPreview) {
    return null;
  }

  if (!displayConfig) {
    return null;
  }

  if (!isPreview && (!displayConfig.items || displayConfig.items.length === 0)) {
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
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/90 px-6 py-12 text-center shadow-inner">
            <p className="text-sm font-semibold text-slate-700">Timeline is currently disabled</p>
            <p className="mt-2 text-sm text-slate-500">
              Enable the section to preview the milestone layouts.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      style={{
        ...sectionStyle,
        ...revealStyle,
        background: `radial-gradient(circle at top left, ${accentColor}18, transparent 34%), ${backgroundColor}`,
      }}
    >
      <div style={contentStyle}>
        <div className="mb-10" style={{ textAlign: layoutConfig.sectionTextAlign }}>
          {displayConfig.title ? (
            <h2 className="text-balance" style={{ ...titleStyle, color: textColor }}>
              {displayConfig.title}
            </h2>
          ) : null}
          {displayConfig.subtitle ? (
            <p className="mt-3 max-w-3xl" style={{ ...subtitleStyle, color: textColor, opacity: 0.74 }}>
              {displayConfig.subtitle}
            </p>
          ) : null}
        </div>

        {layout === 'horizontal' ? (
          <HorizontalTimeline
            items={items}
            viewport={viewport}
            textColor={textColor}
            accentColor={accentColor}
            lineColor={lineColor}
            cardBackgroundColor={cardBackgroundColor}
            bodyStyle={bodyStyle}
            surfaceStyle={surfaceStyle}
          />
        ) : layout === 'compact' ? (
          <CompactTimeline
            items={items}
            textColor={textColor}
            accentColor={accentColor}
            lineColor={lineColor}
            cardBackgroundColor={cardBackgroundColor}
            bodyStyle={bodyStyle}
            surfaceStyle={surfaceStyle}
          />
        ) : (
          <StackedTimeline
            variant={layout}
            items={items}
            viewport={viewport}
            textColor={textColor}
            accentColor={accentColor}
            lineColor={lineColor}
            cardBackgroundColor={cardBackgroundColor}
            bodyStyle={bodyStyle}
            surfaceStyle={surfaceStyle}
          />
        )}
      </div>
    </section>
  );
}

function StackedTimeline({
  variant,
  items,
  viewport,
  textColor,
  accentColor,
  lineColor,
  cardBackgroundColor,
  bodyStyle,
  surfaceStyle,
}: {
  variant: Exclude<ResolvedTimelineLayout, 'horizontal' | 'compact'>;
  items: TimelineItem[];
  viewport: SectionViewport;
  textColor: string;
  accentColor: string;
  lineColor: string;
  cardBackgroundColor: string;
  bodyStyle: CSSProperties;
  surfaceStyle: CSSProperties;
}) {
  const isMobile = viewport === 'mobile';

  return (
    <div className="relative mx-auto max-w-6xl">
      {!isMobile ? (
        <div
          className="absolute bottom-0 left-1/2 top-0 -translate-x-1/2"
          style={{
            width: '2px',
            background: `linear-gradient(180deg, ${accentColor} 0%, ${lineColor} 18%, ${lineColor} 82%, ${accentColor} 100%)`,
          }}
        />
      ) : (
        <div
          className="absolute bottom-4 left-4 top-4"
          style={{
            width: '2px',
            background: `linear-gradient(180deg, ${accentColor} 0%, ${lineColor} 16%, ${lineColor} 84%, ${accentColor} 100%)`,
          }}
        />
      )}

      <div className="space-y-7">
        {items.map((item, index) => {
          const desktopPosition =
            variant === 'alternating'
              ? index % 2 === 0
                ? 'left'
                : 'right'
              : variant;
          const rowClass = isMobile
            ? 'pl-10'
            : desktopPosition === 'left'
              ? 'justify-start pr-[52%]'
              : desktopPosition === 'right'
                ? 'justify-end pl-[52%]'
                : 'justify-center';
          const widthClass =
            !isMobile && desktopPosition === 'center'
              ? 'w-full max-w-2xl'
              : 'w-full';

          return (
            <div
              key={item.id}
              className={`relative flex ${rowClass}`}
            >
              {!isMobile ? (
                <div
                  className="absolute left-1/2 top-10 z-10 h-4 w-4 -translate-x-1/2 rounded-full border-[5px] bg-white"
                  style={{ borderColor: accentColor, boxShadow: `0 0 0 6px ${lineColor}22` }}
                />
              ) : (
                <div
                  className="absolute left-[9px] top-10 z-10 h-4 w-4 rounded-full border-[5px] bg-white"
                  style={{ borderColor: accentColor, boxShadow: `0 0 0 6px ${lineColor}22` }}
                />
              )}

              <article
                className={`${widthClass} border border-white/60 p-6`}
                style={{
                  ...surfaceStyle,
                  background: `linear-gradient(180deg, ${cardBackgroundColor} 0%, ${cardBackgroundColor}F0 100%)`,
                }}
              >
                <div className="mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor, backgroundColor: `${accentColor}14` }}>
                  {item.date}
                </div>
                <h3 className="text-lg font-semibold" style={{ color: textColor }}>
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7" style={{ ...bodyStyle, color: textColor, opacity: 0.78 }}>
                  {item.description}
                </p>
              </article>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HorizontalTimeline({
  items,
  viewport,
  textColor,
  accentColor,
  lineColor,
  cardBackgroundColor,
  bodyStyle,
  surfaceStyle,
}: {
  items: TimelineItem[];
  viewport: SectionViewport;
  textColor: string;
  accentColor: string;
  lineColor: string;
  cardBackgroundColor: string;
  bodyStyle: CSSProperties;
  surfaceStyle: CSSProperties;
}) {
  if (viewport === 'mobile') {
    return (
      <CompactTimeline
        items={items}
        textColor={textColor}
        accentColor={accentColor}
        lineColor={lineColor}
        cardBackgroundColor={cardBackgroundColor}
        bodyStyle={bodyStyle}
        surfaceStyle={surfaceStyle}
      />
    );
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-3">
      <div
        className="absolute left-0 right-0 top-[58px] h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accentColor} 0%, ${lineColor} 14%, ${lineColor} 86%, ${accentColor} 100%)` }}
      />
      {items.map((item, index) => (
        <div key={item.id} className="relative pt-16">
          <div
            className="absolute left-8 top-[50px] z-10 h-4 w-4 rounded-full border-[5px] bg-white"
            style={{ borderColor: accentColor }}
          />
          <article
            className="h-full border border-white/60 p-6"
            style={{
              ...surfaceStyle,
              background: `linear-gradient(180deg, ${cardBackgroundColor} 0%, ${cardBackgroundColor}F0 100%)`,
            }}
          >
            <div className="mb-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor, backgroundColor: `${accentColor}14` }}>
              Step {index + 1}
            </div>
            <h3 className="text-lg font-semibold" style={{ color: textColor }}>
              {item.title}
            </h3>
            <p className="mt-2 text-sm font-semibold" style={{ color: accentColor }}>
              {item.date}
            </p>
            <p className="mt-4 text-sm leading-7" style={{ ...bodyStyle, color: textColor, opacity: 0.78 }}>
              {item.description}
            </p>
          </article>
        </div>
      ))}
    </div>
  );
}

function CompactTimeline({
  items,
  textColor,
  accentColor,
  lineColor,
  cardBackgroundColor,
  bodyStyle,
  surfaceStyle,
}: {
  items: TimelineItem[];
  textColor: string;
  accentColor: string;
  lineColor: string;
  cardBackgroundColor: string;
  bodyStyle: CSSProperties;
  surfaceStyle: CSSProperties;
}) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="relative border border-white/60 p-5"
          style={{
            ...surfaceStyle,
            background: `linear-gradient(180deg, ${cardBackgroundColor} 0%, ${cardBackgroundColor}F0 100%)`,
          }}
        >
          <div
            className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-[2px]"
            style={{ background: `linear-gradient(180deg, ${accentColor} 0%, ${lineColor} 100%)` }}
          />
          <div className="relative pl-7">
            <div
              className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-[4px] bg-white"
              style={{ borderColor: accentColor }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
              {item.date}
            </p>
            <h3 className="mt-2 text-base font-semibold" style={{ color: textColor }}>
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-7" style={{ ...bodyStyle, color: textColor, opacity: 0.78 }}>
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
