'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  CustomSectionConfig,
  CustomSectionItem,
  CustomSectionViewport,
} from '@/types/custom-section.types';
import { getCustomSectionLayoutDefinition } from '@/lib/custom-section/layouts';
import {
  getDefaultCustomSectionConfig,
  normalizeCustomSectionConfig,
} from '@/lib/custom-section/normalize';
import {
  resolveCustomSectionSpacing,
  resolveCustomSectionSpacingTier,
} from '@/lib/custom-section/spacing';
import {
  getButtonInlineStyle,
  getSectionContainerStyles,
  getSectionTypographyStyles,
  getSurfaceShadowValue,
  mergeGlobalStyleConfig,
} from '@/lib/section-style';
import {
  CustomSectionIntro,
  CustomSectionItemCard,
  CustomSectionMedia,
  getShapeRadius,
} from './custom-section-primitives';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';

interface CustomSectionRendererProps extends Partial<CustomSectionConfig> {
  previewMode?: CustomSectionViewport;
}

function parseColorToRgb(color?: string | null): [number, number, number] | null {
  if (!color) {
    return null;
  }

  const value = color.trim();
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return [
        Number.parseInt(hex[0] + hex[0], 16),
        Number.parseInt(hex[1] + hex[1], 16),
        Number.parseInt(hex[2] + hex[2], 16),
      ];
    }

    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)/i,
  );
  if (!rgbMatch) {
    return null;
  }

  return [
    Math.max(0, Math.min(255, Number(rgbMatch[1]))),
    Math.max(0, Math.min(255, Number(rgbMatch[2]))),
    Math.max(0, Math.min(255, Number(rgbMatch[3]))),
  ];
}

function isLightColor(color?: string | null) {
  const rgb = parseColorToRgb(color);
  if (!rgb) {
    return null;
  }

  const [r, g, b] = rgb;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.68;
}

function isNearWhite(color?: string | null) {
  const rgb = parseColorToRgb(color);
  if (!rgb) {
    return false;
  }

  const [r, g, b] = rgb;
  return r >= 230 && g >= 230 && b >= 230;
}

function resolveViewport(previewMode?: CustomSectionViewport) {
  if (previewMode) {
    return previewMode;
  }

  if (typeof window === 'undefined') {
    return 'desktop' as const;
  }

  return window.innerWidth < 768 ? 'mobile' : 'desktop';
}

function hiddenRevealStyle(preset: string): CSSProperties {
  switch (preset) {
    case 'fade':
      return { opacity: 0 };
    case 'slide-up':
      return { opacity: 0, transform: 'translate3d(0, 28px, 0)' };
    case 'soft-reveal':
      return {
        opacity: 0,
        transform: 'translate3d(0, 22px, 0) scale(0.985)',
        filter: 'blur(8px)',
      };
    case 'fade-up':
    default:
      return { opacity: 0, transform: 'translate3d(0, 18px, 0)' };
  }
}

function revealDuration(speed?: string) {
  switch (speed) {
    case 'fast':
      return 260;
    case 'slow':
      return 520;
    case 'normal':
    default:
      return 380;
  }
}

