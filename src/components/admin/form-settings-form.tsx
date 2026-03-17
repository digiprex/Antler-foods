'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DynamicForm from '@/components/dynamic-form';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';
import { getFormLayoutOptions, formLayoutSupportsImage } from '@/utils/form-layout-utils';
import { SectionAppearanceControls } from '@/components/admin/section-appearance-controls';
import {
  FloatingPreviewButton,
  LayoutCard,
  PreviewModal,
  ResponsiveViewportTabs,
  SettingsCard,
  SettingsHeader,
  ToggleRow,
  type EditorViewport,
} from '@/components/admin/section-settings-primitives';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Toast from '@/components/ui/toast';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';

interface BuilderField {
  id?: string;
  field_id?: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required?: boolean;
  order: number;
  options?: string[];
}

interface FormRecord {
  form_id: string;
  title: string;
  email?: string;
  fields: BuilderField[];
  created_at?: string;
}

interface PreviewFormRecord {
  form_id: string;
  name: string;
  fields: Array<{
    field_id: string;
    label: string;
    placeholder?: string;
    type: BuilderField['type'];
    required: boolean;
    order: number;
    options?: string[];
  }>;
}

interface FormSettingsConfig extends SectionStyleConfig {
  form_id: string;
  layout: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundColor: string;
  mobileBackgroundColor?: string;
  textColor: string;
  mobileTextColor?: string;
  accentColor: string;
  mobileAccentColor?: string;
  buttonText: string;
  imageUrl?: string;
  showImage: boolean;
  isEnabled: boolean;
}

interface FormSettingsFormProps {
  pageId?: string;
  restaurantId: string;
}

const DEFAULT_FORM_CONFIG: FormSettingsConfig = {
  form_id: '',
  layout: 'centered',
  title: '',
  subtitle: '',
  description: '',
  backgroundColor: '#f8fafc',
  mobileBackgroundColor: undefined,
  textColor: '#0f172a',
  mobileTextColor: undefined,
  accentColor: '#7c3aed',
  mobileAccentColor: undefined,
  buttonText: 'Submit Request',
  showImage: true,
  isEnabled: true,
  is_custom: false,
};

