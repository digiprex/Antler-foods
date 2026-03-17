'use client';

import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { useFAQConfig } from '@/hooks/use-faq-config';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import {
  getButtonInlineStyle,
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
} from '@/lib/section-style';
import { resolveSharedSectionSpacing } from '@/lib/shared-section-spacing';
import styles from './dynamic-faq.module.css';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

type FAQLayout = 'list' | 'accordion' | 'grid';
type FAQShadowLevel = 'none' | 'sm' | 'md' | 'lg';

interface FAQConfig extends SectionStyleConfig {
  faqs: FAQ[];
  layout: FAQLayout;
  bgColor: string;
  textColor: string;
  title?: string;
  subtitle?: string;
  faqCardBgColor?: string;
  questionTextColor?: string;
  answerTextColor?: string;
  cardBorderRadius?: string;
  cardShadow?: FAQShadowLevel | string;
  accentColor?: string;
  hoverColor?: string;
  enableScrollAnimation?: boolean;
  isEnabled?: boolean;
}

interface DynamicFAQProps {
  restaurantId?: string;
  pageId?: string;
  showLoading?: boolean;
  fallbackConfig?: Partial<FAQConfig>;
  configData?: Partial<FAQConfig>;
  showPlaceholderWhenEmpty?: boolean;
  previewMode?: boolean;
  previewViewport?: 'desktop' | 'mobile';
}

const DEFAULT_CONFIG: FAQConfig = {
  faqs: [],
  layout: 'accordion',
  bgColor: '#ffffff',
  textColor: '#111827',
  title: 'Frequently Asked Questions',
  subtitle: 'Find answers to common questions about our restaurant',
  faqCardBgColor: 'transparent',
  cardBorderRadius: '18px',
  cardShadow: 'none',
  accentColor: '#8b5cf6',
  hoverColor: 'transparent',
  enableScrollAnimation: false,
  isEnabled: true,
};

const SAMPLE_FAQS: FAQ[] = [
  {
    id: 'sample-1',
    question: 'Question',
    answer: 'Answer',
  },
  {
    id: 'sample-2',
    question: 'Question',
    answer: 'Answer',
  },
  {
    id: 'sample-3',
    question: 'Question',
    answer: 'Answer',
  },
];

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function withAlpha(color: string | undefined, alpha: number) {
  if (!color) {
    return `rgba(17, 24, 39, ${alpha})`;
  }

  const value = color.trim();
  const hexMatch = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : hex;
    const int = Number.parseInt(normalized, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()));

    if ([r, g, b].every((channel) => Number.isFinite(channel))) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return `rgba(17, 24, 39, ${alpha})`;
}

function normalizeFaqs(faqs: unknown): FAQ[] {
  if (!Array.isArray(faqs)) {
    return [];
  }

  return faqs
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
    )
    .map((item, index) => ({
      id:
        typeof item.id === 'string' && item.id.trim()
          ? item.id
          : `faq-${index + 1}`,
      question: typeof item.question === 'string' ? item.question : '',
      answer: typeof item.answer === 'string' ? item.answer : '',
    }));
}

function normalizeShadowLevel(value: string | undefined): FAQShadowLevel {
  return value === 'none' || value === 'sm' || value === 'md' || value === 'lg'
    ? value
    : 'none';
}

function normalizeConfig(
  source: Partial<FAQConfig> | null | undefined,
): FAQConfig | null {
  if (!source) {
    return null;
  }

  const normalizedShadow = normalizeShadowLevel(
    typeof source.cardShadow === 'string' ? source.cardShadow : undefined,
  );

  return {
    ...DEFAULT_CONFIG,
    ...source,
    layout:
      source.layout === 'grid' ||
      source.layout === 'list' ||
      source.layout === 'accordion'
        ? source.layout
        : DEFAULT_CONFIG.layout,
    bgColor:
      typeof source.bgColor === 'string'
        ? source.bgColor
        : DEFAULT_CONFIG.bgColor,
    textColor:
      typeof source.textColor === 'string'
        ? source.textColor
        : DEFAULT_CONFIG.textColor,
    title:
      typeof source.title === 'string' ? source.title : DEFAULT_CONFIG.title,
    subtitle:
      typeof source.subtitle === 'string'
        ? source.subtitle
        : DEFAULT_CONFIG.subtitle,
    faqCardBgColor:
      typeof source.faqCardBgColor === 'string'
        ? source.faqCardBgColor
        : DEFAULT_CONFIG.faqCardBgColor,
    questionTextColor:
      typeof source.questionTextColor === 'string'
        ? source.questionTextColor
        : undefined,
    answerTextColor:
      typeof source.answerTextColor === 'string'
        ? source.answerTextColor
        : undefined,
    cardBorderRadius:
      typeof source.cardBorderRadius === 'string'
        ? source.cardBorderRadius
        : DEFAULT_CONFIG.cardBorderRadius,
    cardShadow: normalizedShadow,
    accentColor:
      typeof source.accentColor === 'string'
        ? source.accentColor
        : DEFAULT_CONFIG.accentColor,
    hoverColor:
      typeof source.hoverColor === 'string'
        ? source.hoverColor
        : DEFAULT_CONFIG.hoverColor,
    enableScrollAnimation: source.enableScrollAnimation === true,
    isEnabled: source.isEnabled !== false, // Default to true unless explicitly false
    faqs: normalizeFaqs(source.faqs),
  };
}