function applyPreviewContentFallbacks(
  config: CustomSectionConfig,
): CustomSectionConfig {
  const previewDefaults = getDefaultCustomSectionConfig(config.layout);
  const fallbackItems = previewDefaults.items || [];

  return {
    ...config,
    primaryButtonEnabled:
      config.primaryButtonEnabled ?? previewDefaults.primaryButtonEnabled,
    secondaryButtonEnabled:
      config.secondaryButtonEnabled ?? previewDefaults.secondaryButtonEnabled,
    headline: config.headline?.trim()
      ? config.headline
      : previewDefaults.headline,
    subheadline: config.subheadline?.trim()
      ? config.subheadline
      : previewDefaults.subheadline,
    description: config.description?.trim()
      ? config.description
      : previewDefaults.description,
    primaryButton:
      config.primaryButtonEnabled === false
        ? undefined
        : {
            ...(previewDefaults.primaryButton || {}),
            ...(config.primaryButton || {}),
            label: config.primaryButton?.label?.trim()
              ? config.primaryButton.label
              : previewDefaults.primaryButton?.label || '',
            href: config.primaryButton?.href?.trim()
              ? config.primaryButton.href
              : previewDefaults.primaryButton?.href || '',
            variant:
              config.primaryButton?.variant ||
              previewDefaults.primaryButton?.variant ||
              'primary',
          },
    secondaryButton:
      config.secondaryButtonEnabled === false
        ? undefined
        : {
            ...(previewDefaults.secondaryButton || {}),
            ...(config.secondaryButton || {}),
            label: config.secondaryButton?.label?.trim()
              ? config.secondaryButton.label
              : previewDefaults.secondaryButton?.label || '',
            href: config.secondaryButton?.href?.trim()
              ? config.secondaryButton.href
              : previewDefaults.secondaryButton?.href || '',
            variant:
              config.secondaryButton?.variant ||
              previewDefaults.secondaryButton?.variant ||
              'outline',
          },
    items: (config.items || []).map((item, index) => {
      const fallbackItem =
        fallbackItems[index] ||
        fallbackItems[index % Math.max(fallbackItems.length, 1)];

      if (!fallbackItem) {
        return item;
      }

      return {
        ...item,
        badge: item.badge?.trim() ? item.badge : fallbackItem.badge,
        title: item.title?.trim() ? item.title : fallbackItem.title,
        description: item.description?.trim()
          ? item.description
          : fallbackItem.description,
        statLabel: item.statLabel?.trim()
          ? item.statLabel
          : fallbackItem.statLabel,
        statValue: item.statValue?.trim()
          ? item.statValue
          : fallbackItem.statValue,
      };
    }),
  };
}

