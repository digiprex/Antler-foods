/**
 * Hero Component
 *
 * Renders hero section based on configuration with multiple layout options.
 */

'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DEFAULT_HERO_CONFIG, type HeroConfig } from '@/types/hero.types';
import styles from './hero.module.scss';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getHeroLayoutMediaCapabilities } from '@/lib/hero-layout-media';
import { getRenderableHeroButtons, mergeHeroConfig } from '@/lib/hero-config';
import { getButtonInlineStyle, getSectionTypographyStyles, mergeGlobalStyleConfig } from '@/lib/section-style';
import type { ButtonStyle } from '@/types/global-style.types';

interface HeroProps extends Partial<HeroConfig> {
  restaurant_id?: string;
  previewMode?: 'desktop' | 'mobile';
}

type HeroButtonVariant = NonNullable<HeroConfig['primaryButton']>['variant'];

export default function Hero(props: HeroProps) {
  const { previewMode } = props;
  const resolvedConfig = mergeHeroConfig(props);
  const {
    headline,
    subheadline,
    description,
    image,
    videoUrl,
    backgroundImage,
    imageBorderRadius,
    imageObjectFit = 'cover',
    minimalImages,
    sideBySideImages,
    features = [],
    layout = 'centered-large',
    bgColor = '#ffffff',
    mobileBgColor,
    textColor = '#000000',
    overlayColor = '#000000',
    overlayOpacity = 0.5,
    textAlign = 'center',
    mobileTextAlign,
    paddingTop = '6rem',
    paddingBottom = '6rem',
    paddingInline,
    mobilePaddingInline,
    minHeight = '600px',
    mobileMinHeight,
    showScrollIndicator = false,
    contentMaxWidth = '1200px',
    restaurant_id,
    contentAnimation = 'none',
    defaultContentPanelBackgroundColor = '#ffffff',
    defaultContentPanelMobileBackgroundColor,
    defaultContentPanelBorderRadius = '2rem',
    defaultContentPanelMobileBorderRadius,
    defaultContentPanelMaxWidth = '860px',
    defaultContentPanelMinHeight,
    defaultContentPanelMarginTop,
    defaultContentPanelMarginBottom,
    defaultContentPanelMobileMaxWidth,
    defaultContentPanelMobileMinHeight,
    defaultContentPanelMobileMarginTop,
    defaultContentPanelMobileMarginBottom,
    videoContentPanelEnabled = false,
    videoContentPanelBackgroundColor = 'rgba(15, 23, 42, 0.48)',
    videoContentPanelMobileBackgroundColor,
    videoContentPanelBorderRadius = '2rem',
    videoContentPanelMobileBorderRadius,
    videoContentPanelMaxWidth = '640px',
    videoContentPanelMinHeight,
    videoContentPanelMarginTop,
    videoContentPanelMarginBottom,
    videoContentPanelMobileMaxWidth,
    videoContentPanelMobileMinHeight,
    videoContentPanelMobileMarginTop,
    videoContentPanelMobileMarginBottom,
    videoContentPanelPosition = 'left',
    videoContentPanelMobilePosition,
    is_custom,
    titleFontFamily,
    titleFontSize,
    titleFontWeight,
    titleFontStyle,
    titleColor,
    titleTextTransform,
    titleLineHeight,
    titleLetterSpacing,
    subtitleFontFamily,
    subtitleFontSize,
    subtitleFontWeight,
    subtitleFontStyle,
    subtitleColor,
    subtitleTextTransform,
    subtitleLineHeight,
    subtitleLetterSpacing,
    bodyFontFamily,
    bodyFontSize,
    bodyFontWeight,
    bodyFontStyle,
    bodyColor,
    bodyTextTransform,
    bodyLineHeight,
    bodyLetterSpacing,
  } = resolvedConfig;
  const { primaryButton, secondaryButton } = getRenderableHeroButtons(resolvedConfig);
  const heroRef = useRef<HTMLElement | null>(null);
  const motionEnabled = contentAnimation !== 'none';
  const [isInView, setIsInView] = useState(!motionEnabled);
  const [isClientMobileViewport, setIsClientMobileViewport] = useState(
    previewMode === 'mobile',
  );
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);

  if (process.env.NODE_ENV === 'development') {
    console.log('Hero component props:', {
      layout,
      hasImage: Boolean(image),
      imageUrl: image?.url,
      hasBackgroundImage: Boolean(backgroundImage),
      backgroundImageUrl: backgroundImage,
      hasVideo: Boolean(videoUrl),
      videoUrl,
      previewMode,
    });
  }

  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const mergedGlobalStyles = useMemo(
    () => mergeGlobalStyleConfig(globalStyles),
    [globalStyles],
  );
  const { resolved: resolvedTypography } = getSectionTypographyStyles(resolvedConfig, globalStyles);
  const useGlobalStyles = resolvedConfig.is_custom !== true;
  const buildResponsiveTypographyVars = (
    prefix: 'title' | 'subtitle' | 'body',
    desktop: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: number;
      fontStyle?: string;
      color?: string;
      textTransform?: string;
      lineHeight?: string;
      letterSpacing?: string;
    },
    mobile: {
      fontFamily?: string;
      fontSize?: string;
      fontWeight?: number;
      fontStyle?: string;
      color?: string;
      textTransform?: string;
      lineHeight?: string;
      letterSpacing?: string;
    },
  ) => {
    const vars: CSSProperties & Record<string, any> = {};
    const assignVar = (name: string, value: string | number | undefined) => {
      if (value === undefined || value === '') {
        return;
      }

      vars[name] = value;
    };

    assignVar(`--hero-${prefix}-font-family`, desktop.fontFamily);
    assignVar(`--hero-${prefix}-font-size`, desktop.fontSize);
    assignVar(`--hero-${prefix}-font-weight`, desktop.fontWeight);
    assignVar(`--hero-${prefix}-font-style`, desktop.fontStyle);
    assignVar(`--hero-${prefix}-color`, desktop.color);
    assignVar(`--hero-${prefix}-text-transform`, desktop.textTransform);
    assignVar(`--hero-${prefix}-line-height`, desktop.lineHeight);
    assignVar(`--hero-${prefix}-letter-spacing`, desktop.letterSpacing);
    assignVar(`--hero-${prefix}-mobile-font-family`, mobile.fontFamily);
    assignVar(`--hero-${prefix}-mobile-font-size`, mobile.fontSize);
    assignVar(`--hero-${prefix}-mobile-font-weight`, mobile.fontWeight);
    assignVar(`--hero-${prefix}-mobile-font-style`, mobile.fontStyle);
    assignVar(`--hero-${prefix}-mobile-color`, mobile.color);
    assignVar(`--hero-${prefix}-mobile-text-transform`, mobile.textTransform);
    assignVar(`--hero-${prefix}-mobile-line-height`, mobile.lineHeight);
    assignVar(`--hero-${prefix}-mobile-letter-spacing`, mobile.letterSpacing);

    return vars;
  };
  const titleResponsiveStyle = buildResponsiveTypographyVars(
    'title',
    {
      fontFamily: resolvedTypography.titleFontFamily,
      fontSize: resolvedTypography.titleFontSize,
      fontWeight: resolvedTypography.titleFontWeight,
      fontStyle: resolvedTypography.titleFontStyle,
      color: resolvedTypography.titleColor,
      textTransform: resolvedTypography.titleTextTransform,
      lineHeight: resolvedTypography.titleLineHeight,
      letterSpacing: resolvedTypography.titleLetterSpacing,
    },
    {
      fontFamily: resolvedTypography.titleMobileFontFamily,
      fontSize: resolvedTypography.titleMobileFontSize,
      fontWeight: resolvedTypography.titleMobileFontWeight,
      fontStyle: resolvedTypography.titleMobileFontStyle,
      color: resolvedTypography.titleMobileColor,
      textTransform: resolvedTypography.titleMobileTextTransform,
      lineHeight: resolvedTypography.titleMobileLineHeight,
      letterSpacing: resolvedTypography.titleMobileLetterSpacing,
    },
  );
  const subtitleResponsiveStyle = buildResponsiveTypographyVars(
    'subtitle',
    {
      fontFamily: resolvedTypography.subtitleFontFamily,
      fontSize: resolvedTypography.subtitleFontSize,
      fontWeight: resolvedTypography.subtitleFontWeight,
      fontStyle: resolvedTypography.subtitleFontStyle,
      color: resolvedTypography.subtitleColor,
      textTransform: resolvedTypography.subtitleTextTransform,
      lineHeight: resolvedTypography.subtitleLineHeight,
      letterSpacing: resolvedTypography.subtitleLetterSpacing,
    },
    {
      fontFamily: resolvedTypography.subtitleMobileFontFamily,
      fontSize: resolvedTypography.subtitleMobileFontSize,
      fontWeight: resolvedTypography.subtitleMobileFontWeight,
      fontStyle: resolvedTypography.subtitleMobileFontStyle,
      color: resolvedTypography.subtitleMobileColor,
      textTransform: resolvedTypography.subtitleMobileTextTransform,
      lineHeight: resolvedTypography.subtitleMobileLineHeight,
      letterSpacing: resolvedTypography.subtitleMobileLetterSpacing,
    },
  );
  const bodyResponsiveStyle = buildResponsiveTypographyVars(
    'body',
    {
      fontFamily: resolvedTypography.bodyFontFamily,
      fontSize: resolvedTypography.bodyFontSize,
      fontWeight: resolvedTypography.bodyFontWeight,
      fontStyle: resolvedTypography.bodyFontStyle,
      color: resolvedTypography.bodyColor,
      textTransform: resolvedTypography.bodyTextTransform,
      lineHeight: resolvedTypography.bodyLineHeight,
      letterSpacing: resolvedTypography.bodyLetterSpacing,
    },
    {
      fontFamily: resolvedTypography.bodyMobileFontFamily,
      fontSize: resolvedTypography.bodyMobileFontSize,
      fontWeight: resolvedTypography.bodyMobileFontWeight,
      fontStyle: resolvedTypography.bodyMobileFontStyle,
      color: resolvedTypography.bodyMobileColor,
      textTransform: resolvedTypography.bodyMobileTextTransform,
      lineHeight: resolvedTypography.bodyMobileLineHeight,
      letterSpacing: resolvedTypography.bodyMobileLetterSpacing,
    },
  );

  useEffect(() => {
    if (previewMode) {
      setIsClientMobileViewport(previewMode === 'mobile');
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsClientMobileViewport(mediaQuery.matches);
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, [previewMode]);

  useEffect(() => {
    if (previewMode) {
      if (!motionEnabled) {
        setIsInView(true);
        return;
      }

      setIsInView(false);
      let frameOne = 0;
      let frameTwo = 0;
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(() => {
          setIsInView(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameOne);
        window.cancelAnimationFrame(frameTwo);
      };
    }

    if (!motionEnabled) {
      setIsInView(true);
      return;
    }

    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.16);
      },
      {
        threshold: [0, 0.16, 0.32, 0.56],
        rootMargin: '0px 0px -12% 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [motionEnabled, contentAnimation, previewMode]);

  const scrollToContent = () => {
    window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  };

  const getMotionStyle = (delay = 0): CSSProperties =>
    motionEnabled
      ? ({
          ['--hero-motion-delay' as string]: `${delay}ms`,
        } as CSSProperties)
      : {};

  const mergeMotionStyle = (
    baseStyle: CSSProperties | undefined,
    delay = 0,
  ): CSSProperties => ({
    ...(baseStyle || {}),
    ...getMotionStyle(delay),
  });

  const isRenderableButton = (button?: HeroConfig['primaryButton']) =>
    Boolean(button && (button.label?.trim() || button.href?.trim()));

  const getButtonLabel = (button?: HeroConfig['primaryButton']) => {
    const label = button?.label?.trim();
    if (label) return label;

    const href = button?.href?.trim();
    if (!href || href === '#') return 'Learn more';
    if (href.startsWith('#')) return `Go to ${href.slice(1).replace(/[-_]+/g, ' ') || 'section'}`;

    return 'Open link';
  };

  const resolvedDesktopTextAlign =
    layout === 'video-background' &&
    (!textAlign?.trim() || textAlign === DEFAULT_HERO_CONFIG.textAlign)
      ? 'left'
      : textAlign;
  const resolvedMobileTextAlign =
    layout === 'video-background' &&
    (!mobileTextAlign?.trim() || mobileTextAlign === DEFAULT_HERO_CONFIG.mobileTextAlign)
      ? resolvedDesktopTextAlign
      : mobileTextAlign;
  const effectiveTextAlign =
    isClientMobileViewport && resolvedMobileTextAlign
      ? resolvedMobileTextAlign
      : resolvedDesktopTextAlign;

  const getAlignedContentClass = () => {
    if (effectiveTextAlign === 'left') return styles.contentLeft;
    if (effectiveTextAlign === 'right') return styles.contentRight;
    return styles.contentCentered;
  };

  const effectiveVideoContentPanelPosition =
    (isClientMobileViewport && videoContentPanelMobilePosition) ||
    videoContentPanelPosition ||
    (effectiveTextAlign === 'right'
      ? 'right'
      : effectiveTextAlign === 'center'
        ? 'center'
        : 'left');

  const getVideoContentPositionClass = () => {
    if (effectiveVideoContentPanelPosition === 'right') {
      return styles.videoContentColumnRight;
    }

    if (effectiveVideoContentPanelPosition === 'center') {
      return styles.videoContentColumnCentered;
    }

    return styles.videoContentColumnLeft;
  };

  const mediaCapabilities = getHeroLayoutMediaCapabilities(layout);
  const activeImage = mediaCapabilities.showHeroImage ? image : undefined;
  const resolvedDefaultContentPanelMaxWidth =
    defaultContentPanelMaxWidth?.trim() === '960px' ||
    defaultContentPanelMaxWidth?.trim() === '900px'
      ? '860px'
      : (defaultContentPanelMaxWidth || '860px');
  const activeVideoUrl = mediaCapabilities.showBackgroundVideo ? videoUrl : undefined;
  const showVideoBackground = Boolean(activeVideoUrl) && !videoLoadFailed;
  const activeBackgroundImage = mediaCapabilities.showBackgroundImage ? backgroundImage : undefined;
  const hasCustomBackgroundColor =
    typeof bgColor === 'string' &&
    bgColor.trim() !== '' &&
    bgColor !== DEFAULT_HERO_CONFIG.bgColor;
  const hasCustomTextColor =
    typeof textColor === 'string' &&
    textColor.trim() !== '' &&
    textColor !== DEFAULT_HERO_CONFIG.textColor;
  const resolvedBgColor =
    useGlobalStyles && !hasCustomBackgroundColor
      ? mergedGlobalStyles.backgroundColor || bgColor
      : bgColor;
  const resolvedTextColor =
    useGlobalStyles && !hasCustomTextColor
      ? activeBackgroundImage || showVideoBackground
        ? '#ffffff'
        : mergedGlobalStyles.textColor || textColor
      : textColor;
  const resolvedPaddingTop =
    layout === 'minimal' && paddingTop === DEFAULT_HERO_CONFIG.paddingTop ? '5rem' : paddingTop;
  const resolvedPaddingBottom =
    layout === 'minimal' && paddingBottom === DEFAULT_HERO_CONFIG.paddingBottom
      ? '5rem'
      : paddingBottom;
  const resolvedPaddingInline =
    layout === 'minimal' && !paddingInline?.trim() ? '8rem' : paddingInline;
  const resolvedContentMaxWidth =
    !contentMaxWidth?.trim() || contentMaxWidth === DEFAULT_HERO_CONFIG.contentMaxWidth
      ? '100%'
      : contentMaxWidth;
  const minimalLayoutImages =
    layout === 'minimal'
      ? {
          primary: minimalImages?.primary || activeImage,
          secondaryTop: minimalImages?.secondaryTop || activeImage,
          secondaryBottom: minimalImages?.secondaryBottom || activeImage,
        }
      : null;
  const sideBySideLayoutImages =
    layout === 'side-by-side'
      ? {
          left: sideBySideImages?.left || activeImage,
          center: sideBySideImages?.center || activeImage,
          right: sideBySideImages?.right || activeImage,
        }
      : null;

  const heroStyle: CSSProperties & Record<string, any> = {
    '--hero-bg-color': resolvedBgColor,
    '--hero-mobile-bg-color': mobileBgColor,
    '--hero-text-color': resolvedTextColor,
    '--hero-overlay-color': overlayColor,
    '--hero-overlay-opacity': overlayOpacity,
    '--hero-padding-top': resolvedPaddingTop,
    '--hero-padding-bottom': resolvedPaddingBottom,
    '--hero-min-height': minHeight,
    '--hero-mobile-min-height': mobileMinHeight,
    '--hero-content-max-width': resolvedContentMaxWidth,
    '--hero-text-align': resolvedDesktopTextAlign,
    '--hero-mobile-text-align': resolvedMobileTextAlign,
    '--hero-image-object-fit': imageObjectFit,
    '--hero-screen-height':
      previewMode === 'mobile' ? '780px' : previewMode === 'desktop' ? '720px' : '100svh',
  };

  if (imageBorderRadius?.trim()) {
    heroStyle['--hero-image-border-radius'] = imageBorderRadius;
  }

  if (resolvedPaddingInline?.trim()) {
    heroStyle['--hero-padding-inline'] = resolvedPaddingInline;
  }

  if (mobilePaddingInline?.trim()) {
    heroStyle['--hero-mobile-padding-inline'] = mobilePaddingInline;
  }

  if (activeBackgroundImage && !showVideoBackground) {
    heroStyle.backgroundImage = `url(${activeBackgroundImage})`;
  }

  useEffect(() => {
    setVideoLoadFailed(false);
  }, [activeVideoUrl]);

  const resolveGlobalButtonStyle = (
    variant: HeroButtonVariant,
    fallbackVariant: 'primary' | 'secondary',
  ): ButtonStyle | undefined => {
    if (variant === 'secondary') {
      return mergedGlobalStyles.secondaryButton;
    }

    if (variant === 'primary') {
      return mergedGlobalStyles.primaryButton;
    }

    return fallbackVariant === 'secondary'
      ? mergedGlobalStyles.secondaryButton
      : mergedGlobalStyles.primaryButton;
  };

  const buildButtonStyle = (
    button: HeroConfig['primaryButton'] | undefined,
    fallbackVariant: 'primary' | 'secondary',
  ) => {
    const variant = button?.variant || fallbackVariant;
    const globalStyle = resolveGlobalButtonStyle(variant, fallbackVariant);
    const baseStyle = getButtonInlineStyle(globalStyle);
    const accentColor =
      button?.borderColor ||
      button?.bgColor ||
      globalStyle?.backgroundColor ||
      globalStyle?.color ||
      mergedGlobalStyles.accentColor ||
      '#2563eb';

    let backgroundColor = baseStyle.backgroundColor;
    let color = baseStyle.color;
    let border = baseStyle.border;

    if (variant === 'outline') {
      backgroundColor = 'transparent';
      color = baseStyle.color || accentColor;
      border =
        globalStyle?.border && globalStyle.border !== 'none'
          ? globalStyle.border
          : `1px solid ${accentColor}`;
    }

    if (button?.bgColor) {
      backgroundColor = button.bgColor;
    }

    if (button?.textColor) {
      color = button.textColor;
    }

    if (button?.borderColor) {
      border = `1px solid ${button.borderColor}`;
    }

    const style: CSSProperties & Record<string, any> = {
      '--hero-button-bg': backgroundColor,
      '--hero-button-color': color,
      '--hero-button-border': border,
      '--hero-button-hover-bg': globalStyle?.hoverBackgroundColor,
      '--hero-button-hover-color': globalStyle?.hoverColor,
    };

    if (baseStyle.fontFamily) {
      style.fontFamily = baseStyle.fontFamily;
    }
    if (baseStyle.fontSize) {
      style.fontSize = baseStyle.fontSize;
    }
    if (baseStyle.fontWeight) {
      style.fontWeight = baseStyle.fontWeight;
    }
    if (baseStyle.borderRadius) {
      style.borderRadius = baseStyle.borderRadius;
    }
    if (baseStyle.textTransform) {
      style.textTransform = baseStyle.textTransform;
    }

    return style;
  };

  const renderButtons = () => {
    const visiblePrimaryButton = isRenderableButton(primaryButton) ? primaryButton : undefined;
    const visibleSecondaryButton = isRenderableButton(secondaryButton)
      ? secondaryButton
      : undefined;

    if (!visiblePrimaryButton && !visibleSecondaryButton) return null;

    const primaryButtonStyle = visiblePrimaryButton
      ? buildButtonStyle(visiblePrimaryButton, 'primary')
      : undefined;
    const secondaryButtonStyle = visibleSecondaryButton
      ? buildButtonStyle(visibleSecondaryButton, 'secondary')
      : undefined;

    return (
      <div className={styles.buttonGroup}>
        {visiblePrimaryButton && (
          <a
            href={visiblePrimaryButton.href || '#'}
            aria-label={getButtonLabel(visiblePrimaryButton)}
            className={`${styles.button} ${styles.motionItem} ${styles.buttonPrimary} ${
              visiblePrimaryButton.variant === 'outline' ? styles.buttonOutline : ''
            } ${visiblePrimaryButton.variant === 'secondary' ? styles.buttonSecondary : ''}`}
            style={{
              ...getMotionStyle(240),
              ...(primaryButtonStyle || {}),
            }}
          >
            {getButtonLabel(visiblePrimaryButton)}
          </a>
        )}
        {visibleSecondaryButton && (
          <a
            href={visibleSecondaryButton.href || '#'}
            aria-label={getButtonLabel(visibleSecondaryButton)}
            className={`${styles.button} ${styles.motionItem} ${styles.buttonSecondary} ${
              visibleSecondaryButton.variant === 'outline' ? styles.buttonOutline : ''
            }`}
            style={{
              ...getMotionStyle(320),
              ...(secondaryButtonStyle || {}),
            }}
          >
            {getButtonLabel(visibleSecondaryButton)}
          </a>
        )}
      </div>
    );
  };

  const renderContent = (additionalClass?: string) => (
    <div className={`${styles.content} ${additionalClass || ''}`}>
      {subheadline ? (
        <p
          className={`${styles.subheadline} ${styles.motionItem}`}
          style={mergeMotionStyle(subtitleResponsiveStyle, 40)}
        >
          {subheadline}
        </p>
      ) : null}
      <h1
        className={`${styles.headline} ${styles.motionItem}`}
        style={mergeMotionStyle(titleResponsiveStyle, 120)}
      >
        {headline}
      </h1>
      {description ? (
        <p
          className={`${styles.description} ${styles.motionItem}`}
          style={mergeMotionStyle(bodyResponsiveStyle, 200)}
        >
          {description}
        </p>
      ) : null}
      {renderButtons()}
    </div>
  );

  const renderImage = () => {
    if (!activeImage) return null;

    return (
      <div className={`${styles.imageContainer} ${styles.motionDecor}`} style={getMotionStyle(260)}>
        <img
          src={activeImage.url}
          alt={activeImage.alt}
          width={1440}
          height={900}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className={styles.heroImage}
        />
      </div>
    );
  };

  const renderFeatures = () => {
    if (!features || features.length === 0) return null;

    return (
      <div className={styles.featuresGrid}>
        {features.map((feature, index) => (
          <div
            key={feature.id || index}
            className={`${styles.featureCard} ${styles.motionItem}`}
            style={getMotionStyle(240 + index * 80)}
          >
            {feature.icon ? <div className={styles.featureIcon}>{feature.icon}</div> : null}
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            {feature.description ? (
              <p className={styles.featureDescription}>{feature.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderDefaultLayout = () => (
    <div className={styles.defaultLayout}>
      <div
        className={styles.defaultContentColumn}
        style={{
          ['--hero-default-panel-max-width' as string]: resolvedDefaultContentPanelMaxWidth,
          ['--hero-default-panel-mobile-max-width' as string]: defaultContentPanelMobileMaxWidth,
          ['--hero-default-panel-margin-top' as string]: defaultContentPanelMarginTop,
          ['--hero-default-panel-margin-bottom' as string]: defaultContentPanelMarginBottom,
          ['--hero-default-panel-mobile-margin-top' as string]:
            defaultContentPanelMobileMarginTop,
          ['--hero-default-panel-mobile-margin-bottom' as string]:
            defaultContentPanelMobileMarginBottom,
        }}
      >
        <div
          className={`${styles.defaultContentPanel} ${styles.motionDecor} ${styles.defaultPanelEnabled}`}
          style={{
            ...getMotionStyle(40),
            ['--hero-default-panel-bg' as string]: defaultContentPanelBackgroundColor,
            ['--hero-default-panel-mobile-bg' as string]:
              defaultContentPanelMobileBackgroundColor,
            ['--hero-default-panel-border-radius' as string]:
              defaultContentPanelBorderRadius,
            ['--hero-default-panel-mobile-border-radius' as string]:
              defaultContentPanelMobileBorderRadius,
            ['--hero-default-panel-min-height' as string]: defaultContentPanelMinHeight,
            ['--hero-default-panel-mobile-min-height' as string]:
              defaultContentPanelMobileMinHeight,
          }}
        >
          {renderContent(getAlignedContentClass())}
        </div>
      </div>
    </div>
  );

  const renderVideoLayout = () => (
    <div className={styles.videoBackgroundLayout}>
      <div
        className={`${styles.videoContentColumn} ${getVideoContentPositionClass()}`}
        style={{
          ['--hero-video-panel-max-width' as string]: videoContentPanelMaxWidth,
          ['--hero-video-panel-mobile-max-width' as string]: videoContentPanelMobileMaxWidth,
          ['--hero-video-panel-margin-top' as string]: videoContentPanelMarginTop,
          ['--hero-video-panel-margin-bottom' as string]: videoContentPanelMarginBottom,
          ['--hero-video-panel-mobile-margin-top' as string]: videoContentPanelMobileMarginTop,
          ['--hero-video-panel-mobile-margin-bottom' as string]:
            videoContentPanelMobileMarginBottom,
        }}
      >
        <div
          className={`${styles.videoContentPanel} ${styles.motionDecor} ${
            videoContentPanelEnabled ? styles.videoPanelEnabled : styles.videoPanelDisabled
          }`}
          style={{
            ...getMotionStyle(40),
            ['--hero-video-panel-bg' as string]: videoContentPanelBackgroundColor,
            ['--hero-video-panel-mobile-bg' as string]:
              videoContentPanelMobileBackgroundColor,
            ['--hero-video-panel-border-radius' as string]:
              videoContentPanelBorderRadius,
            ['--hero-video-panel-mobile-border-radius' as string]:
              videoContentPanelMobileBorderRadius,
            ['--hero-video-panel-min-height' as string]: videoContentPanelMinHeight,
            ['--hero-video-panel-mobile-min-height' as string]:
              videoContentPanelMobileMinHeight,
          }}
        >
          {renderContent(getAlignedContentClass())}
        </div>
      </div>
    </div>
  );

  const renderLayout = () => {
    switch (layout) {
      case 'split':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.splitImage}>{renderImage()}</div>
          </div>
        );

      case 'split-reverse':
        return (
          <div className={styles.splitLayout}>
            <div className={styles.splitImage}>{renderImage()}</div>
            <div className={styles.splitContent}>{renderContent(styles.contentLeft)}</div>
          </div>
        );

      case 'minimal':
        return (
          <div className={styles.minimalLayout}>
            <div className={styles.minimalContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.minimalImages}>
              {minimalLayoutImages?.primary ||
              minimalLayoutImages?.secondaryTop ||
              minimalLayoutImages?.secondaryBottom ? (
                <>
                  {minimalLayoutImages?.primary ? (
                    <img
                      src={minimalLayoutImages.primary.url}
                      alt={minimalLayoutImages.primary.alt}
                      width={900}
                      height={600}
                      loading="lazy"
                      decoding="async"
                      className={styles.minimalImageLarge}
                    />
                  ) : null}
                  <div className={styles.minimalImageStack}>
                    {minimalLayoutImages?.secondaryTop ? (
                      <img
                        src={minimalLayoutImages.secondaryTop.url}
                        alt={minimalLayoutImages.secondaryTop.alt}
                        width={480}
                        height={320}
                        loading="lazy"
                        decoding="async"
                        className={styles.minimalImageSmall}
                      />
                    ) : null}
                    {minimalLayoutImages?.secondaryBottom ? (
                      <img
                        src={minimalLayoutImages.secondaryBottom.url}
                        alt={minimalLayoutImages.secondaryBottom.alt}
                        width={480}
                        height={320}
                        loading="lazy"
                        decoding="async"
                        className={styles.minimalImageSmall}
                      />
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        );

      case 'video-background':
        return renderVideoLayout();

      case 'side-by-side':
        return (
          <div className={styles.sideBySideLayout}>
            {sideBySideLayoutImages?.left ||
            sideBySideLayoutImages?.center ||
            sideBySideLayoutImages?.right ? (
              <>
                {sideBySideLayoutImages?.left ? (
                  <img
                    src={sideBySideLayoutImages.left.url}
                    alt={sideBySideLayoutImages.left.alt}
                    width={520}
                    height={680}
                    loading="lazy"
                    decoding="async"
                    className={styles.sideBySideImage}
                  />
                ) : null}
                {sideBySideLayoutImages?.center ? (
                  <img
                    src={sideBySideLayoutImages.center.url}
                    alt={sideBySideLayoutImages.center.alt}
                    width={520}
                    height={680}
                    loading="lazy"
                    decoding="async"
                    className={styles.sideBySideImage}
                  />
                ) : null}
                {sideBySideLayoutImages?.right ? (
                  <img
                    src={sideBySideLayoutImages.right.url}
                    alt={sideBySideLayoutImages.right.alt}
                    width={520}
                    height={680}
                    loading="lazy"
                    decoding="async"
                    className={styles.sideBySideImage}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        );

      case 'offset':
        return (
          <div className={styles.offsetLayout}>
            <div className={styles.offsetImage}>{renderImage()}</div>
            <div className={styles.offsetContent}>{renderContent(styles.contentCentered)}</div>
          </div>
        );

      case 'full-height':
        return <div className={styles.fullHeightLayout}>{renderContent(styles.contentCentered)}</div>;

      case 'with-features':
        return (
          <div className={styles.withFeaturesLayout}>
            <div className={styles.mainContent}>
              {renderContent(styles.contentLeft)}
              {activeImage ? renderImage() : null}
            </div>
            {renderFeatures()}
          </div>
        );

      case 'centered-large':
        return (
          <div className={styles.centeredLargeLayout}>
            {renderContent(styles.contentCentered)}
          </div>
        );

      case 'image-collage':
        return (
          <div className={styles.imageCollageLayout}>
            <div className={styles.imageCollageContent}>{renderContent(styles.contentLeft)}</div>
            <div className={styles.imageCollageImages}>
              {activeImage ? (
                <>
                  <img
                    src={activeImage.url}
                    alt={activeImage.alt}
                    width={900}
                    height={620}
                    loading="lazy"
                    decoding="async"
                    className={styles.collageImagePrimary}
                  />
                  <img
                    src={activeImage.url}
                    alt={activeImage.alt}
                    width={680}
                    height={500}
                    loading="lazy"
                    decoding="async"
                    className={styles.collageImageSecondary}
                  />
                </>
              ) : null}
            </div>
          </div>
        );

      case 'default':
      default:
        return renderDefaultLayout();
    }
  };

  const motionClass =
    contentAnimation === 'fade'
      ? styles.motionFade
      : contentAnimation === 'zoom'
        ? styles.motionZoom
        : contentAnimation === 'cinematic'
          ? styles.motionCinematic
          : styles.motionFadeUp;

  const heroClass = [
    styles.hero,
    layout === 'minimal' ? styles.layoutMinimal : '',
    activeBackgroundImage ? styles.hasBackground : '',
    showVideoBackground ? styles.hasVideo : '',
    previewMode === 'desktop' ? styles.previewDesktop : '',
    previewMode === 'mobile' ? styles.previewMobile : '',
    motionEnabled ? styles.motionEnabled : '',
    motionEnabled ? motionClass : '',
    motionEnabled && isInView ? styles.motionVisible : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section ref={heroRef} className={heroClass} style={heroStyle}>
      {showVideoBackground ? (
        <div className={styles.videoContainer} aria-hidden="true">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className={styles.backgroundVideo}
            onError={() => setVideoLoadFailed(true)}
          >
            <source src={activeVideoUrl} type="video/mp4" />
          </video>
          <div className={styles.videoOverlay} />
        </div>
      ) : null}
      {activeBackgroundImage && !showVideoBackground ? (
        <div className={styles.backgroundOverlay} aria-hidden="true" />
      ) : null}
      <div className={styles.container}>{renderLayout()}</div>

      {showScrollIndicator ? (
        <button onClick={scrollToContent} className={styles.scrollIndicator} aria-label="Scroll to content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5V19M12 19L19 12M12 19L5 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </section>
  );
}
