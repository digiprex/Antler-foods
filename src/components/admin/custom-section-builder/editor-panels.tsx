'use client';

import type {
  ChangeEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import type { EditorViewport } from '@/components/admin/section-settings-primitives';
import type {
  CustomSectionConfig,
  CustomSectionContentAlign,
  CustomSectionItem,
  CustomSectionLayoutSettings,
  CustomSectionResponsiveSettings,
  CustomSectionStyleSettings,
} from '@/types/custom-section.types';
import type {
  CustomSectionFieldKey,
  CustomSectionLayoutDefinition,
  CustomSectionMediaSlot,
} from '@/lib/custom-section/layouts';
import { getCustomSectionGapPlaceholder } from '@/lib/custom-section/spacing';

export type CustomSectionMediaTarget =
  | { type: 'slot'; slot: CustomSectionMediaSlot; mediaKind: 'image' | 'video' }
  | { type: 'item'; itemId: string; mediaKind: 'image' };

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

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${props.className || ''}`}
    />
  );
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${props.className || ''}`}
    />
  );
}

function SegmentedControl<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PlaceholderMedia({
  label,
  accentColor,
}: {
  label: string;
  accentColor: string;
}) {
  return (
    <div
      className="flex h-40 items-end rounded-[24px] border border-slate-200 p-4"
      style={{
        background: `linear-gradient(135deg, ${accentColor}20, rgba(248,250,252,0.96))`,
      }}
    >
      <div className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
        {label}
      </div>
    </div>
  );
}

