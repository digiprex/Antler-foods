'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DynamicTimeline from '@/components/dynamic-timeline';
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
import { useTimelineConfig, useUpdateTimelineConfig } from '@/hooks/use-timeline-config';
import {
  type TimelineConfig,
  type TimelineItem,
  type TimelineLayout,
} from '@/types/timeline.types';
import {
  getTimelineLayoutOptions,
  type TimelineEditorLayoutValue,
} from '@/utils/timeline-layout-utils';

type EditorTimelineLayout = TimelineEditorLayoutValue;

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
] as const satisfies ReadonlyArray<keyof TimelineConfig>;

const buildGlobalTypographyConfig = (
  defaults: Partial<TimelineConfig>,
): Partial<TimelineConfig> => {
  const nextConfig: Partial<TimelineConfig> = {};

  for (const key of GLOBAL_TYPOGRAPHY_KEYS) {
    (nextConfig as any)[key] = defaults[key];
  }

  return nextConfig;
};

const DEFAULT_TIMELINE: Omit<TimelineConfig, 'restaurant_id' | 'page_id'> = {
  isEnabled: true,
  layout: 'alternating',
  title: 'Our Journey',
  subtitle: 'Key milestones that shaped the brand experience.',
  items: [],
  backgroundColor: '#f8fafc',
  mobileBackgroundColor: undefined,
  textColor: '#0f172a',
  mobileTextColor: undefined,
  accentColor: '#7c3aed',
  mobileAccentColor: undefined,
  lineColor: '#cbd5e1',
  mobileLineColor: undefined,
  cardBackgroundColor: '#ffffff',
  mobileCardBackgroundColor: undefined,
};

const PREVIEW_ITEMS: TimelineItem[] = [
  { id: 'p1', title: 'Neighborhood Opening', date: '2018', description: 'Our first dining room opens with a focused seasonal menu and a loyal local audience.', order: 0 },
  { id: 'p2', title: 'Expanded Kitchen', date: '2021', description: 'A larger kitchen unlocks private events, tasting menus, and a faster service rhythm.', order: 1 },
  { id: 'p3', title: 'Today', date: 'Now', description: 'Online orders, chef collaborations, and community-led hospitality define the current chapter.', order: 2 },
];

function normalizeEditorTimelineLayout(layout: TimelineLayout | undefined): EditorTimelineLayout {
  switch (layout) {
    case 'left':
    case 'right':
    case 'center':
    case 'alternating':
      return layout;
    case 'compact':
      return 'left';
    case 'horizontal':
      return 'center';
    case 'vertical':
    default:
      return 'alternating';
  }
}

