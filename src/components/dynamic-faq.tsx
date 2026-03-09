"use client";

import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useFAQConfig } from '@/hooks/use-faq-config';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';
import styles from './dynamic-faq.module.css';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQConfig extends SectionStyleConfig {
  faqs: FAQ[];
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title?: string;
  subtitle?: string;
}

interface DynamicFAQProps {
  restaurantId?: string;
  pageId?: string;
  showLoading?: boolean;
  fallbackConfig?: Partial<FAQConfig>;
  configData?: Partial<FAQConfig>;
  showPlaceholderWhenEmpty?: boolean;
  previewMode?: boolean;
}

const DEFAULT_CONFIG: FAQConfig = {
  faqs: [],
  layout: 'accordion',
  bgColor: '#ffffff',
  textColor: '#111827',
  title: 'Frequently Asked Questions',
  subtitle: 'Find answers to common questions about our restaurant',
};

const SAMPLE_FAQS: FAQ[] = [
  {
    id: 'sample-1',
    question: 'What are your opening hours?',
    answer: 'We are open daily for lunch and dinner, with extended evening hours on weekends.',
  },
  {
    id: 'sample-2',
    question: 'Do you offer vegetarian options?',
    answer: 'Yes. Our menu includes several vegetarian dishes and we can help with custom dietary requests.',
  },
  {
    id: 'sample-3',
    question: 'Can I reserve a table online?',
    answer: 'Reservations can be made online or by phone, and large parties can request tailored seating support.',
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
    const normalized = hex.length === 3
      ? hex.split('').map((char) => `${char}${char}`).join('')
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
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, index) => ({
      id: typeof item.id === 'string' && item.id.trim()
        ? item.id
        : `faq-${index + 1}`,
      question: typeof item.question === 'string' ? item.question : '',
      answer: typeof item.answer === 'string' ? item.answer : '',
    }));
}

function normalizeConfig(
  source: Partial<FAQConfig> | null | undefined,
): FAQConfig | null {
  if (!source) {
    return null;
  }

  return {
    ...DEFAULT_CONFIG,
    ...source,
    layout:
      source.layout === 'grid' || source.layout === 'list' || source.layout === 'accordion'
        ? source.layout
        : DEFAULT_CONFIG.layout,
    bgColor: typeof source.bgColor === 'string' ? source.bgColor : DEFAULT_CONFIG.bgColor,
    textColor: typeof source.textColor === 'string' ? source.textColor : DEFAULT_CONFIG.textColor,
    title: typeof source.title === 'string' ? source.title : DEFAULT_CONFIG.title,
    subtitle: typeof source.subtitle === 'string' ? source.subtitle : DEFAULT_CONFIG.subtitle,
    faqs: normalizeFaqs(source.faqs),
  };
}

