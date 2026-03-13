'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import styles from './gallery-settings-form.module.css';
import { getCustomSectionMediaSupport } from '@/utils/custom-section-layout-utils';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { SectionAppearanceControls } from '@/components/admin/section-appearance-controls';
import {
  FloatingPreviewButton,
  ResponsiveViewportTabs,
  SettingsCard,
  SettingsHeader,
} from '@/components/admin/section-settings-primitives';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import {
  CUSTOM_SECTION_LAYOUT_DEFINITIONS,
  getCustomSectionLayoutDefinition,
} from '@/lib/custom-section/layouts';
import {
  getCustomSectionEditorSummary,
  getDefaultCustomSectionConfig,
  normalizeCustomSectionConfig,
} from '@/lib/custom-section/normalize';
import type { CustomSectionConfig, CustomSectionLayout } from '@/types/custom-section.types';
import {
  ButtonsEditorPanel,
  ColorStylePanel,
  ContentEditorPanel,
  ItemsEditorPanel,
  LayoutControlsPanel,
  MediaEditorPanel,
  type CustomSectionMediaTarget,
} from './custom-section-builder/editor-panels';
import { CustomSectionLayoutPicker } from './custom-section-builder/layout-picker';
import { CustomSectionPreviewModal } from './custom-section-builder/preview-modal';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';

interface CustomSectionSettingsFormProps {
  pageId?: string;
  templateId?: string | null;
  isNewSection?: boolean;
}

function SummaryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
      {label}
    </span>
  );
}

function applyMediaTarget(
  config: CustomSectionConfig,
  target: CustomSectionMediaTarget,
  url: string,
): CustomSectionConfig {
  if (target.type === 'item') {
    return {
      ...config,
      items: (config.items || []).map((item) =>
        item.id === target.itemId
          ? {
              ...item,
              image: url ? { url, alt: item.image?.alt || item.title || 'Item image' } : undefined,
            }
          : item,
      ),
    };
  }

  switch (target.slot) {
    case 'backgroundImage':
      return { ...config, backgroundImage: url };
    case 'secondaryImage':
      return {
        ...config,
        secondaryImage: url ? { url, alt: config.secondaryImage?.alt || 'Secondary image' } : undefined,
      };
    case 'fallbackImage':
      return {
        ...config,
        fallbackImage: url ? { url, alt: config.fallbackImage?.alt || 'Fallback image' } : undefined,
      };
    case 'videoUrl':
      return { ...config, videoUrl: url };
    case 'image':
    default:
      return {
        ...config,
        image: url ? { url, alt: config.image?.alt || 'Section image' } : undefined,
      };
  }
}