function LayoutPreview({ layout }: { layout: EditorTimelineLayout }) {
  if (layout === 'left' || layout === 'right') {
    const alignLeft = layout === 'left';
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="relative h-full overflow-hidden rounded-[14px] border border-slate-200 bg-white/90">
          <div className="absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-violet-200" />
          <div className="flex h-full flex-col justify-between px-4 py-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className={`flex ${alignLeft ? 'justify-start pr-[46%]' : 'justify-end pl-[46%]'}`}>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_28px_rgba(148,163,184,0.12)]">
                  <div className="h-2 w-14 rounded-full bg-slate-600/75" />
                  <div className="mt-2 h-2 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'center') {
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="relative h-full overflow-hidden rounded-[14px] border border-slate-200 bg-white/90">
          <div className="absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-violet-200" />
          <div className="flex h-full flex-col justify-between px-4 py-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex justify-center">
                <div className="w-[68%] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_28px_rgba(148,163,184,0.12)]">
                  <div className="h-2 w-14 rounded-full bg-slate-600/75" />
                  <div className="mt-2 h-2 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
      <div className="relative h-full overflow-hidden rounded-[14px] border border-slate-200 bg-white/90">
        <div className="absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-violet-200" />
        <div className="flex h-full flex-col justify-between px-4 py-3">
          {[true, false, true].map((isLeft, index) => (
            <div key={index} className={`flex ${isLeft ? 'justify-start pr-[46%]' : 'justify-end pl-[46%]'}`}>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_28px_rgba(148,163,184,0.12)]">
                <div className="h-2 w-16 rounded-full bg-slate-600/75" />
                <div className="mt-2 h-2 w-20 rounded-full bg-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TimelineSettingsForm() {
  const searchParams = useSearchParams() ?? new URLSearchParams();
  const restaurantId = searchParams?.get('restaurant_id')?.trim() || '';
  const restaurantName = searchParams?.get('restaurant_name')?.trim() || '';
  const pageId = searchParams?.get('page_id')?.trim() || '';
  const templateId = searchParams?.get('template_id') || null;
  const isNewSection = searchParams?.get('new_section') === 'true';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);
  const endpoint = useMemo(() => {
    if (isNewSection || !restaurantId || !pageId) return '';
    const params = new URLSearchParams({ restaurant_id: restaurantId, page_id: pageId });
    if (templateId) params.set('template_id', templateId);
    return `/api/timeline-config?${params.toString()}`;
  }, [isNewSection, pageId, restaurantId, templateId]);
  const { config, loading, error: fetchError } = useTimelineConfig({ apiEndpoint: endpoint });
  const { updateTimeline, updating, error: updateError } = useUpdateTimelineConfig();

  const [formConfig, setFormConfig] = useState<TimelineConfig>({
    restaurant_id: restaurantId,
    page_id: pageId,
    ...DEFAULT_TIMELINE,
    ...sectionStyleDefaults,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<EditorViewport>('desktop');
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setFormConfig((current) => ({ ...current, ...sectionStyleDefaults }));
  }, [sectionStyleDefaults]);

  useEffect(() => {
    if (!config || isNewSection) return;
    setFormConfig({
      ...DEFAULT_TIMELINE,
      ...sectionStyleDefaults,
      ...config,
      layout: normalizeEditorTimelineLayout(config.layout),
      restaurant_id: restaurantId,
      page_id: pageId,
    });
  }, [config, isNewSection, pageId, restaurantId, sectionStyleDefaults]);

  const selectedLayout = normalizeEditorTimelineLayout(formConfig.layout);
  const sortedItems = useMemo(
    () => [...formConfig.items].sort((a, b) => a.order - b.order),
    [formConfig.items],
  );
  const previewConfig = useMemo(() => ({ ...formConfig, items: formConfig.items.length ? formConfig.items : PREVIEW_ITEMS }), [formConfig]);
  const updateConfig = (updates: Partial<TimelineConfig>) =>
    setFormConfig((current) => ({ ...current, ...updates }));

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

  const saveItem = (item: TimelineItem) => {
    const next = [...sortedItems];
    const index = next.findIndex((current) => current.id === item.id);
    if (index >= 0) next[index] = item; else next.push(item);
    updateConfig({ items: next.map((current, order) => ({ ...current, order })) });
    setShowItemModal(false);
    setEditingItem(null);
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    const index = sortedItems.findIndex((item) => item.id === id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= sortedItems.length) return;
    const next = [...sortedItems];
    [next[index], next[target]] = [next[target], next[index]];
    updateConfig({ items: next.map((item, order) => ({ ...item, order })) });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurantId || !pageId) {
      setToastMessage('Restaurant ID and page ID are required.');
      setToastType('error');
      setShowToast(true);
      return;
    }
    try {
      await updateTimeline({
        ...formConfig,
        layout: selectedLayout,
        restaurant_id: restaurantId,
        page_id: pageId,
        template_id: templateId || undefined,
        new_section: isNewSection,
      } as Partial<TimelineConfig> & { restaurant_id: string; page_id: string; template_id?: string });
      setToastMessage(isNewSection ? 'Timeline section created successfully.' : 'Timeline settings saved successfully.');
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      console.error('Failed to update timeline:', error);
      setToastMessage('Failed to save timeline settings.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (!restaurantId || !pageId) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-sm text-rose-700">Restaurant ID and page ID are required to configure timeline settings.</div>;
  }
  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><div className="inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-medium text-slate-700"><div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />Loading timeline settings...</div></div>;
  }

  return (
    <>
      {showToast ? <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} /> : null}
      <form onSubmit={submit} className="space-y-6 pb-32">
        <SettingsHeader
          icon={<svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
          title={isNewSection ? 'Add Timeline Section' : 'Timeline Settings'}
          description="Create a stronger editing and preview experience for milestone storytelling."
          meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
        />
        {fetchError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">Error loading settings: {fetchError}</div> : null}
        {updateError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">Error saving settings: {updateError}</div> : null}

        <SettingsCard icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} title="Section Basics" description="Enable the section and choose the overall timeline composition.">
          <div className="space-y-5">
            <ToggleRow title="Enable Timeline" description="Show or hide the timeline section on the page." checked={formConfig.isEnabled} onChange={(checked) => updateConfig({ isEnabled: checked })} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {getTimelineLayoutOptions().map((layoutOption) => (
                <LayoutCard
                  key={layoutOption.id}
                  title={layoutOption.name}
                  description={layoutOption.description}
                  preview={<LayoutPreview layout={layoutOption.id} />}
                  selected={selectedLayout === layoutOption.id}
                  onClick={() => updateConfig({ layout: layoutOption.id })}
                  badge={layoutOption.badge}
                />
              ))}
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>} title="Content" description="Set the heading and subtitle shown above the milestone sequence.">
          <div className="grid gap-5 lg:grid-cols-2">
            <input type="text" value={formConfig.title || ''} onChange={(e) => updateConfig({ title: e.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="Our Journey" />
            <input type="text" value={formConfig.subtitle || ''} onChange={(e) => updateConfig({ subtitle: e.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="Key milestones that shaped the brand experience" />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          title="Milestones"
          description="Add, edit, delete, and reorder the items shown in the timeline."
          action={<button type="button" onClick={() => { setEditingItem({ id: `item-${Date.now()}`, title: '', date: '', description: '', order: sortedItems.length }); setShowItemModal(true); }} className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(109,40,217,0.25)] transition-all hover:-translate-y-0.5 hover:bg-violet-700"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Add Milestone</button>}
        >
          {sortedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">No milestones added yet. Sample content is shown in preview until you add your own items.</div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item, index) => (
                <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-sm font-semibold text-violet-700">{String(index + 1).padStart(2, '0')}</div>
                      <div>
                        <div className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">{item.date || 'Date'}</div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{item.title || 'Untitled milestone'}</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{item.description || 'Add a short description explaining why this milestone matters.'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button type="button" onClick={() => moveItem(item.id, 'up')} disabled={index === 0} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Up</button>
                      <button type="button" onClick={() => moveItem(item.id, 'down')} disabled={index === sortedItems.length - 1} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Down</button>
                      <button type="button" onClick={() => { setEditingItem(item); setShowItemModal(true); }} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100">Edit</button>
                      <button type="button" onClick={() => updateConfig({ items: sortedItems.filter((current) => current.id !== item.id).map((current, order) => ({ ...current, order })) })} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100">Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SettingsCard>

        <SettingsCard
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
          title="Typography"
          description="Customize text styles across the timeline."
        >
          <div className="space-y-4">
            <ToggleRow
              title="Custom Typography"
              description="Override the global theme typography for this timeline."
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
                <SectionTypographyControls value={formConfig} onChange={updateConfig} showAdvancedControls />
              </div>
            )}
            <ToggleRow
              title="Page Scroll Animation"
              description="Reveal the timeline when it enters the viewport."
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
          <button type="submit" disabled={updating} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(109,40,217,0.28)] transition-all hover:-translate-y-0.5 hover:from-violet-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
            {updating ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Saving...</> : <>{isNewSection ? 'Create Timeline Section' : 'Save Timeline Settings'}</>}
          </button>
        </div>
      </form>

      {!showPreview ? <FloatingPreviewButton viewport="desktop" onClick={() => { setPreviewViewport('desktop'); setShowPreview(true); }} /> : null}
      {showPreview ? (
        <PreviewModal title="Live Preview" description="Switch between desktop and mobile to verify spacing, card hierarchy, and milestone readability." viewport={previewViewport} onViewportChange={setPreviewViewport} onClose={() => setShowPreview(false)} note={formConfig.items.length ? 'Preview reflects your live milestone content and styling changes instantly.' : 'Sample milestones are shown until you add your own timeline items.'}>
          <DynamicTimeline configData={previewConfig} isPreview previewViewport={previewViewport} restaurantId={restaurantId} />
        </PreviewModal>
      ) : null}
      {showItemModal && editingItem ? <TimelineItemModal item={editingItem} onClose={() => { setShowItemModal(false); setEditingItem(null); }} onSave={saveItem} /> : null}
    </>
  );
}

function TimelineItemModal({
  item,
  onClose,
  onSave,
}: {
  item: TimelineItem;
  onClose: () => void;
  onSave: (item: TimelineItem) => void;
}) {
  const [draft, setDraft] = useState<TimelineItem>(item);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.28)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{item.title ? 'Edit Milestone' : 'Add Milestone'}</h2>
              <p className="text-sm text-slate-600">Refine the milestone title, date, and supporting story.</p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }} className="space-y-5 px-6 py-6">
          <input type="text" value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="Expanded Kitchen" required />
          <input type="text" value={draft.date} onChange={(e) => setDraft((current) => ({ ...current, date: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" placeholder="2021" required />
          <textarea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" rows={5} placeholder="Describe what changed, why it mattered, and how it shaped the next milestone." required />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Cancel</button>
            <button type="submit" className="rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(109,40,217,0.25)] transition-all hover:-translate-y-0.5 hover:from-violet-700 hover:to-purple-800">Save Milestone</button>
          </div>
        </form>
      </div>
    </div>
  );
}
