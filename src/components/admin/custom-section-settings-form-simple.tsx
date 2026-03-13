'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'; // ChangeEvent used inside MediaField
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';
import {
  FloatingPreviewButton,
  SettingsCard,
  SettingsHeader,
  ToggleRow,
} from '@/components/admin/section-settings-primitives';
import {
  CUSTOM_SECTION_LAYOUT_DEFINITIONS,
  getCustomSectionLayoutDefinition,
} from '@/lib/custom-section/layouts';
import {
  getCustomSectionEditorSummary,
  getDefaultCustomSectionConfig,
  normalizeCustomSectionConfig,
} from '@/lib/custom-section/normalize';
import type {
  CustomSectionAnimationSpeed,
  CustomSectionConfig,
  CustomSectionLayout,
} from '@/types/custom-section.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { CustomSectionLayoutPicker } from './custom-section-builder/layout-picker';
import { CustomSectionPreviewModal } from './custom-section-builder/preview-modal';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { SectionStyleConfig } from '@/types/section-style.types';

type MediaSlot =
  | 'image'
  | 'backgroundImage'
  | 'secondaryImage'
  | 'fallbackImage'
  | 'videoUrl';

interface LayoutSchema {
  id: CustomSectionLayout;
  supportsItems: boolean;
  mediaSlots: MediaSlot[];
}

function buildLayoutSchema(
  layout: ReturnType<typeof getCustomSectionLayoutDefinition>,
): LayoutSchema {
  return {
    id: layout.value,
    supportsItems: layout.supportsItems ?? false,
    mediaSlots: layout.mediaSlots as MediaSlot[],
  };
}

function Label({ title, hint }: { title: string; hint?: string }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      <span>{title}</span>
      {hint ? (
        <span className="mt-0.5 block text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900',
        'transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900',
        'transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
        props.className ?? '',
      ].join(' ')}
    />
  );
}

function SummaryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
      {label}
    </span>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3.5">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs leading-relaxed text-violet-700">{children}</p>
    </div>
  );
}