function LayoutPreview({ layout }: { layout: string }) {
  if (layout === 'split-right' || layout === 'split-left') {
    const reversed = layout === 'split-left';
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="grid h-full grid-cols-2 gap-2 overflow-hidden rounded-[14px] border border-slate-200 bg-white/90 p-2">
          {reversed ? <div className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ede9fe_0%,#faf5ff_100%)]" /> : null}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <div className="h-2 w-16 rounded-full bg-slate-600/75" />
            <div className="h-2 w-20 rounded-full bg-slate-300" />
            <div className="h-7 rounded-lg bg-slate-100" />
            <div className="h-7 rounded-lg bg-slate-100" />
            <div className="h-7 rounded-full bg-violet-500" />
          </div>
          {!reversed ? <div className="rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ede9fe_0%,#faf5ff_100%)]" /> : null}
        </div>
      </div>
    );
  }

  if (layout === 'background-image') {
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[14px] border border-slate-200 bg-[linear-gradient(135deg,#ede9fe_0%,#f8fafc_100%)] p-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.18),transparent_46%)]" />
          <div className="relative w-full max-w-[72%] rounded-xl border border-white/70 bg-white/92 p-3 shadow-[0_10px_28px_rgba(148,163,184,0.16)]">
            <div className="h-2 w-16 rounded-full bg-slate-600/75" />
            <div className="mt-2 h-2 w-20 rounded-full bg-slate-300" />
            <div className="mt-3 h-7 rounded-lg bg-slate-100" />
            <div className="mt-2 h-7 rounded-full bg-violet-500" />
          </div>
        </div>
      </div>
    );
  }

  if (layout === 'image-top') {
    return (
      <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
        <div className="space-y-2 overflow-hidden rounded-[14px] border border-slate-200 bg-white/90 p-2">
          <div className="h-8 rounded-xl border border-violet-100 bg-[linear-gradient(135deg,#ede9fe_0%,#faf5ff_100%)]" />
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="h-2 w-16 rounded-full bg-slate-600/75" />
            <div className="mt-2 h-7 rounded-lg bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-28 rounded-[16px] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-3">
      <div className="space-y-2 rounded-[14px] border border-slate-200 bg-white/85 p-3">
        <div className="mx-auto h-2 w-20 rounded-full bg-slate-600/75" />
        <div className="mx-auto h-2 w-28 rounded-full bg-slate-300" />
        <div className="mx-auto mt-2 max-w-[78%] rounded-xl border border-slate-200 bg-white p-3">
          <div className="h-7 rounded-lg bg-slate-100" />
          <div className="mt-2 h-7 rounded-full bg-violet-500" />
        </div>
      </div>
    </div>
  );
}


function toPreviewForm(form: FormRecord | null): PreviewFormRecord | null {
  if (!form) return null;
  return {
    form_id: form.form_id,
    name: form.title,
    fields: (form.fields || []).map((field, index) => ({
      field_id: field.field_id || field.id || `field-${index}`,
      label: field.label,
      placeholder: field.placeholder,
      type: field.type,
      required: field.required ?? false,
      order: field.order ?? index,
      options: field.options,
    })),
  };
}

export default function FormSettingsForm({ pageId, restaurantId }: FormSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantName = searchParams?.get('restaurant_name')?.trim() || '';
  const templateId = searchParams?.get('template_id') || null;
  const isNewSection = searchParams?.get('new_section') === 'true';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [config, setConfig] = useState<FormSettingsConfig>({
    ...DEFAULT_FORM_CONFIG,
    ...sectionStyleDefaults,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<EditorViewport>('desktop');
  const [editorViewport, setEditorViewport] = useState<EditorViewport>('mobile');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  useEffect(() => {
    setConfig((current) => ({ ...current, ...sectionStyleDefaults }));
  }, [sectionStyleDefaults]);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoadingForms(true);
        const response = await fetch(`/api/forms?restaurant_id=${encodeURIComponent(restaurantId)}`);
        const data = await response.json();
        setForms(data.success ? data.data || [] : []);
      } catch (error) {
        console.error('Error fetching forms:', error);
        setForms([]);
      } finally {
        setLoadingForms(false);
      }
    };

    if (restaurantId) {
      fetchForms();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (isNewSection || !restaurantId || (!pageId && !templateId)) return;
    const fetchConfig = async () => {
      try {
        const params = new URLSearchParams({ restaurant_id: restaurantId });
        if (templateId) params.set('template_id', templateId); else if (pageId) params.set('page_id', pageId);
        const response = await fetch(`/api/form-settings?${params.toString()}`);
        const data = await response.json();
        if (data.success && data.data) {
          setConfig({
            ...DEFAULT_FORM_CONFIG,
            ...sectionStyleDefaults,
            ...data.data,
            // Ensure is_custom defaults to false if not specified
            is_custom: data.data.is_custom ?? false
          });
        }
      } catch (error) {
        console.error('Error loading form settings:', error);
      }
    };
    fetchConfig();
  }, [isNewSection, pageId, restaurantId, sectionStyleDefaults, templateId]);

  const selectedForm = useMemo(() => forms.find((form) => form.form_id === config.form_id) || null, [config.form_id, forms]);
  const previewForm = toPreviewForm(selectedForm);
  const updateConfig = (updates: Partial<FormSettingsConfig>) => setConfig((current) => ({ ...current, ...updates }));

  // Create preview config that uses global styles when custom typography is disabled
  const previewConfig = useMemo(() => {
    if (config.is_custom) {
      return config;
    }
    
    // When using global styles, only keep essential form properties and remove all custom styling
    return {
      // Keep only essential form configuration
      form_id: config.form_id,
      layout: config.layout,
      title: config.title,
      subtitle: config.subtitle,
      description: config.description,
      buttonText: config.buttonText,
      imageUrl: config.imageUrl,
      showImage: config.showImage,
      isEnabled: config.isEnabled,
      enableScrollReveal: config.enableScrollReveal,
      scrollRevealAnimation: config.scrollRevealAnimation,
      // Explicitly set to use global styles
      is_custom: false,
      // Pass restaurant ID so DynamicForm can fetch global styles from restaurant table
      restaurantId: restaurantId,
      // Remove all custom styling properties so global styles are used
      // (no backgroundColor, textColor, accentColor, fontFamily, fontSize, etc.)
    };
  }, [config, restaurantId]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config.form_id) {
      setToastMessage('Please select a form to display.');
      setToastType('error');
      setShowToast(true);
      return;
    }
    try {
      // Prepare config for saving - remove custom styling properties when using global styles
      const saveConfig = config.is_custom ? config : {
        // Keep only essential form configuration when using global styles
        form_id: config.form_id,
        layout: config.layout,
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        buttonText: config.buttonText,
        imageUrl: config.imageUrl,
        showImage: config.showImage,
        isEnabled: config.isEnabled,
        enableScrollReveal: config.enableScrollReveal,
        scrollRevealAnimation: config.scrollRevealAnimation,
        is_custom: false,
        // Don't save any custom styling properties when using global styles
      };

      const response = await fetch('/api/form-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...saveConfig,
          restaurant_id: restaurantId,
          page_id: pageId || null,
          template_id: templateId || null,
          new_section: isNewSection,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to save');
      
      if (isNewSection) {
        // For new sections, route back to page-settings and add the new section at the end
        const params = new URLSearchParams();
        params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        
        router.push(`/admin/page-settings?${params.toString()}`);
      } else {
        setToastMessage('Form settings saved successfully.');
        setToastType('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Failed to save form settings:', error);
      setToastMessage('Failed to save form settings.');
      setToastType('error');
      setShowToast(true);
    }
  };

  if (!restaurantId || !pageId) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-sm text-rose-700">Restaurant ID and page ID are required to configure form display settings.</div>;
  }
  if (loadingForms) {
    return <div className="flex min-h-[420px] items-center justify-center"><div className="inline-flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-3.5 text-sm font-medium text-slate-700"><div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />Loading forms...</div></div>;
  }

  return (
    <>
      {showToast ? <Toast message={toastMessage} type={toastType} onClose={() => setShowToast(false)} /> : null}

      <form onSubmit={save} className="space-y-6 pb-32">
        <SettingsHeader
          icon={<svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>}
          title={isNewSection ? 'Add Form Display Section' : 'Form Display Settings'}
          description="Match Hero Settings quality with premium layout cards, responsive controls, and a polished live preview."
          meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
        />

        <SettingsCard icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>} title="Form Status" description="Enable the section and choose which form will be displayed.">
          <div className="space-y-5">
            <ToggleRow title="Enable Form Display" description="Show or hide the section on the page." checked={config.isEnabled} onChange={(checked) => updateConfig({ isEnabled: checked })} />
            {forms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-slate-700">No forms available yet</p>
                <p className="mt-2 text-sm text-slate-500">Create a form first, then return here to style its presentation.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {forms.map((form) => {
                  const selected = config.form_id === form.form_id;
                  return (
                    <button key={form.form_id} type="button" onClick={() => updateConfig({ form_id: form.form_id })} className={`rounded-[24px] border p-4 text-left transition-all ${selected ? 'border-violet-400 bg-[linear-gradient(180deg,rgba(245,243,255,1),rgba(255,255,255,1))] shadow-[0_24px_65px_rgba(109,40,217,0.18)]' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">{(form.fields || []).length} fields</div>
                          <h3 className="mt-3 text-base font-semibold text-slate-900">{form.title}</h3>
                          <p className="mt-2 text-sm text-slate-500">{form.email || 'Configured form'}</p>
                        </div>
                        {selected ? <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.6}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SettingsCard>

        {config.form_id && (
          <>
            <SettingsCard
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.75 5.25h14.5A2.25 2.25 0 0121.5 7.5v9a2.25 2.25 0 01-2.25 2.25H4.75A2.25 2.25 0 012.5 16.5v-9A2.25 2.25 0 014.75 5.25z" /></svg>}
              title="Layout Configuration"
              description="Choose the presentation style that best fits the page content and conversion goal, then verify it in mobile and desktop."
              action={
                <ResponsiveViewportTabs
                  value={editorViewport}
                  onChange={(viewport) => {
                    setEditorViewport(viewport);
                    setPreviewViewport(viewport);
                  }}
                  scope="form-layout"
                />
              }
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {getFormLayoutOptions().map((layout) => (
                  <LayoutCard key={layout.value} title={layout.title} description={layout.description} preview={<LayoutPreview layout={layout.value} />} selected={config.layout === layout.value} onClick={() => updateConfig({ layout: layout.value })} badge={layout.badge} />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>} title="Content Management" description="Set the section heading, subheading, and supporting copy.">
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                  <input type="text" value={config.title} onChange={(e) => updateConfig({ title: e.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Subtitle</label>
                  <input type="text" value={config.subtitle} onChange={(e) => updateConfig({ subtitle: e.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
                </div>
                <div className="lg:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea value={config.description} onChange={(e) => updateConfig({ description: e.target.value })} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20" rows={4} />
                </div>
              </div>
            </SettingsCard>

            {formLayoutSupportsImage(config.layout) && (
              <SettingsCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>}
                title="Supporting Media"
                description="Choose artwork for your selected layout."
                action={<button type="button" onClick={() => setShowGalleryModal(true)} className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100">Choose Image</button>}
              >
                <div className="space-y-5">
                  {config.imageUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <img src={config.imageUrl} alt="Selected form media" className="h-24 w-32 object-cover" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => setShowGalleryModal(true)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Change Image</button>
                        <button type="button" onClick={() => updateConfig({ imageUrl: undefined })} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100">Remove Image</button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">No image selected. Click "Choose Image" to select artwork for your layout.</div>
                  )}
                </div>
              </SettingsCard>
            )}

            <SettingsCard
              icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
              title="Typography and Responsive Structure"
              description="Typography inherits from the global theme by default. Disable the toggle below to apply section-specific overrides."
              action={
                <ResponsiveViewportTabs
                  value={editorViewport}
                  onChange={(viewport) => {
                    setEditorViewport(viewport);
                    setPreviewViewport(viewport);
                  }}
                  scope="form-typography"
                />
              }
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Page Scroll Animation</h3>
                      <p className="text-xs text-slate-500">
                        Reveal the whole section when it enters the viewport.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={config.enableScrollReveal === true}
                        onChange={(event) => updateConfig({ enableScrollReveal: event.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                    </label>
                  </div>
                  {config.enableScrollReveal ? (
                    <div className="mt-4">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Reveal Animation Style
                      </label>
                      <select
                        value={config.scrollRevealAnimation || 'fade-up'}
                        onChange={(event) =>
                          updateConfig({
                            scrollRevealAnimation: event.target.value as SectionStyleConfig['scrollRevealAnimation'],
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                      >
                        <option value="fade">Fade</option>
                        <option value="fade-up">Fade Up</option>
                        <option value="slide-up">Slide Up</option>
                        <option value="soft-reveal">Soft Reveal</option>
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        {config.scrollRevealAnimation === 'fade' && 'Opacity only, minimal motion.'}
                        {config.scrollRevealAnimation === 'fade-up' && 'Soft lift with subtle fade.'}
                        {config.scrollRevealAnimation === 'slide-up' && 'Slightly stronger upward movement.'}
                        {(config.scrollRevealAnimation === 'soft-reveal' || !config.scrollRevealAnimation) && 'Blur-to-sharp premium entrance.'}
                      </p>
                    </div>
                  ) : null}
                </div>
                <ToggleRow
                  title="Use Global Styles"
                  description="When enabled, typography inherits from the global theme. Disable to set section-specific type styles."
                  checked={!(config.is_custom || false)}
                  onChange={(checked) => updateConfig({ is_custom: !checked })}
                />
                {!config.is_custom ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-800">Typography is inherited from the global theme. Disable the toggle above to edit section-specific font size, weight, and button styling for this form block.</div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <SectionTypographyControls value={config} onChange={updateConfig} showAdvancedControls viewport={editorViewport} />
                  </div>
                )}
              </div>
            </SettingsCard>
          </>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!config.form_id}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
              config.form_id
                ? 'bg-gradient-to-r from-violet-600 to-purple-700 text-white shadow-[0_18px_45px_rgba(109,40,217,0.28)] hover:-translate-y-0.5 hover:from-violet-700 hover:to-purple-800'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isNewSection ? 'Create Form Section' : 'Save Form Settings'}
          </button>
        </div>
      </form>

      {config.form_id && !showPreview ? <FloatingPreviewButton viewport="desktop" onClick={() => { setPreviewViewport('desktop'); setShowPreview(true); }} disabled={!selectedForm} /> : null}
      {showPreview ? (
        <PreviewModal title="Live Preview" description="Switch between desktop and mobile to check composition, readability, and field hierarchy." viewport={previewViewport} onViewportChange={setPreviewViewport} onClose={() => setShowPreview(false)} note={selectedForm ? 'Preview reflects your current form selection, layout, colors, and typography instantly.' : 'Select a form first to preview the section.'}>
          <DynamicForm
            configData={previewConfig}
            previewForm={previewForm}
            isPreview
            previewViewport={previewViewport}
            restaurantId={restaurantId}
          />
        </PreviewModal>
      ) : null}

      <ImageGalleryModal isOpen={showGalleryModal} onClose={() => setShowGalleryModal(false)} onSelect={(imageUrl) => updateConfig({ imageUrl })} restaurantId={restaurantId} title="Select Form Image" description="Choose artwork from your media library or upload a new image." />
    </>
  );
}