export default function DynamicFAQ({
  restaurantId,
  pageId,
  showLoading = false,
  fallbackConfig = {},
  configData,
  showPlaceholderWhenEmpty = false,
  previewMode = false,
}: DynamicFAQProps) {
  const apiEndpoint = useMemo(() => {
    if (!restaurantId || configData) {
      return undefined;
    }

    if (pageId) {
      return `/api/faq-config?restaurant_id=${restaurantId}&page_id=${pageId}`;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pathSegments = currentPath.split('/').filter(Boolean);
    const urlSlug = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

    return urlSlug
      ? `/api/faq-config?restaurant_id=${restaurantId}&url_slug=${urlSlug}`
      : `/api/faq-config?restaurant_id=${restaurantId}`;
  }, [restaurantId, pageId, configData]);

  const { config: fetchedConfig, loading, error } = useFAQConfig({
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
    const source = normalizeConfig(fetchedConfig)
      || normalizeConfig(fallbackConfig)
      || ((showPlaceholderWhenEmpty || previewMode) ? DEFAULT_CONFIG : null);

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

  const [openItemId, setOpenItemId] = useState<string | null>(displayFaqs[0]?.id ?? null);

  useEffect(() => {
    if (displayFaqs.length === 0) {
      setOpenItemId(null);
      return;
    }

    if (!displayFaqs.some((faq) => faq.id === openItemId)) {
      setOpenItemId(displayFaqs[0].id);
    }
  }, [displayFaqs, openItemId]);

  if (loading && showLoading && !resolvedConfig) {
    return (
      <section style={{ padding: '80px 2rem', backgroundColor: '#f9fafb', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', color: '#6b7280' }}>Loading FAQ...</div>
      </section>
    );
  }

  if (error && !resolvedConfig && !showPlaceholderWhenEmpty && !previewMode) {
    return null;
  }

  if (!resolvedConfig || displayFaqs.length === 0) {
    return null;
  }

  const mergedConfig: FAQConfig = {
    ...resolvedConfig,
    faqs: displayFaqs,
  };

  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    mergedConfig,
    globalStyles,
  );

  const sectionTheme = {
    backgroundColor: mergedConfig.bgColor,
    color: mergedConfig.textColor,
    '--faq-bg': mergedConfig.bgColor,
    '--faq-glow': withAlpha(mergedConfig.textColor, previewMode ? 0.08 : 0.12),
    '--faq-surface': withAlpha(mergedConfig.textColor, 0.03),
    '--faq-surface-strong': withAlpha(mergedConfig.textColor, previewMode ? 0.08 : 0.06),
    '--faq-border': withAlpha(mergedConfig.textColor, 0.14),
    '--faq-divider': withAlpha(mergedConfig.textColor, 0.1),
    '--faq-shadow': withAlpha(mergedConfig.textColor, previewMode ? 0.08 : 0.1),
  } as CSSProperties;

  const emptyPreview = resolvedConfig.faqs.length === 0 && (showPlaceholderWhenEmpty || previewMode);

  const renderListLayout = () => (
    <div className={cx(styles.layout, styles.listLayout)}>
      {displayFaqs.map((faq) => (
        <article key={faq.id} className={cx(styles.card, styles.listCard)}>
          <div className={styles.questionWrap}>
            <h3 className={styles.question} style={subtitleStyle}>
              {faq.question || 'Question'}
            </h3>
            <p className={styles.answer} style={bodyStyle}>
              {faq.answer || 'Answer'}
            </p>
          </div>
        </article>
      ))}
    </div>
  );

  const renderGridLayout = () => (
    <div className={cx(styles.layout, styles.gridLayout)}>
      {displayFaqs.map((faq) => (
        <article key={faq.id} className={cx(styles.card, styles.gridCard)}>
          <div className={styles.questionWrap}>
            <h3 className={styles.question} style={subtitleStyle}>
              {faq.question || 'Question'}
            </h3>
            <p className={styles.answer} style={bodyStyle}>
              {faq.answer || 'Answer'}
            </p>
          </div>
        </article>
      ))}
    </div>
  );

  const renderAccordionLayout = () => (
    <div className={cx(styles.layout, styles.accordionLayout)}>
      {displayFaqs.map((faq) => {
        const isOpen = openItemId === faq.id;
        const contentId = `faq-answer-${faq.id}`;

        return (
          <article key={faq.id} className={cx(styles.card, styles.accordionCard)}>
            <button
              type="button"
              className={cx(styles.accordionTrigger, isOpen && styles.accordionTriggerOpen)}
              aria-expanded={isOpen}
              aria-controls={contentId}
              onClick={() => setOpenItemId(isOpen ? null : faq.id)}
            >
              <div className={styles.accordionHeading}>
                <h3 className={styles.question} style={subtitleStyle}>
                  {faq.question || 'Question'}
                </h3>
              </div>
              <svg
                className={cx(styles.accordionChevron, isOpen && styles.accordionChevronOpen)}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {isOpen && (
              <div id={contentId} className={styles.accordionAnswer}>
                <p className={styles.answer} style={bodyStyle}>
                  {faq.answer || 'Answer'}
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );

  return (
    <section
      className={cx(styles.section, previewMode && styles.sectionPreview)}
      style={sectionTheme}
    >
      <div className={cx(styles.shell, previewMode && styles.shellPreview)}>
        {(mergedConfig.title || mergedConfig.subtitle) && (
          <header className={cx(styles.header, previewMode && styles.headerPreview)}>
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
    </section>
  );
}