function getItemLabel(index: number) {
  return String(index + 1).padStart(2, '0');
}

function buildResponsiveTypographyStyle(
  isMobileViewport: boolean,
  desktop: CSSProperties,
  mobile: CSSProperties,
) {
  if (!isMobileViewport) {
    return desktop;
  }

  const mergedStyle: CSSProperties = { ...desktop };

  Object.entries(mobile).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      mergedStyle[key as keyof CSSProperties] = value as never;
    }
  });

  return mergedStyle;
}

function withMobileFontSizeFallback(
  style: CSSProperties,
  isMobileViewport: boolean,
  fallbackFontSize?: string,
  fallbackLineHeight?: string,
) {
  if (!isMobileViewport) {
    return style;
  }

  return {
    ...style,
    fontSize:
      (typeof style.fontSize === 'string' && style.fontSize.trim()) ||
      fallbackFontSize,
    lineHeight:
      (typeof style.lineHeight === 'string' && style.lineHeight.trim()) ||
      fallbackLineHeight,
  } as CSSProperties;
}

function areVisibleItemsEqual(
  current: Record<string, boolean>,
  next: Record<string, boolean>,
) {
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);

  if (currentKeys.length !== nextKeys.length) {
    return false;
  }

  return nextKeys.every((key) => current[key] === next[key]);
}