function MediaPreview({
  src,
  alt,
  label,
  accentColor,
  isVideo,
}: {
  src?: string;
  alt: string;
  label: string;
  accentColor: string;
  isVideo?: boolean;
}) {
  if (!src) {
    return <PlaceholderMedia label={label} accentColor={accentColor} />;
  }

  if (isVideo) {
    return (
      <div className="relative h-40 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
        <video
          src={src}
          className="h-full w-full object-cover opacity-80"
          muted
          playsInline
          preload="metadata"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
        <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] text-white">
            ▶
          </span>
          {label}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent p-4">
        <span className="inline-flex rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg">
          {label}
        </span>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label title={label} hint={hint} />
      <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-2.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent p-0"
        />
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function fieldTitle(field: CustomSectionFieldKey) {
  switch (field) {
    case 'contentAlignment':
      return 'Content Alignment';
    case 'verticalAlignment':
      return 'Vertical Alignment';
    case 'mediaRatio':
      return 'Media Ratio';
    case 'contentWidth':
      return 'Content Width';
    case 'contentGap':
      return 'Content Gap';
    case 'cardSpacing':
      return 'Card Spacing';
    case 'cardColumns':
      return 'Card Columns';
    case 'stackOnMobile':
      return 'Stack On Mobile';
    case 'mediaShape':
      return 'Media Shape';
    case 'buttonStyle':
      return 'Button Style';
    case 'hoverEffect':
      return 'Hover Effect';
    case 'transitionStyle':
      return 'Transition Style';
    case 'autoplay':
      return 'Autoplay';
    case 'autoplayInterval':
      return 'Autoplay Interval';
    case 'overlayOpacity':
      return 'Overlay Opacity';
    default:
      return field;
  }
}

function updateResponsive<T extends keyof CustomSectionResponsiveSettings>(
  responsive: CustomSectionResponsiveSettings | undefined,
  key: T,
  value: CustomSectionResponsiveSettings[T],
) {
  return {
    ...(responsive || {}),
    [key]: value,
  };
}

function updateLayoutSettings<T extends keyof CustomSectionLayoutSettings>(
  settings: CustomSectionLayoutSettings | undefined,
  key: T,
  value: CustomSectionLayoutSettings[T],
) {
  return {
    ...(settings || {}),
    [key]: value,
  };
}

function slotLabel(slot: CustomSectionMediaSlot) {
  switch (slot) {
    case 'backgroundImage':
      return 'Background Image';
    case 'secondaryImage':
      return 'Secondary Image';
    case 'fallbackImage':
      return 'Fallback Poster';
    case 'videoUrl':
      return 'Video Source';
    case 'image':
    default:
      return 'Primary Image';
  }
}

function slotHint(slot: CustomSectionMediaSlot) {
  switch (slot) {
    case 'backgroundImage':
      return 'Used behind the content surface or overlay layout.';
    case 'secondaryImage':
      return 'Used by layouts that show a supporting second media panel.';
    case 'fallbackImage':
      return 'Shown when the video cannot autoplay or before it loads.';
    case 'videoUrl':
      return 'Upload or paste an MP4/WebM video source.';
    case 'image':
    default:
      return 'Upload a lead image for the selected layout.';
  }
}

function getSlotValue(
  config: CustomSectionConfig,
  slot: CustomSectionMediaSlot,
) {
  switch (slot) {
    case 'backgroundImage':
      return config.backgroundImage || '';
    case 'secondaryImage':
      return config.secondaryImage?.url || '';
    case 'fallbackImage':
      return config.fallbackImage?.url || '';
    case 'videoUrl':
      return config.videoUrl || '';
    case 'image':
    default:
      return config.image?.url || '';
  }
}

export function ContentEditorPanel({
  config,
  onChange,
}: {
  config: CustomSectionConfig;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label title="Eyebrow" hint="Short lead-in above the headline" />
            <TextInput
              value={config.eyebrow || ''}
              onChange={(event) => onChange({ eyebrow: event.target.value })}
              placeholder="Custom Section"
            />
          </div>
        </div>
        <div>
          <Label title="Headline" hint="Primary section heading" />
          <TextInput
            value={config.headline}
            onChange={(event) => onChange({ headline: event.target.value })}
            placeholder="Craft a story-driven section"
          />
        </div>
        <div>
          <Label title="Subheadline" hint="Secondary heading line" />
          <TextInput
            value={config.subheadline || ''}
            onChange={(event) => onChange({ subheadline: event.target.value })}
            placeholder="Flexible layout builder"
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <Label
          title="Description"
          hint="Supportive body copy used across the layout"
        />
        <TextArea
          rows={8}
          value={config.description || ''}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder="Describe the promotion, story, service, or highlight for this section."
        />
      </div>
    </div>
  );
}

export function ButtonsEditorPanel({
  config,
  onChange,
}: {
  config: CustomSectionConfig;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
}) {
  const updateButton = (
    key: 'primaryButton' | 'secondaryButton',
    field: 'label' | 'href' | 'variant',
    value: string,
  ) => {
    const current = config[key] || {
      label: '',
      href: '',
      variant: key === 'primaryButton' ? 'primary' : 'outline',
    };
    onChange({
      [key]: {
        ...current,
        [field]: value,
      },
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {(['primaryButton', 'secondaryButton'] as const).map((key) => (
        <div
          key={key}
          className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {key === 'primaryButton' ? 'Primary CTA' : 'Secondary CTA'}
              </h3>
              <p className="text-xs text-slate-500">
                {key === 'primaryButton'
                  ? 'Main action button for the section.'
                  : 'Optional secondary action for softer navigation.'}
              </p>
            </div>
            <SegmentedControl
              value={
                (config[key]?.variant ||
                  (key === 'primaryButton' ? 'primary' : 'outline')) as string
              }
              onChange={(value) => updateButton(key, 'variant', value)}
              options={[
                {
                  value: key === 'primaryButton' ? 'primary' : 'secondary',
                  label: 'Solid',
                },
                { value: 'outline', label: 'Outline' },
                { value: 'ghost', label: 'Ghost' },
              ]}
            />
          </div>
          <div className="space-y-4">
            <div>
              <Label title="Label" />
              <TextInput
                value={config[key]?.label || ''}
                onChange={(event) =>
                  updateButton(key, 'label', event.target.value)
                }
                placeholder={
                  key === 'primaryButton' ? 'Explore More' : 'Reserve Table'
                }
              />
            </div>
            <div>
              <Label
                title="Link"
                hint="Use a full URL or internal path such as /menu"
              />
              <TextInput
                value={config[key]?.href || ''}
                onChange={(event) =>
                  updateButton(key, 'href', event.target.value)
                }
                placeholder={key === 'primaryButton' ? '/menu' : '/contact'}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MediaEditorPanel({
  config,
  definition,
  onChange,
  onOpenLibrary,
  onUpload,
}: {
  config: CustomSectionConfig;
  definition: CustomSectionLayoutDefinition;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
  onOpenLibrary: (target: CustomSectionMediaTarget) => void;
  onUpload: (target: CustomSectionMediaTarget, file: File) => void;
}) {
  const accentColor = config.styleConfig?.accentColor || '#7c3aed';

  const updateSlot = (slot: CustomSectionMediaSlot, value: string) => {
    switch (slot) {
      case 'backgroundImage':
        onChange({ backgroundImage: value });
        return;
      case 'secondaryImage':
        onChange({
          secondaryImage: value
            ? {
                url: value,
                alt: config.secondaryImage?.alt || 'Secondary image',
              }
            : undefined,
        });
        return;
      case 'fallbackImage':
        onChange({
          fallbackImage: value
            ? { url: value, alt: config.fallbackImage?.alt || 'Fallback image' }
            : undefined,
        });
        return;
      case 'videoUrl':
        onChange({ videoUrl: value });
        return;
      case 'image':
      default:
        onChange({
          image: value
            ? { url: value, alt: config.image?.alt || 'Section image' }
            : undefined,
        });
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {definition.mediaSlots.map((slot) => {
        const value = getSlotValue(config, slot);
        const isVideo = slot === 'videoUrl';
        const target: CustomSectionMediaTarget = {
          type: 'slot',
          slot,
          mediaKind: isVideo ? 'video' : 'image',
        };

        return (
          <div
            key={slot}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {slotLabel(slot)}
              </h3>
              <p className="text-xs text-slate-500">{slotHint(slot)}</p>
            </div>
            <div className="space-y-4">
              <MediaPreview
                src={value}
                alt={slotLabel(slot)}
                label={slotLabel(slot)}
                accentColor={accentColor}
                isVideo={isVideo}
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onOpenLibrary(target)}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                >
                  Choose from library
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
                  <input
                    type="file"
                    accept={isVideo ? 'video/*' : 'image/*'}
                    className="hidden"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        onUpload(target, file);
                        event.target.value = '';
                      }
                    }}
                  />
                  Upload {isVideo ? 'video' : 'image'}
                </label>
                <button
                  type="button"
                  onClick={() => updateSlot(slot, '')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  Remove
                </button>
              </div>
              <div>
                <Label
                  title={isVideo ? 'Video URL' : 'Image URL'}
                  hint="You can also paste a direct media URL manually."
                />
                <TextInput
                  value={value}
                  onChange={(event) => updateSlot(slot, event.target.value)}
                  placeholder={
                    isVideo
                      ? 'https://example.com/video.mp4'
                      : 'https://images.example.com/feature.jpg'
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ItemsEditorPanel({
  config,
  definition,
  onChange,
  onOpenLibrary,
  onUpload,
}: {
  config: CustomSectionConfig;
  definition: CustomSectionLayoutDefinition;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
  onOpenLibrary: (target: CustomSectionMediaTarget) => void;
  onUpload: (target: CustomSectionMediaTarget, file: File) => void;
}) {
  if (!definition.supportsItems) {
    return null;
  }

  const items = config.items || [];
  const accentColor = config.styleConfig?.accentColor || '#7c3aed';

  const updateItem = (itemId: string, updates: Partial<CustomSectionItem>) => {
    onChange({
      items: items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    });
  };

  const removeItem = (itemId: string) => {
    onChange({
      items: items.filter((item) => item.id !== itemId),
    });
  };

  const addItem = () => {
    onChange({
      items: [
        ...items,
        {
          id: `${config.layout}-item-${Date.now()}`,
          badge: 'New',
          title: 'New item',
          description: 'Describe this item.',
        },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Repeated Content Blocks
          </h3>
          <p className="text-xs text-slate-500">
            This layout uses repeated cards, slides, or story blocks.
          </p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
        >
          Add item
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((item, index) => {
          const imageTarget: CustomSectionMediaTarget = {
            type: 'item',
            itemId: item.id,
            mediaKind: 'image',
          };

          return (
            <div
              key={item.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Item {index + 1}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Used by {definition.name.toLowerCase()}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-4">
                <MediaPreview
                  src={item.image?.url}
                  alt={item.title}
                  label={item.title || `Item ${index + 1}`}
                  accentColor={accentColor}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenLibrary(imageTarget)}
                    className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                  >
                    Choose image
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          onUpload(imageTarget, file);
                          event.target.value = '';
                        }
                      }}
                    />
                    Upload image
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label title="Badge" />
                    <TextInput
                      value={item.badge || ''}
                      onChange={(event) =>
                        updateItem(item.id, { badge: event.target.value })
                      }
                      placeholder="Signature"
                    />
                  </div>
                  <div>
                    <Label title="Eyebrow" />
                    <TextInput
                      value={item.eyebrow || ''}
                      onChange={(event) =>
                        updateItem(item.id, { eyebrow: event.target.value })
                      }
                      placeholder="Chef's note"
                    />
                  </div>
                </div>
                <div>
                  <Label title="Title" />
                  <TextInput
                    value={item.title}
                    onChange={(event) =>
                      updateItem(item.id, { title: event.target.value })
                    }
                    placeholder="Seasonal tasting menu"
                  />
                </div>
                <div>
                  <Label title="Description" />
                  <TextArea
                    rows={4}
                    value={item.description || ''}
                    onChange={(event) =>
                      updateItem(item.id, { description: event.target.value })
                    }
                    placeholder="Describe this item."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label title="Stat Value" />
                    <TextInput
                      value={item.statValue || ''}
                      onChange={(event) =>
                        updateItem(item.id, { statValue: event.target.value })
                      }
                      placeholder="120+"
                    />
                  </div>
                  <div>
                    <Label title="Stat Label" />
                    <TextInput
                      value={item.statLabel || ''}
                      onChange={(event) =>
                        updateItem(item.id, { statLabel: event.target.value })
                      }
                      placeholder="Guests"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label title="CTA Label" />
                    <TextInput
                      value={item.ctaLabel || ''}
                      onChange={(event) =>
                        updateItem(item.id, { ctaLabel: event.target.value })
                      }
                      placeholder="Learn more"
                    />
                  </div>
                  <div>
                    <Label title="CTA Link" />
                    <TextInput
                      value={item.ctaHref || ''}
                      onChange={(event) =>
                        updateItem(item.id, { ctaHref: event.target.value })
                      }
                      placeholder="/events"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LayoutControlsPanel({
  config,
  definition,
  viewport,
  onChange,
}: {
  config: CustomSectionConfig;
  definition: CustomSectionLayoutDefinition;
  viewport: EditorViewport;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
}) {
  const isMobile = viewport === 'mobile';

  const getAlignmentValue = () =>
    (isMobile
      ? config.responsive?.mobileContentAlignment ||
        config.layoutSettings?.contentAlignment ||
        'left'
      : config.layoutSettings?.contentAlignment ||
        'left') as CustomSectionContentAlign;

  const getTextValue = (field: CustomSectionFieldKey) => {
    switch (field) {
      case 'mediaRatio':
        return isMobile
          ? config.responsive?.mobileMediaRatio ||
              config.layoutSettings?.mediaRatio ||
              '4 / 3'
          : config.layoutSettings?.mediaRatio || '4 / 3';
      case 'contentWidth':
        return isMobile
          ? config.responsive?.mobileContentWidth ||
              config.layoutSettings?.contentWidth ||
              '100%'
          : config.layoutSettings?.contentWidth || '560px';
      case 'contentGap':
        return isMobile
          ? config.responsive?.mobileContentGap ||
              config.layoutSettings?.contentGap ||
              getCustomSectionGapPlaceholder('mobile')
          : config.layoutSettings?.contentGap ||
              getCustomSectionGapPlaceholder('desktop');
      case 'cardSpacing':
        return config.layoutSettings?.cardSpacing || '1.25rem';
      default:
        return '';
    }
  };

  const setTextValue = (field: CustomSectionFieldKey, value: string) => {
    switch (field) {
      case 'mediaRatio':
        onChange({
          responsive: isMobile
            ? updateResponsive(config.responsive, 'mobileMediaRatio', value)
            : config.responsive,
          layoutSettings: isMobile
            ? config.layoutSettings
            : updateLayoutSettings(config.layoutSettings, 'mediaRatio', value),
        });
        return;
      case 'contentWidth':
        onChange({
          responsive: isMobile
            ? updateResponsive(config.responsive, 'mobileContentWidth', value)
            : config.responsive,
          layoutSettings: isMobile
            ? config.layoutSettings
            : updateLayoutSettings(
                config.layoutSettings,
                'contentWidth',
                value,
              ),
        });
        return;
      case 'contentGap':
        onChange({
          responsive: isMobile
            ? updateResponsive(config.responsive, 'mobileContentGap', value)
            : config.responsive,
          layoutSettings: isMobile
            ? config.layoutSettings
            : updateLayoutSettings(config.layoutSettings, 'contentGap', value),
        });
        return;
      case 'cardSpacing':
        onChange({
          layoutSettings: updateLayoutSettings(
            config.layoutSettings,
            'cardSpacing',
            value,
          ),
        });
        return;
      default:
        return;
    }
  };

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm ${
          isMobile
            ? 'border-violet-200 bg-violet-50 text-violet-800'
            : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        {isMobile
          ? 'Adjust layout-specific mobile overrides for stacking, gap, and content balance.'
          : definition.summary}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {definition.layoutFields.map((field) => {
          if (field === 'contentAlignment') {
            return (
              <div key={field}>
                <Label
                  title={fieldTitle(field)}
                  hint={isMobile ? 'Mobile override' : 'Desktop base value'}
                />
                <SegmentedControl
                  value={getAlignmentValue()}
                  onChange={(value) =>
                    onChange({
                      responsive: isMobile
                        ? updateResponsive(
                            config.responsive,
                            'mobileContentAlignment',
                            value,
                          )
                        : config.responsive,
                      layoutSettings: isMobile
                        ? config.layoutSettings
                        : updateLayoutSettings(
                            config.layoutSettings,
                            'contentAlignment',
                            value,
                          ),
                    })
                  }
                  options={[
                    { value: 'left', label: 'Left' },
                    { value: 'center', label: 'Center' },
                    { value: 'right', label: 'Right' },
                  ]}
                />
              </div>
            );
          }

          if (field === 'verticalAlignment') {
            return (
              <div key={field}>
                <Label title={fieldTitle(field)} />
                <SegmentedControl
                  value={
                    (config.layoutSettings?.verticalAlignment ||
                      'center') as string
                  }
                  onChange={(value) =>
                    onChange({
                      layoutSettings: updateLayoutSettings(
                        config.layoutSettings,
                        'verticalAlignment',
                        value as CustomSectionLayoutSettings['verticalAlignment'],
                      ),
                    })
                  }
                  options={[
                    { value: 'start', label: 'Top' },
                    { value: 'center', label: 'Center' },
                    { value: 'end', label: 'Bottom' },
                  ]}
                />
              </div>
            );
          }

          if (field === 'cardColumns') {
            const value = isMobile
              ? config.responsive?.mobileCardColumns || 1
              : config.layoutSettings?.cardColumns || 3;
            return (
              <div key={field}>
                <Label
                  title={fieldTitle(field)}
                  hint={isMobile ? 'Mobile columns' : 'Desktop columns'}
                />
                <SegmentedControl
                  value={value}
                  onChange={(next) =>
                    onChange({
                      responsive: isMobile
                        ? updateResponsive(
                            config.responsive,
                            'mobileCardColumns',
                            next as number,
                          )
                        : config.responsive,
                      layoutSettings: isMobile
                        ? config.layoutSettings
                        : updateLayoutSettings(
                            config.layoutSettings,
                            'cardColumns',
                            next as number,
                          ),
                    })
                  }
                  options={[
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                    { value: 3, label: '3' },
                    { value: 4, label: '4' },
                  ]}
                />
              </div>
            );
          }

          if (field === 'stackOnMobile') {
            return (
              <div
                key={field}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {fieldTitle(field)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stack media and content vertically on small screens.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.layoutSettings?.stackOnMobile !== false}
                      onChange={(event) =>
                        onChange({
                          layoutSettings: updateLayoutSettings(
                            config.layoutSettings,
                            'stackOnMobile',
                            event.target.checked,
                          ),
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                  </label>
                </div>
              </div>
            );
          }

          if (
            field === 'mediaShape' ||
            field === 'buttonStyle' ||
            field === 'hoverEffect' ||
            field === 'transitionStyle'
          ) {
            const value = (config.layoutSettings?.[field] ||
              (field === 'mediaShape'
                ? 'soft'
                : field === 'buttonStyle'
                  ? 'solid'
                  : field === 'hoverEffect'
                    ? 'lift'
                    : 'fade')) as string;

            const options =
              field === 'mediaShape'
                ? [
                    { value: 'soft', label: 'Soft' },
                    { value: 'rounded', label: 'Rounded' },
                    { value: 'arched', label: 'Arched' },
                    { value: 'circle', label: 'Circle' },
                  ]
                : field === 'buttonStyle'
                  ? [
                      { value: 'solid', label: 'Solid' },
                      { value: 'outline', label: 'Outline' },
                      { value: 'soft', label: 'Soft' },
                    ]
                  : field === 'hoverEffect'
                    ? [
                        { value: 'lift', label: 'Lift' },
                        { value: 'spotlight', label: 'Spotlight' },
                        { value: 'reveal', label: 'Reveal' },
                      ]
                    : [
                        { value: 'fade', label: 'Fade' },
                        { value: 'slide', label: 'Slide' },
                        { value: 'soft-zoom', label: 'Soft Zoom' },
                      ];

            return (
              <div key={field}>
                <Label title={fieldTitle(field)} />
                <SegmentedControl
                  value={value}
                  onChange={(next) =>
                    onChange({
                      layoutSettings: updateLayoutSettings(
                        config.layoutSettings,
                        field as keyof CustomSectionLayoutSettings,
                        next as never,
                      ),
                    })
                  }
                  options={options}
                />
              </div>
            );
          }

          if (field === 'autoplay') {
            return (
              <div
                key={field}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Autoplay Slides
                    </p>
                    <p className="text-xs text-slate-500">
                      Automatically advance carousel-style layouts.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.layoutSettings?.autoplay !== false}
                      onChange={(event) =>
                        onChange({
                          layoutSettings: updateLayoutSettings(
                            config.layoutSettings,
                            'autoplay',
                            event.target.checked,
                          ),
                        })
                      }
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                  </label>
                </div>
              </div>
            );
          }

          if (field === 'autoplayInterval') {
            return (
              <div key={field}>
                <Label
                  title={fieldTitle(field)}
                  hint="Seconds between slide changes"
                />
                <TextInput
                  type="number"
                  min={2}
                  max={15}
                  value={String(config.layoutSettings?.autoplayInterval || 5)}
                  onChange={(event) =>
                    onChange({
                      layoutSettings: updateLayoutSettings(
                        config.layoutSettings,
                        'autoplayInterval',
                        Number(event.target.value) || 5,
                      ),
                    })
                  }
                />
              </div>
            );
          }

          if (field === 'overlayOpacity') {
            return (
              <div key={field}>
                <Label
                  title={fieldTitle(field)}
                  hint="Use lower values for lighter overlays."
                />
                <input
                  type="range"
                  min={0}
                  max={0.9}
                  step={0.05}
                  value={
                    config.styleConfig?.overlayOpacity ??
                    config.overlayOpacity ??
                    0.48
                  }
                  onChange={(event) =>
                    onChange({
                      overlayOpacity: Number(event.target.value),
                      styleConfig: {
                        ...(config.styleConfig || {}),
                        overlayOpacity: Number(event.target.value),
                      },
                    })
                  }
                  className="w-full accent-violet-600"
                />
              </div>
            );
          }

          return (
            <div key={field}>
              <Label
                title={fieldTitle(field)}
                hint={isMobile ? 'Mobile override' : 'Desktop value'}
              />
              <TextInput
                value={getTextValue(field)}
                onChange={(event) => setTextValue(field, event.target.value)}
                placeholder={
                  field === 'mediaRatio'
                    ? '4 / 3'
                    : field === 'contentWidth'
                      ? '560px'
                      : field === 'contentGap'
                        ? getCustomSectionGapPlaceholder(
                            isMobile ? 'mobile' : 'desktop',
                          )
                        : '1.25rem'
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ColorStylePanel({
  config,
  onChange,
}: {
  config: CustomSectionConfig;
  onChange: (updates: Partial<CustomSectionConfig>) => void;
}) {
  const styleConfig: CustomSectionStyleSettings = {
    ...(config.styleConfig || {}),
  };

  const updateStyles = (updates: Partial<CustomSectionStyleSettings>) => {
    const nextStyles = {
      ...styleConfig,
      ...updates,
    };

    onChange({
      styleConfig: nextStyles,
      bgColor: nextStyles.sectionBackgroundColor || config.bgColor,
      overlayColor: nextStyles.overlayColor || config.overlayColor,
      overlayOpacity: nextStyles.overlayOpacity ?? config.overlayOpacity,
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Section Palette
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Tune the main surfaces, accent color, and overlay tone for the
          selected layout.
        </p>
        <div className="mt-5 grid gap-4">
          <ColorInput
            label="Section Background"
            value={
              styleConfig.sectionBackgroundColor || config.bgColor || '#ffffff'
            }
            onChange={(value) =>
              updateStyles({ sectionBackgroundColor: value })
            }
          />
          <ColorInput
            label="Content Surface"
            value={styleConfig.contentSurfaceBackground || '#ffffff'}
            onChange={(value) =>
              updateStyles({ contentSurfaceBackground: value })
            }
          />
          <ColorInput
            label="Card Background"
            value={styleConfig.cardBackgroundColor || '#ffffff'}
            onChange={(value) => updateStyles({ cardBackgroundColor: value })}
          />
          <ColorInput
            label="Accent Color"
            value={styleConfig.accentColor || '#7c3aed'}
            onChange={(value) =>
              updateStyles({
                accentColor: value,
                badgeTextColor: value,
                buttonSecondaryTextColor: value,
              })
            }
          />
          <ColorInput
            label="Muted Accent"
            value={styleConfig.mutedAccentColor || '#ede9fe'}
            onChange={(value) =>
              updateStyles({
                mutedAccentColor: value,
                badgeBackgroundColor: value,
              })
            }
          />
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Buttons, Borders, and Overlay
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Keep button treatments and supporting chrome aligned with the chosen
          layout.
        </p>
        <div className="mt-5 grid gap-4">
          <ColorInput
            label="Border Color"
            value={styleConfig.borderColor || '#e2e8f0'}
            onChange={(value) =>
              updateStyles({ borderColor: value, buttonBorderColor: value })
            }
          />
          <ColorInput
            label="Primary Button Background"
            value={styleConfig.buttonBackgroundColor || '#7c3aed'}
            onChange={(value) => updateStyles({ buttonBackgroundColor: value })}
          />
          <ColorInput
            label="Primary Button Text"
            value={styleConfig.buttonTextColor || '#ffffff'}
            onChange={(value) => updateStyles({ buttonTextColor: value })}
          />
          <ColorInput
            label="Secondary Button Background"
            value={styleConfig.buttonSecondaryBackgroundColor || '#ffffff'}
            onChange={(value) =>
              updateStyles({ buttonSecondaryBackgroundColor: value })
            }
          />
          <ColorInput
            label="Secondary Button Text"
            value={styleConfig.buttonSecondaryTextColor || '#6d28d9'}
            onChange={(value) =>
              updateStyles({ buttonSecondaryTextColor: value })
            }
          />
          <ColorInput
            label="Overlay Color"
            value={styleConfig.overlayColor || config.overlayColor || '#0f172a'}
            onChange={(value) => updateStyles({ overlayColor: value })}
          />
        </div>
      </div>
    </div>
  );
}
