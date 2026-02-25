/**
 * Dynamic FAQ Component
 *
 * Renders FAQ section with configurable layout and styling.
 * Fetches FAQ data from the backend or uses fallback configuration.
 */

"use client";

import { useState, useEffect } from 'react';
import { useFAQConfig } from '@/hooks/use-faq-config';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQConfig {
  faqs: FAQ[];
  layout: 'list' | 'accordion' | 'grid';
  bgColor: string;
  textColor: string;
  title?: string;
  subtitle?: string;
}

interface DynamicFAQProps {
  restaurantId: string;
  showLoading?: boolean;
  fallbackConfig?: Partial<FAQConfig>;
}

export default function DynamicFAQ({ 
  restaurantId, 
  showLoading = false, 
  fallbackConfig = {} 
}: DynamicFAQProps) {
  const apiEndpoint = `/api/faq-config?restaurant_id=${restaurantId}`;
  const { config: fetchedConfig, loading, error, refetch } = useFAQConfig({ apiEndpoint });

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
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: (mergedConfig as FAQConfig).textColor
              }}>
                {faq.question}
              </h3>
              <p style={{ 
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: (mergedConfig as FAQConfig).textColor,
                opacity: 0.8
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
                fontWeight: '600',
                marginBottom: '0.75rem',
                color: (mergedConfig as FAQConfig).textColor
              }}>
                {faq.question}
              </h3>
              <p style={{ 
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: (mergedConfig as FAQConfig).textColor,
                opacity: 0.8
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
              fontWeight: '600',
              cursor: 'pointer',
              color: (mergedConfig as FAQConfig).textColor,
              fontSize: '1rem',
              marginBottom: '0.5rem'
            }}>
              {faq.question}
            </summary>
              <p style={{ 
              fontSize: '0.9rem',
              lineHeight: '1.6',
              color: (mergedConfig as FAQConfig).textColor,
              opacity: 0.8,
              marginTop: '0.75rem',
              paddingLeft: '0.5rem'
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
      color: (mergedConfig as FAQConfig).textColor
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {(mergedConfig as FAQConfig).title && (
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            textAlign: 'center',
            marginBottom: (mergedConfig as FAQConfig).subtitle ? '0.5rem' : '3rem',
            color: (mergedConfig as FAQConfig).textColor
          }}>
            {(mergedConfig as FAQConfig).title}
          </h2>
        )}
        
        {(mergedConfig as FAQConfig).subtitle && (
          <p style={{ 
            fontSize: '1.125rem',
            textAlign: 'center',
            marginBottom: '3rem',
            color: (mergedConfig as FAQConfig).textColor,
            opacity: 0.8
          }}>
            {(mergedConfig as FAQConfig).subtitle}
          </p>
        )}

        {renderFAQs()}
      </div>
    </section>
  );
}