export default function DynamicFAQ({
  restaurantId,
  pageId,
  showLoading = false,
  fallbackConfig,
  configData,
  showPlaceholderWhenEmpty = false,
  previewMode = false,
  previewViewport,
}: DynamicFAQProps) {
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  const [isMobileViewport, setIsMobileViewport] = useState(
    previewViewport === 'mobile',
  );

  const apiEndpoint = useMemo(() => {
    if (!restaurantId || configData) {
      return undefined;
    }

    if (pageId) {
      return `/api/faq-config?restaurant_id=${restaurantId}&page_id=${pageId}`;
    }

    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : '';
    const pathSegments = currentPath.split('/').filter(Boolean);
    const urlSlug =
      pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

    return urlSlug
      ? `/api/faq-config?restaurant_id=${restaurantId}&url_slug=${urlSlug}`
      : `/api/faq-config?restaurant_id=${restaurantId}`;
  }, [restaurantId, pageId, configData]);

  const {
    config: fetchedConfig,
    loading,
    error,
  } = useFAQConfig({
    apiEndpoint,
    overrideConfig: configData,
  });

  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  const resolvedConfig = useMemo(() => {
    const source =
      normalizeConfig(fetchedConfig) ||
      normalizeConfig(fallbackConfig) ||
      (showPlaceholderWhenEmpty || previewMode ? DEFAULT_CONFIG : null);

    return source;
  }, [fallbackConfig, fetchedConfig, previewMode, showPlaceholderWhenEmpty]);

  const displayFaqs = useMemo(() => {
    if (!resolvedConfig) {
      return [];
    }

    if (resolvedConfig.faqs.length > 0) {
      return resolvedConfig.faqs;
    }

    return showPlaceholderWhenEmpty || previewMode ? SAMPLE_FAQS : [];
  }, [previewMode, resolvedConfig, showPlaceholderWhenEmpty]);

  const [openItemId, setOpenItemId] = useState<string | null>(
    displayFaqs[0]?.id ?? null,
  );
  const hasResolvedConfig = Boolean(resolvedConfig);
  const hasScrollAnimation = resolvedConfig?.enableScrollAnimation === true;

  useEffect(() => {
    if (previewViewport) {
      setIsMobileViewport(previewViewport === 'mobile');
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, [previewViewport]);

  useEffect(() => {
    if (displayFaqs.length === 0) {
      setOpenItemId(null);
      return;
    }

    if (!displayFaqs.some((faq) => faq.id === openItemId)) {
      setOpenItemId(displayFaqs[0].id);
    }
  }, [displayFaqs, openItemId]);

  useEffect(() => {
    if (!hasResolvedConfig) {
      return;
    }

    if (!hasScrollAnimation) {
      const nextVisibleItems = Object.fromEntries(
        displayFaqs.map((faq) => [faq.id, true]),
      );

      setVisibleItems((current) =>
        areVisibleItemsEqual(current, nextVisibleItems)
          ? current
          : nextVisibleItems,
      );
      return;
    }

    setVisibleItems((current) =>
      Object.keys(current).length === 0 ? current : {},
    );

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleItems((prev) => {
          let changed = false;
          const next = { ...prev };

          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            const id = entry.target.getAttribute('data-faq-id');
            if (!id || next[id]) {
              return;
            }

            next[id] = true;
            changed = true;
            observer.unobserve(entry.target);
          });

          return changed ? next : prev;
        });
      },
      {
        threshold: previewMode ? 0.12 : 0.18,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    const nodes = displayFaqs
      .map((faq) => itemRefs.current[faq.id])
      .filter((node): node is HTMLElement => Boolean(node));

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [displayFaqs, hasResolvedConfig, hasScrollAnimation, previewMode]);

  if (loading && showLoading && !resolvedConfig) {
    const sharedSpacing = resolveSharedSectionSpacing(
      previewViewport === 'mobile' ? 'mobile' : 'desktop',
    );
    return (
      <section
        style={{
          padding: sharedSpacing.sectionPadding,
          backgroundColor: '#f9fafb',
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#6b7280' }}>Loading FAQ...</div>
      </section>
    );
  }

  if (error && !resolvedConfig && !showPlaceholderWhenEmpty && !previewMode) {
    return null;
  }

  if (!resolvedConfig || displayFaqs.length === 0) {
    return null;
  }

  // Check if FAQ section is disabled
  if (resolvedConfig.isEnabled === false && !previewMode) {
    return null;
  }

  const mergedConfig: FAQConfig = {
    ...resolvedConfig,
    faqs: displayFaqs,
  };

  const { resolved } = getSectionTypographyStyles(mergedConfig, globalStyles);
  const titleStyle = withMobileFontSizeFallback(
    buildResponsiveTypographyStyle(
      isMobileViewport,
      {
        fontFamily: resolved.titleFontFamily,
        fontSize: resolved.titleFontSize,
        fontWeight: resolved.titleFontWeight,
        fontStyle: resolved.titleFontStyle,
        color: resolved.titleColor,
        textTransform: resolved.titleTextTransform,
        lineHeight: resolved.titleLineHeight,
        letterSpacing: resolved.titleLetterSpacing,
      },
      {
        fontFamily: resolved.titleMobileFontFamily,
        fontSize: resolved.titleMobileFontSize,
        fontWeight: resolved.titleMobileFontWeight,
        fontStyle: resolved.titleMobileFontStyle,
        color: resolved.titleMobileColor,
        textTransform: resolved.titleMobileTextTransform,
        lineHeight: resolved.titleMobileLineHeight,
        letterSpacing: resolved.titleMobileLetterSpacing,
      },
    ),
    isMobileViewport,
    `clamp(2rem, 8vw, ${resolved.titleFontSize})`,
    '1.12',
  );
  const subtitleStyle = withMobileFontSizeFallback(
    buildResponsiveTypographyStyle(
      isMobileViewport,
      {
        fontFamily: resolved.subtitleFontFamily,
        fontSize: resolved.subtitleFontSize,
        fontWeight: resolved.subtitleFontWeight,
        fontStyle: resolved.subtitleFontStyle,
        color: resolved.subtitleColor,
        textTransform: resolved.subtitleTextTransform,
        lineHeight: resolved.subtitleLineHeight,
        letterSpacing: resolved.subtitleLetterSpacing,
      },
      {
        fontFamily: resolved.subtitleMobileFontFamily,
        fontSize: resolved.subtitleMobileFontSize,
        fontWeight: resolved.subtitleMobileFontWeight,
        fontStyle: resolved.subtitleMobileFontStyle,
        color: resolved.subtitleMobileColor,
        textTransform: resolved.subtitleMobileTextTransform,
        lineHeight: resolved.subtitleMobileLineHeight,
        letterSpacing: resolved.subtitleMobileLetterSpacing,
      },
    ),
    isMobileViewport,
    `clamp(1rem, 5vw, ${resolved.subtitleFontSize})`,
    '1.55',
  );
  const bodyStyle = withMobileFontSizeFallback(
    buildResponsiveTypographyStyle(
      isMobileViewport,
      {
        fontFamily: resolved.bodyFontFamily,
        fontSize: resolved.bodyFontSize,
        fontWeight: resolved.bodyFontWeight,
        fontStyle: resolved.bodyFontStyle,
        color: resolved.bodyColor,
        textTransform: resolved.bodyTextTransform,
        lineHeight: resolved.bodyLineHeight,
        letterSpacing: resolved.bodyLetterSpacing,
      },
      {
        fontFamily: resolved.bodyMobileFontFamily,
        fontSize: resolved.bodyMobileFontSize,
        fontWeight: resolved.bodyMobileFontWeight,
        fontStyle: resolved.bodyMobileFontStyle,
        color: resolved.bodyMobileColor,
        textTransform: resolved.bodyMobileTextTransform,
        lineHeight: resolved.bodyMobileLineHeight,
        letterSpacing: resolved.bodyMobileLetterSpacing,
      },
    ),
    isMobileViewport,
    `clamp(0.95rem, 3.8vw, ${resolved.bodyFontSize})`,
    '1.7',
  );

  const globalBackground = globalStyles?.backgroundColor;
  const globalText = globalStyles?.textColor;
  const selectedButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(mergedConfig, globalStyles),
  );
  const globalButtonColor =
    selectedButtonStyle.backgroundColor ||
    globalStyles?.primaryButton?.backgroundColor;
  const globalAccent =
    globalButtonColor || globalStyles?.accentColor || globalStyles?.primaryColor;
  const useCustomStyles = mergedConfig.is_custom === true;
  const accentColor = useCustomStyles
    ? mergedConfig.accentColor || globalAccent || DEFAULT_CONFIG.accentColor!
    : globalAccent || mergedConfig.accentColor || DEFAULT_CONFIG.accentColor!;
  const buttonAccentBackground = globalButtonColor || accentColor;
  const buttonAccentText = selectedButtonStyle.color || '#ffffff';
  const textColor = useCustomStyles
    ? mergedConfig.textColor || globalText || DEFAULT_CONFIG.textColor
    : globalText || mergedConfig.textColor || DEFAULT_CONFIG.textColor;
  const backgroundColor = useCustomStyles
    ? mergedConfig.bgColor || globalBackground || DEFAULT_CONFIG.bgColor
    : globalBackground || mergedConfig.bgColor || DEFAULT_CONFIG.bgColor;
  const questionStyle: CSSProperties = {
    ...subtitleStyle,
    color:
      (useCustomStyles ? mergedConfig.questionTextColor : undefined) ||
      subtitleStyle.color,
  };
  const answerStyle: CSSProperties = {
    ...bodyStyle,
    color:
      (useCustomStyles ? mergedConfig.answerTextColor : undefined) ||
      bodyStyle.color,
  };
  const sectionTheme = {
    backgroundColor: 'transparent',
    color: textColor,
    '--faq-bg': 'transparent',
    '--faq-shell-bg': 'transparent',
    '--faq-shell-border': 'transparent',
    '--faq-card-bg': 'transparent',
    '--faq-card-hover': 'transparent',
    '--faq-question': questionStyle.color || subtitleStyle.color || textColor,
    '--faq-answer': answerStyle.color || bodyStyle.color || textColor,
    '--faq-border': 'transparent',
    '--faq-divider': 'transparent',
    '--faq-accent': accentColor,
    '--faq-accent-soft': withAlpha(accentColor, 0.12),
    '--faq-accent-border': 'transparent',
    '--faq-button-bg': buttonAccentBackground,
    '--faq-button-text': buttonAccentText,
    '--faq-muted': withAlpha(textColor, 0.58),
    '--faq-shadow': 'none',
    '--faq-shadow-hover': 'none',
    '--faq-radius':
      mergedConfig.cardBorderRadius || DEFAULT_CONFIG.cardBorderRadius,
  } as CSSProperties;

  const emptyPreview =
    resolvedConfig.faqs.length === 0 &&
    (showPlaceholderWhenEmpty || previewMode);

  const getMotionClassName = (faqId: string) =>
    mergedConfig.enableScrollAnimation
      ? cx(styles.cardAnimated, visibleItems[faqId] && styles.cardVisible)
      : undefined;

  const getMotionStyle = (index: number) =>
    mergedConfig.enableScrollAnimation
      ? ({
          '--faq-item-delay': `${index * 70}ms`,
        } as CSSProperties)
      : undefined;

  const renderStaticCard = (faq: FAQ, index: number, layoutType: FAQLayout) => (
    <article
      key={faq.id}
      ref={(node) => {
        itemRefs.current[faq.id] = node;
      }}
      data-faq-id={faq.id}
      className={cx(
        styles.card,
        layoutType === 'grid' ? styles.gridCard : styles.listCard,
        getMotionClassName(faq.id),
      )}
      style={getMotionStyle(index)}
    >
      <div className={styles.cardHeader}>
        <span className={styles.itemBadge}>{getItemLabel(index)}</span>
        {!emptyPreview ? (
          <span className={styles.itemKicker}>Common question</span>
        ) : null}
      </div>
      <div className={styles.questionWrap}>
        <h3 className={styles.question} style={questionStyle}>
          {faq.question || 'Question'}
        </h3>
        <p className={styles.answer} style={answerStyle}>
          {faq.answer || 'Answer'}
        </p>
      </div>
    </article>
  );

  const renderListLayout = () => (
    <div className={cx(styles.layout, styles.listLayout)}>
      {displayFaqs.map((faq, index) => renderStaticCard(faq, index, 'list'))}
    </div>
  );

  const renderGridLayout = () => (
    <div className={cx(styles.layout, styles.gridLayout)}>
      {displayFaqs.map((faq, index) => renderStaticCard(faq, index, 'grid'))}
    </div>
  );

  const renderAccordionLayout = () => (
    <div className={cx(styles.layout, styles.accordionLayout)}>
      {displayFaqs.map((faq, index) => {
        const isOpen = openItemId === faq.id;
        const contentId = `faq-answer-${faq.id}`;

        return (
          <article
            key={faq.id}
            ref={(node) => {
              itemRefs.current[faq.id] = node;
            }}
            data-faq-id={faq.id}
            className={cx(
              styles.card,
              styles.accordionCard,
              isOpen && styles.accordionCardOpen,
              getMotionClassName(faq.id),
            )}
            style={getMotionStyle(index)}
          >
            <button
              type="button"
              className={cx(
                styles.accordionTrigger,
                isOpen && styles.accordionTriggerOpen,
              )}
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setOpenItemId(isOpen ? null : faq.id)}
            >
              <div className={styles.accordionLeading}>
                <span className={styles.itemBadge}>{getItemLabel(index)}</span>
                <div className={styles.accordionHeading}>
                  {!emptyPreview ? (
                    <span className={styles.itemKicker}></span>
                  ) : null}
                  <h3 className={styles.question} style={questionStyle}>
                    {faq.question || 'Question'}
                  </h3>
                </div>
              </div>
              <span className={styles.accordionIconWrap} aria-hidden="true">
                <svg
                  className={cx(
                    styles.accordionChevron,
                    isOpen && styles.accordionChevronOpen,
                  )}
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>
            <div
              id={contentId}
              className={cx(
                styles.accordionBody,
                isOpen && styles.accordionBodyOpen,
              )}
            >
              <div className={styles.accordionBodyInner}>
                <p className={styles.answer} style={answerStyle}>
                  {faq.answer || 'Answer'}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <section
      className={cx(styles.section, previewMode && styles.sectionPreview)}
      data-faq-preview-viewport={previewViewport}
      data-faq-layout-viewport={isMobileViewport ? 'mobile' : 'desktop'}
      style={sectionTheme}
    >
      <div className={cx(styles.shell, previewMode && styles.shellPreview)}>
        <div className={cx(styles.frame, previewMode && styles.framePreview)}>
          {(mergedConfig.title || mergedConfig.subtitle) && (
            <header
              className={cx(styles.header, previewMode && styles.headerPreview)}
            >
              {mergedConfig.title && (
                <h2 className={styles.title} style={titleStyle}>
                  {mergedConfig.title}
                </h2>
              )}
              {mergedConfig.subtitle && (
                <p className={styles.subtitle} style={subtitleStyle}>
                  {mergedConfig.subtitle}
                </p>
              )}
            </header>
          )}

          {mergedConfig.layout === 'grid'
            ? renderGridLayout()
            : mergedConfig.layout === 'list'
              ? renderListLayout()
              : renderAccordionLayout()}

          {emptyPreview && (
            <p className={styles.emptyStateNote} style={bodyStyle}>
              Sample preview only. Add FAQ items to replace this content.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