export function CustomSectionRenderer(props: CustomSectionRendererProps) {
  const [viewport, setViewport] = useState<CustomSectionViewport>(() =>
    resolveViewport(props.previewMode),
  );
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const [isVisible, setIsVisible] = useState(props.enableScrollReveal !== true);
  const [activeSlide, setActiveSlide] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  const restaurantId = props.restaurant_id?.trim() || '';
  const { config: rawGlobalStyles } = useGlobalStyleConfig({
    apiEndpoint: restaurantId
      ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
      : '/api/global-style-config',
    fetchOnMount: Boolean(restaurantId),
  });
  const globalStyles = useMemo(
    () => mergeGlobalStyleConfig(rawGlobalStyles),
    [rawGlobalStyles],
  );

  useEffect(() => {
    if (props.previewMode) {
      setViewport(props.previewMode);
      return;
    }

    const updateViewport = () => {
      setViewport(resolveViewport());
      setWindowWidth(window.innerWidth);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, [props.previewMode]);

  const normalizedConfig = useMemo(
    () => normalizeCustomSectionConfig(props),
    [props],
  );
  const config = useMemo(
    () =>
      props.previewMode
        ? applyPreviewContentFallbacks(normalizedConfig)
        : normalizedConfig,
    [normalizedConfig, props.previewMode],
  );
  const definition = useMemo(
    () => getCustomSectionLayoutDefinition(config.layout),
    [config.layout],
  );
  const isMobile = viewport === 'mobile';
  const spacingTier = useMemo(
    () =>
      resolveCustomSectionSpacingTier({
        viewport,
        previewMode: props.previewMode,
        windowWidth,
      }),
    [props.previewMode, viewport, windowWidth],
  );
  const spacing = useMemo(
    () =>
      resolveCustomSectionSpacing({
        config,
        viewport,
        tier: spacingTier,
      }),
    [config, spacingTier, viewport],
  );

  useEffect(() => {
    const itemsLength = config.items?.length || 0;
    if (activeSlide > Math.max(itemsLength - 1, 0)) {
      setActiveSlide(0);
    }
  }, [activeSlide, config.items?.length]);

  useEffect(() => {
    if (config.enableScrollReveal !== true) {
      setIsVisible(true);
      return;
    }

    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [config.enableScrollReveal]);

  useEffect(() => {
    if (
      definition.value !== 'layout-31' ||
      config.layoutSettings?.autoplay === false
    ) {
      return;
    }

    const items = config.items || [];
    if (items.length <= 1) {
      return;
    }

    const timeout = window.setInterval(
      () => {
        setActiveSlide((current) => (current + 1) % items.length);
      },
      (config.layoutSettings?.autoplayInterval || 5) * 1000,
    );

    return () => window.clearInterval(timeout);
  }, [
    config.items,
    config.layout,
    config.layoutSettings?.autoplay,
    config.layoutSettings?.autoplayInterval,
    definition.value,
  ]);

  const sectionStyleInput = useMemo(
    () => ({
      ...config,
      sectionPaddingY: spacing.sectionPaddingY,
      sectionPaddingX: spacing.sectionPaddingX,
      mobileSectionPaddingY: spacing.sectionPaddingY,
      mobileSectionPaddingX: spacing.sectionPaddingX,
    }),
    [config, spacing.sectionPaddingX, spacing.sectionPaddingY],
  );
  const { sectionStyle, contentStyle, layoutConfig } =
    getSectionContainerStyles(sectionStyleInput, viewport);
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    config,
    globalStyles,
    viewport,
  );

  const align = (
    isMobile
      ? config.responsive?.mobileContentAlignment ||
        config.layoutSettings?.contentAlignment ||
        layoutConfig.sectionTextAlign
      : config.layoutSettings?.contentAlignment || layoutConfig.sectionTextAlign
  ) as 'left' | 'center' | 'right';

  const contentGap = spacing.internalGap;
  const mediaRatio = isMobile
    ? config.responsive?.mobileMediaRatio ||
      config.layoutSettings?.mediaRatio ||
      '4 / 3'
    : config.layoutSettings?.mediaRatio || '4 / 3';
  const cardColumns = isMobile
    ? config.responsive?.mobileCardColumns || 1
    : config.layoutSettings?.cardColumns || 3;
  const cardSpacing = config.layoutSettings?.cardSpacing || '1.25rem';
  const surfacePadding = spacing.surfacePadding;
  const surfacePaddingLarge = spacing.surfacePaddingLarge;
  const surfacePaddingCompact = spacing.surfacePaddingCompact;
  const stackOnMobile = config.layoutSettings?.stackOnMobile !== false;
  const shouldStack = isMobile && stackOnMobile;
  const splitLayouts = new Set(['layout-2', 'layout-6']);
  const edgeToEdgeLayouts = new Set(['layout-2', 'layout-6', 'layout-22']);
  const useEdgeToEdge = edgeToEdgeLayouts.has(definition.value) && !shouldStack;
  const verticalStackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: contentGap,
  };
  const introOrder = splitLayouts.has(definition.value)
    ? 'subheadline-first'
    : 'default';
  const hideIntroEyebrow = splitLayouts.has(definition.value);

  // Resolve global theme colors — used as fallbacks when useGlobalStyles is ON (is_custom === false)
  const globalAccent =
    globalStyles.accentColor ||
    globalStyles.primaryButton?.backgroundColor ||
    '#7c3aed';
  const globalButtonPrimary =
    globalStyles.primaryButton?.backgroundColor || globalAccent;
  const globalButtonPrimaryText =
    globalStyles.primaryButton?.color || '#ffffff';
  const globalButtonSecondaryBg =
    globalStyles.secondaryButton?.backgroundColor || '#ffffff';
  const globalButtonSecondaryText =
    globalStyles.secondaryButton?.color || globalAccent;
  const globalButtonBorder = globalStyles.secondaryButton?.border
    ? globalStyles.secondaryButton.border
        .replace(/^[0-9a-z.\s]+solid\s+/i, '')
        .trim()
    : `${globalAccent}66`;
  // Derive muted accent tint from global accent (lighten to ~10% opacity)
  const globalMutedAccent = `${globalAccent}1a`;
  const globalBadgeBg = `${globalAccent}18`;
  const globalBadgeText = globalAccent;
  const globalBg = globalStyles.backgroundColor || '#ffffff';
  const globalText = globalStyles.textColor || '#0f172a';

  const palette = {
    background:
      config.styleConfig?.sectionBackgroundColor || config.bgColor || globalBg,
    contentSurface: config.styleConfig?.contentSurfaceBackground || globalBg,
    card: config.styleConfig?.cardBackgroundColor || globalBg,
    accent: config.styleConfig?.accentColor || globalAccent,
    mutedAccent: config.styleConfig?.mutedAccentColor || globalMutedAccent,
    border: config.styleConfig?.borderColor || '#e2e8f0',
    overlayColor:
      config.styleConfig?.overlayColor || config.overlayColor || '#0f172a',
    overlayOpacity:
      config.styleConfig?.overlayOpacity ?? config.overlayOpacity ?? 0.48,
    buttonPrimary:
      config.styleConfig?.buttonBackgroundColor || globalButtonPrimary,
    buttonPrimaryText:
      config.styleConfig?.buttonTextColor || globalButtonPrimaryText,
    buttonSecondary:
      config.styleConfig?.buttonSecondaryBackgroundColor ||
      globalButtonSecondaryBg,
    buttonSecondaryText:
      config.styleConfig?.buttonSecondaryTextColor || globalButtonSecondaryText,
    buttonBorder: config.styleConfig?.buttonBorderColor || globalButtonBorder,
    badgeBackground: config.styleConfig?.badgeBackgroundColor || globalBadgeBg,
    badgeText: config.styleConfig?.badgeTextColor || globalBadgeText,
  };
  // Only use dark/white-text presentation when there is actually a background image/video
  const hasMediaBackground =
    Boolean(config.backgroundImage) ||
    Boolean(config.fallbackImage?.url) ||
    Boolean(config.videoUrl);
  const darkPresentation =
    hasMediaBackground &&
    (definition.family === 'hero' ||
      definition.family === 'video' ||
      definition.value === 'layout-30');

  const radius =
    config.styleConfig?.cardBorderRadius ||
    layoutConfig.surfaceBorderRadius ||
    '1.5rem';
  const shadow = getSurfaceShadowValue(
    config.styleConfig?.cardShadow || layoutConfig.surfaceShadow,
  );
  const buttonSurfaceColor = darkPresentation
    ? palette.overlayColor
    : palette.contentSurface || palette.background;
  const isLightButtonSurface = isLightColor(buttonSurfaceColor) ?? true;
  const resolvedSecondaryTextColor = (() => {
    if (config.secondaryButton?.textColor) {
      return config.secondaryButton.textColor;
    }

    const candidate = palette.buttonSecondaryText;
    if (isLightButtonSurface && isNearWhite(candidate)) {
      return globalStyles.textColor || '#1f2937';
    }

    return candidate || (isLightButtonSurface ? '#1f2937' : '#f8fafc');
  })();
  const resolvedSecondaryBorderColor = (() => {
    if (config.secondaryButton?.borderColor) {
      return config.secondaryButton.borderColor;
    }

    const candidate = palette.buttonBorder;
    if (isLightButtonSurface && isNearWhite(candidate)) {
      return resolvedSecondaryTextColor;
    }

    return candidate || resolvedSecondaryTextColor;
  })();
  const items = config.items || [];
  const globalPrimaryButtonInlineStyle = getButtonInlineStyle(
    globalStyles.primaryButton,
  );
  const globalSecondaryButtonInlineStyle = getButtonInlineStyle(
    globalStyles.secondaryButton,
  );
  const intro = (
    <CustomSectionIntro
      config={config}
      align={align}
      order={introOrder}
      hideEyebrow={hideIntroEyebrow}
      badgeStyle={{
        backgroundColor: darkPresentation
          ? 'rgba(255,255,255,0.14)'
          : palette.badgeBackground,
        color: darkPresentation ? '#ffffff' : palette.badgeText,
      }}
      eyebrowStyle={{
        ...(subtitleStyle as CSSProperties),
        color: darkPresentation ? 'rgba(255,255,255,0.78)' : palette.accent,
      }}
      titleStyle={{
        ...(titleStyle as CSSProperties),
        color: darkPresentation
          ? '#ffffff'
          : (titleStyle as CSSProperties).color,
      }}
      subtitleStyle={{
        ...(subtitleStyle as CSSProperties),
        color: darkPresentation
          ? 'rgba(255,255,255,0.86)'
          : (subtitleStyle as CSSProperties).color,
      }}
      bodyStyle={{
        ...(bodyStyle as CSSProperties),
        color: darkPresentation
          ? 'rgba(255,255,255,0.78)'
          : (bodyStyle as CSSProperties).color,
      }}
      buttonStyles={{
        primary: {
          backgroundColor: palette.buttonPrimary,
          color: palette.buttonPrimaryText,
          borderColor: palette.buttonPrimary,
          border: globalStyles.primaryButton?.border,
          baseStyle: globalPrimaryButtonInlineStyle,
          globalStyle: globalStyles.primaryButton,
        },
        secondary: {
          backgroundColor: palette.buttonSecondary,
          color: resolvedSecondaryTextColor,
          borderColor: resolvedSecondaryBorderColor,
          border: globalStyles.secondaryButton?.border,
          baseStyle: globalSecondaryButtonInlineStyle,
          globalStyle: globalStyles.secondaryButton,
        },
      }}
    />
  );

  const baseSurfaceStyle: CSSProperties = {
    backgroundColor: palette.contentSurface,
    borderRadius: radius,
  };

  const revealPreset =
    config.scrollRevealAnimation || config.animation?.preset || 'fade-up';
  const revealStyle: CSSProperties =
    config.enableScrollReveal && !isVisible
      ? hiddenRevealStyle(revealPreset)
      : {};
  const animatedStyle: CSSProperties = {
    transition: `opacity ${revealDuration(config.animation?.speed)}ms ease, transform ${revealDuration(config.animation?.speed)}ms ease, filter ${revealDuration(config.animation?.speed)}ms ease`,
    ...revealStyle,
  };

  const renderGridItems = (columns = cardColumns) => (
    <div
      className="grid"
      style={{
        gap: cardSpacing,
        gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => (
        <CustomSectionItemCard
          key={item.id}
          item={item}
          accentColor={palette.accent}
          borderColor={palette.border}
          backgroundColor={palette.card}
          radius={radius}
          shadow={shadow}
          titleStyle={{
            ...(titleStyle as CSSProperties),
            fontSize: isMobile ? '1.15rem' : '1.25rem',
          }}
          bodyStyle={bodyStyle as CSSProperties}
        />
      ))}
    </div>
  );

  const renderSplitLayout = (options?: {
    reverse?: boolean;
    circular?: boolean;
    accentShell?: boolean;
    boxed?: boolean;
    overlap?: boolean;
    wideMedia?: boolean;
    diagonal?: boolean;
    edgeToEdge?: boolean;
  }) => {
    const reverse = options?.reverse === true;
    const edgeToEdge = options?.edgeToEdge === true && useEdgeToEdge;
    const edgeGap = contentGap;
    const mediaFlex = edgeToEdge ? 1 : options?.wideMedia ? 1.15 : 1;
    const media = (
      <div
        className="min-w-0"
        style={{
          flex: mediaFlex,
          flexBasis: edgeToEdge ? 0 : undefined,
          marginTop: options?.overlap && !shouldStack ? surfacePadding : 0,
        }}
      >
        <CustomSectionMedia
          image={config.image}
          label={selectedLayout.name}
          aspectRatio={mediaRatio}
          shape={
            options?.circular ? 'circle' : config.layoutSettings?.mediaShape
          }
          accentColor={palette.accent}
          borderColor={palette.border}
        />
      </div>
    );

    const content = (
      <div
        className="min-w-0"
        style={{
          flex: 1,
          flexBasis: edgeToEdge ? 0 : undefined,
          boxSizing: 'border-box',
          ...(options?.boxed
            ? {
                ...baseSurfaceStyle,
                padding: surfacePadding,
              }
            : {}),
        }}
      >
        {intro}
      </div>
    );

    return (
      <div
        className="flex"
        style={{
          flexDirection: shouldStack
            ? 'column'
            : reverse
              ? 'row-reverse'
              : 'row',
          gap: edgeGap,
          alignItems:
            config.layoutSettings?.verticalAlignment === 'start'
              ? 'flex-start'
              : config.layoutSettings?.verticalAlignment === 'end'
                ? 'flex-end'
                : 'center',
          padding: options?.accentShell ? spacing.accentShellPadding : 0,
          borderRadius: options?.accentShell
            ? `calc(${radius} + 0.5rem)`
            : undefined,
          background: options?.accentShell
            ? `linear-gradient(135deg, ${palette.mutedAccent}, rgba(255,255,255,0.92))`
            : options?.diagonal
              ? `linear-gradient(135deg, ${palette.mutedAccent} 0 45%, transparent 45% 100%)`
              : undefined,
        }}
      >
        {options?.overlap && !shouldStack ? (
          <>
            <div style={{ flex: options?.wideMedia ? 1.15 : 1 }}>{media}</div>
            <div
              style={{
                flex: 1,
                marginLeft: `-${spacing.overlapOffset}`,
                position: 'relative',
                zIndex: 2,
              }}
            >
              {content}
            </div>
          </>
        ) : (
          <>
            {media}
            {content}
          </>
        )}
      </div>
    );
  };

  const hasHeroBg = Boolean(
    config.backgroundImage || config.fallbackImage?.url,
  );
  const hasHeroVideo = Boolean(config.videoUrl);

  const renderHeroLayout = (options?: {
    compact?: boolean;
    video?: boolean;
    full?: boolean;
  }) => {
    const hasBg = options?.video ? hasHeroVideo || hasHeroBg : hasHeroBg;
    return (
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: options?.full ? 0 : radius,
          minHeight: options?.full
            ? isMobile
              ? '520px'
              : '720px'
            : options?.compact
              ? '360px'
              : '520px',
          backgroundColor: hasBg ? palette.overlayColor : palette.background,
        }}
      >
        {options?.video && config.videoUrl ? (
          <video
            src={config.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : config.backgroundImage || config.fallbackImage?.url ? (
          <img
            src={config.backgroundImage || config.fallbackImage?.url || ''}
            alt={config.headline}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {hasBg ? (
          <div
            className="absolute inset-0"
            style={{
              background: palette.overlayColor,
              opacity: palette.overlayOpacity,
            }}
          />
        ) : null}
        <div
          className="relative z-10 flex h-full w-full items-center"
          style={{ padding: surfacePaddingLarge }}
        >
          {intro}
        </div>
      </div>
    );
  };

  const selectedLayout = definition;

  const layoutContent = (() => {
    switch (definition.value) {
      case 'layout-1':
        return renderHeroLayout();
      case 'layout-2':
        return renderSplitLayout({ edgeToEdge: true });
      case 'layout-3':
        return renderHeroLayout({ video: true });
      case 'layout-4':
        return renderSplitLayout({ accentShell: true });
      case 'layout-5':
        return renderSplitLayout({ circular: true });
      case 'layout-6':
        return renderSplitLayout({ reverse: true, edgeToEdge: true });
      case 'layout-7':
        return renderSplitLayout();
      case 'layout-8':
      case 'layout-13':
        return (
          <div
            className="grid items-center"
            style={{
              gap: contentGap,
              gridTemplateColumns: shouldStack
                ? '1fr'
                : '0.8fr minmax(0, 1fr) 0.8fr',
            }}
          >
            <CustomSectionMedia
              image={config.image}
              label="Left media"
              aspectRatio={mediaRatio}
              shape={config.layoutSettings?.mediaShape}
              accentColor={palette.accent}
              borderColor={palette.border}
            />
            <div
              style={{
                ...baseSurfaceStyle,
                padding: surfacePadding,
              }}
            >
              {intro}
            </div>
            <CustomSectionMedia
              image={config.secondaryImage || config.image}
              label="Right media"
              aspectRatio={mediaRatio}
              shape={config.layoutSettings?.mediaShape}
              accentColor={palette.accent}
              borderColor={palette.border}
            />
          </div>
        );
      case 'layout-9':
      case 'layout-10':
      case 'layout-21':
        return (
          <div style={verticalStackStyle}>
            <CustomSectionMedia
              image={config.image}
              label={definition.name}
              aspectRatio={mediaRatio}
              shape={config.layoutSettings?.mediaShape}
              accentColor={palette.accent}
              borderColor={palette.border}
            />
            <div
              style={{
                ...baseSurfaceStyle,
                padding: surfacePadding,
              }}
            >
              {intro}
            </div>
          </div>
        );
      case 'layout-11':
        return (
          <div style={verticalStackStyle}>
            <div
              className="grid"
              style={{
                gap: contentGap,
                gridTemplateColumns: shouldStack ? '1fr' : '1fr 1fr',
              }}
            >
              <CustomSectionMedia
                image={config.image}
                label="Primary panel"
                aspectRatio={mediaRatio}
                shape={config.layoutSettings?.mediaShape}
                accentColor={palette.accent}
                borderColor={palette.border}
              />
              <CustomSectionMedia
                image={config.secondaryImage || config.image}
                label="Secondary panel"
                aspectRatio={mediaRatio}
                shape={config.layoutSettings?.mediaShape}
                accentColor={palette.accent}
                borderColor={palette.border}
              />
            </div>
            <div
              style={{
                ...baseSurfaceStyle,
                padding: surfacePadding,
              }}
            >
              {intro}
            </div>
          </div>
        );
      case 'layout-12':
        return renderSplitLayout({ boxed: true });
      case 'layout-14':
        return (
          <div style={verticalStackStyle}>
            {intro}
            {renderGridItems(1)}
          </div>
        );
      case 'layout-15':
        return renderSplitLayout({ wideMedia: true });
      case 'layout-16':
        return renderSplitLayout({ wideMedia: true });
      case 'layout-17':
        return renderSplitLayout();
      case 'layout-18':
        return renderSplitLayout({ overlap: true });
      case 'layout-19':
        return (
          <div
            style={{
              ...baseSurfaceStyle,
              padding: surfacePaddingLarge,
            }}
          >
            {intro}
          </div>
        );
      case 'layout-20':
        return renderSplitLayout({ accentShell: true });
      case 'layout-22':
        return (
          <div style={verticalStackStyle}>
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid items-center"
                style={{
                  gap: contentGap,
                  gridTemplateColumns: shouldStack
                    ? '1fr'
                    : index % 2 === 0
                      ? '1fr minmax(0, 1fr)'
                      : 'minmax(0, 1fr) 1fr',
                }}
              >
                {index % 2 === 0 || shouldStack ? (
                  <CustomSectionMedia
                    image={item.image}
                    label={item.title || `Block ${index + 1}`}
                    aspectRatio={mediaRatio}
                    shape={config.layoutSettings?.mediaShape}
                    accentColor={palette.accent}
                    borderColor={palette.border}
                  />
                ) : null}
                <div>
                  <div
                    style={{
                      ...baseSurfaceStyle,
                      padding: surfacePaddingCompact,
                    }}
                  >
                    <CustomSectionItemCard
                      item={item}
                      accentColor={palette.accent}
                      borderColor={palette.border}
                      backgroundColor={palette.card}
                      radius={radius}
                      shadow="none"
                      titleStyle={{
                        ...(titleStyle as CSSProperties),
                        fontSize: isMobile ? '1.2rem' : '1.35rem',
                      }}
                      bodyStyle={bodyStyle as CSSProperties}
                      showMedia={false}
                      showBorder={false}
                      showMeta={false}
                    />
                  </div>
                </div>
                {index % 2 !== 0 && !shouldStack ? (
                  <CustomSectionMedia
                    image={item.image}
                    label={item.title || `Block ${index + 1}`}
                    aspectRatio={mediaRatio}
                    shape={config.layoutSettings?.mediaShape}
                    accentColor={palette.accent}
                    borderColor={palette.border}
                  />
                ) : null}
              </div>
            ))}
          </div>
        );
      case 'layout-23':
        return (
          <div
            className="grid items-center"
            style={{
              gap: contentGap,
              gridTemplateColumns: shouldStack
                ? '1fr'
                : '0.6fr minmax(0, 1fr) 0.6fr',
            }}
          >
            <div
              className="hidden rounded-[24px] border border-dashed border-slate-300 bg-slate-50 md:block"
              style={{ minHeight: 220 }}
            />
            <div
              style={{
                ...baseSurfaceStyle,
                padding: surfacePaddingLarge,
              }}
            >
              {intro}
            </div>
            <div
              className="hidden rounded-[24px] border border-dashed border-slate-300 bg-slate-50 md:block"
              style={{ minHeight: 220 }}
            />
          </div>
        );
      case 'layout-24':
        return renderHeroLayout({ video: true, full: true });
      case 'layout-25':
        return (
          <div style={verticalStackStyle}>
            {intro}
            {renderGridItems(cardColumns)}
          </div>
        );
      case 'layout-26':
        return (
          <div>
            <div
              style={{
                ...baseSurfaceStyle,
                padding: surfacePaddingLarge,
              }}
            >
              {intro}
            </div>
          </div>
        );
      case 'layout-27':
        return renderSplitLayout({ diagonal: true });
      case 'layout-28':
        return (
          <div style={verticalStackStyle}>
            {intro}
            {renderGridItems(shouldStack ? 1 : 3)}
          </div>
        );
      case 'layout-29':
        return renderSplitLayout({ overlap: true, accentShell: true });
      case 'layout-30':
        return renderHeroLayout({ compact: true });
      case 'layout-31': {
        const currentItem = items[activeSlide] || items[0];
        return (
          <div style={verticalStackStyle}>
            <div
              className="grid items-center"
              style={{
                gap: contentGap,
                gridTemplateColumns: shouldStack
                  ? '1fr'
                  : '1.1fr minmax(0, 0.9fr)',
              }}
            >
              <CustomSectionMedia
                image={currentItem?.image}
                label={currentItem?.title || 'Featured slide'}
                aspectRatio={mediaRatio}
                shape={config.layoutSettings?.mediaShape}
                accentColor={palette.accent}
                borderColor={palette.border}
              />
              <div
                style={{
                  ...baseSurfaceStyle,
                  padding: surfacePadding,
                }}
              >
                {currentItem ? (
                  <CustomSectionItemCard
                    item={currentItem}
                    accentColor={palette.accent}
                    borderColor={palette.border}
                    backgroundColor={palette.card}
                    radius={radius}
                    shadow="none"
                    titleStyle={titleStyle as CSSProperties}
                    bodyStyle={bodyStyle as CSSProperties}
                    showMedia={false}
                    showBorder={false}
                  />
                ) : (
                  intro
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() =>
                  setActiveSlide(
                    (current) => (current - 1 + items.length) % items.length,
                  )
                }
                disabled={items.length <= 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ←
              </button>
              <div className="flex flex-1 items-center justify-center gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      activeSlide === index
                        ? 'w-10 bg-violet-600'
                        : 'w-2.5 bg-slate-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveSlide((current) => (current + 1) % items.length)
                }
                disabled={items.length <= 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-violet-200 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        );
      }
      case 'layout-32':
        return (
          <div style={verticalStackStyle}>
            {intro}
            <div
              className="grid"
              style={{
                gap: cardSpacing,
                gridTemplateColumns: `repeat(${Math.max(cardColumns, 1)}, minmax(0, 1fr))`,
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden"
                  style={{ borderRadius: radius, boxShadow: shadow }}
                >
                  <CustomSectionMedia
                    image={item.image}
                    label={item.title}
                    aspectRatio={mediaRatio}
                    shape={config.layoutSettings?.mediaShape}
                    accentColor={palette.accent}
                    borderColor={palette.border}
                    overlay={
                      <div
                        className={`absolute inset-0 p-5 transition-all duration-300 ${
                          isMobile
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        style={{
                          background: `linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.82) 100%)`,
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                      >
                        <div>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            {item.title}
                          </h3>
                          {item.description ? (
                            <p className="mt-2 text-sm text-white/80">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return renderSplitLayout();
    }
  })();

  const adjustedContentStyle = useEdgeToEdge
    ? { width: '100%', maxWidth: '100%', marginInline: '0' }
    : contentStyle;

  return (
    <section
      ref={sectionRef}
      style={{
        ...sectionStyle,
        backgroundColor: palette.background,
        color: config.textColor || globalText,
        ...animatedStyle,
      }}
    >
      <div
        style={
          definition.value === 'layout-24'
            ? { width: '100%', maxWidth: '100%' }
            : adjustedContentStyle
        }
      >
        {layoutContent}
      </div>
    </section>
  );
}
