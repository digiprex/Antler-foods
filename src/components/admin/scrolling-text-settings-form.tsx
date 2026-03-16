'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DynamicScrollingText from '@/components/dynamic-scrolling-text';
import {
  FloatingPreviewButton,
  LayoutCard,
  PreviewModal,
  SettingsCard,
  SettingsHeader,
  ToggleRow,
  type EditorViewport,
} from '@/components/admin/section-settings-primitives';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Toast from '@/components/ui/toast';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import {
  useScrollingTextConfig,
  useUpdateScrollingTextConfig,
} from '@/hooks/use-scrolling-text-config';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';
import {
  DEFAULT_SCROLLING_TEXT_CONFIG,
  SCROLL_SPEEDS,
} from '@/types/scrolling-text.types';

function LayoutPreview({ layout }: { layout: NonNullable<ScrollingTextConfig['layout']> }) {
  if (layout === 'vertical') {
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-[14px] border border-violet-100 bg-white/90">
          {['Brunch', 'Chef tasting', 'Late night'].map((item, index) => (
            <div key={item} className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  index === 1 ? 'bg-violet-500' : 'bg-violet-200'
                }`}
              />
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
      <div className="flex h-full items-center overflow-hidden rounded-[14px] border border-violet-100 bg-white/90 px-3">
        <div className="flex min-w-full items-center gap-4 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700">
          <span>Fresh pasta every morning</span>
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          <span>Weekend brunch reservations</span>
          <span className="h-2 w-2 rounded-full bg-violet-500" />
        </div>
      </div>
    </div>
  );
}

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
] as const satisfies ReadonlyArray<keyof ScrollingTextConfig>;

const buildGlobalTypographyConfig = (
  defaults: Partial<ScrollingTextConfig>,
): Partial<ScrollingTextConfig> => {
  const nextConfig: Partial<ScrollingTextConfig> = {};

  for (const key of GLOBAL_TYPOGRAPHY_KEYS) {
    (nextConfig as any)[key] = defaults[key];
  }

  return nextConfig;
};

export default function ScrollingTextSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id')?.trim() || '';
  const restaurantName = searchParams?.get('restaurant_name')?.trim() || '';
  const pageId = searchParams?.get('page_id')?.trim() || '';
  const templateId = searchParams?.get('template_id') || null;
  const isNewSection = searchParams?.get('new_section') === 'true';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const configApiEndpoint = useMemo(() => {
    if (isNewSection || !restaurantId || !pageId) {
      return '';
    }

    const params = new URLSearchParams({
      restaurant_id: restaurantId,
      page_id: pageId,
    });

    if (templateId) {
      params.set('template_id', templateId);
    }

    return `/api/scrolling-text-config?${params.toString()}`;
  }, [isNewSection, pageId, restaurantId, templateId]);

  const { config, loading, error: fetchError } = useScrollingTextConfig({
    apiEndpoint: configApiEndpoint,
  });
  const { updateScrollingText, updating, error: updateError } =
    useUpdateScrollingTextConfig();

  const [formConfig, setFormConfig] = useState<ScrollingTextConfig>({
    ...DEFAULT_SCROLLING_TEXT_CONFIG,
    ...sectionStyleDefaults,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<EditorViewport>('desktop');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setFormConfig((current) => ({
      ...current,
      ...sectionStyleDefaults,
    }));
  }, [sectionStyleDefaults]);

  useEffect(() => {
    if (!config || isNewSection) {
      return;
    }

    setFormConfig({
      ...DEFAULT_SCROLLING_TEXT_CONFIG,
      ...sectionStyleDefaults,
      ...config,
    });
  }, [config, isNewSection, sectionStyleDefaults]);

  const updateConfig = (updates: Partial<ScrollingTextConfig>) => {
    setFormConfig((current) => ({
      ...current,
      ...updates,
    }));
  };

  const handleCustomTypographyToggle = (enabled: boolean) => {
    if (!enabled) {
      updateConfig({ is_custom: false });
      return;
    }

    updateConfig({
      ...buildGlobalTypographyConfig(sectionStyleDefaults),
      is_custom: true,
    });
  };

  const previewConfig = useMemo(
    () => ({
      ...formConfig,
      text: formConfig.text?.trim()
        ? formConfig.text
        : 'Fresh pasta every morning  •  Weekend brunch reservations  •  Happy hour from 4 PM',
      isEnabled: formConfig.isEnabled,
    }),
    [formConfig],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!restaurantId || !pageId) {
      setToastMessage('Restaurant ID and page ID are required.');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      await updateScrollingText({
        ...formConfig,
        restaurant_id: restaurantId,
        page_id: pageId,
        template_id: templateId,
        new_section: isNewSection,
      } as Partial<ScrollingTextConfig> & {
        restaurant_id: string;
        page_id: string;
        template_id?: string | null;
      });

      setToastMessage(
        isNewSection
          ? 'Scrolling text section created successfully.'
          : 'Scrolling text settings saved successfully.',
      );
      setToastType('success');
      setShowToast(true);
    } catch (saveError) {
      console.error('Failed to update scrolling text:', saveError);
      setToastMessage('Failed to save scrolling text settings.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (!restaurantId || !pageId) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center">
        <h2 className="text-lg font-semibold text-rose-900">Missing Page Context</h2>
        <p className="mt-2 text-sm text-rose-700">
          Restaurant ID and page ID are required to configure scrolling text.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-medium text-slate-700">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          Loading scrolling text settings...
        </div>
      </div>
    );
  }

  return (
    <>
      {showToast ? (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6 pb-32">
        <SettingsHeader
          icon={
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          }
          title={isNewSection ? 'Add Scrolling Text Section' : 'Scrolling Text Settings'}
          description="Design a premium marquee treatment with responsive styling, instant preview, and motion controls."
          meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
        />

        {fetchError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            Error loading settings: {fetchError}
          </div>
        ) : null}
        {updateError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            Error saving settings: {updateError}
          </div>
        ) : null}

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="Section Status"
          description="Enable the section and choose the marquee direction before styling it."
        >
          <div className="space-y-5">
            <ToggleRow
              title="Enable Scrolling Text"
              description="Show or hide the marquee section on the page."
              checked={formConfig.isEnabled}
              onChange={(checked) => updateConfig({ isEnabled: checked })}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <LayoutCard
                title="Horizontal Scroll"
                description="A continuous marquee strip with strong motion and premium separators."
                preview={<LayoutPreview layout="horizontal" />}
                selected={(formConfig.layout || 'horizontal') === 'horizontal'}
                onClick={() => updateConfig({ layout: 'horizontal' })}
                badge="Recommended"
              />
              <LayoutCard
                title="Vertical Scroll"
                description="A stacked ticker feel that works well for short promotional statements."
                preview={<LayoutPreview layout="vertical" />}
                selected={formConfig.layout === 'vertical'}
                onClick={() => updateConfig({ layout: 'vertical' })}
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          }
          title="Content & Motion"
          description="Write the message, tune speed, and control spacing between repeats."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
                <span>Scrolling Copy</span>
                <span className="text-xs font-normal text-slate-500">Text that repeats inside the marquee</span>
              </label>
              <textarea
                value={formConfig.text}
                onChange={(event) => updateConfig({ text: event.target.value })}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="Fresh pasta every morning • Happy hour from 4 PM • Weekend brunch reservations now open"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
                <span>Scroll Speed</span>
                <span className="text-xs font-normal text-slate-500">Marquee motion tempo</span>
              </label>
              <select
                value={formConfig.scrollSpeed}
                onChange={(event) =>
                  updateConfig({
                    scrollSpeed: event.target.value as ScrollingTextConfig['scrollSpeed'],
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Approx. {SCROLL_SPEEDS[formConfig.scrollSpeed]}px per second.
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
                <span>Repeat Gap</span>
                <span className="text-xs font-normal text-slate-500">Space between repeated messages</span>
              </label>
              <input
                type="text"
                value={formConfig.textGap || '3rem'}
                onChange={(event) => updateConfig({ textGap: event.target.value || '3rem' })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="3rem"
              />
            </div>
          </div>
        </SettingsCard>
        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          }
          title="Typography"
          description="Customize text styles across the scrolling text."
        >
          <div className="space-y-4">
            <ToggleRow
              title="Custom Typography"
              description="Override the global theme typography for this section."
              checked={formConfig.is_custom || false}
              onChange={handleCustomTypographyToggle}
            />

            {!formConfig.is_custom ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">
                This section and its preview are currently using the global styles from your theme settings. Enable custom typography when you want section-specific overrides.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-800">
                  Custom typography starts from your current global styles. Mobile view automatically scales down oversized desktop font sizes for smaller screens.
                </div>
                <SectionTypographyControls
                  value={formConfig}
                  onChange={updateConfig}
                  showAdvancedControls
                />
              </div>
            )}

            <ToggleRow
              title="Page Scroll Animation"
              description="Reveal the marquee when it enters the viewport."
              checked={formConfig.enableScrollReveal === true}
              onChange={(checked) =>
                updateConfig({
                  enableScrollReveal: checked,
                  scrollRevealAnimation:
                    checked && !formConfig.scrollRevealAnimation
                      ? 'fade-up'
                      : formConfig.scrollRevealAnimation,
                })
              }
            />
          </div>
        </SettingsCard>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(109,40,217,0.28)] transition-all hover:-translate-y-0.5 hover:from-violet-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {updating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                {isNewSection ? 'Create Scrolling Text Section' : 'Save Scrolling Text Settings'}
              </>
            )}
          </button>
        </div>
      </form>

      {!showPreview ? (
        <FloatingPreviewButton
          viewport="desktop"
          onClick={() => {
            setPreviewViewport('desktop');
            setShowPreview(true);
          }}
        />
      ) : null}

      {showPreview ? (
        <PreviewModal
          title="Live Preview"
          description="Switch between desktop and mobile to verify the marquee motion and spacing."
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setShowPreview(false)}
          note={
            formConfig.isEnabled
              ? 'Preview updates instantly as you change copy, speed, typography, and reveal animation.'
              : 'The disabled state is shown so you can verify how the section behaves before publishing.'
          }
        >
          <DynamicScrollingText
            configData={previewConfig}
            isPreview
            previewViewport={previewViewport}
            restaurantId={restaurantId}
          />
        </PreviewModal>
      ) : null}
    </>
  );
}
