'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/menu';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
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
import {
  CategoryDrivenLayoutEditor,
  type CategoryEditorCopy,
} from '@/components/admin/menu-settings/category-editor';
import { useMenuConfig, useUpdateMenuConfig } from '@/hooks/use-menu-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import {
  MENU_LAYOUT_DEFINITIONS,
  MENU_LAYOUT_ORDER,
  getMenuLayoutDefinition,
  isCategoryMenuLayout,
  isDirectMenuLayout,
  mergeMenuLayoutSettings,
  withMenuLayoutDefaults,
  type MenuLayoutControlDefinition,
} from '@/lib/menu-layout-schema';
import {
  DEFAULT_MENU_CONFIG,
  type MenuButton,
  type MenuCategory,
  type MenuConfig,
  type MenuItem,
  type MenuLayout,
} from '@/types/menu.types';

interface MenuSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

type MenuMediaField =
  | { type: 'header_image' }
  | { type: 'background_image' }
  | { type: 'layout_item_image'; itemIndex: number }
  | { type: 'category_item_image'; categoryIndex: number; itemIndex: number };

type LayoutSettingsMap = NonNullable<MenuConfig['layoutSettings']>;
type LayoutSettingsValue = string | number | boolean | undefined;

function getSearchParams() {
  return typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
}

function getMenuItemKey(item: MenuItem) {
  return item.id ? `id:${item.id}` : `name:${item.name}`;
}

function hydrateFeaturedItems(config: MenuConfig): MenuConfig {
  const featuredKeys = new Set((config.featuredItems || []).map(getMenuItemKey));
  const categories = (config.categories || []).map((category) => ({
    ...category,
    items: (category.items || []).map((item) => ({
      ...item,
      featured: item.featured || featuredKeys.has(getMenuItemKey(item)),
    })),
  }));

  const derivedFeaturedItems = categories.flatMap((category) =>
    (category.items || [])
      .filter((item) => item.featured)
      .map((item) => ({
        ...item,
        category: category.name,
      })),
  );

  return {
    ...config,
    categories,
    featuredItems: derivedFeaturedItems,
  };
}

function createEmptyLayoutItem(index: number): MenuItem {
  return {
    name: '',
    description: '',
    price: '',
    category: `Highlight ${index + 1}`,
    ctaLabel: '',
    ctaLink: '',
    image: '',
    imageLink: '',
    badge: '',
  };
}

function ensureLayoutItems(config: MenuConfig): MenuConfig {
  const layout = (config.layout || 'grid') as MenuLayout;
  if (!isDirectMenuLayout(layout)) {
    return config;
  }

  const slotCount = getMenuLayoutDefinition(layout).itemSlots;
  const layoutItems = [...(config.layoutItems || [])];

  while (layoutItems.length < slotCount) {
    layoutItems.push(createEmptyLayoutItem(layoutItems.length));
  }

  return {
    ...config,
    layoutItems,
  };
}

function normalizeMenuConfig(config: Partial<MenuConfig>): MenuConfig {
  return ensureLayoutItems(
    hydrateFeaturedItems(
      withMenuLayoutDefaults({
        ...DEFAULT_MENU_CONFIG,
        ...config,
      } as MenuConfig),
    ),
  );
}

function getMenuItemCount(categories?: MenuCategory[]) {
  return (categories || []).reduce(
    (total, category) => total + (category.items || []).length,
    0,
  );
}

function getMenuImageCount(categories?: MenuCategory[]) {
  return (categories || []).reduce(
    (total, category) =>
      total + (category.items || []).filter((item) => Boolean(item.image)).length,
    0,
  );
}

function getGalleryModalCopy(field: MenuMediaField | null) {
  if (!field) {
    return {
      title: 'Select Image',
      description: 'Choose an image from your media library or upload a new one.',
    };
  }

  switch (field.type) {
    case 'header_image':
      return {
        title: 'Select Header Image',
        description: 'Use a section-level visual for intro cards, tabs, and fallback media.',
      };
    case 'background_image':
      return {
        title: 'Select Background Image',
        description: 'Use a background image for ambience behind the menu section.',
      };
    case 'layout_item_image':
      return {
        title: 'Select Card Image',
        description: 'Choose the image shown for this direct-layout menu card.',
      };
    case 'category_item_image':
      return {
        title: 'Select Item Image',
        description: 'Choose the image shown inside the selected category item.',
      };
    default:
      return {
        title: 'Select Image',
        description: 'Choose an image from your media library or upload a new one.',
      };
  }
}

function getResponsiveValue<T>(
  config: MenuConfig,
  desktopKey: keyof MenuConfig,
  mobileKey: keyof MenuConfig | undefined,
  viewport: EditorViewport,
  fallback: T,
) {
  if (viewport === 'mobile') {
    const mobileValue = mobileKey ? config[mobileKey] : undefined;
    return (mobileValue ?? config[desktopKey] ?? fallback) as T;
  }

  return (config[desktopKey] ?? fallback) as T;
}

function getResponsiveLayoutValue(
  settings: Record<string, LayoutSettingsValue>,
  field: string,
  mobileField: string | undefined,
  viewport: EditorViewport,
  fallback: LayoutSettingsValue,
) {
  if (viewport === 'mobile') {
    return settings[mobileField || field] ?? settings[field] ?? fallback;
  }

  return settings[field] ?? fallback;
}

function getCategoryEditorCopy(layout: MenuLayout): CategoryEditorCopy {
  if (layout === 'accordion') {
    return {
      sectionTitle: 'Accordion Categories',
      sectionDescription:
        'Build expandable menu groups with polished titles, descriptions, pricing, media, and actions.',
      addCategoryLabel: 'Add Accordion Group',
      categoryLabel: 'Accordion Group',
      removeCategoryLabel: 'Remove Group',
      categoryNameLabel: 'Group Title',
      categoryNamePlaceholder: 'Dinner specials',
      categoryIconLabel: 'Group Icon',
      categoryIconPlaceholder: 'DS',
      categoryDescriptionLabel: 'Group Description',
      categoryDescriptionPlaceholder: 'Describe what guests will find in this group.',
      emptyTitle: 'No accordion groups yet',
      emptyDescription:
        'Add the first accordion group to structure a longer menu into cleaner expandable sections.',
      addFirstItemLabel: 'Add First Group',
    };
  }

  return {
    sectionTitle: 'Tab Categories',
    sectionDescription:
      'Organize dishes into category tabs and edit the content that appears for each selection.',
    addCategoryLabel: 'Add Category Tab',
    categoryLabel: 'Category Tab',
    removeCategoryLabel: 'Remove Category',
    categoryNameLabel: 'Category Name',
    categoryNamePlaceholder: 'Lunch specials',
    categoryIconLabel: 'Category Icon',
    categoryIconPlaceholder: 'LS',
    categoryDescriptionLabel: 'Category Description',
    categoryDescriptionPlaceholder: 'Short context shown in the tab selector and panel.',
    emptyTitle: 'No categories yet',
    emptyDescription:
      'Add category tabs to create a stronger multi-group menu experience with focused panels.',
    addFirstItemLabel: 'Add First Category',
  };
}

