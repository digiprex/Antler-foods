'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/menu';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from '@/components/admin/image-gallery-modal';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import {
  FloatingPreviewButton,
  LayoutCard,
  PreviewModal,
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
import {
  SECTION_STYLE_KEYS,
  type SectionStyleConfig,
} from '@/types/section-style.types';

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

const NON_TYPOGRAPHY_SECTION_KEYS = new Set([
  'is_custom',
  'buttonStyleVariant',
  'sectionTextAlign',
  'mobileSectionTextAlign',
  'sectionMaxWidth',
  'mobileSectionMaxWidth',
  'sectionPaddingY',
  'mobileSectionPaddingY',
  'sectionPaddingX',
  'mobileSectionPaddingX',
  'surfaceBorderRadius',
  'mobileSurfaceBorderRadius',
  'surfaceShadow',
  'mobileSurfaceShadow',
  'enableScrollReveal',
  'scrollRevealAnimation',
] satisfies Array<keyof SectionStyleConfig>);

const TYPOGRAPHY_SECTION_KEYS = SECTION_STYLE_KEYS.filter(
  (key) => !NON_TYPOGRAPHY_SECTION_KEYS.has(key),
);

const DEFAULT_PRIMARY_MENU_BUTTON: MenuButton = {
  label: '',
  href: '',
  variant: 'primary',
};

const DEFAULT_SECONDARY_MENU_BUTTON: MenuButton = {
  label: '',
  href: '',
  variant: 'outline',
};

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

function normalizeMenuButtons(config: MenuConfig): MenuConfig {
  const legacyPrimaryButton = config.primaryButton || config.ctaButton;

  return {
    ...config,
    primaryButton: legacyPrimaryButton
      ? {
          ...DEFAULT_PRIMARY_MENU_BUTTON,
          ...legacyPrimaryButton,
          variant: legacyPrimaryButton.variant || 'primary',
        }
      : undefined,
    secondaryButton: config.secondaryButton
      ? {
          ...DEFAULT_SECONDARY_MENU_BUTTON,
          ...config.secondaryButton,
          variant: config.secondaryButton.variant || 'outline',
        }
      : undefined,
  };
}

function normalizeMenuConfig(config: Partial<MenuConfig>): MenuConfig {
  return ensureLayoutItems(
    hydrateFeaturedItems(
      withMenuLayoutDefaults({
        ...normalizeMenuButtons({
          ...DEFAULT_MENU_CONFIG,
          ...config,
        } as MenuConfig),
      }),
    ),
  );
}

function mergeGlobalTypographyDefaults(
  config: MenuConfig,
  defaults?: Partial<SectionStyleConfig>,
): MenuConfig {
  if (!defaults) {
    return config;
  }

  const typographyDefaults: Partial<MenuConfig> = {};

  TYPOGRAPHY_SECTION_KEYS.forEach((key) => {
    const value = defaults[key];
    if (value !== undefined) {
      (typographyDefaults as Record<string, unknown>)[key] = value;
    }
  });

  return normalizeMenuConfig({
    ...config,
    ...typographyDefaults,
  });
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
        checked={Boolean(value)}
        onChange={(checked) =>
          onChange(isMobile && control.mobileField ? control.mobileField : control.field, checked)
        }
      />
    );
  }

  if (control.kind === 'select') {
    return (
      <FieldShell label={control.label} action={reset}>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelect}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
          >
            {value ? 'Replace' : 'Choose'}
          </button>
          {value ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {value ? (
          <img src={value} alt={label} className="h-32 w-full object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_42%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1))] text-sm font-medium text-slate-500">
            No image selected
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
    <div className="space-y-4">
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((item, itemIndex) => (
          <div
            key={`menu-layout-item-${itemIndex}`}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Item {itemIndex + 1}
                </div>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  {item.name?.trim() || `${definition.name} Item ${itemIndex + 1}`}
                </h3>
              </div>
              {showImages ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenImage(itemIndex)}
                    className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100"
                  >
                    {item.image ? 'Replace' : 'Choose Image'}
                  </button>
                  {item.image ? (
                    <button
                      type="button"
                      onClick={() => onUpdate(itemIndex, { image: '' })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {showImages ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {item.image ? (
                    <img src={item.image} alt={item.name || `Menu item ${itemIndex + 1}`} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_42%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1))] text-sm font-medium text-slate-500">
                      No image selected
                    </div>
                  )}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <FieldShell label="Title">
                  <input
                    type="text"
                    value={item.name || ''}
                    onChange={(event) => onUpdate(itemIndex, { name: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Signature Pasta"
                  />
                </FieldShell>
                <FieldShell label="Label">
                  <input
                    type="text"
                    value={item.category || ''}
                    onChange={(event) => onUpdate(itemIndex, { category: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Chef Pick"
                  />
                </FieldShell>
                <FieldShell label="Price">
                  <input
                    type="text"
                    value={item.price || ''}
                    onChange={(event) => onUpdate(itemIndex, { price: event.target.value })}
                    className={textInputClassName()}
                    placeholder="24"
                  />
                </FieldShell>
                <FieldShell label="Badge">
                  <input
                    type="text"
                    value={item.badge || ''}
                    onChange={(event) => onUpdate(itemIndex, { badge: event.target.value })}
                    className={textInputClassName()}
                    placeholder="Best Seller"
                  />
                </FieldShell>
              </div>

              <FieldShell label="Description">
                <textarea
                  value={item.description || ''}
                  onChange={(event) => onUpdate(itemIndex, { description: event.target.value })}
                  className={textareaClassName()}
                  placeholder="Short supporting copy about this menu item or promotion."
                />
              </FieldShell>

              {definition.usesButtons ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Button Text">
                    <input
                      type="text"
                      value={item.ctaLabel || ''}
                      onChange={(event) => onUpdate(itemIndex, { ctaLabel: event.target.value })}
                      className={textInputClassName()}
                      placeholder="Order Now"
                    />
                  </FieldShell>
                  <FieldShell label="Button Link">
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
                <FieldShell label="Image Link">
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
  const editorViewport: EditorViewport = 'desktop';
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
        mergeGlobalTypographyDefaults(
          normalizeMenuConfig({
            ...DEFAULT_MENU_CONFIG,
            ...sectionStyleDefaults,
            title: '',
            subtitle: '',
            description: '',
            restaurant_id: restaurantId,
          }),
          sectionStyleDefaults,
        ),
      );
      return;
    }

    if (config) {
      const normalized = normalizeMenuConfig({
        ...sectionStyleDefaults,
        ...config,
      });

      setFormConfig(
        config.is_custom === true
          ? normalized
          : mergeGlobalTypographyDefaults(normalized, sectionStyleDefaults),
      );
    }
  }, [config, formConfig, isNewSection, restaurantId, sectionStyleDefaults]);

  useEffect(() => {
    setFormConfig((previous) =>
      previous
        ? previous.is_custom === true
          ? normalizeMenuConfig({
              ...sectionStyleDefaults,
              ...previous,
            })
          : mergeGlobalTypographyDefaults(
              normalizeMenuConfig({
                ...sectionStyleDefaults,
                ...previous,
              }),
              sectionStyleDefaults,
            )
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

  const handleCustomTypographyToggle = (checked: boolean) => {
    setFormConfig((previous) => {
      if (!previous) {
        return previous;
      }

      if (!checked) {
        return mergeGlobalTypographyDefaults(
          normalizeMenuConfig({
            ...previous,
            is_custom: false,
          }),
          sectionStyleDefaults,
        );
      }

      return normalizeMenuConfig({
        ...mergeGlobalTypographyDefaults(previous, sectionStyleDefaults),
        is_custom: true,
      });
    });
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

  const updatePrimaryButton = (updates: Partial<MenuButton>) => {
    setFormConfig((previous) =>
      previous
        ? normalizeMenuConfig({
            ...previous,
            primaryButtonEnabled: true,
            primaryButton: {
              ...DEFAULT_PRIMARY_MENU_BUTTON,
              ...(previous.primaryButton || previous.ctaButton || {}),
              ...updates,
            },
            ctaButton: {
              ...DEFAULT_PRIMARY_MENU_BUTTON,
              ...(previous.primaryButton || previous.ctaButton || {}),
              ...updates,
            },
          })
        : previous,
    );
  };

  const updateSecondaryButton = (updates: Partial<MenuButton>) => {
    setFormConfig((previous) =>
      previous
        ? normalizeMenuConfig({
            ...previous,
            secondaryButtonEnabled: true,
            secondaryButton: {
              ...DEFAULT_SECONDARY_MENU_BUTTON,
              ...(previous.secondaryButton || {}),
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

      if (normalizedConfig.is_custom !== true) {
        TYPOGRAPHY_SECTION_KEYS.forEach((key) => {
          delete payload[key];
        });
        payload.is_custom = false;
      }

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
  const galleryCopy = getGalleryModalCopy(currentMediaField);
  const primaryButtonEnabled = formConfig.primaryButtonEnabled !== false;
  const secondaryButtonEnabled =
    formConfig.secondaryButtonEnabled === true ||
    Boolean(formConfig.secondaryButton?.label?.trim() || formConfig.secondaryButton?.href?.trim());
  const editablePrimaryButton =
    formConfig.primaryButton ||
    formConfig.ctaButton ||
    DEFAULT_PRIMARY_MENU_BUTTON;
  const editableSecondaryButton =
    formConfig.secondaryButton || DEFAULT_SECONDARY_MENU_BUTTON;

  const layoutSection = (
    <SettingsCard
      icon={
        <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.75 6.75h14.5M4.75 12h14.5M4.75 17.25h14.5" />
        </svg>
      }
      title="Layout Configuration"
      description="Choose a menu layout and adjust only the settings for that layout."
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

      <div className="mt-5 space-y-3">
        {currentLayoutDefinition.controlGroups.map((group) => (
          <div
            key={`${currentLayout}-${group.title}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
          >
            {currentLayoutDefinition.controlGroups.length > 1 ? (
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{group.title}</h3>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
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
          <FieldShell label="Section Title">
            <input
              type="text"
              value={formConfig.title || ''}
              onChange={(event) => updateConfig({ title: event.target.value })}
              className={textInputClassName()}
              placeholder="Our Menu"
            />
          </FieldShell>
          <FieldShell label="Subtitle">
            <input
              type="text"
              value={formConfig.subtitle || ''}
              onChange={(event) => updateConfig({ subtitle: event.target.value })}
              className={textInputClassName()}
              placeholder="Seasonal dishes and house favorites"
            />
          </FieldShell>
          <FieldShell label="Description">
            <textarea
              value={formConfig.description || ''}
              onChange={(event) => updateConfig({ description: event.target.value })}
              className={textareaClassName()}
              placeholder="Give guests a quick introduction to the menu, categories, or featured offerings."
            />
          </FieldShell>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-semibold text-slate-900">Section Actions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Primary button is used as the shared CTA for this section.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Primary Button
                  </label>
                  <p className="text-xs text-slate-500">Shared CTA</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={primaryButtonEnabled}
                    onChange={(event) => {
                      if (event.target.checked) {
                        updateConfig({
                          primaryButtonEnabled: true,
                          primaryButton:
                            formConfig.primaryButton ||
                            formConfig.ctaButton || {
                              ...DEFAULT_PRIMARY_MENU_BUTTON,
                            },
                        });
                      } else {
                        updateConfig({ primaryButtonEnabled: false });
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                </label>
              </div>

              {primaryButtonEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <FieldShell label="Text">
                    <input
                      type="text"
                      value={editablePrimaryButton.label}
                      onChange={(event) =>
                        updatePrimaryButton({ label: event.target.value })
                      }
                      className={textInputClassName()}
                      placeholder="Order Online"
                    />
                  </FieldShell>
                  <FieldShell label="Link">
                    <input
                      type="text"
                      value={editablePrimaryButton.href}
                      onChange={(event) =>
                        updatePrimaryButton({ href: event.target.value })
                      }
                      className={textInputClassName()}
                      placeholder="#order"
                    />
                  </FieldShell>
                  <div className="md:col-span-2">
                    <FieldShell label="Style">
                      <select
                        value={editablePrimaryButton.variant || 'primary'}
                        onChange={(event) =>
                          updatePrimaryButton({
                            variant: event.target.value as
                              | 'primary'
                              | 'secondary'
                              | 'outline',
                          })
                        }
                        className={selectClassName()}
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="outline">Outline</option>
                      </select>
                    </FieldShell>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-800">
                    Secondary Button
                  </label>
                  <p className="text-xs text-slate-500">Optional action</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={secondaryButtonEnabled}
                    onChange={(event) => {
                      if (event.target.checked) {
                        updateConfig({
                          secondaryButtonEnabled: true,
                          secondaryButton: formConfig.secondaryButton || {
                            ...DEFAULT_SECONDARY_MENU_BUTTON,
                          },
                        });
                      } else {
                        updateConfig({ secondaryButtonEnabled: false });
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
                </label>
              </div>

              {secondaryButtonEnabled ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <FieldShell label="Text">
                    <input
                      type="text"
                      value={editableSecondaryButton.label}
                      onChange={(event) =>
                        updateSecondaryButton({ label: event.target.value })
                      }
                      className={textInputClassName()}
                      placeholder="Book a Table"
                    />
                  </FieldShell>
                  <FieldShell label="Link">
                    <input
                      type="text"
                      value={editableSecondaryButton.href}
                      onChange={(event) =>
                        updateSecondaryButton({ href: event.target.value })
                      }
                      className={textInputClassName()}
                      placeholder="#reservations"
                    />
                  </FieldShell>
                  <div className="md:col-span-2">
                    <FieldShell label="Style">
                      <select
                        value={editableSecondaryButton.variant || 'outline'}
                        onChange={(event) =>
                          updateSecondaryButton({
                            variant: event.target.value as
                              | 'primary'
                              | 'secondary'
                              | 'outline',
                          })
                        }
                        className={selectClassName()}
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="outline">Outline</option>
                      </select>
                    </FieldShell>
                  </div>
                </div>
              ) : null}
            </div>
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
      title="Media and Display"
      description="Choose section images and the basic display options used in the live menu."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <MediaPickerCard
          label="Header Image"
          description="Used as the main section image and as fallback media where needed."
          value={formConfig.headerImage}
          onSelect={() => openMediaGallery({ type: 'header_image' })}
          onClear={() => updateConfig({ headerImage: '' })}
        />
        <MediaPickerCard
          label="Background Image"
          description="Optional backdrop behind the menu section."
          value={formConfig.backgroundImage}
          onSelect={() => openMediaGallery({ type: 'background_image' })}
          onClear={() => updateConfig({ backgroundImage: '' })}
        />
      </div>

      {formConfig.backgroundImage ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Background Overlay
            </h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ColorField
              label="Overlay Color"
              value={formConfig.overlayColor || '#0f172a'}
              onChange={(value) => updateConfig({ overlayColor: value })}
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
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Display Options
          </h3>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
        <ToggleRow
          title="Show Item Images"
          checked={Boolean(formConfig.showImages)}
          onChange={(checked) => updateConfig({ showImages: checked })}
        />
        <ToggleRow
          title="Show Prices"
          checked={Boolean(formConfig.showPrices)}
          onChange={(checked) => updateConfig({ showPrices: checked })}
        />
        <ToggleRow
          title="Show Descriptions"
          checked={Boolean(formConfig.showDescriptions)}
          onChange={(checked) => updateConfig({ showDescriptions: checked })}
        />
        <ToggleRow
          title="Show Dietary Badges"
          checked={Boolean(formConfig.showDietaryInfo)}
          onChange={(checked) => updateConfig({ showDietaryInfo: checked })}
        />
        <ToggleRow
          title="Show Category Icons"
          checked={Boolean(formConfig.showCategoryIcons)}
          onChange={(checked) => updateConfig({ showCategoryIcons: checked })}
        />
        </div>
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
      title="Typography and Responsive Structure"
      description="Keep menu typography aligned with the global theme by default, then opt into section-specific overrides only when needed."
    >
      <div className="space-y-5">
        <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Page Scroll Animation</h3>
              <p className="mt-1 text-sm text-slate-600">
                Reveal the entire menu section when it enters the viewport.
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formConfig.enableScrollReveal === true}
                onChange={(event) =>
                  updateConfig({ enableScrollReveal: event.target.checked })
                }
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-violet-500/30" />
            </label>
          </div>
          {formConfig.enableScrollReveal ? (
            <div className="mt-4">
              <FieldShell label="Reveal Animation Style">
                <select
                  value={formConfig.scrollRevealAnimation || 'fade-up'}
                  onChange={(event) =>
                    updateConfig({
                      scrollRevealAnimation:
                        event.target.value as SectionStyleConfig['scrollRevealAnimation'],
                    })
                  }
                  className={selectClassName()}
                >
                  <option value="fade">Fade</option>
                  <option value="fade-up">Fade Up</option>
                  <option value="slide-up">Slide Up</option>
                  <option value="soft-reveal">Soft Reveal</option>
                </select>
              </FieldShell>
            </div>
          ) : null}
        </div>

        <ToggleRow
          title="Use Global Styles"
          description="When enabled, title, subtitle, and paragraph typography inherit from the global theme."
          checked={formConfig.is_custom !== true}
          onChange={(checked) => handleCustomTypographyToggle(!checked)}
        />

        {formConfig.is_custom ? (
          <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5">
            <SectionTypographyControls
              value={formConfig}
              onChange={updateConfig}
              showAdvancedControls
              viewport={editorViewport}
            />
          </div>
        ) : (
          <div className="rounded-[26px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-800">
            Typography is inherited from the global theme. Disable the toggle above to edit section-specific title, subtitle, and paragraph typography for this menu.
          </div>
        )}
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
        description="Configure menu layouts with cleaner responsive controls, polished typography, and live preview."
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

      <div className="space-y-8">
        {layoutSection}
        {contentSection}
        {mediaSection}
        {typographySection}
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
          description="Desktop and mobile previews update instantly as you edit layout, media, typography, and motion settings."
          viewport={previewViewport}
          onViewportChange={setPreviewViewport}
          onClose={() => setShowPreview(false)}
          note="Live preview reflects the selected layout, responsive overrides, media, typography, and motion settings."
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