// Single-button media field — one "Add Image" button opens a modal with gallery + desktop upload
function MediaField({
  label,
  hint,
  value,
  restaurantId,
  onUpload,
  onSelect,
  onClear,
}: {
  label: string;
  hint?: string;
  value?: string;
  restaurantId: string;
  onUpload: (file: File) => void;
  onSelect: (url: string) => void;
  onClear: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<
    Array<{ id: string; url: string; name: string }>
  >([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const openModal = async () => {
    setModalOpen(true);
    setGalleryLoading(true);
    try {
      const res = await fetch(
        `/api/media?restaurant_id=${encodeURIComponent(restaurantId)}`,
      );
      const data = await res.json();
      if (data.success) {
        const imgs = (data.data || [])
          .filter((m: any) =>
            (m.file?.mimeType || m.type || '').startsWith('image/'),
          )
          .map((m: any) => ({
            id: m.id,
            url: m.file?.url || '',
            name: m.file?.name || 'Image',
          }));
        setGalleryImages(imgs);
      }
    } catch {
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('restaurant_id', restaurantId);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.success && data.data?.file?.url) {
        onUpload(file);
        const newImg = {
          id: data.data.file.id || Date.now().toString(),
          url: data.data.file.url,
          name: data.data.file.name || file.name,
        };
        setGalleryImages((prev) => [newImg, ...prev]);
        onSelect(data.data.file.url);
        setModalOpen(false);
      }
    } catch {
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Label title={label} hint={hint} />

      {/* Current selection preview */}
      {value ? (
        <div className="relative h-40 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-100">
          <img src={value} alt={label} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow transition-colors hover:bg-rose-50 hover:text-rose-600"
            title="Remove image"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {/* Change button overlay */}
          <button
            type="button"
            onClick={openModal}
            className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow transition-colors hover:bg-white"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
              />
            </svg>
            Change
          </button>
        </div>
      ) : (
        /* Single add button when no image selected */
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          Add Image
        </button>
      )}

      {/* Popup modal */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Add Image
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {label} — upload from your device or pick from library
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Upload from desktop button */}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus-within:ring-2 focus-within:ring-violet-500/30">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={handleFileChange}
                  />
                  {uploading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      Upload
                    </>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
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

            {/* Gallery grid */}
            <div className="max-h-[420px] overflow-y-auto p-5">
              {galleryLoading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                </div>
              ) : galleryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <svg
                      className="h-8 w-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    No images in library
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Upload an image from your device using the button above.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {galleryImages.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        onSelect(img.url);
                        setModalOpen(false);
                      }}
                      className="group relative aspect-square overflow-hidden rounded-[14px] border-2 border-transparent bg-slate-100 transition-all hover:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <img
                        src={img.url}
                        alt={img.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/10 group-hover:opacity-100">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function applyMedia(
  config: CustomSectionConfig,
  slot: MediaSlot,
  url: string,
): CustomSectionConfig {
  switch (slot) {
    case 'backgroundImage':
      return { ...config, backgroundImage: url };
    case 'secondaryImage':
      return {
        ...config,
        secondaryImage: url
          ? { url, alt: config.secondaryImage?.alt ?? 'Secondary image' }
          : undefined,
      };
    case 'fallbackImage':
      return {
        ...config,
        fallbackImage: url
          ? { url, alt: config.fallbackImage?.alt ?? 'Fallback image' }
          : undefined,
      };
    case 'videoUrl':
      return { ...config, videoUrl: url };
    default:
      return {
        ...config,
        image: url
          ? { url, alt: config.image?.alt ?? 'Section image' }
          : undefined,
      };
  }
}

function getSlotSrc(config: CustomSectionConfig, slot: MediaSlot): string {
  switch (slot) {
    case 'backgroundImage':
      return config.backgroundImage ?? '';
    case 'secondaryImage':
      return config.secondaryImage?.url ?? '';
    case 'fallbackImage':
      return config.fallbackImage?.url ?? '';
    case 'videoUrl':
      return config.videoUrl ?? '';
    default:
      return config.image?.url ?? '';
  }
}

function getSlotLabel(slot: MediaSlot): string {
  switch (slot) {
    case 'backgroundImage':
      return 'Background Image';
    case 'secondaryImage':
      return 'Secondary Image';
    case 'fallbackImage':
      return 'Fallback Poster';
    case 'videoUrl':
      return 'Video Source';
    default:
      return 'Primary Image';
  }
}

function getSlotHint(slot: MediaSlot): string {
  switch (slot) {
    case 'backgroundImage':
      return 'Used behind the content or overlay.';
    case 'secondaryImage':
      return 'Supporting second image panel.';
    case 'fallbackImage':
      return 'Shown when video cannot autoplay.';
    case 'videoUrl':
      return 'Upload or paste an MP4/WebM source.';
    default:
      return 'Upload or select the primary image for this layout.';
  }
}

interface CustomSectionSettingsFormProps {
  pageId?: string;
  templateId?: string | null;
  isNewSection?: boolean;
}

export default function CustomSectionSettingsForm({
  pageId,
  templateId,
  isNewSection = false,
}: CustomSectionSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') ?? '';
  const restaurantName = searchParams?.get('restaurant_name') ?? '';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [config, setConfig] = useState<CustomSectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<EditorViewport>('desktop');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (isNewSection) {
          setConfig(
            getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults),
          );
          return;
        }
        const params = new URLSearchParams();
        params.set('restaurant_id', restaurantId);
        if (pageId) params.set('page_id', pageId);
        if (templateId) params.set('template_id', templateId);
        const res = await fetch(
          `/api/custom-section-config?${params.toString()}`,
        );
        const data = await res.json();
        if (data.success && data.data) {
          const normalized = normalizeCustomSectionConfig(
            data.data,
            sectionStyleDefaults,
          );
          setConfig(normalized);
        } else {
          setConfig(
            getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults),
          );
        }
      } catch (err) {
        console.error('Error fetching custom section config:', err);
        setConfig(
          getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults),
        );
        setToast({
          message: 'Failed to load custom section settings.',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [isNewSection, pageId, restaurantId, sectionStyleDefaults, templateId]);

  const selectedLayout = config
    ? getCustomSectionLayoutDefinition(config.layout)
    : CUSTOM_SECTION_LAYOUT_DEFINITIONS[0];

  const layoutSchema = useMemo(
    () => buildLayoutSchema(selectedLayout),
    [selectedLayout],
  );

  const summary = useMemo(
    () => (config ? getCustomSectionEditorSummary(config) : null),
    [config],
  );

  const updateConfig = (updates: Partial<CustomSectionConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleLayoutChange = (layout: CustomSectionLayout) => {
    setConfig((prev) =>
      prev
        ? normalizeCustomSectionConfig(
            { ...prev, layout },
            sectionStyleDefaults,
          )
        : prev,
    );
  };

  const handleGlobalStylesToggle = (value: boolean) => {
    updateConfig({ is_custom: !value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config || !restaurantId) {
      setToast({ message: 'Restaurant ID is required.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const sanitized: Record<string, unknown> = { ...config };
      const stripKeys = [
        'paddingTop',
        'paddingBottom',
        'minHeight',
        'contentMaxWidth',
        'sectionPaddingY',
        'sectionPaddingX',
        'sectionMaxWidth',
        'layoutSettings',
        'responsive',
      ];
      for (const key of stripKeys) {
        delete sanitized[key];
      }
      const payload = {
        ...sanitized,
        restaurant_id: restaurantId,
        page_id: pageId ?? null,
        template_id: templateId ?? config.template_id ?? null,
        new_section: isNewSection,
        is_custom: config.is_custom === true,
      };
      const res = await fetch('/api/custom-section-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error ?? 'Failed to save custom section.');
      setToast({
        message: isNewSection
          ? 'Custom section created successfully.'
          : 'Custom section updated successfully.',
        type: 'success',
      });
      setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        router.replace(`/admin/page-settings?${params.toString()}`);
      }, 900);
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : 'Failed to save custom section.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!restaurantId) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
        Restaurant ID is required to configure a custom section.
      </div>
    );
  }

  if (loading || !config) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          Loading custom section builder...
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8 pb-28">
        <SettingsHeader
          icon={
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 7.5h15m-15 4.5h15m-15 4.5h9"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.75 16.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
              />
            </svg>
          }
          title={
            isNewSection ? 'Add New Custom Section' : 'Custom Section Builder'
          }
          description="Choose a layout template, edit your content, and publish. Layout and spacing are managed by Global CSS."
          meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
          action={
            <div className="flex flex-wrap gap-2">
              <SummaryChip
                label={`${CUSTOM_SECTION_LAYOUT_DEFINITIONS.length} layouts`}
              />
              <SummaryChip label={selectedLayout.badge} />
              {summary?.definition.supportsItems ? (
                <SummaryChip label={`${summary.itemCount} content blocks`} />
              ) : null}
            </div>
          }
        />

        {/* SECTION 1: Layout Configuration — predefined templates only */}
        <SettingsCard
          icon={
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
                d="M4.75 4.75h6.5v6.5h-6.5zm8 0h6.5v6.5h-6.5zm-8 8h6.5v6.5h-6.5zm8 8v-6.5h6.5v6.5z"
              />
            </svg>
          }
          title="Layout Configuration"
          description="Select a predefined layout template. Container width, section spacing, and grid are controlled by Global CSS."
        >
          <div className="space-y-6">
            <div className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1.1fr,0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Current Layout
                </p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                  {selectedLayout.name}
                </h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {selectedLayout.summary}
                </p>
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                {layoutSchema.mediaSlots.length > 0 ? (
                  <SummaryChip
                    label={`${layoutSchema.mediaSlots.length} media slot${layoutSchema.mediaSlots.length > 1 ? 's' : ''}`}
                  />
                ) : null}
                {layoutSchema.supportsItems ? (
                  <SummaryChip label="Repeated blocks enabled" />
                ) : null}
              </div>
            </div>

            <CustomSectionLayoutPicker
              layouts={CUSTOM_SECTION_LAYOUT_DEFINITIONS}
              selectedLayout={config.layout}
              onSelect={handleLayoutChange}
            />

            <InfoBanner>
              Layout structure, container width, section spacing, and responsive
              grid are controlled by Global CSS design tokens. Selecting a
              layout applies a predefined template — you cannot modify its
              spacing, padding, or margins here.
            </InfoBanner>
          </div>
        </SettingsCard>

        {/* SECTION 2: Content — Title, Subtitle, Paragraph, Image only */}
        <SettingsCard
          icon={
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
                d="M8.25 6.75h12m-12 5.25h12m-12 5.25h12M3.75 6.75h.008v.008H3.75zm0 5.25h.008v.008H3.75zm0 5.25h.008v.008H3.75z"
              />
            </svg>
          }
          title="Content"
        >
          <div className="space-y-6">
            {layoutSchema.supportsItems ? (
              /* Item-based layouts: Zigzag, Grid, Carousel, etc. — each block has its own content + image */
              <div className="space-y-4">
                {(config.items || []).map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Block {index + 1}
                      </h3>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[1fr,160px]">
                      {/* Text fields */}
                      <div className="space-y-3">
                        <div>
                          <Label title="Title" />
                          <TextInput
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...(config.items || [])];
                              newItems[index] = {
                                ...item,
                                title: e.target.value,
                              };
                              updateConfig({ items: newItems });
                            }}
                          />
                        </div>
                        <div>
                          <Label title="Description" />
                          <TextArea
                            rows={3}
                            value={item.description ?? ''}
                            onChange={(e) => {
                              const newItems = [...(config.items || [])];
                              newItems[index] = {
                                ...item,
                                description: e.target.value,
                              };
                              updateConfig({ items: newItems });
                            }}
                          />
                        </div>
                      </div>
                      {/* Image */}
                      <div>
                        <Label title="Image" />
                        <MediaField
                          label={`Block ${index + 1} Image`}
                          value={item.image?.url ?? ''}
                          restaurantId={restaurantId}
                          onUpload={() => {}}
                          onSelect={(url) => {
                            const newItems = [...(config.items || [])];
                            newItems[index] = {
                              ...item,
                              image: url
                                ? {
                                    url,
                                    alt: item.title || `Block ${index + 1}`,
                                  }
                                : undefined,
                            };
                            updateConfig({ items: newItems });
                          }}
                          onClear={() => {
                            const newItems = [...(config.items || [])];
                            newItems[index] = { ...item, image: undefined };
                            updateConfig({ items: newItems });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Standard layouts: single Title, Subtitle, Paragraph, Image */
              <>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                    <div>
                      <Label title="Title" />
                      <TextInput
                        value={config.headline}
                        onChange={(e) =>
                          updateConfig({ headline: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label title="Subtitle" />
                      <TextInput
                        value={config.subheadline ?? ''}
                        onChange={(e) =>
                          updateConfig({ subheadline: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                    <Label title="Content" />
                    <TextArea
                      rows={8}
                      value={config.description ?? ''}
                      onChange={(e) =>
                        updateConfig({ description: e.target.value })
                      }
                    />
                  </div>
                </div>

                {layoutSchema.mediaSlots.length > 0 ? (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {layoutSchema.mediaSlots.map((slot) => (
                      <div
                        key={slot}
                        className="rounded-[24px] border border-slate-200 bg-white p-5"
                      >
                        <MediaField
                          label={getSlotLabel(slot)}
                          value={getSlotSrc(config, slot)}
                          restaurantId={restaurantId}
                          onUpload={() => {}}
                          onSelect={(url) =>
                            setConfig((prev) =>
                              prev ? applyMedia(prev, slot, url) : prev,
                            )
                          }
                          onClear={() =>
                            setConfig((prev) =>
                              prev ? applyMedia(prev, slot, '') : prev,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
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
                d="M7.5 6h9M6.75 10.5h10.5M9 15h6m-6.75 4.5h7.5A2.25 2.25 0 0018 17.25V6.75A2.25 2.25 0 0015.75 4.5h-7.5A2.25 2.25 0 006 6.75v10.5A2.25 2.25 0 008.25 19.5z"
              />
            </svg>
          }
          title="Typography and Responsive Structure"
          description="Typography inherits from the global theme by default. Responsive structure stays aligned with Global CSS, and section reveal animation is configured here."
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Page Scroll Animation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reveal the whole custom section when it enters the viewport.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={config.enableScrollReveal === true}
                    onChange={(event) => {
                      const enabled = event.target.checked;
                      const preset =
                        config.scrollRevealAnimation ||
                        config.animation?.preset ||
                        'fade-up';
                      updateConfig({
                        enableScrollReveal: enabled,
                        scrollRevealAnimation: preset,
                        animation: {
                          ...(config.animation || {}),
                          enabled,
                          preset,
                        },
                      });
                    }}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                </label>
              </div>
              {config.enableScrollReveal ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Reveal Animation Style
                    </label>
                    <select
                      value={config.scrollRevealAnimation || 'fade-up'}
                      onChange={(event) => {
                        const preset =
                          event.target
                            .value as SectionStyleConfig['scrollRevealAnimation'];
                        updateConfig({
                          scrollRevealAnimation: preset,
                          animation: {
                            ...(config.animation || {}),
                            enabled: true,
                            preset,
                          },
                        });
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      <option value="fade">Fade</option>
                      <option value="fade-up">Fade Up</option>
                      <option value="slide-up">Slide Up</option>
                      <option value="soft-reveal">Soft Reveal</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      {config.scrollRevealAnimation === 'fade' &&
                        'Opacity only, minimal motion.'}
                      {config.scrollRevealAnimation === 'fade-up' &&
                        'Soft lift with subtle fade.'}
                      {config.scrollRevealAnimation === 'slide-up' &&
                        'Slightly stronger upward movement.'}
                      {(config.scrollRevealAnimation === 'soft-reveal' ||
                        !config.scrollRevealAnimation) &&
                        'Blur-to-sharp premium entrance.'}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Animation Speed
                    </label>
                    <select
                      value={config.animation?.speed || 'normal'}
                      onChange={(event) =>
                        updateConfig({
                          animation: {
                            ...(config.animation || {}),
                            enabled: true,
                            preset:
                              config.scrollRevealAnimation ||
                              config.animation?.preset ||
                              'fade-up',
                            speed:
                              event.target.value as CustomSectionAnimationSpeed,
                          },
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                      <option value="fast">Fast</option>
                      <option value="normal">Normal</option>
                      <option value="slow">Slow</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      {config.animation?.speed === 'fast' &&
                        'Quick, lightweight reveal for denser pages.'}
                      {(config.animation?.speed === 'normal' ||
                        !config.animation?.speed) &&
                        'Balanced entrance timing for most sections.'}
                      {config.animation?.speed === 'slow' &&
                        'Longer reveal for more cinematic hero-style sections.'}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <ToggleRow
              title="Use Global Styles"
              description="When enabled, typography inherits from the global theme. Disable to set section-specific type styles."
              checked={config.is_custom !== true}
              onChange={handleGlobalStylesToggle}
            />
            {config.is_custom ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <SectionTypographyControls
                  value={config}
                  onChange={updateConfig}
                  showAdvancedControls
                />
              </div>
            ) : (
              <InfoBanner>
                Typography is inherited from the Global CSS theme. To override
                font styles for this section only, disable the toggle above.
              </InfoBanner>
            )}
          </div>
        </SettingsCard>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Save Custom Section
              </h2>
              <p className="text-sm text-slate-600">
                Layout, content, and media are ready to publish as a draft.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-w-[260px] items-center justify-center gap-3 rounded-full bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(109,40,217,0.28)] transition-all hover:-translate-y-0.5 hover:from-violet-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <span>Save Custom Section</span>
              )}
            </button>
          </div>
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
        <CustomSectionPreviewModal
          config={config}
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setShowPreview(false)}
          restaurantId={restaurantId}
        />
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