function FieldShell({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {action ? <span>{action}</span> : hint ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function textInputClassName() {
  return 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/15';
}

function textareaClassName() {
  return `${textInputClassName()} min-h-[110px] resize-y`;
}

function selectClassName() {
  return textInputClassName();
}

function resetButton(onClick: () => void, title: string) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-200 hover:text-violet-700"
      title={title}
    >
      Use Desktop
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
  hint,
  action,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <FieldShell label={label} hint={hint} action={action}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded-xl border border-slate-200 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm text-slate-900 focus:outline-none focus:ring-0"
        />
      </div>
    </FieldShell>
  );
}

function MenuLayoutThumbnail({ layout }: { layout: MenuLayout }) {
  const chrome = (
    <div className="mb-3 flex items-center justify-center">
      <div className="h-1.5 w-10 rounded-full bg-slate-200" />
    </div>
  );
  const lightCard = 'rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]';
  const media = 'rounded-xl bg-[linear-gradient(135deg,rgba(237,233,254,1),rgba(224,231,255,0.7))]';

  switch (layout) {
    case 'grid':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-2 gap-3">
            {[0, 1].map((card) => (
              <div key={card} className={`${lightCard} overflow-hidden p-2`}>
                <div className={`${media} h-12`} />
                <div className="mt-2 space-y-1.5">
                  <div className="h-2.5 w-16 rounded-full bg-slate-700/80" />
                  <div className="h-2 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'list':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] gap-3 md:grid-cols-2">
            {[0, 1].map((card) => (
              <div key={card} className={`${lightCard} grid place-items-center p-4 text-center`}>
                <div className="space-y-2">
                  <div className="mx-auto h-2.5 w-20 rounded-full bg-violet-500/70" />
                  <div className="mx-auto h-2 w-24 rounded-full bg-slate-300" />
                  <div className="mx-auto h-6 w-14 rounded-full bg-violet-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'masonry':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-2 gap-3">
            <div className={`${lightCard} overflow-hidden p-2`}>
              <div className={`${media} h-14`} />
              <div className="mt-2 h-2.5 w-16 rounded-full bg-slate-700/80" />
            </div>
            <div className={`${lightCard} mt-4 overflow-hidden p-2`}>
              <div className={`${media} h-10`} />
              <div className="mt-2 h-2.5 w-16 rounded-full bg-slate-700/80" />
            </div>
          </div>
        </div>
      );
    case 'carousel':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-flow-col auto-cols-[minmax(68px,1fr)] gap-2 overflow-hidden">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className={`${lightCard} overflow-hidden`}>
                <div className={`${media} h-14`} />
                <div className="space-y-1.5 p-2">
                  <div className="h-2.5 w-10 rounded-full bg-slate-700/80" />
                  <div className="h-2 w-12 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'tabs':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-[1.08fr_0.92fr] gap-3">
            <div className={`${lightCard} p-3`}>
              <div className="h-2 w-14 rounded-full bg-violet-300" />
              <div className="mt-3 h-3 w-24 rounded-full bg-slate-800" />
              <div className="mt-2 h-2 w-28 rounded-full bg-slate-300" />
              <div className="mt-6 h-6 w-16 rounded-full bg-violet-100" />
            </div>
            <div className="grid gap-2">
              {[0, 1, 2].map((row) => (
                <div key={row} className={`${lightCard} flex items-center justify-between px-3 py-2`}>
                  <div className="space-y-1">
                    <div className="h-2.5 w-16 rounded-full bg-slate-700/80" />
                    <div className="h-2 w-20 rounded-full bg-slate-300" />
                  </div>
                  <div className="h-6 w-6 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    case 'accordion':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] gap-2">
            {[0, 1, 2].map((row) => (
              <div key={row} className={`${lightCard} flex items-center justify-between px-3 py-3`}>
                <div className="space-y-1">
                  <div className="h-2.5 w-20 rounded-full bg-slate-700/80" />
                  <div className="h-2 w-24 rounded-full bg-slate-300" />
                </div>
                <div className="h-6 w-6 rounded-full bg-violet-100" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'two-column':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-2 gap-3">
            {[0, 1].map((card) => (
              <div key={card} className={`${lightCard} overflow-hidden p-2`}>
                <div className={`${media} h-12`} />
                <div className="mt-2 space-y-1.5">
                  <div className="h-2.5 w-16 rounded-full bg-slate-700/80" />
                  <div className="h-2 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'single-column':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="mx-auto grid h-[120px] max-w-[170px] gap-3">
            {[0, 1].map((card) => (
              <div key={card} className={`${lightCard} overflow-hidden p-2`}>
                <div className={`${media} h-8`} />
                <div className="mt-2 space-y-1.5">
                  <div className="h-2.5 w-16 rounded-full bg-slate-700/80" />
                  <div className="h-2 w-20 rounded-full bg-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case 'featured-grid':
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-3 gap-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className={`${lightCard} grid place-items-center p-3 text-center`}>
                <div className="h-10 w-10 rounded-2xl bg-violet-100" />
                <div className="mt-2 h-2.5 w-12 rounded-full bg-slate-700/80" />
                <div className="mt-1 h-2 w-14 rounded-full bg-slate-300" />
              </div>
            ))}
          </div>
        </div>
      );
    case 'minimal':
    default:
      return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {chrome}
          <div className="grid h-[120px] grid-cols-3 gap-3">
            {[0, 1, 2].map((card) => (
              <div
                key={card}
                className={`grid place-items-center p-3 text-center ${card === 1 ? 'border-x border-slate-200' : ''}`}
              >
                <div className="h-8 w-8 rounded-full bg-violet-100" />
                <div className="mt-2 h-2.5 w-12 rounded-full bg-slate-700/80" />
                <div className="mt-1 h-2 w-14 rounded-full bg-slate-300" />
              </div>
            ))}
          </div>
        </div>
      );
  }
}

function LayoutControl({
  control,
  settings,
  viewport,
  onChange,
}: {
  control: MenuLayoutControlDefinition;
  settings: Record<string, LayoutSettingsValue>;
  viewport: EditorViewport;
  onChange: (field: string, value: LayoutSettingsValue) => void;
}) {
  const isMobile = viewport === 'mobile';
  const value = getResponsiveLayoutValue(
    settings,
    control.field,
    control.mobileField,
    viewport,
    control.kind === 'toggle' ? false : control.min ?? '',
  );

  const reset =
    isMobile && control.mobileField
      ? resetButton(() => onChange(control.mobileField as string, undefined), `Use desktop ${control.label.toLowerCase()}`)
      : null;

  if (control.kind === 'toggle') {
    return (
      <ToggleRow
        title={control.label}
        description={control.description}
        checked={Boolean(value)}
        onChange={(checked) =>
          onChange(isMobile && control.mobileField ? control.mobileField : control.field, checked)
        }
      />
    );
  }

  if (control.kind === 'select') {
    return (
      <FieldShell label={control.label} hint={control.description} action={reset}>
        <select
          value={String(value)}
          onChange={(event) =>
            onChange(
              isMobile && control.mobileField ? control.mobileField : control.field,
              event.target.value,
            )
          }
          className={selectClassName()}
        >
          {(control.options || []).map((option) => (
            <option key={`${control.field}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  return (
    <FieldShell
      label={control.label}
      hint={control.description}
      action={
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span>{typeof value === 'number' ? `${value}${control.unit || ''}` : value}</span>
          {reset}
        </span>
      }
    >
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={Number(value)}
        onChange={(event) =>
          onChange(
            isMobile && control.mobileField ? control.mobileField : control.field,
            Number(event.target.value),
          )
        }
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600"
      />
    </FieldShell>
  );
}

function MediaPickerCard({
  label,
  description,
  value,
  onSelect,
  onClear,
}: {
  label: string;
  description: string;
  value?: string;
  onSelect: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-50"
          >
            {value ? 'Replace' : 'Choose'}
          </button>
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200 bg-white">
        {value ? (
          <img src={value} alt={label} className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1))] text-sm font-medium text-slate-500">
            No media selected
          </div>
        )}
      </div>
    </div>
  );
}

function DirectLayoutItemEditor({
  layout,
  items,
  onUpdate,
  onOpenImage,
}: {
  layout: MenuLayout;
  items: MenuItem[];
  onUpdate: (itemIndex: number, updates: Partial<MenuItem>) => void;
  onOpenImage: (itemIndex: number) => void;
}) {
  const definition = MENU_LAYOUT_DEFINITIONS[layout];
  const showImages = definition.usesImages || definition.imageOptional;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Layout Mode</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{definition.name}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{definition.description}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editable Slots</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{definition.itemSlots}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Each slot maps directly to a card, tile, or highlight in the selected layout.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Media Support</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {showImages ? 'Images Ready' : 'Text Focused'}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {showImages
              ? 'Upload per-item images for richer cards, or leave them empty to use polished placeholders.'
              : 'This layout prioritizes text and CTA hierarchy over imagery.'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((item, itemIndex) => (
          <div
            key={`menu-layout-item-${itemIndex}`}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                    Slot {itemIndex + 1}
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {item.name?.trim() || `Menu Card ${itemIndex + 1}`}
                  </h3>
                </div>
                {item.badge?.trim() ? (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-4 p-5">
              {showImages ? (
                <>
                  <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                    {item.image ? (
                      <img src={item.image} alt={item.name || `Menu card ${itemIndex + 1}`} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1))] text-sm font-medium text-slate-500">
                        No image selected
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenImage(itemIndex)}
                      className="rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                    >
                      {item.image ? 'Replace Image' : 'Choose Image'}
                    </button>
                    {item.image ? (
                      <button
                        type="button"
                        onClick={() => onUpdate(itemIndex, { image: '' })}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                      >
                        Remove Image
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Item Title" hint="Headline shown in the card">
                  <input
                    type="text"
                    value={item.name || ''}
                    onChange={(event) => onUpdate(itemIndex, { name: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Signature Pasta"
                  />
                </FieldShell>
                <FieldShell label="Category Label" hint="Small label above the title">
                  <input
                    type="text"
                    value={item.category || ''}
                    onChange={(event) => onUpdate(itemIndex, { category: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Chef Pick"
                  />
                </FieldShell>
                <FieldShell label="Price" hint="Optional price badge">
                  <input
                    type="text"
                    value={item.price || ''}
                    onChange={(event) => onUpdate(itemIndex, { price: event.target.value })}
                    className={textInputClassName()}
                    placeholder="24"
                  />
                </FieldShell>
                <FieldShell label="Tag / Badge" hint="Optional badge on the card">
                  <input
                    type="text"
                    value={item.badge || ''}
                    onChange={(event) => onUpdate(itemIndex, { badge: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Best Seller"
                  />
                </FieldShell>
              </div>

              <FieldShell label="Description" hint="Keep copy concise for a stronger card layout">
                <textarea
                  value={item.description || ''}
                  onChange={(event) => onUpdate(itemIndex, { description: event.target.value })}
                  className={textareaClassName()}
                  placeholder="Short supporting copy about this menu item or promotion."
                />
              </FieldShell>

              {definition.usesButtons ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="CTA Label" hint="Button text inside the card">
                    <input
                      type="text"
                      value={item.ctaLabel || ''}
                      onChange={(event) => onUpdate(itemIndex, { ctaLabel: event.target.value })}
                      className={textInputClassName()}
                      placeholder="Order Now"
                    />
                  </FieldShell>
                  <FieldShell label="CTA Link" hint="Action URL for this specific card">
                    <input
                      type="text"
                      value={item.ctaLink || ''}
                      onChange={(event) => onUpdate(itemIndex, { ctaLink: event.target.value })}
                      className={textInputClassName()}
                      placeholder="#order"
                    />
                  </FieldShell>
                </div>
              ) : null}

              {showImages ? (
                <FieldShell label="Image Click Link" hint="Optional link when the card image itself is clicked">
                  <input
                    type="text"
                    value={item.imageLink || ''}
                    onChange={(event) => onUpdate(itemIndex, { imageLink: event.target.value })}
                    className={textInputClassName()}
                    placeholder="https://example.com/menu"
                  />
                </FieldShell>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MenuSettingsFormEnhanced({
  pageId,
  templateId,
  isNewSection,
}: MenuSettingsFormProps) {
  const router = useRouter();
  const searchParams = getSearchParams();
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  const pageName = searchParams.get('page_name') || '';

  const {
    config,
    loading,
    error: fetchError,
  } = useMenuConfig({
    fetchOnMount: !isNewSection,
    restaurantId,
    pageId,
    templateId,
  });
  const { updateMenu, updating } = useUpdateMenuConfig();
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  const [formConfig, setFormConfig] = useState<MenuConfig | null>(null);
  const [editorViewport, setEditorViewport] = useState<EditorViewport>('mobile');
  const [previewViewport, setPreviewViewport] = useState<EditorViewport>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<MenuMediaField | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (formConfig) {
      return;
    }

    if (isNewSection) {
      setFormConfig(
        normalizeMenuConfig({
          ...DEFAULT_MENU_CONFIG,
          ...sectionStyleDefaults,
          title: '',
          subtitle: '',
          description: '',
          restaurant_id: restaurantId,
        }),
      );
      return;
    }

    if (config) {
      setFormConfig(
        normalizeMenuConfig({
          ...sectionStyleDefaults,
          ...config,
        }),
      );
    }
  }, [config, formConfig, isNewSection, restaurantId, sectionStyleDefaults]);

  useEffect(() => {
    setFormConfig((previous) =>
      previous
        ? normalizeMenuConfig({
            ...sectionStyleDefaults,
            ...previous,
          })
        : previous,
    );
  }, [sectionStyleDefaults]);

  if (!restaurantId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-800 shadow-sm">
          Restaurant ID is required to configure Menu Settings.
        </div>
      </div>
    );
  }

  const updateConfig = (updates: Partial<MenuConfig>) => {
    setFormConfig((previous) =>
      previous ? normalizeMenuConfig({ ...previous, ...updates }) : previous,
    );
  };

  const currentLayout = (formConfig?.layout || 'grid') as MenuLayout;
  const currentLayoutDefinition = getMenuLayoutDefinition(currentLayout);
  const currentLayoutSettings = useMemo(
    () =>
      ((mergeMenuLayoutSettings(formConfig?.layoutSettings)?.[currentLayout] ||
        currentLayoutDefinition.defaults) as Record<string, LayoutSettingsValue>),
    [currentLayout, currentLayoutDefinition.defaults, formConfig?.layoutSettings],
  );

  const updateLayoutSettings = (field: string, value: LayoutSettingsValue) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const mergedSettings = mergeMenuLayoutSettings(previous.layoutSettings);
      const nextLayoutSettings = {
        ...mergedSettings,
        [currentLayout]: {
          ...(mergedSettings[currentLayout] || {}),
          [field]: value,
        },
      } as LayoutSettingsMap;

      return normalizeMenuConfig({
        ...previous,
        layoutSettings: nextLayoutSettings,
      });
    });
  };

  const updateLayoutItem = (itemIndex: number, updates: Partial<MenuItem>) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const layoutItems = [...(previous.layoutItems || [])];
      layoutItems[itemIndex] = {
        ...(layoutItems[itemIndex] || createEmptyLayoutItem(itemIndex)),
        ...updates,
      };

      return normalizeMenuConfig({
        ...previous,
        layoutItems,
      });
    });
  };

  const updateCtaButton = (updates: Partial<MenuButton>) => {
    setFormConfig((previous) =>
      previous
        ? normalizeMenuConfig({
            ...previous,
            ctaButton: {
              label: '',
              href: '',
              ...(previous.ctaButton || {}),
              ...updates,
            },
          })
        : previous,
    );
  };

  const addCategory = () => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      return normalizeMenuConfig({
        ...previous,
        categories: [
          ...(previous.categories || []),
          { name: '', description: '', icon: '', items: [] },
        ],
      });
    });
  };

  const updateCategory = (categoryIndex: number, updates: Partial<MenuCategory>) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const categories = [...(previous.categories || [])];
      categories[categoryIndex] = {
        ...(categories[categoryIndex] || { name: '', items: [] }),
        ...updates,
      };

      return normalizeMenuConfig({
        ...previous,
        categories,
      });
    });
  };

  const removeCategory = (categoryIndex: number) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      return normalizeMenuConfig({
        ...previous,
        categories: (previous.categories || []).filter((_, index) => index !== categoryIndex),
      });
    });
  };

  const addItemToCategory = (categoryIndex: number) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const categories = [...(previous.categories || [])];
      const category = categories[categoryIndex] || { name: '', items: [] };
      categories[categoryIndex] = {
        ...category,
        items: [
          ...(category.items || []),
          {
            name: '',
            description: '',
            price: '',
            image: '',
            ctaLabel: '',
            ctaLink: '',
            badge: '',
          },
        ],
      };

      return normalizeMenuConfig({
        ...previous,
        categories,
      });
    });
  };

  const updateCategoryItem = (
    categoryIndex: number,
    itemIndex: number,
    updates: Partial<MenuItem>,
  ) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const categories = [...(previous.categories || [])];
      const category = categories[categoryIndex] || { name: '', items: [] };
      const items = [...(category.items || [])];
      items[itemIndex] = {
        ...(items[itemIndex] || {
          name: '',
          description: '',
          price: '',
        }),
        ...updates,
      };

      categories[categoryIndex] = {
        ...category,
        items,
      };

      return normalizeMenuConfig({
        ...previous,
        categories,
      });
    });
  };

  const removeCategoryItem = (categoryIndex: number, itemIndex: number) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      const categories = [...(previous.categories || [])];
      const category = categories[categoryIndex];

      if (!category) {
        return previous;
      }

      categories[categoryIndex] = {
        ...category,
        items: (category.items || []).filter((_, index) => index !== itemIndex),
      };

      return normalizeMenuConfig({
        ...previous,
        categories,
      });
    });
  };

  const openMediaGallery = (field: MenuMediaField) => {
    setCurrentMediaField(field);
    setShowGalleryModal(true);
  };

  const handleMediaSelect = (imageUrl: string) => {
    if (!currentMediaField) {
      return;
    }

    if (currentMediaField.type === 'header_image') {
      updateConfig({ headerImage: imageUrl });
    } else if (currentMediaField.type === 'background_image') {
      updateConfig({ backgroundImage: imageUrl });
    } else if (currentMediaField.type === 'layout_item_image') {
      updateLayoutItem(currentMediaField.itemIndex, { image: imageUrl });
    } else {
      updateCategoryItem(currentMediaField.categoryIndex, currentMediaField.itemIndex, {
        image: imageUrl,
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formConfig) {
      return;
    }

    try {
      const normalizedConfig = normalizeMenuConfig(formConfig);
      const payload: Partial<MenuConfig> & Record<string, unknown> = {
        ...normalizedConfig,
        restaurant_id: restaurantId,
      };

      if (pageId) {
        payload.page_id = pageId;
      }

      if (isNewSection) {
        payload.new_section = true;
      } else if (templateId) {
        payload.template_id = templateId;
      }

      await updateMenu(payload);
      setToastType('success');
      setToastMessage('Menu settings saved successfully.');
      setShowToast(true);

      window.setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        if (pageName) params.set('page_name', pageName);
        router.push(`/admin/page-settings?${params.toString()}`);
      }, 1200);
    } catch (error) {
      console.error('Failed to save menu settings:', error);
      setToastType('error');
      setToastMessage('Failed to save menu settings. Please try again.');
      setShowToast(true);
    }
  };

  if (loading && !formConfig) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          Loading Menu Settings...
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-800">
        {fetchError || 'Unable to load menu settings.'}
      </div>
    );
  }

  const menuItemCount = getMenuItemCount(formConfig.categories);
  const menuImageCount = getMenuImageCount(formConfig.categories);
  const categoryEditorCopy = getCategoryEditorCopy(currentLayout);
  const layoutItems = (formConfig.layoutItems || []).slice(0, currentLayoutDefinition.itemSlots);
  const isMobileEditing = editorViewport === 'mobile';
  const galleryCopy = getGalleryModalCopy(currentMediaField);

  const updateResponsiveField = (
    desktopKey: keyof MenuConfig,
    mobileKey: keyof MenuConfig | undefined,
    value: LayoutSettingsValue,
  ) => {
    updateConfig({
      [isMobileEditing && mobileKey ? mobileKey : desktopKey]: value,
    } as Partial<MenuConfig>);
  };

  const currentBgColor = getResponsiveValue(formConfig, 'bgColor', 'mobileBgColor', editorViewport, DEFAULT_MENU_CONFIG.bgColor || '#ffffff');
  const currentTextColor = getResponsiveValue(formConfig, 'textColor', 'mobileTextColor', editorViewport, DEFAULT_MENU_CONFIG.textColor || '#111827');
  const currentAccentColor = getResponsiveValue(formConfig, 'accentColor', 'mobileAccentColor', editorViewport, DEFAULT_MENU_CONFIG.accentColor || '#7c3aed');
  const currentCardBgColor = getResponsiveValue(formConfig, 'cardBgColor', 'mobileCardBgColor', editorViewport, DEFAULT_MENU_CONFIG.cardBgColor || '#f8fafc');
  const currentCardBorderColor = getResponsiveValue(formConfig, 'cardBorderColor', 'mobileCardBorderColor', editorViewport, DEFAULT_MENU_CONFIG.cardBorderColor || 'rgba(148, 163, 184, 0.22)');
  const currentDividerColor = getResponsiveValue(formConfig, 'dividerColor', 'mobileDividerColor', editorViewport, DEFAULT_MENU_CONFIG.dividerColor || 'rgba(148, 163, 184, 0.24)');
  const currentBadgeColor = getResponsiveValue(formConfig, 'badgeColor', 'mobileBadgeColor', editorViewport, DEFAULT_MENU_CONFIG.badgeColor || '#7c3aed');
  const currentButtonBgColor = getResponsiveValue(formConfig, 'buttonBgColor', 'mobileButtonBgColor', editorViewport, DEFAULT_MENU_CONFIG.buttonBgColor || '#7c3aed');
  const currentButtonTextColor = getResponsiveValue(formConfig, 'buttonTextColor', 'mobileButtonTextColor', editorViewport, DEFAULT_MENU_CONFIG.buttonTextColor || '#ffffff');
  const currentPriceColor = getResponsiveValue(formConfig, 'priceColor', 'mobilePriceColor', editorViewport, DEFAULT_MENU_CONFIG.priceColor || '#7c3aed');
  const currentActiveTabColor = getResponsiveValue(formConfig, 'activeTabColor', 'mobileActiveTabColor', editorViewport, DEFAULT_MENU_CONFIG.activeTabColor || '#7c3aed');
  const currentAccordionActiveColor = getResponsiveValue(formConfig, 'accordionActiveColor', 'mobileAccordionActiveColor', editorViewport, DEFAULT_MENU_CONFIG.accordionActiveColor || '#ede9fe');
  const currentCardRadius = getResponsiveValue(formConfig, 'cardRadius', 'mobileCardRadius', editorViewport, DEFAULT_MENU_CONFIG.cardRadius || '1.4rem');
  const currentCardShadow = getResponsiveValue(formConfig, 'cardShadow', 'mobileCardShadow', editorViewport, DEFAULT_MENU_CONFIG.cardShadow || 'soft');
  const currentCardGap = getResponsiveValue(formConfig, 'cardGap', 'mobileCardGap', editorViewport, DEFAULT_MENU_CONFIG.cardGap || '1.25rem');
  const currentGridGap = getResponsiveValue(formConfig, 'gridGap', 'mobileGridGap', editorViewport, DEFAULT_MENU_CONFIG.gridGap || '1.4rem');
  const currentRowGap = getResponsiveValue(formConfig, 'rowSpacing', 'mobileRowSpacing', editorViewport, DEFAULT_MENU_CONFIG.rowSpacing || '1.5rem');
  const currentItemPadding = getResponsiveValue(formConfig, 'itemPadding', 'mobileItemPadding', editorViewport, DEFAULT_MENU_CONFIG.itemPadding || '1.25rem');
  const currentColumnSpacing = getResponsiveValue(formConfig, 'columnSpacing', 'mobileColumnSpacing', editorViewport, DEFAULT_MENU_CONFIG.columnSpacing || '1.5rem');
  const currentItemTitleSize = getResponsiveValue(formConfig, 'itemTitleSize', 'mobileItemTitleSize', editorViewport, DEFAULT_MENU_CONFIG.itemTitleSize || '1.125rem');
  const currentItemDescriptionSize = getResponsiveValue(formConfig, 'itemDescriptionSize', 'mobileItemDescriptionSize', editorViewport, DEFAULT_MENU_CONFIG.itemDescriptionSize || '0.95rem');
  const currentPriceTextSize = getResponsiveValue(formConfig, 'priceTextSize', 'mobilePriceTextSize', editorViewport, DEFAULT_MENU_CONFIG.priceTextSize || '1rem');
  const currentItemTextAlign = getResponsiveValue(formConfig, 'itemTextAlign', 'mobileItemTextAlign', editorViewport, DEFAULT_MENU_CONFIG.itemTextAlign || 'left');
  const currentItemLineHeight = getResponsiveValue(formConfig, 'itemLineHeight', 'mobileItemLineHeight', editorViewport, DEFAULT_MENU_CONFIG.itemLineHeight || '1.65');
  const currentItemLetterSpacing = getResponsiveValue(formConfig, 'itemLetterSpacing', 'mobileItemLetterSpacing', editorViewport, DEFAULT_MENU_CONFIG.itemLetterSpacing || '0');

  const layoutSection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 6.75h14.5M4.75 12h14.5M4.75 17.25h14.5" />
        </svg>
      }
      title="Layout Configuration"
      description="Select the menu layout, then tune layout-specific behavior with responsive controls."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {MENU_LAYOUT_ORDER.map((layout) => {
          const definition = MENU_LAYOUT_DEFINITIONS[layout];
          return (
            <LayoutCard
              key={layout}
              title={definition.name}
              description={definition.description}
              badge={definition.badge}
              selected={currentLayout === layout}
              onClick={() => updateConfig({ layout })}
              preview={<MenuLayoutThumbnail layout={layout} />}
            />
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            Selected Layout
          </div>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {currentLayoutDefinition.name}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {currentLayoutDefinition.description}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Content Model</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {isCategoryMenuLayout(currentLayout) ? 'Category Driven' : 'Direct Cards'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editable Slots</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {currentLayoutDefinition.itemSlots || 'Dynamic'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Media Support</div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {currentLayoutDefinition.usesImages || currentLayoutDefinition.imageOptional ? 'Image Ready' : 'Text Led'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-violet-200 bg-[linear-gradient(180deg,rgba(245,243,255,1),rgba(255,255,255,1))] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            Editing Scope
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">
            {editorViewport === 'mobile' ? 'Mobile overrides are active' : 'Desktop base styles are active'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Layout-specific fields below update the live preview instantly. Mobile values automatically fall back to desktop until you override them.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {currentLayoutDefinition.controlGroups.map((group) => (
          <div key={`${currentLayout}-${group.title}`} className="rounded-[26px] border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{group.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {group.controls.map((control) => (
                <LayoutControl
                  key={`${currentLayout}-${group.title}-${control.field}`}
                  control={control}
                  settings={currentLayoutSettings}
                  viewport={editorViewport}
                  onChange={updateLayoutSettings}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );

  const contentSection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75H7.5a3 3 0 00-3 3v10.5a3 3 0 003 3h9a3 3 0 003-3V6.75a3 3 0 00-3-3zM8.25 8.25h7.5m-7.5 4.5h7.5m-7.5 4.5h3.75" />
        </svg>
      }
      title="Content Configuration"
      description="Edit section copy, CTA content, and the structured items or categories used by the selected layout."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-4">
          <FieldShell label="Section Title" hint="Main menu heading">
            <input
              type="text"
              value={formConfig.title || ''}
              onChange={(event) => updateConfig({ title: event.target.value })}
              className={textInputClassName()}
              placeholder="Our Menu"
            />
          </FieldShell>
          <FieldShell label="Subtitle" hint="Supporting subheading above or below the title">
            <input
              type="text"
              value={formConfig.subtitle || ''}
              onChange={(event) => updateConfig({ subtitle: event.target.value })}
              className={textInputClassName()}
              placeholder="Seasonal dishes and house favorites"
            />
          </FieldShell>
          <FieldShell label="Description" hint="Short descriptive paragraph for the section">
            <textarea
              value={formConfig.description || ''}
              onChange={(event) => updateConfig({ description: event.target.value })}
              className={textareaClassName()}
              placeholder="Give guests a quick introduction to the menu, categories, or featured offerings."
            />
          </FieldShell>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            Shared CTA
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Section Button</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use this CTA as the shared button for category layouts or as the fallback action for cards without custom buttons.
          </p>
          <div className="mt-5 grid gap-4">
            <FieldShell label="Button Label" hint="Shared CTA text">
              <input
                type="text"
                value={formConfig.ctaButton?.label || ''}
                onChange={(event) => updateCtaButton({ label: event.target.value })}
                className={textInputClassName()}
                placeholder="Order Online"
              />
            </FieldShell>
            <FieldShell label="Button Link" hint="URL or section anchor">
              <input
                type="text"
                value={formConfig.ctaButton?.href || ''}
                onChange={(event) => updateCtaButton({ href: event.target.value })}
                className={textInputClassName()}
                placeholder="#order"
              />
            </FieldShell>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {isCategoryMenuLayout(currentLayout) ? (
          <CategoryDrivenLayoutEditor
            currentLayout={currentLayout}
            activeLayoutName={currentLayoutDefinition.name}
            categories={formConfig.categories || []}
            totalItems={menuItemCount}
            totalItemImages={menuImageCount}
            copy={categoryEditorCopy}
            onAddCategory={addCategory}
            onUpdateCategory={updateCategory}
            onRemoveCategory={removeCategory}
            onAddItem={addItemToCategory}
            onUpdateItem={updateCategoryItem}
            onRemoveItem={removeCategoryItem}
            onOpenItemImage={(categoryIndex, itemIndex) =>
              openMediaGallery({
                type: 'category_item_image',
                categoryIndex,
                itemIndex,
              })
            }
          />
        ) : (
          <DirectLayoutItemEditor
            layout={currentLayout}
            items={layoutItems}
            onUpdate={updateLayoutItem}
            onOpenImage={(itemIndex) =>
              openMediaGallery({ type: 'layout_item_image', itemIndex })
            }
          />
        )}
      </div>
    </SettingsCard>
  );

  const mediaSection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5A2.25 2.25 0 016.75 5.25h10.5A2.25 2.25 0 0119.5 7.5v9a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 16.5v-9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15l2.25-2.25a1.5 1.5 0 012.122 0L15 15m-5.25-5.25h.008v.008H9.75V9.75z" />
        </svg>
      }
      title="Media & Display"
      description="Manage section-level media, image fallback behavior, and display toggles used across the selected menu layout."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <MediaPickerCard
          label="Header Image"
          description="Used by tabs, feature layouts, and as fallback media when item images are missing."
          value={formConfig.headerImage}
          onSelect={() => openMediaGallery({ type: 'header_image' })}
          onClear={() => updateConfig({ headerImage: '' })}
        />
        <MediaPickerCard
          label="Background Image"
          description="Optional section backdrop for a more atmospheric preview and live section presentation."
          value={formConfig.backgroundImage}
          onSelect={() => openMediaGallery({ type: 'background_image' })}
          onClear={() => updateConfig({ backgroundImage: '' })}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ColorField
          label="Overlay Color"
          value={formConfig.overlayColor || '#0f172a'}
          onChange={(value) => updateConfig({ overlayColor: value })}
          hint="Applied when a background image is active"
        />
        <FieldShell label="Overlay Opacity" hint={`${Math.round((formConfig.overlayOpacity || 0.52) * 100)}%`}>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.02"
            value={formConfig.overlayOpacity || 0.52}
            onChange={(event) => updateConfig({ overlayOpacity: Number(event.target.value) })}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600"
          />
        </FieldShell>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ToggleRow
          title="Show Item Images"
          description="Display per-item images in layouts that support media."
          checked={Boolean(formConfig.showImages)}
          onChange={(checked) => updateConfig({ showImages: checked })}
        />
        <ToggleRow
          title="Show Prices"
          description="Display pricing in cards, lists, and accordion rows."
          checked={Boolean(formConfig.showPrices)}
          onChange={(checked) => updateConfig({ showPrices: checked })}
        />
        <ToggleRow
          title="Show Descriptions"
          description="Display item descriptions in previews and the live layout."
          checked={Boolean(formConfig.showDescriptions)}
          onChange={(checked) => updateConfig({ showDescriptions: checked })}
        />
        <ToggleRow
          title="Show Dietary Badges"
          description="Display dietary tags when menu items include them."
          checked={Boolean(formConfig.showDietaryInfo)}
          onChange={(checked) => updateConfig({ showDietaryInfo: checked })}
        />
        <ToggleRow
          title="Show Category Icons"
          description="Display category icon initials where supported."
          checked={Boolean(formConfig.showCategoryIcons)}
          onChange={(checked) => updateConfig({ showCategoryIcons: checked })}
        />
      </div>
    </SettingsCard>
  );

  const typographySection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15M7.5 4.5v6m9-6v6M4.5 13.5h9m-9 4.5h15" />
        </svg>
      }
      title="Typography"
      description="Control section typography plus menu-item text styling for desktop and mobile."
      action={<ResponsiveViewportTabs value={editorViewport} onChange={setEditorViewport} scope="menu-typography" />}
    >
      <div className="space-y-5">
        <ToggleRow
          title="Use Custom Section Typography"
          description="When disabled, title, subtitle, and paragraph typography follow the global style config."
          checked={Boolean(formConfig.is_custom)}
          onChange={(checked) => updateConfig({ is_custom: checked })}
        />

        <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
          <SectionTypographyControls
            value={formConfig}
            onChange={updateConfig}
            showAdvancedControls
            viewport={editorViewport}
          />
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Menu Item Typography</h3>
            <p className="mt-1 text-sm text-slate-600">
              Separate item-level text styling for titles, descriptions, prices, and card alignment.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FieldShell label="Item Title Size" hint="Desktop card headline size" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemTitleSize: undefined }), 'Use desktop item title size') : undefined}>
              <input type="text" value={currentItemTitleSize} onChange={(event) => updateResponsiveField('itemTitleSize', 'mobileItemTitleSize', event.target.value)} className={textInputClassName()} placeholder="1.125rem" />
            </FieldShell>
            <FieldShell label="Item Title Weight" hint="Font weight for card titles" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemTitleWeight: undefined }), 'Use desktop item title weight') : undefined}>
              <select value={String(getResponsiveValue(formConfig, 'itemTitleWeight', 'mobileItemTitleWeight', editorViewport, DEFAULT_MENU_CONFIG.itemTitleWeight || 700))} onChange={(event) => updateResponsiveField('itemTitleWeight', 'mobileItemTitleWeight', Number(event.target.value))} className={selectClassName()}>
                {[400, 500, 600, 700, 800].map((weight) => (
                  <option key={weight} value={weight}>
                    {weight}
                  </option>
                ))}
              </select>
            </FieldShell>
            <FieldShell label="Description Size" hint="Size for supporting copy" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemDescriptionSize: undefined }), 'Use desktop description size') : undefined}>
              <input type="text" value={currentItemDescriptionSize} onChange={(event) => updateResponsiveField('itemDescriptionSize', 'mobileItemDescriptionSize', event.target.value)} className={textInputClassName()} placeholder="0.95rem" />
            </FieldShell>
            <FieldShell label="Price Size" hint="Price highlight size" action={isMobileEditing ? resetButton(() => updateConfig({ mobilePriceTextSize: undefined }), 'Use desktop price size') : undefined}>
              <input type="text" value={currentPriceTextSize} onChange={(event) => updateResponsiveField('priceTextSize', 'mobilePriceTextSize', event.target.value)} className={textInputClassName()} placeholder="1rem" />
            </FieldShell>
            <FieldShell label="Line Height" hint="Line height for body copy" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemLineHeight: undefined }), 'Use desktop line height') : undefined}>
              <input type="text" value={currentItemLineHeight} onChange={(event) => updateResponsiveField('itemLineHeight', 'mobileItemLineHeight', event.target.value)} className={textInputClassName()} placeholder="1.65" />
            </FieldShell>
            <FieldShell label="Letter Spacing" hint="Tracking for card copy" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemLetterSpacing: undefined }), 'Use desktop letter spacing') : undefined}>
              <input type="text" value={currentItemLetterSpacing} onChange={(event) => updateResponsiveField('itemLetterSpacing', 'mobileItemLetterSpacing', event.target.value)} className={textInputClassName()} placeholder="0" />
            </FieldShell>
            <FieldShell label="Item Alignment" hint="Alignment for card copy" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemTextAlign: undefined }), 'Use desktop item alignment') : undefined}>
              <select value={currentItemTextAlign} onChange={(event) => updateResponsiveField('itemTextAlign', 'mobileItemTextAlign', event.target.value)} className={selectClassName()}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </FieldShell>
          </div>
        </div>
      </div>
    </SettingsCard>
  );

  const stylingSection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M6.75 3.75v6m10.5-6v6M4.5 13.5h15m-12 3.75h9" />
        </svg>
      }
      title="Colors, Styling & Motion"
      description="Fine-tune colors, card surfaces, spacing, width, and page-scroll animation settings."
      action={<ResponsiveViewportTabs value={editorViewport} onChange={setEditorViewport} scope="menu-styling" />}
    >
      <div className="space-y-6">
        <div className="rounded-[26px] border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Section Colors</h3>
            <p className="mt-1 text-sm text-slate-600">
              Apply section-level background, card, border, accent, and state colors for this viewport.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ColorField label="Section Background" value={currentBgColor} onChange={(value) => updateResponsiveField('bgColor', 'mobileBgColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileBgColor: undefined }), 'Use desktop background') : undefined} />
            <ColorField label="Text Color" value={currentTextColor} onChange={(value) => updateResponsiveField('textColor', 'mobileTextColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileTextColor: undefined }), 'Use desktop text color') : undefined} />
            <ColorField label="Accent Color" value={currentAccentColor} onChange={(value) => updateResponsiveField('accentColor', 'mobileAccentColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileAccentColor: undefined }), 'Use desktop accent color') : undefined} />
            <ColorField label="Card Background" value={currentCardBgColor} onChange={(value) => updateResponsiveField('cardBgColor', 'mobileCardBgColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileCardBgColor: undefined }), 'Use desktop card background') : undefined} />
            <ColorField label="Card Border" value={currentCardBorderColor} onChange={(value) => updateResponsiveField('cardBorderColor', 'mobileCardBorderColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileCardBorderColor: undefined }), 'Use desktop card border') : undefined} />
            <ColorField label="Divider Color" value={currentDividerColor} onChange={(value) => updateResponsiveField('dividerColor', 'mobileDividerColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileDividerColor: undefined }), 'Use desktop divider color') : undefined} />
            <ColorField label="Badge Color" value={currentBadgeColor} onChange={(value) => updateResponsiveField('badgeColor', 'mobileBadgeColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileBadgeColor: undefined }), 'Use desktop badge color') : undefined} />
            <ColorField label="Price Highlight" value={currentPriceColor} onChange={(value) => updateResponsiveField('priceColor', 'mobilePriceColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobilePriceColor: undefined }), 'Use desktop price color') : undefined} />
            <ColorField label="Button Background" value={currentButtonBgColor} onChange={(value) => updateResponsiveField('buttonBgColor', 'mobileButtonBgColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileButtonBgColor: undefined }), 'Use desktop button background') : undefined} />
            <ColorField label="Button Text" value={currentButtonTextColor} onChange={(value) => updateResponsiveField('buttonTextColor', 'mobileButtonTextColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileButtonTextColor: undefined }), 'Use desktop button text color') : undefined} />
            <ColorField label="Active Tab Color" value={currentActiveTabColor} onChange={(value) => updateResponsiveField('activeTabColor', 'mobileActiveTabColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileActiveTabColor: undefined }), 'Use desktop active tab color') : undefined} />
            <ColorField label="Accordion Active" value={currentAccordionActiveColor} onChange={(value) => updateResponsiveField('accordionActiveColor', 'mobileAccordionActiveColor', value)} action={isMobileEditing ? resetButton(() => updateConfig({ mobileAccordionActiveColor: undefined }), 'Use desktop accordion active color') : undefined} />
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Card Styling & Spacing</h3>
            <p className="mt-1 text-sm text-slate-600">
              Control card radius, shadow intensity, and spacing between content blocks.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FieldShell label="Card Radius" hint="Rounded corners for cards" action={isMobileEditing ? resetButton(() => updateConfig({ mobileCardRadius: undefined }), 'Use desktop card radius') : undefined}>
              <input type="text" value={currentCardRadius} onChange={(event) => updateResponsiveField('cardRadius', 'mobileCardRadius', event.target.value)} className={textInputClassName()} placeholder="1.4rem" />
            </FieldShell>
            <FieldShell label="Card Shadow" hint="Elevation of the menu cards" action={isMobileEditing ? resetButton(() => updateConfig({ mobileCardShadow: undefined }), 'Use desktop card shadow') : undefined}>
              <select value={String(currentCardShadow)} onChange={(event) => updateResponsiveField('cardShadow', 'mobileCardShadow', event.target.value)} className={selectClassName()}>
                <option value="none">None</option>
                <option value="soft">Soft</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </FieldShell>
            <FieldShell label="Card Gap" hint="Generic card spacing" action={isMobileEditing ? resetButton(() => updateConfig({ mobileCardGap: undefined }), 'Use desktop card gap') : undefined}>
              <input type="text" value={currentCardGap} onChange={(event) => updateResponsiveField('cardGap', 'mobileCardGap', event.target.value)} className={textInputClassName()} placeholder="1.25rem" />
            </FieldShell>
            <FieldShell label="Grid Gap" hint="Grid spacing between items" action={isMobileEditing ? resetButton(() => updateConfig({ mobileGridGap: undefined }), 'Use desktop grid gap') : undefined}>
              <input type="text" value={currentGridGap} onChange={(event) => updateResponsiveField('gridGap', 'mobileGridGap', event.target.value)} className={textInputClassName()} placeholder="1.4rem" />
            </FieldShell>
            <FieldShell label="Row Spacing" hint="Spacing between larger layout groups" action={isMobileEditing ? resetButton(() => updateConfig({ mobileRowSpacing: undefined }), 'Use desktop row spacing') : undefined}>
              <input type="text" value={currentRowGap} onChange={(event) => updateResponsiveField('rowSpacing', 'mobileRowSpacing', event.target.value)} className={textInputClassName()} placeholder="1.5rem" />
            </FieldShell>
            <FieldShell label="Item Padding" hint="Inner padding for cards" action={isMobileEditing ? resetButton(() => updateConfig({ mobileItemPadding: undefined }), 'Use desktop item padding') : undefined}>
              <input type="text" value={currentItemPadding} onChange={(event) => updateResponsiveField('itemPadding', 'mobileItemPadding', event.target.value)} className={textInputClassName()} placeholder="1.25rem" />
            </FieldShell>
            <FieldShell label="Column Spacing" hint="Gap between larger layout columns" action={isMobileEditing ? resetButton(() => updateConfig({ mobileColumnSpacing: undefined }), 'Use desktop column spacing') : undefined}>
              <input type="text" value={currentColumnSpacing} onChange={(event) => updateResponsiveField('columnSpacing', 'mobileColumnSpacing', event.target.value)} className={textInputClassName()} placeholder="1.5rem" />
            </FieldShell>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
          <SectionAppearanceControls
            value={formConfig}
            onChange={updateConfig}
            viewport={editorViewport}
          />
        </div>
      </div>
    </SettingsCard>
  );

  return (
    <form onSubmit={handleSubmit} className="pb-40">
      <SettingsHeader
        icon={
          <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10.5A2.5 2.5 0 007.5 20h9a2.5 2.5 0 002.5-2.5V7A2 2 0 0017 5h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2m-8 6h8m-8 4h5" />
          </svg>
        }
        title={isNewSection ? 'Add Menu Section' : 'Menu Settings'}
        description="Upgrade menu layouts with responsive layout-specific controls, richer styling, and polished live previews."
        meta={restaurantName ? `Restaurant: ${restaurantName}` : undefined}
        action={
          <button
            type="submit"
            disabled={updating}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition-all ${
              updating
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-slate-900 text-white hover:-translate-y-0.5 hover:bg-slate-800'
            }`}
          >
            {updating ? 'Saving...' : 'Save Menu Settings'}
          </button>
        }
      />

      <div className="mb-8 flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
            Responsive Editing
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Switch between desktop and mobile overrides for layout settings, typography, spacing, colors, and live preview behavior.
          </p>
        </div>
        <ResponsiveViewportTabs value={editorViewport} onChange={setEditorViewport} scope="menu-editor" />
      </div>

      <div className="space-y-8">
        {layoutSection}
        {contentSection}
        {mediaSection}
        {typographySection}
        {stylingSection}
      </div>

      <FloatingPreviewButton
        viewport="desktop"
        onClick={() => {
          setPreviewViewport('desktop');
          setShowPreview(true);
        }}
      />

      {showPreview ? (
        <PreviewModal
          title="Menu Preview"
          description="Desktop and mobile previews update instantly as you edit layout-specific controls, media, typography, colors, and spacing."
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setShowPreview(false)}
          note="Live preview reflects the selected layout, responsive overrides, colors, media, and motion settings."
        >
          <Menu {...formConfig} previewMode={previewViewport} />
        </PreviewModal>
      ) : null}

      <ImageGalleryModal
        isOpen={showGalleryModal}
        onClose={() => {
          setShowGalleryModal(false);
          setCurrentMediaField(null);
        }}
        onSelect={handleMediaSelect}
        restaurantId={restaurantId}
        title={galleryCopy.title}
        description={galleryCopy.description}
      />

      {showToast ? (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      ) : null}
    </form>
  );
}
