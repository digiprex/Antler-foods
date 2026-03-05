/**
 * Dynamic FAQ Component
 *
 * Renders FAQ section with configurable layout and styling.
 * Fetches FAQ data from the backend or uses fallback configuration.
 */

"use client";

import { useMemo } from 'react';
import { useFAQConfig } from '@/hooks/use-faq-config';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';

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
}

export default function DynamicFAQ({
  restaurantId,
  pageId,
  showLoading = false,
  fallbackConfig = {},
  configData
}: DynamicFAQProps) {
  // Build API endpoint with restaurant_id and page_id or auto-detected url_slug - memoized to prevent infinite loop
  const apiEndpoint = useMemo(() => {
    if (!restaurantId || configData) return undefined; // Skip API if configData provided

    // If pageId is provided, use it directly
    if (pageId) {
      return `/api/faq-config?restaurant_id=${restaurantId}&page_id=${pageId}`;
    }

    // Fallback to url_slug detection for backward compatibility
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const pathSegments = currentPath.split('/').filter(Boolean);
    const urlSlug = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

    const endpoint = urlSlug
      ? `/api/faq-config?restaurant_id=${restaurantId}&url_slug=${urlSlug}`
      : `/api/faq-config?restaurant_id=${restaurantId}`;

    return endpoint;
  }, [restaurantId, pageId, configData]);

  const { config: fetchedConfig, loading, error } = useFAQConfig({
    apiEndpoint,
    overrideConfig: configData
  });
  const globalStyleEndpoint = restaurantId
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurantId)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurantId),
  });

  // Default configuration structure (no default FAQs)
  const defaultConfig: FAQConfig = {
    faqs: [],
    layout: 'accordion',
    bgColor: '#ffffff',
    textColor: '#111827',
    title: 'Frequently Asked Questions',
    subtitle: 'Find answers to common questions about our restaurant'
  };

  // Merge fetched config with fallback
  const mergedConfig: FAQConfig | null = (fetchedConfig && Object.keys(fetchedConfig).length > 0)
    ? { ...defaultConfig, ...fetchedConfig, ...fallbackConfig }
    : (fallbackConfig && Object.keys(fallbackConfig).length > 0)
      ? { ...defaultConfig, ...fallbackConfig }
      : null;

  if (loading && showLoading) {
    return (
      <section style={{ 
        padding: '80px 2rem',
        backgroundColor: '#f9fafb',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ color: '#6b7280' }}>Loading FAQ...</div>
        </div>
      </section>
    );
  }

  if (error && !mergedConfig) {
    // No config and error—don't render unless fallback is provided
    return null;
  }

  if (!mergedConfig || mergedConfig.faqs.length === 0) {
    return null; // Nothing to render
  }

  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    mergedConfig,
    globalStyles,
  );

  const renderFAQs = () => {
    const { faqs, layout } = mergedConfig as FAQConfig;

    if (layout === 'grid') {
      return (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              style={{ 
                padding: '1.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}
            >
              <h3 style={{ 
                marginBottom: '0.75rem',
                ...subtitleStyle,
              }}>
                {faq.question}
              </h3>
              <p style={{ 
                lineHeight: '1.6',
                opacity: 0.8,
                ...bodyStyle,
              }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (layout === 'list') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {faqs.map((faq) => (
            <div key={faq.id}>
              <h3 style={{ 
                marginBottom: '0.75rem',
                ...subtitleStyle,
              }}>
                {faq.question}
              </h3>
              <p style={{ 
                lineHeight: '1.6',
                opacity: 0.8,
                ...bodyStyle,
              }}>
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // Default to accordion layout
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {faqs.map((faq) => (
          <details 
            key={faq.id}
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <summary style={{ 
              cursor: 'pointer',
              marginBottom: '0.5rem',
              ...subtitleStyle,
            }}>
              {faq.question}
            </summary>
              <p style={{ 
              lineHeight: '1.6',
              opacity: 0.8,
              marginTop: '0.75rem',
              paddingLeft: '0.5rem',
              ...bodyStyle,
            }}>
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    );
  };

  return (
    <section style={{ 
      padding: '80px 2rem',
      backgroundColor: (mergedConfig as FAQConfig).bgColor,
      ...bodyStyle,
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {(mergedConfig as FAQConfig).title && (
          <h2 style={{ 
            textAlign: 'center',
            marginBottom: (mergedConfig as FAQConfig).subtitle ? '0.5rem' : '3rem',
            ...titleStyle,
          }}>
            {(mergedConfig as FAQConfig).title}
          </h2>
        )}
        
        {(mergedConfig as FAQConfig).subtitle && (
          <p style={{ 
            textAlign: 'center',
            marginBottom: '3rem',
            opacity: 0.8,
            ...subtitleStyle,
          }}>
            {(mergedConfig as FAQConfig).subtitle}
          </p>
        )}

        {renderFAQs()}
      </div>
    </section>
  );
}