export default function CustomSectionSettingsForm({
  pageId,
  templateId,
  isNewSection = false,
}: CustomSectionSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || '';
  const restaurantName = searchParams?.get('restaurant_name') || '';
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [config, setConfig] = useState<CustomSectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<EditorViewport>('desktop');
  const [responsiveEditorViewport, setResponsiveEditorViewport] = useState<EditorViewport>('desktop');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<CustomSectionMediaTarget | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [imageFieldType, setImageFieldType] = useState<'image' | 'background'>('image');

  // Helper function to determine what media is needed for each layout
  // Now uses dynamic media support data from custom-section-layouts.json
  const getMediaRequirements = (layout: LayoutType) => {
    const requirements = {
      needsImage: false,
      needsVideo: false,
      needsBackgroundImage: false,
      imageLabel: 'Section Image',
      imageHint: 'Upload an image for this layout',
    };

    // Get media support from JSON configuration
    const mediaSupport = getCustomSectionMediaSupport(layout);

    if (mediaSupport) {
      requirements.needsImage = mediaSupport.image;
      requirements.needsVideo = mediaSupport.video;
      requirements.needsBackgroundImage = mediaSupport.backgroundImage;

      // Set appropriate labels based on media type
      if (mediaSupport.backgroundImage) {
        requirements.imageLabel = 'Background Image';
        requirements.imageHint = 'Background image for this layout';
      } else if (mediaSupport.video) {
        requirements.imageLabel = 'Video';
        requirements.imageHint = 'Video for this layout';
      } else if (mediaSupport.image) {
        requirements.imageLabel = 'Section Image';
        requirements.imageHint = 'Image for this layout';
      }
    }

    return requirements;
  };

  const mediaRequirements = getMediaRequirements(formData.layout || 'layout-1');

  // Fetch existing custom section data when editing

  useEffect(() => {
    const hydrate = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        if (isNewSection) {
          setConfig(getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults));
          return;
        }

        const params = new URLSearchParams();
        params.set('restaurant_id', restaurantId);
        if (pageId) {
          params.set('page_id', pageId);
        }
        if (templateId) {
          params.set('template_id', templateId);
        }

        const response = await fetch(`/api/custom-section-config?${params.toString()}`);
        const data = await response.json();

        if (data.success && data.data) {
          setConfig(normalizeCustomSectionConfig(data.data, sectionStyleDefaults));
        } else {
          setConfig(getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults));
        }
      } catch (error) {
        console.error('Error fetching custom section config:', error);
        setConfig(getDefaultCustomSectionConfig('layout-1', sectionStyleDefaults));
        setToast({ message: 'Failed to load custom section settings.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    hydrate();
  }, [isNewSection, pageId, restaurantId, sectionStyleDefaults, templateId]);

  const selectedLayout = config ? getCustomSectionLayoutDefinition(config.layout) : CUSTOM_SECTION_LAYOUT_DEFINITIONS[0];
  const summary = useMemo(
    () => (config ? getCustomSectionEditorSummary(config) : null),
    [config],
  );

  const updateConfig = (updates: Partial<CustomSectionConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleLayoutChange = (layout: CustomSectionLayout) => {
    setConfig((prev) =>
      prev ? normalizeCustomSectionConfig({ ...prev, layout }, sectionStyleDefaults) : prev,
    );
  };

  const handleOpenLibrary = (target: CustomSectionMediaTarget) => {
    setMediaTarget(target);
    setShowMediaLibrary(true);
  };

  const handleSelectMedia = (url: string) => {
    if (!mediaTarget) {
      return;
    }

    setConfig((prev) => (prev ? applyMediaTarget(prev, mediaTarget, url) : prev));
    setShowMediaLibrary(false);
    setMediaTarget(null);
  };

  const handleUploadMedia = async (target: CustomSectionMediaTarget, file: File) => {
    if (!restaurantId) {
      setToast({ message: 'Restaurant ID is required for uploads.', type: 'error' });
      return;
    }

    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();

      if (data.success && data.data?.file?.url) {
        setConfig((prev) => (prev ? applyMediaTarget(prev, target, data.data.file.url) : prev));
        setToast({ message: 'Media uploaded successfully.', type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to upload media.', type: 'error' });
      }
    } catch (error) {
      console.error('Error uploading custom section media:', error);
      setToast({ message: 'Failed to upload media.', type: 'error' });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!config || !restaurantId) {
      setToast({ message: 'Restaurant ID is required.', type: 'error' });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...config,
        restaurant_id: restaurantId,
        page_id: pageId || null,
        template_id: templateId || config.template_id || null,
        new_section: isNewSection,
      };

      const response = await fetch('/api/custom-section-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save custom section.');
      }

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
    } catch (error) {
      console.error('Error saving custom section:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to save custom section.',
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
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-15 4.5h15m-15 4.5h9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 16.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
            </svg>
          }
          title={isNewSection ? 'Add New Custom Section' : 'Custom Section Builder'}
          description="Layout-specific editing, media controls, responsive overrides, and a live preview workflow aligned with Hero Settings."
          meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
          action={
            <div className="flex flex-wrap gap-2">
              <SummaryChip label={`${CUSTOM_SECTION_LAYOUT_DEFINITIONS.length} layouts`} />
              <SummaryChip label={selectedLayout.badge} />
              {summary?.definition.supportsItems ? <SummaryChip label={`${summary.itemCount} content blocks`} /> : null}
            </div>
          }
        />

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 4.75h6.5v6.5h-6.5zm8 0h6.5v6.5h-6.5zm-8 8h6.5v6.5h-6.5zm8 8v-6.5h6.5v6.5z" />
            </svg>
          }
          title="Layout Configuration"
          description="Choose a layout, then tune layout-specific controls for desktop and mobile."
          action={
            <ResponsiveViewportTabs
              value={responsiveEditorViewport}
              onChange={(viewport) => {
                setResponsiveEditorViewport(viewport);
                setPreviewViewport(viewport);
              }}
              scope="custom-section-editor"
            />
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1.1fr,0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current Layout</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">{selectedLayout.name}</h3>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{selectedLayout.summary}</p>
              </div>
              <div className="flex flex-wrap content-start gap-2 lg:justify-end">
                <SummaryChip label={responsiveEditorViewport === 'mobile' ? 'Mobile editing' : 'Desktop editing'} />
                {selectedLayout.mediaSlots.length > 0 ? <SummaryChip label={`${selectedLayout.mediaSlots.length} media slot${selectedLayout.mediaSlots.length > 1 ? 's' : ''}`} /> : null}
                {selectedLayout.supportsItems ? <SummaryChip label="Repeated blocks enabled" /> : null}
                {config.enableScrollReveal ? <SummaryChip label={`Scroll reveal · ${config.scrollRevealAnimation || 'fade-up'}`} /> : null}
              </div>
            </div>

            <CustomSectionLayoutPicker
              layouts={CUSTOM_SECTION_LAYOUT_DEFINITIONS}
              selectedLayout={config.layout}
              onSelect={handleLayoutChange}
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12m-12 5.25h12m-12 5.25h12M3.75 6.75h.008v.008H3.75zm0 5.25h.008v.008H3.75zm0 5.25h.008v.008H3.75z" />
            </svg>
          }
          title="Content Configuration"
          description="Edit the main section messaging, CTAs, and repeated content blocks used by richer layouts."
        >
          <div className="space-y-6">
            <ContentEditorPanel config={config} onChange={updateConfig} />
            <ButtonsEditorPanel config={config} onChange={updateConfig} />
            {selectedLayout.supportsItems ? (
              <ItemsEditorPanel
                config={config}
                definition={selectedLayout}
                onChange={updateConfig}
                onOpenLibrary={handleOpenLibrary}
                onUpload={handleUploadMedia}
              />
            ) : null}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5h16.5m-16.5 9h16.5M6.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v10.5A2.25 2.25 0 0117.25 19.5H6.75A2.25 2.25 0 014.5 17.25V6.75A2.25 2.25 0 016.75 4.5z" />
            </svg>
          }
          title="Media and Layout Controls"
          description="Each layout exposes only the image, video, spacing, and structural controls relevant to that design."
        >
          <div className="space-y-6">
            <LayoutControlsPanel
              config={config}
              definition={selectedLayout}
              viewport={responsiveEditorViewport}
              onChange={updateConfig}
            />
            {selectedLayout.mediaSlots.length > 0 ? (
              <MediaEditorPanel
                config={config}
                definition={selectedLayout}
                onChange={updateConfig}
                onOpenLibrary={handleOpenLibrary}
                onUpload={handleUploadMedia}
              />
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                This layout does not require dedicated top-level media slots. Use the content and style panels to shape the section.
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6h9M6.75 10.5h10.5M9 15h6m-6.75 4.5h7.5A2.25 2.25 0 0018 17.25V6.75A2.25 2.25 0 0015.75 4.5h-7.5A2.25 2.25 0 006 6.75v10.5A2.25 2.25 0 008.25 19.5z" />
            </svg>
          }
          title="Typography and Responsive Structure"
          description="Use the same desktop/mobile editing model as Hero Settings for type, spacing, alignment, surface depth, and scroll reveal."
          action={
            <ResponsiveViewportTabs
              value={responsiveEditorViewport}
              onChange={(viewport) => {
                setResponsiveEditorViewport(viewport);
                setPreviewViewport(viewport);
              }}
              scope="custom-section-style"
            />
          }
        >
          <div className="space-y-8">
            <SectionTypographyControls
              value={config}
              onChange={(updates) => updateConfig({ ...updates, is_custom: true })}
              showAdvancedControls
              viewport={responsiveEditorViewport}
            />
            <SectionAppearanceControls
              value={config}
              onChange={(updates) => updateConfig({ ...updates, is_custom: true })}
              viewport={responsiveEditorViewport}
              widthLabel="Section Content Width"
              sectionLabel="custom section"
            />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18l-.813-2.096A4.5 4.5 0 005.904 13.187L3.808 12l2.096-.813A4.5 4.5 0 008.187 8.904L9 6.808l.813 2.096a4.5 4.5 0 002.717 2.717L14.626 12l-2.096.813a4.5 4.5 0 00-2.717 2.717zm6.687 0L16 17.25l-.5-1.346a2.25 2.25 0 00-1.154-1.154L13 14.25l1.346-.5a2.25 2.25 0 001.154-1.154L16 11.25l.5 1.346a2.25 2.25 0 001.154 1.154l1.346.5-1.346.5a2.25 2.25 0 00-1.154 1.154z" />
            </svg>
          }
          title="Colors and Styling"
          description="Control the section palette, button treatments, accents, and overlay colors without cluttering the editor."
        >
          <ColorStylePanel config={config} onChange={updateConfig} />
        </SettingsCard>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Save Custom Section</h2>
              <p className="text-sm text-slate-600">
                Your layout, responsive settings, media selections, and preview state are ready to publish as a draft.
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
                <>
                  <span>Save Custom Section</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {!showPreview ? (
        <FloatingPreviewButton
          viewport={responsiveEditorViewport}
          onClick={() => {
            setPreviewViewport(responsiveEditorViewport);
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

      <ImageGalleryModal
        isOpen={showMediaLibrary}
        onClose={() => {
          setShowMediaLibrary(false);
          setMediaTarget(null);
        }}
        onSelect={handleSelectMedia}
        restaurantId={restaurantId}
        title={mediaTarget?.mediaKind === 'video' ? 'Select Video' : 'Select Media'}
        description="Choose from your media library or upload a new asset for this layout."
        mediaKind={mediaTarget?.mediaKind || 'image'}
      />

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
