/**
 * FAQ Settings Form
 *
 * Enhanced interface for configuring FAQ settings:
 * - Layout selection (list, accordion, grid)
 * - FAQ management (add, edit, delete)
 * - Live preview modal
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFAQConfig, useUpdateFAQConfig } from '@/hooks/use-faq-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import DynamicFAQ from '@/components/dynamic-faq';
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

type PreviewViewport = 'desktop' | 'mobile';

const GLOBAL_TYPOGRAPHY_KEYS = [
  'buttonStyleVariant',
  'titleFontFamily',
  'titleFontSize',
  'titleMobileFontSize',
  'titleMobileFontFamily',
  'titleFontWeight',
  'titleMobileFontWeight',
  'titleFontStyle',
  'titleMobileFontStyle',
  'titleColor',
  'titleMobileColor',
  'titleTextTransform',
  'titleMobileTextTransform',
  'titleLineHeight',
  'titleMobileLineHeight',
  'titleLetterSpacing',
  'titleMobileLetterSpacing',
  'subtitleFontFamily',
  'subtitleFontSize',
  'subtitleMobileFontSize',
  'subtitleMobileFontFamily',
  'subtitleFontWeight',
  'subtitleMobileFontWeight',
  'subtitleFontStyle',
  'subtitleMobileFontStyle',
  'subtitleColor',
  'subtitleMobileColor',
  'subtitleTextTransform',
  'subtitleMobileTextTransform',
  'subtitleLineHeight',
  'subtitleMobileLineHeight',
  'subtitleLetterSpacing',
  'subtitleMobileLetterSpacing',
  'bodyFontFamily',
  'bodyFontSize',
  'bodyMobileFontSize',
  'bodyMobileFontFamily',
  'bodyFontWeight',
  'bodyMobileFontWeight',
  'bodyFontStyle',
  'bodyMobileFontStyle',
  'bodyColor',
  'bodyMobileColor',
  'bodyTextTransform',
  'bodyMobileTextTransform',
  'bodyLineHeight',
  'bodyMobileLineHeight',
  'bodyLetterSpacing',
  'bodyMobileLetterSpacing',
] as const satisfies ReadonlyArray<keyof SectionStyleConfig>;

const buildGlobalTypographyConfig = (
  defaults: SectionStyleConfig,
): SectionStyleConfig => {
  const nextConfig: SectionStyleConfig = {};

  for (const key of GLOBAL_TYPOGRAPHY_KEYS) {
    nextConfig[key] = defaults[key];
  }

  return nextConfig;
};

function pickSectionStyleConfig(
  source?: Partial<SectionStyleConfig> | null,
): SectionStyleConfig {
  if (!source) {
    return {};
  }

  return {
    is_custom: source.is_custom,
    buttonStyleVariant: source.buttonStyleVariant,
    titleFontFamily: source.titleFontFamily,
    titleFontSize: source.titleFontSize,
    titleMobileFontSize: source.titleMobileFontSize,
    titleMobileFontFamily: source.titleMobileFontFamily,
    titleFontWeight: source.titleFontWeight,
    titleMobileFontWeight: source.titleMobileFontWeight,
    titleFontStyle: source.titleFontStyle,
    titleMobileFontStyle: source.titleMobileFontStyle,
    titleColor: source.titleColor,
    titleMobileColor: source.titleMobileColor,
    titleTextTransform: source.titleTextTransform,
    titleMobileTextTransform: source.titleMobileTextTransform,
    titleLineHeight: source.titleLineHeight,
    titleMobileLineHeight: source.titleMobileLineHeight,
    titleLetterSpacing: source.titleLetterSpacing,
    titleMobileLetterSpacing: source.titleMobileLetterSpacing,
    subtitleFontFamily: source.subtitleFontFamily,
    subtitleFontSize: source.subtitleFontSize,
    subtitleMobileFontSize: source.subtitleMobileFontSize,
    subtitleMobileFontFamily: source.subtitleMobileFontFamily,
    subtitleFontWeight: source.subtitleFontWeight,
    subtitleMobileFontWeight: source.subtitleMobileFontWeight,
    subtitleFontStyle: source.subtitleFontStyle,
    subtitleMobileFontStyle: source.subtitleMobileFontStyle,
    subtitleColor: source.subtitleColor,
    subtitleMobileColor: source.subtitleMobileColor,
    subtitleTextTransform: source.subtitleTextTransform,
    subtitleMobileTextTransform: source.subtitleMobileTextTransform,
    subtitleLineHeight: source.subtitleLineHeight,
    subtitleMobileLineHeight: source.subtitleMobileLineHeight,
    subtitleLetterSpacing: source.subtitleLetterSpacing,
    subtitleMobileLetterSpacing: source.subtitleMobileLetterSpacing,
    bodyFontFamily: source.bodyFontFamily,
    bodyFontSize: source.bodyFontSize,
    bodyMobileFontSize: source.bodyMobileFontSize,
    bodyMobileFontFamily: source.bodyMobileFontFamily,
    bodyFontWeight: source.bodyFontWeight,
    bodyMobileFontWeight: source.bodyMobileFontWeight,
    bodyFontStyle: source.bodyFontStyle,
    bodyMobileFontStyle: source.bodyMobileFontStyle,
    bodyColor: source.bodyColor,
    bodyMobileColor: source.bodyMobileColor,
    bodyTextTransform: source.bodyTextTransform,
    bodyMobileTextTransform: source.bodyMobileTextTransform,
    bodyLineHeight: source.bodyLineHeight,
    bodyMobileLineHeight: source.bodyMobileLineHeight,
    bodyLetterSpacing: source.bodyLetterSpacing,
    bodyMobileLetterSpacing: source.bodyMobileLetterSpacing,
  };
}

// Restaurant ID should be provided dynamically - no default static ID

export default function FAQSettingsForm({
  pageId,
  restaurantId,
}: FAQFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const domainParamRaw =
    searchParams?.get('domain') ||
    searchParams?.get('staging_domain') ||
    searchParams?.get('url') ||
    null;
  const urlSlugFromParams =
    searchParams?.get('url_slug') ||
    searchParams?.get('slug') ||
    searchParams?.get('path') ||
    null;
  const pageIdFromParams =
    searchParams?.get('page_id') || searchParams?.get('page') || null;
  const [resolvedPageId, setResolvedPageId] = useState<string | null>(
    pageId || null,
  );
  const restaurantIdFromQuery =
    searchParams?.get('restaurant_id')?.trim() ?? '';
  const finalRestaurantId = restaurantIdFromQuery || restaurantId || '';
  const sectionStyleDefaults = useSectionStyleDefaults(finalRestaurantId);

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams?.get('new_section') === 'true';
  const templateId = searchParams?.get('template_id') || null;
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    templateId,
  );
  const [hydratedTemplateId, setHydratedTemplateId] = useState<string | null>(
    null,
  );

  // Form state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [layout, setLayout] = useState<'list' | 'accordion' | 'grid'>(
    'accordion',
  );
  const [title, setTitle] = useState<string>('Frequently Asked Questions');
  const [subtitle, setSubtitle] = useState<string>(
    'Find answers to common questions',
  );
  const [sectionStyle, setSectionStyle] =
    useState<SectionStyleConfig>(sectionStyleDefaults);

  // Animation toggle
  const [enableScrollAnimation, setEnableScrollAnimation] =
    useState<boolean>(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>('desktop');

  const configApiEndpoint = useMemo(() => {
    // Don't fetch existing config if this is a new section
    if (isNewSection) return undefined;

    const params = new URLSearchParams({ restaurant_id: finalRestaurantId });
    const currentPageId = pageId || resolvedPageId;
    if (currentPageId) {
      params.append('page_id', currentPageId);
    }
    if (activeTemplateId) {
      params.append('template_id', activeTemplateId);
    }
    return `/api/faq-config?${params.toString()}`;
  }, [
    activeTemplateId,
    finalRestaurantId,
    pageId,
    resolvedPageId,
    isNewSection,
  ]);

  const previewConfig = useMemo(
    () => ({
      ...pickSectionStyleConfig(sectionStyle),
      layout,
      title,
      subtitle,
      faqs,
      enableScrollAnimation,
    }),
    [
      faqs,
      layout,
      sectionStyle,
      subtitle,
      title,
      enableScrollAnimation,
    ],
  );

  const {
    config,
    loading: fetchLoading,
    error: fetchError,
  } = useFAQConfig({
    apiEndpoint: configApiEndpoint,
  });
  const {
    updateFAQ: updateFAQConfig,
    updating,
    error: updateError,
  } = useUpdateFAQConfig();

  useEffect(() => {
    setActiveTemplateId(templateId);
  }, [templateId]);

  // Validate that restaurant ID is provided
  if (!finalRestaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>
          Restaurant ID is required. Please provide it via URL parameter or
          props.
        </p>
      </div>
    );
  }

  // Initialize form with fetched config (only for existing sections)
  useEffect(() => {
    if (config && !isNewSection) {
      const fetchedTemplateId = config.template_id || null;

      // Ignore stale fetch responses for a different FAQ template.
      if (
        activeTemplateId &&
        fetchedTemplateId &&
        fetchedTemplateId !== activeTemplateId
      ) {
        return;
      }

      // Only hydrate the form once per template instance so local layout
      // selection is not overwritten by later refetches for the same record.
      if (hydratedTemplateId === fetchedTemplateId) {
        return;
      }

      if (fetchedTemplateId) {
        setActiveTemplateId(fetchedTemplateId);
      }
      setLayout(config.layout || 'accordion');
      setTitle(config.title || 'Frequently Asked Questions');
      setSubtitle(config.subtitle || 'Find answers to common questions');
      setFaqs(config.faqs || []);
      setEnableScrollAnimation(
        config.enableScrollAnimation ??
          sectionStyleDefaults.enableScrollReveal ??
          false,
      );

      setSectionStyle((prev) => ({
        ...sectionStyleDefaults,
        ...prev,
        ...pickSectionStyleConfig(config),
      }));
      setHydratedTemplateId(fetchedTemplateId);
    }
  }, [
    activeTemplateId,
    config,
    hydratedTemplateId,
    isNewSection,
    sectionStyleDefaults,
  ]);

  useEffect(() => {
    setSectionStyle((prev) => ({
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [sectionStyleDefaults]);

  useEffect(() => {
    if (!config && isNewSection) {
      setEnableScrollAnimation(
        sectionStyleDefaults.enableScrollReveal ?? false,
      );
    }
  }, [config, isNewSection, sectionStyleDefaults.enableScrollReveal]);

  const addFAQ = () => {
    setFaqs((s) => [
      ...s,
      { id: String(Date.now()), question: '', answer: '' },
    ]);
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

        const res = await fetch(
          `/api/page-details?restaurant_id=${encodeURIComponent(finalRestaurantId)}&url_slug=${encodeURIComponent(urlSlug)}${domain ? `&domain=${encodeURIComponent(domain)}` : ''}`,
        );
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
  }, [
    pageId,
    pageIdFromParams,
    domainParamRaw,
    urlSlugFromParams,
    finalRestaurantId,
  ]);

  const updateFAQ = (
    id: string,
    field: 'question' | 'answer',
    value: string,
  ) => {
    setFaqs((s) => s.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const removeFAQ = (id: string) =>
    setFaqs((s) => s.filter((f) => f.id !== id));

  const handleLayoutSelect = (nextLayout: 'list' | 'accordion' | 'grid') => {
    setLayout(nextLayout);
  };

  const handleCustomTypographyToggle = (enabled: boolean) => {
    if (!enabled) {
      setSectionStyle((prev) => ({
        ...prev,
        is_custom: false,
      }));
      return;
    }

    setSectionStyle((prev) => ({
      ...prev,
      ...buildGlobalTypographyConfig(sectionStyleDefaults),
      is_custom: true,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalRestaurantId) {
      setToastMessage('Restaurant ID not found. Please refresh the page.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const payload: any = {
        restaurant_id: finalRestaurantId,
        ...pickSectionStyleConfig(sectionStyle),
        layout,
        title,
        subtitle,
        faqs,
        enableScrollAnimation,
      };

      if (pageId) payload.page_id = pageId;
      else if (resolvedPageId) payload.page_id = resolvedPageId;

      // Include template_id when editing the current FAQ instance
      if (!isNewSection && activeTemplateId) {
        payload.template_id = activeTemplateId;
      }

      // Debug: log payload so developer can verify page_id presence
      try {
        // eslint-disable-next-line no-console
        console.debug('FAQ save payload:', payload);
      } catch {
        // Ignore console errors
      }

      const savedConfig = await updateFAQConfig(payload);

      // Keep the current UI aligned with the just-saved template instead of
      // briefly snapping back to previously fetched values.
      setLayout(savedConfig.layout || layout);
      setTitle(savedConfig.title || title);
      setSubtitle(savedConfig.subtitle || subtitle);
      setFaqs(savedConfig.faqs || faqs);
      setEnableScrollAnimation(
        savedConfig.enableScrollAnimation ?? enableScrollAnimation,
      );
      setSectionStyle((prev) => ({
        ...sectionStyleDefaults,
        ...prev,
        ...pickSectionStyleConfig(savedConfig),
      }));

      if (savedConfig.template_id) {
        setActiveTemplateId(savedConfig.template_id);
        setHydratedTemplateId(savedConfig.template_id);

        const nextParams = new URLSearchParams(searchParams?.toString() || '');
        nextParams.set('template_id', savedConfig.template_id);
        nextParams.delete('new_section');

        const nextPageId = savedConfig.page_id || payload.page_id;
        if (nextPageId) {
          nextParams.set('page_id', nextPageId);
        }

        router.replace(`/admin/faq-settings?${nextParams.toString()}`, {
          scroll: false,
        });
      }

      setToastMessage(
        isNewSection
          ? 'FAQ section created successfully!'
          : 'FAQ settings saved successfully!',
      );
      setToastType('success');
      setShowToast(true);
    } catch (err) {
      console.error('Failed to update FAQ:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
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
      <div className="mb-8 flex items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FAQ Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your FAQ section layout and content
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {fetchError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">
              Error loading settings: {fetchError}
            </p>
          </div>
        </div>
      )}

      {updateError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">
              Error saving settings: {updateError}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 pb-40">
        {/* Layout Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Layout Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Choose how FAQs are displayed
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                value: 'list',
                name: 'List',
                description: 'Simple list layout',
              },
              {
                value: 'accordion',
                name: 'Accordion',
                description: 'Collapsible sections',
              },
              { value: 'grid', name: 'Grid', description: 'Grid card layout' },
            ].map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() =>
                  handleLayoutSelect(
                    option.value as 'list' | 'accordion' | 'grid',
                  )
                }
                aria-pressed={layout === option.value}
                className={`group w-full cursor-pointer rounded-xl border-2 p-3 text-left transition-all ${
                  layout === option.value
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="h-20 w-full">
                    {option.value === 'list' && (
                      <div className="space-y-2">
                        {[1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-gray-200 bg-white/80 p-2.5"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
                                {index}
                              </div>
                              <div className="flex-1 space-y-1">
                                <div
                                  className={`h-2.5 rounded-full bg-gray-400 ${index === 2 ? 'w-2/3' : index === 3 ? 'w-4/5' : 'w-3/4'}`}
                                ></div>
                                <div
                                  className={`h-1.5 rounded-full bg-gray-300 ${index === 2 ? 'w-full' : 'w-5/6'}`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {option.value === 'accordion' && (
                      <div className="space-y-2">
                        {[1, 2, 3].map((index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-gray-300 bg-white/80 px-2.5 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                className={`h-2.5 rounded-full bg-gray-400 ${index === 2 ? 'w-3/4' : index === 3 ? 'w-1/2' : 'w-2/3'}`}
                              ></div>
                              <div
                                className={`rounded-full border border-gray-400 p-0.5 transition-transform ${index === 1 ? 'rotate-180' : ''}`}
                              >
                                <svg
                                  className="h-2.5 w-2.5 text-gray-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m6 9 6 6 6-6"
                                  />
                                </svg>
                              </div>
                            </div>
                            {index === 1 && (
                              <div className="mt-2 h-1.5 w-11/12 rounded-full bg-gray-300"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {option.value === 'grid' && (
                      <div className="grid h-full grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-gray-300 bg-white/80 p-2"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="h-5 w-5 rounded-full bg-gray-200"></div>
                              <div className="h-1.5 w-10 rounded-full bg-gray-200"></div>
                            </div>
                            <div
                              className={`mb-1.5 h-2.5 rounded-full bg-gray-400 ${index === 2 ? 'w-3/4' : 'w-full'}`}
                            ></div>
                            <div
                              className={`h-1.5 rounded-full bg-gray-300 ${index === 4 ? 'w-1/2' : index === 3 ? 'w-4/5' : 'w-2/3'}`}
                            ></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`text-sm font-medium ${
                    layout === option.value
                      ? 'text-purple-700'
                      : 'text-gray-900'
                  }`}
                >
                  {option.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Content Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Set title, subtitle and description
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Section Title</span>
                <span className="text-xs font-normal text-gray-500">
                  Main heading for the FAQ section
                </span>
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
                <span className="text-xs font-normal text-gray-500">
                  Subheading text below the title
                </span>
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
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                FAQ Management
              </h2>
              <p className="text-sm text-gray-600">
                Add and manage frequently asked questions
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {faqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-600 shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="mt-4 text-sm font-semibold text-slate-900">
                  No FAQ items yet
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  Add your first question to populate the preview and start
                  shaping the accordion experience.
                </p>
              </div>
            ) : null}

            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-purple-200 bg-purple-50 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        FAQ Item
                      </h4>
                      <p className="text-xs text-slate-500">
                        Edit the question and supporting answer copy.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFAQ(faq.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                    Remove
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 text-sm font-medium text-slate-700">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        updateFAQ(faq.id, 'question', e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Enter your question here..."
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 text-sm font-medium text-slate-700">
                      Answer
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) =>
                        updateFAQ(faq.id, 'answer', e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
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
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Add FAQ
            </button>
          </div>
        </div>

        {/* Typography */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Typography
              </h2>
              <p className="text-sm text-gray-600">
                Customize text styles across the FAQ
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Custom Typography & Styles
                  </label>
                  <p className="text-xs text-gray-500">
                    Override global CSS with custom styling options
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={sectionStyle.is_custom || false}
                    onChange={(e) =>
                      handleCustomTypographyToggle(e.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>
            </div>

            {!sectionStyle.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Using Global Styles
                    </h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section and its preview are currently using the
                      global styles from your theme settings. Enable custom
                      typography above when you want FAQ-specific overrides.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                  Custom typography starts from your current global styles.
                  Mobile view automatically scales down oversized desktop font
                  sizes for smaller screens.
                </div>
                <SectionTypographyControls
                  value={sectionStyle}
                  onChange={(updates) =>
                    setSectionStyle((prev) => ({ ...prev, ...updates }))
                  }
                  showAdvancedControls
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-4">
              <div>
                <label className="text-sm font-medium text-purple-900">
                  Enable Page Scroll Animation
                </label>
                <p className="text-xs text-purple-700">
                  Animate FAQ items when they enter the viewport
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={enableScrollAnimation}
                  onChange={(e) => setEnableScrollAnimation(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-purple-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-purple-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>
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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                {isNewSection ? 'Create FAQ Section' : 'Save FAQ Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      {!showPreview ? (
        <button
          type="button"
          onClick={() => {
            setPreviewViewport('desktop');
            setShowPreview(true);
          }}
          className="fixed bottom-24 right-6 z-40 inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/95 px-5 py-3 text-sm font-semibold text-purple-700 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white"
          aria-label="Open live preview"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span className="text-xs font-medium text-purple-500">
              {previewViewport === 'mobile'
                ? 'Open mobile preview'
                : 'Open desktop preview'}
            </span>
          </span>
        </button>
      ) : null}

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch between desktop and mobile to review spacing, card
                  hierarchy, and animation behavior.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(['desktop', 'mobile'] as PreviewViewport[]).map(
                    (viewport) => (
                      <button
                        key={viewport}
                        type="button"
                        onClick={() => setPreviewViewport(viewport)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          previewViewport === viewport
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div
                className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${
                  previewViewport === 'mobile'
                    ? 'max-w-[430px] rounded-[32px]'
                    : 'max-w-[1240px] rounded-[32px]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>
                    {previewViewport === 'mobile'
                      ? 'Phone Preview'
                      : 'Desktop Preview'}
                  </span>
                  <span>
                    {previewViewport === 'mobile' ? '390 x 780' : '1280 x 720'}
                  </span>
                </div>
                <div className="bg-white">
                  <DynamicFAQ
                    restaurantId={finalRestaurantId}
                    pageId={pageId || resolvedPageId || undefined}
                    configData={previewConfig}
                    showLoading={false}
                    showPlaceholderWhenEmpty
                    previewMode
                    previewViewport={previewViewport}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {enableScrollAnimation
                    ? 'Scroll reveal is enabled. Open the section in the preview and scroll to validate the motion cadence.'
                    : faqs.length === 0
                      ? 'Sample FAQ content is shown until you add your own questions.'
                      : 'Live preview reflects your current FAQ layout, styling, and content changes.'}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === 'mobile'
                    ? 'Mobile responsiveness check'
                    : 'Desktop composition check'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
