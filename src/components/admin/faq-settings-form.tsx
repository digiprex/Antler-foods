/**
 * FAQ Settings Form
 *
 * Enhanced interface for configuring FAQ settings:
 * - Layout selection (list, accordion, grid)
 * - FAQ management (add, edit, delete)
 * - Color customization
 * - Live preview modal
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPageById } from '@/lib/graphql/queries';
import type { PageItem } from '@/types/pages.types';
import { useFAQConfig, useUpdateFAQConfig } from '@/hooks/use-faq-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Toast from '@/components/ui/toast';
import styles from './faq-settings-form.module.css';

interface FAQFormProps {
  pageId?: string;
  restaurantId?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

// Restaurant ID should be provided dynamically - no default static ID

export default function FAQSettingsForm({ pageId, restaurantId }: FAQFormProps) {
  const searchParams = useSearchParams();
  const restaurantNameFromQuery = searchParams.get('restaurant_name') || undefined;
  const domainParamRaw = searchParams.get('domain') || searchParams.get('staging_domain') || searchParams.get('url') || null;
  const urlSlugFromParams = searchParams.get('url_slug') || searchParams.get('slug') || searchParams.get('path') || null;
  const pageIdFromParams = searchParams.get('page_id') || searchParams.get('page') || null;
  const [resolvedPageId, setResolvedPageId] = useState<string | null>(pageId || null);
  const restaurantIdFromQuery = searchParams.get('restaurant_id')?.trim() ?? '';
  const finalRestaurantId = restaurantIdFromQuery || restaurantId || '';
  const sectionStyleDefaults = useSectionStyleDefaults(finalRestaurantId);
  
  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get('new_section') === 'true';
  const templateId = searchParams.get('template_id') || null;
  
  // Form state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [layout, setLayout] = useState<'list' | 'accordion' | 'grid'>('accordion');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [textColor, setTextColor] = useState<string>('#111827');
  const [title, setTitle] = useState<string>('Frequently Asked Questions');
  const [subtitle, setSubtitle] = useState<string>('Find answers to common questions');
  const [sectionStyle, setSectionStyle] = useState<SectionStyleConfig>(
    sectionStyleDefaults,
  );
  
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  
  const configApiEndpoint = useMemo(
    () => {
      // Don't fetch existing config if this is a new section
      if (isNewSection) return undefined;
      
      const params = new URLSearchParams({ restaurant_id: finalRestaurantId });
      const currentPageId = pageId || resolvedPageId;
      if (currentPageId) {
        params.append('page_id', currentPageId);
      }
      if (templateId) {
        params.append('template_id', templateId);
      }
      return `/api/faq-config?${params.toString()}`;
    },
    [finalRestaurantId, pageId, resolvedPageId, isNewSection, templateId],
  );

  const { config, loading: fetchLoading, error: fetchError } = useFAQConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateFAQ: updateFAQConfig, updating, error: updateError } = useUpdateFAQConfig();
  
  // Validate that restaurant ID is provided
  if (!finalRestaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter or props.</p>
      </div>
    );
  }

  // Initialize form with fetched config (only for existing sections)
  useEffect(() => {
    if (config && !isNewSection) {
      setLayout(config.layout || 'accordion');
      setBgColor(config.bgColor || '#ffffff');
      setTextColor(config.textColor || '#111827');
      setTitle(config.title || 'Frequently Asked Questions');
      setSubtitle(config.subtitle || 'Find answers to common questions');
      setFaqs(config.faqs || []);
      setSectionStyle((prev) => ({
        ...sectionStyleDefaults,
        ...prev,
        ...config,
      }));
    }
  }, [config, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setSectionStyle((prev) => ({
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [sectionStyleDefaults]);

  const addFAQ = () => {
    setFaqs((s) => [...s, { id: String(Date.now()), question: '', answer: '' }]);
  };

  // Resolve page_id from domain/url params if pageId prop not provided
  useEffect(() => {
    if (pageId) {
      setResolvedPageId(pageId);
      return;
    }

    if (pageIdFromParams) {
      setResolvedPageId(pageIdFromParams);
      return;
    }

    const tryResolve = async () => {
      try {
        if (!finalRestaurantId) return;

        let domain = domainParamRaw;
        let urlSlug = urlSlugFromParams;

        // If domain param contains a full URL with path, extract path as url slug
        if (domain && !urlSlug) {
          try {
            const parsed = new URL(domain);
            const p = parsed.pathname.replace(/^\//, '');
            if (p) urlSlug = p;
            // use hostname as domain if needed
            domain = parsed.hostname;
          } catch {
            // not a full URL, keep domain as-is
          }
        }

        if (!urlSlug) return; // url_slug is required by page-details API

        const res = await fetch(`/api/page-details?restaurant_id=${encodeURIComponent(finalRestaurantId)}&url_slug=${encodeURIComponent(urlSlug)}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.data?.page?.page_id) {
          setResolvedPageId(data.data.page.page_id);
        }
      } catch (err) {
        console.error('Failed to resolve page_id from domain params', err);
      }
    };

    tryResolve();
  }, [pageId, pageIdFromParams, domainParamRaw, urlSlugFromParams, finalRestaurantId]);

  const updateFAQ = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs((s) => s.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFAQ = (id: string) => setFaqs((s) => s.filter((f) => f.id !== id));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!finalRestaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const payload: {
        restaurant_id: string;
        layout: 'list' | 'accordion' | 'grid';
        bgColor: string;
        textColor: string;
        title: string;
        subtitle: string;
        faqs: FAQ[];
        page_id?: string;
        template_id?: string;
      } = {
        restaurant_id: finalRestaurantId,
        layout,
        bgColor,
        textColor,
        title,
        subtitle,
        faqs,
        ...sectionStyle,
      };

      if (pageId) payload.page_id = pageId;
      else if (resolvedPageId) payload.page_id = resolvedPageId;
      
      // Include template_id when editing existing section
      if (templateId) payload.template_id = templateId;

      // Debug: log payload so developer can verify page_id presence
      try {
        // eslint-disable-next-line no-console
        console.debug('FAQ save payload:', payload);
      } catch {
        // Ignore console errors
      }

      await updateFAQConfig(payload);
      
      setToastMessage(isNewSection ? 'FAQ section created successfully!' : 'FAQ settings saved successfully!');
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update FAQ:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const renderPreviewContent = () => {
    const previewStyle = {
      backgroundColor: bgColor,
      color: textColor,
      padding: '2rem',
      borderRadius: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    };

    const headerSection = (
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '0.75rem',
          color: textColor,
          lineHeight: '1.2'
        }}>
          {title || 'Frequently Asked Questions'}
        </h2>
        <p style={{
          fontSize: '1.125rem',
          color: textColor,
          opacity: 0.8,
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {subtitle || 'Find answers to common questions'}
        </p>
      </div>
    );

    // Show placeholder UI when no FAQs are added
    if (faqs.length === 0) {
      if (layout === 'grid') {
        return (
          <div style={previewStyle}>
            {headerSection}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{
                  padding: '1.5rem',
                  border: `1px solid ${textColor}20`,
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                    fontSize: '1.1rem',
                    color: textColor,
                    opacity: 0.5
                  }}>
                    Sample Question Text
                  </div>
                  <div style={{
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    color: textColor,
                    opacity: 0.4
                  }}>
                    Sample answer text that would appear here when you add your FAQ content.
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (layout === 'list') {
        return (
          <div style={previewStyle}>
            {headerSection}
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {[1, 2, 3].map((i, index) => (
                <div key={i} style={{
                  paddingBottom: '2rem',
                  marginBottom: '2rem',
                  borderBottom: index < 2 ? `1px solid ${textColor}20` : 'none'
                }}>
                  <div style={{
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                    fontSize: '1.2rem',
                    color: textColor,
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}>
                    <span style={{
                      background: `${textColor}50`,
                      color: bgColor,
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      Q
                    </span>
                    Sample Question Text
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: textColor,
                    opacity: 0.4,
                    marginLeft: '2.25rem'
                  }}>
                    Sample answer text that would appear here when you add your FAQ content.
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // accordion layout placeholder
      return (
        <div style={previewStyle}>
          {headerSection}
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3].map((i, index) => (
              <div key={i} style={{
                border: `1px solid ${textColor}20`,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.25rem',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  color: textColor,
                  opacity: 0.5,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: index === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}>
                  <span>Sample Question Text</span>
                  <svg
                    style={{
                      width: '20px',
                      height: '20px',
                      transform: index === 0 ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      opacity: 0.5
                    }}
                    fill="none"
                    stroke={textColor}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {index === 0 && (
                  <div style={{
                    padding: '0 1.25rem 1.25rem',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    color: textColor,
                    opacity: 0.4,
                    borderTop: `1px solid ${textColor}10`
                  }}>
                    Sample answer text that would appear here when you add your FAQ content.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (layout === 'grid') {
      return (
        <div style={previewStyle}>
          {headerSection}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {faqs.map((f) => (
              <div key={f.id} style={{
                padding: '1.5rem',
                border: `1px solid ${textColor}20`,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  fontSize: '1.1rem',
                  color: textColor
                }}>
                  {f.question || 'Question'}
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: '1.5',
                  color: textColor,
                  opacity: 0.9
                }}>
                  {f.answer || 'Answer content...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (layout === 'list') {
      return (
        <div style={previewStyle}>
          {headerSection}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {faqs.map((f, index) => (
              <div key={f.id} style={{
                paddingBottom: '2rem',
                marginBottom: '2rem',
                borderBottom: index < faqs.length - 1 ? `1px solid ${textColor}20` : 'none'
              }}>
                <div style={{
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  fontSize: '1.2rem',
                  color: textColor,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <span style={{
                    background: textColor,
                    color: bgColor,
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    Q
                  </span>
                  {f.question || 'Question'}
                </div>
                <div style={{
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: textColor,
                  opacity: 0.9,
                  marginLeft: '2.25rem'
                }}>
                  {f.answer || 'Answer content...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // accordion layout
    return (
      <div style={previewStyle}>
        {headerSection}
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((f, index) => (
            <div key={f.id} style={{
              border: `1px solid ${textColor}20`,
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1.25rem',
                fontWeight: '600',
                fontSize: '1.1rem',
                color: textColor,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: index === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'
              }}>
                <span>{f.question || 'Question'}</span>
                <svg
                  style={{
                    width: '20px',
                    height: '20px',
                    transform: index === 0 ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                  fill="none"
                  stroke={textColor}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {index === 0 && (
                <div style={{
                  padding: '0 1.25rem 1.25rem',
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: textColor,
                  opacity: 0.9,
                  borderTop: `1px solid ${textColor}10`
                }}>
                  {f.answer || 'Answer content...'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (fetchLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FAQ Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Configure your FAQ section layout and content</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? 'Hide Preview' : 'Show Live Preview'}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Error Messages */}
      {fetchError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">Error loading settings: {fetchError}</p>
          </div>
        </div>
      )}

      {updateError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">Error saving settings: {updateError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Layout Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
              <p className="text-sm text-gray-600">Choose how FAQs are displayed</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'list', name: 'List', description: 'Simple list layout' },
              { value: 'accordion', name: 'Accordion', description: 'Collapsible sections' },
              { value: 'grid', name: 'Grid', description: 'Grid card layout' }
            ].map((option) => (
              <div
                key={option.value}
                onClick={() => setLayout(option.value as any)}
                className={`group cursor-pointer rounded-lg border-2 p-3 transition-all ${
                  layout === option.value
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="mb-2 overflow-hidden rounded border border-gray-200 bg-gray-50 p-2">
                  <div className="h-16 w-full">
                    {option.value === 'list' && (
                      <div className="space-y-1">
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-3 bg-gray-400 rounded-full mt-0.5"></div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-2 bg-gray-400 rounded w-3/4"></div>
                            <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-3 bg-gray-400 rounded-full mt-0.5"></div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-2 bg-gray-400 rounded w-2/3"></div>
                            <div className="h-1.5 bg-gray-300 rounded w-5/6"></div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 h-3 bg-gray-400 rounded-full mt-0.5"></div>
                          <div className="flex-1 space-y-0.5">
                            <div className="h-2 bg-gray-400 rounded w-4/5"></div>
                            <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {option.value === 'accordion' && (
                      <div className="space-y-1">
                        <div className="border border-gray-300 rounded p-1">
                          <div className="flex items-center justify-between">
                            <div className="h-2 bg-gray-400 rounded w-2/3"></div>
                            <div className="w-2 h-2 border border-gray-400 rounded-sm"></div>
                          </div>
                          <div className="mt-1 h-1.5 bg-gray-300 rounded w-full"></div>
                        </div>
                        <div className="border border-gray-300 rounded p-1">
                          <div className="flex items-center justify-between">
                            <div className="h-2 bg-gray-400 rounded w-3/4"></div>
                            <div className="w-2 h-2 border border-gray-400 rounded-sm"></div>
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded p-1">
                          <div className="flex items-center justify-between">
                            <div className="h-2 bg-gray-400 rounded w-1/2"></div>
                            <div className="w-2 h-2 border border-gray-400 rounded-sm"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {option.value === 'grid' && (
                      <div className="grid grid-cols-2 gap-1 h-full">
                        <div className="border border-gray-300 rounded p-1">
                          <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                          <div className="h-1.5 bg-gray-300 rounded w-3/4"></div>
                        </div>
                        <div className="border border-gray-300 rounded p-1">
                          <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                          <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                        </div>
                        <div className="border border-gray-300 rounded p-1">
                          <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                          <div className="h-1.5 bg-gray-300 rounded w-4/5"></div>
                        </div>
                        <div className="border border-gray-300 rounded p-1">
                          <div className="h-2 bg-gray-400 rounded w-full mb-0.5"></div>
                          <div className="h-1.5 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`text-sm font-medium ${
                  layout === option.value ? 'text-purple-700' : 'text-gray-900'
                }`}>
                  {option.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
              <p className="text-sm text-gray-600">Set title, subtitle and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Title</span>
                <span className="text-xs font-normal text-gray-500">Main heading for the FAQ section</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Frequently Asked Questions"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Subtitle</span>
                <span className="text-xs font-normal text-gray-500">Subheading text below the title</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Find answers to common questions"
              />
            </div>
          </div>
        </div>

        {/* FAQ Management */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">FAQ Management</h2>
              <p className="text-sm text-gray-600">Add and manage frequently asked questions</p>
            </div>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">FAQ Item</h4>
                  <button
                    type="button"
                    onClick={() => removeFAQ(faq.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 text-sm font-medium text-gray-700">Question</label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Enter your question here..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 text-sm font-medium text-gray-700">Answer</label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Enter the answer here..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addFAQ}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add FAQ
            </button>
          </div>
        </div>

        {/* Colors & Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Colors & Styling</h2>
              <p className="text-sm text-gray-600">Customize colors and appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">FAQ section background</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() => setBgColor('#ffffff')}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Text Color</span>
                <span className="text-xs font-normal text-gray-500">FAQ text color</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#111827"
                />
                <button
                  type="button"
                  onClick={() => setTextColor('#111827')}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Typography & Buttons</h2>
              <p className="text-sm text-gray-600">Customize text styles and button appearance</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Custom Typography & Styles</label>
                <p className="text-xs text-gray-500">Override global CSS with custom styling options</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sectionStyle.is_custom || false}
                  onChange={(e) => setSectionStyle((prev) => ({ ...prev, is_custom: e.target.checked }))}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!sectionStyle.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Using Global Styles</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles defined in your theme settings.
                      Enable custom typography above to override these styles with section-specific options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {isNewSection ? 'Creating...' : 'Saving...'}
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isNewSection ? 'Create FAQ Section' : 'Save FAQ Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">FAQ Live Preview</h2>
                <p className="mt-0.5 text-sm text-gray-600">Updates in real-time</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-4xl">
                {renderPreviewContent()}
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <svg className="h-5 w-5 shrink-0 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your FAQ section will appear on the website
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
