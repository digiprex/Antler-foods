/**
 * Menu Component
 *
 * Displays menu items with different layout options.
 */

'use client';

import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import type {
  MenuButton,
  MenuCategory,
  MenuConfig,
  MenuItem,
  MenuLayout,
} from '@/types/menu.types';
import { DEFAULT_MENU_CONFIG } from '@/types/menu.types';
import styles from './menu.module.css';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import {
  getMenuLayoutDefinition,
  mergeMenuLayoutSettings,
} from '@/lib/menu-layout-schema';
import {
  applyMenuSharedSpacingDefaults,
  resolveMenuInternalGap,
  resolveMenuSectionPadding,
  resolveMenuSpacingTier,
  spacingValueToPixels,
} from '@/lib/menu-spacing';
import {
  getSectionContainerStyles,
  getSectionTypographyStyles,
  getSelectedGlobalButtonStyle,
  getButtonInlineStyle,
  getSurfaceShadowValue,
} from '@/lib/section-style';

interface MenuProps extends Partial<MenuConfig> {
  className?: string;
  previewMode?: 'desktop' | 'mobile';
}

interface PreparedMenuItem extends MenuItem {
  categoryName: string;
  categoryDescription?: string;
  categoryIcon?: string;
}

const PRESET_CATEGORY_SYMBOLS = ['M', 'S', 'F', 'D'];
const GRID_IMAGE_HEIGHT_LAYOUTS = new Set<MenuLayout>([
  'masonry',
  'carousel',
  'two-column',
  'single-column',
]);
const PREVIEW_PLACEHOLDER_COPY = {
  title: 'Title',
  subtitle: 'Subtitle',
  content: 'Content',
  button: 'Button',
};
const PREVIEW_DIRECT_ITEM_LIBRARY: MenuItem[] = [
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
  {
    name: PREVIEW_PLACEHOLDER_COPY.title,
    description: PREVIEW_PLACEHOLDER_COPY.content,
    price: '',
    category: PREVIEW_PLACEHOLDER_COPY.subtitle,
    ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
    ctaLink: '/menu',
  },
];

function joinClasses(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function getItemIdentifier(item: MenuItem) {
  return item.id ? `id:${item.id}` : `name:${item.name}`;
}

function withFeaturedFlags(
  categories: MenuCategory[] | undefined,
  featuredItems: MenuItem[] | undefined,
) {
  const featuredKeys = new Set((featuredItems || []).map(getItemIdentifier));

  return (categories || []).map((category) => ({
    ...category,
    items: (category.items || []).map((item) => ({
      ...item,
      featured: item.featured || featuredKeys.has(getItemIdentifier(item)),
    })),
  }));
}

function buildPreparedCategories(
  categories: MenuCategory[] | undefined,
  featuredItems: MenuItem[] | undefined,
  title: string,
  options?: {
    preserveEmptyCategories?: boolean;
  },
) {
  const hydratedCategories = withFeaturedFlags(categories, featuredItems);

  if (options?.preserveEmptyCategories) {
    return hydratedCategories.filter(
      (category) =>
        Boolean(category.name?.trim()) ||
        Boolean(category.description?.trim()) ||
        Boolean(category.icon?.trim()) ||
        (category.items || []).length > 0,
    );
  }

  const populatedCategories = hydratedCategories.filter(
    (category) => (category.items || []).length > 0,
  );

  if (populatedCategories.length > 0) {
    return populatedCategories;
  }

  if ((featuredItems || []).length > 0) {
    return [
      {
        name: title || 'Featured Menu',
        description: 'Highlighted items from your menu',
        items: featuredItems,
      },
    ] satisfies MenuCategory[];
  }

  return [] as MenuCategory[];
}

function prepareItems(categories: MenuCategory[]) {
  return categories.flatMap((category) =>
    (category.items || []).map(
      (item): PreparedMenuItem => ({
        ...item,
        categoryName: item.category || category.name,
        categoryDescription: category.description,
        categoryIcon: category.icon,
      }),
    ),
  );
}

function buildFeaturedItems(
  featuredItems: MenuItem[] | undefined,
  allItems: PreparedMenuItem[],
) {
  if ((featuredItems || []).length > 0) {
    return featuredItems!.map((item) => {
      const matched = allItems.find(
        (candidate) =>
          (item.id && candidate.id === item.id) ||
          (!item.id && candidate.name === item.name),
      );

      return (
        matched || {
          ...item,
          categoryName: item.category || 'Featured',
          categoryDescription: undefined,
          categoryIcon: undefined,
        }
      );
    });
  }

  const flaggedItems = allItems.filter((item) => item.featured);
  return flaggedItems.length > 0 ? flaggedItems : allItems;
}

function hasRenderableItemContent(item: MenuItem) {
  return Boolean(
    item.name?.trim() ||
    item.description?.trim() ||
    item.image ||
    item.ctaLabel?.trim() ||
    item.ctaLink?.trim() ||
    item.badge?.trim() ||
    item.imageLink?.trim(),
  );
}

function getDirectLayoutSlotCount(layout: MenuLayout) {
  return Math.max(0, getMenuLayoutDefinition(layout).itemSlots || 0);
}

function buildDirectLayoutItems(
  layoutItems: MenuItem[] | undefined,
  title: string,
  layout: MenuLayout,
) {
  const slotCount = getDirectLayoutSlotCount(layout);

  if (slotCount === 0) {
    return [];
  }

  return (layoutItems || [])
    .slice(0, slotCount)
    .filter(hasRenderableItemContent)
    .map((item, index): PreparedMenuItem => ({
      ...item,
      name: item.name?.trim() || `Menu ${index + 1}`,
      categoryName: item.category?.trim() || title || '',
      categoryDescription: undefined,
      categoryIcon: undefined,
    }));
}

function buildPreviewDirectItems(layout: MenuLayout, title: string) {
  const slotCount = getDirectLayoutSlotCount(layout);

  return PREVIEW_DIRECT_ITEM_LIBRARY.slice(0, slotCount).map(
    (item): PreparedMenuItem => ({
      ...item,
      categoryName: item.category || title || 'Menu Preview',
      categoryDescription: undefined,
      categoryIcon: undefined,
    }),
  );
}

function buildPreviewCategories(): MenuCategory[] {
  return Array.from({ length: 3 }, (_, index) => ({
    name: `${PREVIEW_PLACEHOLDER_COPY.title}${' '.repeat(index)}`,
    description: PREVIEW_PLACEHOLDER_COPY.subtitle,
    icon: PRESET_CATEGORY_SYMBOLS[index],
    items: [
      {
        id: `preview-category-item-${index + 1}`,
        name: PREVIEW_PLACEHOLDER_COPY.title,
        description: PREVIEW_PLACEHOLDER_COPY.content,
        price: '',
        category: PREVIEW_PLACEHOLDER_COPY.subtitle,
        ctaLabel: PREVIEW_PLACEHOLDER_COPY.button,
        ctaLink: '/menu',
      },
    ],
  }));
}

function getFallbackSymbol(item: PreparedMenuItem, index: number) {
  if (item.categoryIcon?.trim()) {
    return item.categoryIcon.trim().slice(0, 2);
  }

  const firstLetter = item.name?.trim().charAt(0);
  return (
    firstLetter ||
    PRESET_CATEGORY_SYMBOLS[index % PRESET_CATEGORY_SYMBOLS.length]
  );
}

function resolveItemMedia(
  item: PreparedMenuItem,
  headerImage?: string,
  backgroundImage?: string,
) {
  return item.image || item.backgroundImage || headerImage || backgroundImage;
}

function buildCardAction(item: PreparedMenuItem, ctaButton?: MenuButton) {
  const label = item.ctaLabel || ctaButton?.label || '';
  const href = item.ctaLink || ctaButton?.href || '/menu';

  if (!label) {
    return null;
  }

  return { label, href };
}

function buildSecondaryCardAction(item: PreparedMenuItem) {
  const label = item.badge?.trim() || '';
  const href = item.imageLink?.trim() || '/menu';

  if (!label) {
    return null;
  }

  return { label, href };
}

function resolveMenuButton(
  button: MenuButton | undefined,
  fixedVariant: MenuButton['variant'],
) {
  if (!button) {
    return undefined;
  }

  const label = button.label?.trim() || '';
  const href = button.href?.trim() || '/menu';

  if (!label) {
    return undefined;
  }

  return {
    ...button,
    label,
    href,
    variant: fixedVariant,
  } satisfies MenuButton;
}

function resolveResponsiveValue<T>(
  desktopValue: T | undefined,
  mobileValue: T | undefined,
  viewport: 'desktop' | 'mobile',
  fallback: T,
) {
  if (viewport === 'mobile') {
    return (mobileValue ?? desktopValue ?? fallback) as T;
  }

  return (desktopValue ?? fallback) as T;
}

function getAspectRatioValue(value?: string) {
  switch (value) {
    case 'square':
      return '1 / 1';
    case 'portrait':
      return '4 / 5';
    case 'wide':
      return '16 / 9';
    case 'landscape':
    default:
      return '4 / 3';
  }
}

function getGridAlignedImageAspectRatio(
  layout: MenuLayout,
  configuredValue?: string,
) {
  return GRID_IMAGE_HEIGHT_LAYOUTS.has(layout)
    ? 'landscape'
    : configuredValue || 'landscape';
}

function getColumnRatioValue(value?: string) {
  switch (value) {
    case '5:4':
      return 'minmax(0, 1.25fr) minmax(0, 1fr)';
    case '4:5':
      return 'minmax(0, 1fr) minmax(0, 1.25fr)';
    case '3:2':
      return 'minmax(0, 1.5fr) minmax(0, 1fr)';
    case '1:1':
    default:
      return 'repeat(2, minmax(0, 1fr))';
  }
}

function getContentWidthValue(value?: string) {
  switch (value) {
    case 'narrow':
      return '680px';
    case 'wide':
      return '980px';
    case 'medium':
    default:
      return '820px';
  }
}

function getLayoutRecord(
  settings: MenuConfig['layoutSettings'],
  layout: MenuLayout,
): Record<string, string | number | boolean | undefined> {
  return (mergeMenuLayoutSettings(settings)?.[layout] || {}) as Record<
    string,
    string | number | boolean | undefined
  >;
}

function getOverlayBodyStyle(
  position: string,
  textAlign: string,
): CSSProperties {
  const alignment =
    textAlign === 'center'
      ? 'center'
      : textAlign === 'right'
        ? 'flex-end'
        : 'flex-start';

  switch (position) {
    case 'top-left':
      return {
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: alignment,
        textAlign: textAlign as CSSProperties['textAlign'],
      };
    case 'center':
      return {
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      };
    case 'bottom-center':
      return {
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      };
    case 'bottom-left':
    default:
      return {
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: alignment,
        textAlign: textAlign as CSSProperties['textAlign'],
      };
  }
}

function getTitleRowStyle(textAlign: string): CSSProperties {
  return {
    justifyContent:
      textAlign === 'center'
        ? 'center'
        : textAlign === 'right'
          ? 'flex-end'
          : 'flex-start',
  };
}

function getItemEyebrowLabel(
  item: PreparedMenuItem,
  showCategoryIcons: boolean,
) {
  if (!item.categoryName?.trim()) {
    return null;
  }

  return showCategoryIcons && item.categoryIcon
    ? `${item.categoryIcon} ${item.categoryName}`
    : item.categoryName;
}

export default function Menu(rawProps: MenuProps) {
  const {
    restaurant_id,
    title = '',
    subtitle,
    description,
    categories = [],
    featuredItems = [],
    layoutItems = [],
    ctaButton,
    primaryButtonEnabled,
    secondaryButtonEnabled,
    primaryButton,
    secondaryButton,
    headerImage,
    backgroundImage,
    layout = 'grid',
    bgColor = '#ffffff',
    mobileBgColor,
    textColor = '#000000',
    mobileTextColor,
    accentColor = '#3b82f6',
    mobileAccentColor,
    cardBgColor = '#f9fafb',
    mobileCardBgColor,
    cardBorderColor,
    mobileCardBorderColor,
    dividerColor,
    mobileDividerColor,
    badgeColor,
    mobileBadgeColor,
    buttonBgColor,
    mobileButtonBgColor,
    buttonTextColor,
    mobileButtonTextColor,
    priceColor,
    mobilePriceColor,
    activeTabColor,
    mobileActiveTabColor,
    accordionActiveColor,
    mobileAccordionActiveColor,
    cardRadius,
    mobileCardRadius,
    cardShadow,
    mobileCardShadow,
    overlayColor = '#0f172a',
    overlayOpacity = 0.52,
    showImages = true,
    showDescriptions = true,
    showDietaryInfo = false,
    showCategoryIcons = false,
    textAlign = 'center',
    itemTextAlign = 'left',
    mobileItemTextAlign,
    cardGap,
    mobileCardGap,
    gridGap,
    mobileGridGap,
    rowSpacing,
    mobileRowSpacing,
    itemPadding,
    mobileItemPadding,
    columnSpacing,
    mobileColumnSpacing,
    itemTitleSize,
    mobileItemTitleSize,
    itemTitleWeight,
    mobileItemTitleWeight,
    itemDescriptionSize,
    mobileItemDescriptionSize,
    itemLineHeight,
    mobileItemLineHeight,
    itemLetterSpacing,
    mobileItemLetterSpacing,
    priceTextSize,
    mobilePriceTextSize,
    layoutSettings,
    className,
    previewMode,
    is_custom,
    buttonStyleVariant,
    titleFontFamily,
    titleFontSize,
    titleFontWeight,
    titleColor,
    subtitleFontFamily,
    subtitleFontSize,
    subtitleFontWeight,
    subtitleColor,
    bodyFontFamily,
    bodyFontSize,
    bodyFontWeight,
    bodyColor,
    enableScrollReveal,
    scrollRevealAnimation,
    sectionTextAlign,
    mobileSectionTextAlign,
    sectionMaxWidth,
    mobileSectionMaxWidth,
    sectionPaddingY,
    mobileSectionPaddingY,
    sectionPaddingX,
    mobileSectionPaddingX,
    surfaceBorderRadius,
    mobileSurfaceBorderRadius,
    surfaceShadow,
    mobileSurfaceShadow,
  } = applyMenuSharedSpacingDefaults(rawProps);
  const normalizedTitle = title.trim();
  const normalizedSubtitle = subtitle?.trim() || '';
  const normalizedDescription = description?.trim() || '';
  const hasHeaderContent = Boolean(
    normalizedTitle || normalizedSubtitle || normalizedDescription,
  );

  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';

  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const viewport = useSectionViewport(previewMode);
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );

  useEffect(() => {
    if (previewMode) {
      setWindowWidth(previewMode === 'mobile' ? 390 : 1440);
      return;
    }

    const updateWindowWidth = () => setWindowWidth(window.innerWidth);
    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);

    return () => window.removeEventListener('resize', updateWindowWidth);
  }, [previewMode]);

  const spacingTier = resolveMenuSpacingTier({
    viewport,
    previewMode,
    windowWidth,
  });
  const resolvedSectionPaddingY = resolveMenuSectionPadding({
    desktopValue: sectionPaddingY,
    mobileValue: mobileSectionPaddingY,
    viewport,
    tier: spacingTier,
    axis: 'y',
  });
  const resolvedSectionPaddingX = resolveMenuSectionPadding({
    desktopValue: sectionPaddingX,
    mobileValue: mobileSectionPaddingX,
    viewport,
    tier: spacingTier,
    axis: 'x',
  });

  const sectionStyleConfig = {
    is_custom,
    buttonStyleVariant,
    titleFontFamily,
    titleFontSize,
    titleFontWeight,
    titleColor,
    subtitleFontFamily,
    subtitleFontSize,
    subtitleFontWeight,
    subtitleColor,
    bodyFontFamily,
    bodyFontSize,
    bodyFontWeight,
    bodyColor,
    enableScrollReveal,
    scrollRevealAnimation,
    sectionTextAlign,
    mobileSectionTextAlign,
    sectionMaxWidth,
    mobileSectionMaxWidth,
    sectionPaddingY: resolvedSectionPaddingY,
    mobileSectionPaddingY: resolvedSectionPaddingY,
    sectionPaddingX: resolvedSectionPaddingX,
    mobileSectionPaddingX: resolvedSectionPaddingX,
    surfaceBorderRadius,
    mobileSurfaceBorderRadius,
    surfaceShadow,
    mobileSurfaceShadow,
  };

  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    sectionStyleConfig,
    globalStyles,
    viewport,
  );
  const { sectionStyle } = getSectionContainerStyles(
    sectionStyleConfig,
    viewport,
  );
  const reveal = useSectionReveal({
    enabled: enableScrollReveal,
    animation: scrollRevealAnimation,
    isPreview: Boolean(previewMode),
  });

  const ctaButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(sectionStyleConfig, globalStyles),
  );
  const secondaryCtaButtonStyle = getButtonInlineStyle(
    getSelectedGlobalButtonStyle(
      { ...sectionStyleConfig, buttonStyleVariant: 'secondary' },
      globalStyles,
    ),
  );
  const currentLayoutSettings = getLayoutRecord(
    layoutSettings,
    layout as MenuLayout,
  );
  const layoutNumber = (
    desktopKey: string,
    mobileKey: string,
    fallback: number,
  ) =>
    Number(
      resolveResponsiveValue(
        currentLayoutSettings[desktopKey] as number | undefined,
        currentLayoutSettings[mobileKey] as number | undefined,
        viewport,
        fallback,
      ),
    );
  const layoutString = (
    desktopKey: string,
    mobileKey: string,
    fallback: string,
  ) =>
    String(
      resolveResponsiveValue(
        currentLayoutSettings[desktopKey] as string | undefined,
        currentLayoutSettings[mobileKey] as string | undefined,
        viewport,
        fallback,
      ),
    );
  const layoutGap = (
    desktopKey: string,
    mobileKey: string,
    desktopFallback: number,
    mobileFallback: number,
    sharedValue: string,
    sharedValuePx: number,
  ) => {
    const desktopValue = currentLayoutSettings[desktopKey] as
      | number
      | undefined;
    const mobileValue = currentLayoutSettings[mobileKey] as number | undefined;
    const resolvedValue =
      viewport === 'mobile' ? mobileValue ?? desktopValue : desktopValue;
    const fallbackValue =
      viewport === 'mobile' ? mobileFallback : desktopFallback;

    if (resolvedValue === undefined || resolvedValue === fallbackValue) {
      return {
        css: sharedValue,
        px: sharedValuePx,
      };
    }

    return {
      css: `${resolvedValue}px`,
      px: resolvedValue,
    };
  };

  const resolvedBgColor = resolveResponsiveValue(
    bgColor,
    mobileBgColor,
    viewport,
    '#ffffff',
  );
  const resolvedTextColor = resolveResponsiveValue(
    textColor,
    mobileTextColor,
    viewport,
    '#111827',
  );
  const resolvedAccentColor = resolveResponsiveValue(
    accentColor,
    mobileAccentColor,
    viewport,
    '#7c3aed',
  );
  const resolvedCardBgColor = resolveResponsiveValue(
    cardBgColor,
    mobileCardBgColor,
    viewport,
    '#f8fafc',
  );
  const resolvedCardBorderColor = resolveResponsiveValue(
    cardBorderColor,
    mobileCardBorderColor,
    viewport,
    'rgba(148, 163, 184, 0.22)',
  );
  const resolvedDividerColor = resolveResponsiveValue(
    dividerColor,
    mobileDividerColor,
    viewport,
    'rgba(148, 163, 184, 0.24)',
  );
  const resolvedBadgeColor = resolveResponsiveValue(
    badgeColor,
    mobileBadgeColor,
    viewport,
    resolvedAccentColor,
  );
  const resolvedButtonBgColor = resolveResponsiveValue(
    buttonBgColor,
    mobileButtonBgColor,
    viewport,
    resolvedAccentColor,
  );
  const resolvedButtonTextColor = resolveResponsiveValue(
    buttonTextColor,
    mobileButtonTextColor,
    viewport,
    '#ffffff',
  );
  const resolvedPrimaryButtonBg =
    ctaButtonStyle.backgroundColor || resolvedButtonBgColor;
  const resolvedPrimaryButtonText =
    ctaButtonStyle.color || resolvedButtonTextColor;
  const resolvedSecondaryButtonBg =
    secondaryCtaButtonStyle.backgroundColor || resolvedCardBgColor;
  const resolvedSecondaryButtonText =
    secondaryCtaButtonStyle.color || resolvedAccentColor;
  const resolvedPriceColor = resolveResponsiveValue(
    priceColor,
    mobilePriceColor,
    viewport,
    resolvedAccentColor,
  );
  const resolvedActiveTabColor = resolveResponsiveValue(
    activeTabColor,
    mobileActiveTabColor,
    viewport,
    resolvedAccentColor,
  );
  const resolvedAccordionActiveColor = resolveResponsiveValue(
    accordionActiveColor,
    mobileAccordionActiveColor,
    viewport,
    'rgba(237, 233, 254, 1)',
  );
  const defaultCardRadius =
    viewport === 'mobile'
      ? DEFAULT_MENU_CONFIG.mobileCardRadius ||
        DEFAULT_MENU_CONFIG.cardRadius ||
        '0.875rem'
      : DEFAULT_MENU_CONFIG.cardRadius || '1rem';
  const resolvedCardRadius = resolveResponsiveValue(
    cardRadius,
    mobileCardRadius,
    viewport,
    defaultCardRadius,
  );
  const resolvedCardShadow = getSurfaceShadowValue(
    resolveResponsiveValue(cardShadow, mobileCardShadow, viewport, 'soft'),
  );
  const resolvedCardGap = resolveMenuInternalGap({
    desktopValue: cardGap,
    mobileValue: mobileCardGap,
    viewport,
    tier: spacingTier,
  });
  const resolvedGridGap = resolveMenuInternalGap({
    desktopValue: gridGap,
    mobileValue: mobileGridGap,
    viewport,
    tier: spacingTier,
  });
  const resolvedRowGap = resolveMenuInternalGap({
    desktopValue: rowSpacing,
    mobileValue: mobileRowSpacing,
    viewport,
    tier: spacingTier,
  });
  const resolvedItemPadding = resolveResponsiveValue(
    itemPadding,
    mobileItemPadding,
    viewport,
    '1.25rem',
  );
  const resolvedColumnSpacing = resolveMenuInternalGap({
    desktopValue: columnSpacing,
    mobileValue: mobileColumnSpacing,
    viewport,
    tier: spacingTier,
  });
  const resolvedCardGapPx = spacingValueToPixels(resolvedCardGap);
  const resolvedGridGapPx = spacingValueToPixels(resolvedGridGap);
  const resolvedItemTitleSize = resolveResponsiveValue(
    itemTitleSize,
    mobileItemTitleSize,
    viewport,
    '1.125rem',
  );
  const resolvedItemTitleWeight = resolveResponsiveValue(
    itemTitleWeight,
    mobileItemTitleWeight,
    viewport,
    700,
  );
  const resolvedItemDescriptionSize = resolveResponsiveValue(
    itemDescriptionSize,
    mobileItemDescriptionSize,
    viewport,
    '0.95rem',
  );
  const resolvedHeaderAlign =
    viewport === 'mobile'
      ? mobileSectionTextAlign || textAlign || sectionTextAlign || 'center'
      : textAlign || sectionTextAlign || 'center';
  const resolvedItemLineHeight = resolveResponsiveValue(
    itemLineHeight,
    mobileItemLineHeight,
    viewport,
    '1.65',
  );
  const resolvedItemLetterSpacing = resolveResponsiveValue(
    itemLetterSpacing,
    mobileItemLetterSpacing,
    viewport,
    '0',
  );
  const resolvedPriceTextSize = resolveResponsiveValue(
    priceTextSize,
    mobilePriceTextSize,
    viewport,
    '1rem',
  );
  const defaultDesktopItemTextAlign =
    layout === 'grid' &&
    (!itemTextAlign || itemTextAlign === DEFAULT_MENU_CONFIG.itemTextAlign)
      ? 'center'
      : itemTextAlign || 'left';
  const defaultMobileItemTextAlign =
    layout === 'grid' &&
    (!mobileItemTextAlign ||
      mobileItemTextAlign === DEFAULT_MENU_CONFIG.mobileItemTextAlign)
      ? 'center'
      : mobileItemTextAlign || defaultDesktopItemTextAlign;
  const resolvedItemTextAlign =
    viewport === 'mobile'
      ? defaultMobileItemTextAlign
      : defaultDesktopItemTextAlign;
  const resolvedListGap = layoutGap(
    'cardGap',
    'mobileCardGap',
    20,
    16,
    resolvedCardGap,
    resolvedCardGapPx,
  );
  const resolvedMasonryGap = layoutGap(
    'gap',
    'mobileGap',
    22,
    16,
    resolvedGridGap,
    resolvedGridGapPx,
  );
  const resolvedCarouselGap = layoutGap(
    'slideSpacing',
    'mobileSlideSpacing',
    16,
    12,
    resolvedCardGap,
    resolvedCardGapPx,
  );
  const resolvedTwoColumnGap = layoutGap(
    'cardGap',
    'mobileCardGap',
    22,
    16,
    resolvedCardGap,
    resolvedCardGapPx,
  );
  const resolvedSingleColumnGap = layoutGap(
    'cardSpacing',
    'mobileCardSpacing',
    20,
    16,
    resolvedCardGap,
    resolvedCardGapPx,
  );
  const resolvedFeatureGap = layoutGap(
    'cardGap',
    'mobileCardGap',
    20,
    14,
    resolvedCardGap,
    resolvedCardGapPx,
  );
  const resolvedGridLayoutGap = layoutGap(
    'gap',
    'mobileGap',
    24,
    16,
    resolvedGridGap,
    resolvedGridGapPx,
  );
  const resolvedTitleTextColor =
    (typeof titleStyle.color === 'string' && titleStyle.color.trim()
      ? titleStyle.color
      : undefined) || resolvedTextColor;
  const resolvedSubtitleTextColor =
    (typeof subtitleStyle.color === 'string' && subtitleStyle.color.trim()
      ? subtitleStyle.color
      : undefined) || resolvedTitleTextColor;
  const resolvedBodyTextColor =
    (typeof bodyStyle.color === 'string' && bodyStyle.color.trim()
      ? bodyStyle.color
      : undefined) || resolvedTextColor;
  const sharedTitleTextStyle: CSSProperties = {
    ...(titleStyle.fontFamily ? { fontFamily: titleStyle.fontFamily } : {}),
    ...(typeof titleStyle.fontWeight === 'number'
      ? { fontWeight: titleStyle.fontWeight }
      : {}),
    ...(titleStyle.fontStyle
      ? {
          fontStyle: titleStyle.fontStyle as CSSProperties['fontStyle'],
        }
      : {}),
    ...(titleStyle.lineHeight
      ? {
          lineHeight: titleStyle.lineHeight as CSSProperties['lineHeight'],
        }
      : {}),
    ...(titleStyle.letterSpacing
      ? {
          letterSpacing:
            titleStyle.letterSpacing as CSSProperties['letterSpacing'],
        }
      : {}),
    ...(titleStyle.textTransform
      ? {
          textTransform:
            titleStyle.textTransform as CSSProperties['textTransform'],
        }
      : {}),
    color: resolvedTitleTextColor,
  };
  const sharedSubtitleTextStyle: CSSProperties = {
    ...(subtitleStyle.fontFamily
      ? { fontFamily: subtitleStyle.fontFamily }
      : {}),
    ...(typeof subtitleStyle.fontWeight === 'number'
      ? { fontWeight: subtitleStyle.fontWeight }
      : {}),
    ...(subtitleStyle.fontStyle
      ? {
          fontStyle: subtitleStyle.fontStyle as CSSProperties['fontStyle'],
        }
      : {}),
    ...(subtitleStyle.lineHeight
      ? {
          lineHeight:
            subtitleStyle.lineHeight as CSSProperties['lineHeight'],
        }
      : {}),
    ...(subtitleStyle.letterSpacing
      ? {
          letterSpacing:
            subtitleStyle.letterSpacing as CSSProperties['letterSpacing'],
        }
      : {}),
    ...(subtitleStyle.textTransform
      ? {
          textTransform:
            subtitleStyle.textTransform as CSSProperties['textTransform'],
        }
      : {}),
    color: resolvedSubtitleTextColor,
  };
  const sharedBodyTextStyle: CSSProperties = {
    ...(bodyStyle.fontFamily ? { fontFamily: bodyStyle.fontFamily } : {}),
    ...(typeof bodyStyle.fontWeight === 'number'
      ? { fontWeight: bodyStyle.fontWeight }
      : {}),
    ...(bodyStyle.fontStyle
      ? {
          fontStyle: bodyStyle.fontStyle as CSSProperties['fontStyle'],
        }
      : {}),
    ...(bodyStyle.lineHeight
      ? {
          lineHeight: bodyStyle.lineHeight as CSSProperties['lineHeight'],
        }
      : {}),
    ...(bodyStyle.letterSpacing
      ? {
          letterSpacing: bodyStyle.letterSpacing as CSSProperties['letterSpacing'],
        }
      : {}),
    ...(bodyStyle.textTransform
      ? {
          textTransform:
            bodyStyle.textTransform as CSSProperties['textTransform'],
        }
      : {}),
    color: resolvedBodyTextColor,
  };
  const sharedItemTitleTextStyle: CSSProperties = {
    ...sharedTitleTextStyle,
    fontSize:
      (titleStyle.fontSize as CSSProperties['fontSize']) || resolvedItemTitleSize,
    fontWeight:
      typeof titleStyle.fontWeight === 'number'
        ? titleStyle.fontWeight
        : resolvedItemTitleWeight,
    lineHeight:
      (titleStyle.lineHeight as CSSProperties['lineHeight']) ||
      (resolvedItemLineHeight as CSSProperties['lineHeight']),
    letterSpacing:
      (titleStyle.letterSpacing as CSSProperties['letterSpacing']) ||
      (resolvedItemLetterSpacing as CSSProperties['letterSpacing']),
  };
  const sharedItemSubtitleTextStyle: CSSProperties = {
    ...sharedSubtitleTextStyle,
    fontSize:
      (subtitleStyle.fontSize as CSSProperties['fontSize']) ||
      resolvedItemDescriptionSize,
    lineHeight:
      (subtitleStyle.lineHeight as CSSProperties['lineHeight']) ||
      (resolvedItemLineHeight as CSSProperties['lineHeight']),
    letterSpacing:
      (subtitleStyle.letterSpacing as CSSProperties['letterSpacing']) ||
      (resolvedItemLetterSpacing as CSSProperties['letterSpacing']),
    color: resolvedSubtitleTextColor,
  };
  const titleTypographyVariables: CSSProperties = {
    ...(titleStyle.fontFamily
      ? { ['--menu-title-font-family' as string]: titleStyle.fontFamily }
      : {}),
    ...(typeof titleStyle.fontWeight === 'number'
      ? { ['--menu-title-font-weight' as string]: titleStyle.fontWeight }
      : {}),
    ...(titleStyle.fontStyle
      ? { ['--menu-title-font-style' as string]: titleStyle.fontStyle }
      : {}),
    ...(titleStyle.lineHeight
      ? {
          ['--menu-title-line-height' as string]:
            titleStyle.lineHeight as string,
        }
      : {}),
    ...(titleStyle.letterSpacing
      ? {
          ['--menu-title-letter-spacing' as string]:
            titleStyle.letterSpacing as string,
        }
      : {}),
    ...(titleStyle.textTransform
      ? {
          ['--menu-title-text-transform' as string]:
            titleStyle.textTransform,
        }
      : {}),
  };
  const subtitleTypographyVariables: CSSProperties = {
    ...(subtitleStyle.fontFamily
      ? {
          ['--menu-subtitle-font-family' as string]:
            subtitleStyle.fontFamily,
        }
      : {}),
    ...(subtitleStyle.fontStyle
      ? {
          ['--menu-subtitle-font-style' as string]:
            subtitleStyle.fontStyle,
        }
      : {}),
    ...(typeof subtitleStyle.fontWeight === 'number'
      ? {
          ['--menu-subtitle-font-weight' as string]:
            subtitleStyle.fontWeight,
        }
      : {}),
    ...(subtitleStyle.lineHeight
      ? {
          ['--menu-subtitle-line-height' as string]:
            subtitleStyle.lineHeight as string,
        }
      : {}),
    ...(subtitleStyle.letterSpacing
      ? {
          ['--menu-subtitle-letter-spacing' as string]:
            subtitleStyle.letterSpacing as string,
        }
      : {}),
    ...(subtitleStyle.textTransform
      ? {
          ['--menu-subtitle-text-transform' as string]:
            subtitleStyle.textTransform,
        }
      : {}),
  };
  const bodyTypographyVariables: CSSProperties = {
    ...(bodyStyle.fontFamily
      ? { ['--menu-body-font-family' as string]: bodyStyle.fontFamily }
      : {}),
    ...(bodyStyle.fontStyle
      ? { ['--menu-body-font-style' as string]: bodyStyle.fontStyle }
      : {}),
    ...(typeof bodyStyle.fontWeight === 'number'
      ? { ['--menu-body-font-weight' as string]: bodyStyle.fontWeight }
      : {}),
    ...(bodyStyle.lineHeight
      ? {
          ['--menu-body-line-height' as string]:
            bodyStyle.lineHeight as string,
        }
      : {}),
    ...(bodyStyle.letterSpacing
      ? {
          ['--menu-body-letter-spacing' as string]:
            bodyStyle.letterSpacing as string,
        }
      : {}),
    ...(bodyStyle.textTransform
      ? { ['--menu-body-text-transform' as string]: bodyStyle.textTransform }
      : {}),
  };
  const buttonTypographyVariables: CSSProperties = {
    ...(ctaButtonStyle.fontFamily
      ? {
          ['--menu-button-font-family' as string]:
            String(ctaButtonStyle.fontFamily),
        }
      : {}),
    ...(ctaButtonStyle.fontSize
      ? {
          ['--menu-button-font-size' as string]:
            String(ctaButtonStyle.fontSize),
        }
      : {}),
    ...(ctaButtonStyle.fontWeight
      ? {
          ['--menu-button-font-weight' as string]:
            String(ctaButtonStyle.fontWeight),
        }
      : {}),
    ...(ctaButtonStyle.borderRadius
      ? {
          ['--menu-button-radius' as string]:
            String(ctaButtonStyle.borderRadius),
        }
      : {}),
    ...(ctaButtonStyle.textTransform
      ? {
          ['--menu-button-text-transform' as string]:
            String(ctaButtonStyle.textTransform),
        }
      : {}),
  };

  const categoryDrivenLayout = layout === 'tabs' || layout === 'accordion';
  const preparedCategories = buildPreparedCategories(
    categories,
    featuredItems,
    normalizedTitle,
    { preserveEmptyCategories: categoryDrivenLayout },
  );
  const preparedItems = prepareItems(preparedCategories);
  const spotlightItems = buildFeaturedItems(featuredItems, preparedItems);
  const preparedLayoutItems = buildDirectLayoutItems(
    layoutItems,
    normalizedTitle,
    layout as MenuLayout,
  );
  const previewEnabled = Boolean(previewMode);
  const shouldUsePreviewCategories =
    categoryDrivenLayout && preparedCategories.length === 0 && previewEnabled;
  const displayCategories = shouldUsePreviewCategories
    ? buildPreviewCategories()
    : preparedCategories;
  const highlightedItems = spotlightItems.slice(0, 8);
  const shouldUsePreviewDirectItems =
    !categoryDrivenLayout &&
    preparedLayoutItems.length === 0 &&
    preparedItems.length === 0 &&
    previewEnabled;
  const previewDirectItems = shouldUsePreviewDirectItems
    ? buildPreviewDirectItems(layout, normalizedTitle)
    : [];
  const directItems =
    preparedLayoutItems.length > 0
      ? preparedLayoutItems
      : shouldUsePreviewDirectItems
        ? previewDirectItems
        : preparedItems;
  const spotlightDirectItems =
    preparedLayoutItems.length > 0
      ? preparedLayoutItems
      : shouldUsePreviewDirectItems
        ? previewDirectItems
        : highlightedItems;
  const useDirectLayoutCards =
    preparedLayoutItems.length > 0 || shouldUsePreviewDirectItems;
  const resolvedPrimaryButton =
    primaryButtonEnabled === false
      ? undefined
      : resolveMenuButton(primaryButton || ctaButton, 'primary');
  const resolvedSecondaryButton =
    secondaryButtonEnabled === false
      ? undefined
      : resolveMenuButton(secondaryButton, 'secondary');

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [expandedCategoryIndex, setExpandedCategoryIndex] = useState(0);
  const carouselTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeCategoryIndex >= displayCategories.length) {
      setActiveCategoryIndex(0);
    }
  }, [activeCategoryIndex, displayCategories.length]);

  useEffect(() => {
    if (expandedCategoryIndex >= displayCategories.length) {
      setExpandedCategoryIndex(0);
    }
  }, [displayCategories.length, expandedCategoryIndex]);

  useEffect(() => {
    if (layout !== 'accordion') {
      return;
    }

    const defaultExpanded = Number(
      currentLayoutSettings.defaultExpandedItem ?? 0,
    );
    if (defaultExpanded >= 0 && defaultExpanded < displayCategories.length) {
      setExpandedCategoryIndex(defaultExpanded);
    }
  }, [
    currentLayoutSettings.defaultExpandedItem,
    displayCategories.length,
    layout,
  ]);

  useEffect(() => {
    if (layout !== 'carousel' || currentLayoutSettings.autoplay !== true) {
      return;
    }

    const track = carouselTrackRef.current;
    if (!track) {
      return;
    }

    const stepWidth =
      track.firstElementChild instanceof HTMLElement
        ? track.firstElementChild.getBoundingClientRect().width +
          resolvedCarouselGap.px
        : 320;

    const interval = window.setInterval(() => {
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const nextScrollLeft =
        track.scrollLeft + stepWidth >= maxScrollLeft
          ? 0
          : track.scrollLeft + stepWidth;

      track.scrollTo({
        left: nextScrollLeft,
        behavior: 'smooth',
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [
    currentLayoutSettings.autoplay,
    layout,
    resolvedCarouselGap.px,
    spotlightDirectItems.length,
  ]);

  const activeCategory =
    displayCategories[activeCategoryIndex] || displayCategories[0] || null;

  const containerStyle: CSSProperties = {
    ...sectionStyle,
    ...reveal.style,
    backgroundColor: resolvedBgColor,
    ...bodyStyle,
    ...titleTypographyVariables,
    ...subtitleTypographyVariables,
    ...bodyTypographyVariables,
    ...buttonTypographyVariables,
    ['--menu-accent' as string]: resolvedAccentColor,
    ['--menu-card-bg' as string]: resolvedCardBgColor,
    ['--menu-text' as string]: resolvedTextColor,
    ['--menu-title-color' as string]: resolvedTitleTextColor,
    ['--menu-subtitle-color' as string]: resolvedSubtitleTextColor,
    ['--menu-body' as string]: bodyStyle.color || resolvedTextColor,
    ['--menu-body-color' as string]: resolvedBodyTextColor,
    ['--menu-card-border' as string]: resolvedCardBorderColor,
    ['--menu-divider' as string]: resolvedDividerColor,
    ['--menu-price' as string]: resolvedPriceColor,
    ['--menu-badge' as string]: resolvedBadgeColor,
    ['--menu-card-radius' as string]: resolvedCardRadius,
    ['--menu-card-shadow' as string]: resolvedCardShadow,
    ['--menu-section-gap' as string]: resolvedRowGap,
    ['--menu-card-gap' as string]: resolvedCardGap,
    ['--menu-grid-gap' as string]: resolvedGridGap,
    ['--menu-primary-button-bg' as string]: resolvedPrimaryButtonBg,
    ['--menu-primary-button-text' as string]: resolvedPrimaryButtonText,
    ['--menu-secondary-button-bg' as string]: resolvedSecondaryButtonBg,
    ['--menu-secondary-button-text' as string]: resolvedSecondaryButtonText,
    ['--menu-placeholder-start' as string]: resolvedCardBgColor,
    ['--menu-placeholder-end' as string]: resolvedPrimaryButtonBg,
    ['--menu-row-gap' as string]: resolvedRowGap,
    ['--menu-item-padding' as string]: resolvedItemPadding,
    ['--menu-column-gap' as string]: resolvedColumnSpacing,
    ['--menu-item-title-size' as string]: resolvedItemTitleSize,
    ['--menu-item-title-weight' as string]: String(resolvedItemTitleWeight),
    ['--menu-item-description-size' as string]: resolvedItemDescriptionSize,
    ['--menu-item-line-height' as string]: resolvedItemLineHeight,
    ['--menu-item-letter-spacing' as string]: resolvedItemLetterSpacing,
    ['--menu-item-text-align' as string]: resolvedItemTextAlign,
    ['--menu-price-size' as string]: resolvedPriceTextSize,
  };

  const getSectionButtonInlineStyle = (
    button: MenuButton | undefined,
    fallbackVariant: MenuButton['variant'],
  ): CSSProperties => {
    const variant = button?.variant || fallbackVariant;
    const baseButtonStyle =
      variant === 'secondary' || variant === 'outline'
        ? secondaryCtaButtonStyle
        : ctaButtonStyle;

    if (variant === 'outline') {
      return {
        ...baseButtonStyle,
        backgroundColor: 'transparent',
        color:
          button?.textColor ||
          baseButtonStyle.color ||
          button?.borderColor ||
          resolvedAccentColor,
        border:
          baseButtonStyle.border ||
          `1.5px solid ${button?.borderColor || button?.bgColor || resolvedAccentColor}`,
        borderColor:
          button?.borderColor || button?.bgColor || resolvedAccentColor,
        borderRadius: baseButtonStyle.borderRadius || resolvedCardRadius,
      };
    }

    if (variant === 'secondary') {
      return {
        ...baseButtonStyle,
        backgroundColor:
          button?.bgColor || baseButtonStyle.backgroundColor || '#ffffff',
        color:
          button?.textColor ||
          baseButtonStyle.color ||
          button?.borderColor ||
          resolvedAccentColor,
        border:
          baseButtonStyle.border ||
          `1.5px solid ${button?.borderColor || button?.bgColor || resolvedAccentColor}`,
        borderColor:
          button?.borderColor || button?.bgColor || resolvedAccentColor,
        borderRadius: baseButtonStyle.borderRadius || resolvedCardRadius,
      };
    }

    return {
      ...baseButtonStyle,
      backgroundColor:
        button?.bgColor ||
        baseButtonStyle.backgroundColor ||
        resolvedButtonBgColor,
      color:
        button?.textColor ||
        baseButtonStyle.color ||
        resolvedButtonTextColor,
      border:
        baseButtonStyle.border ||
        `1.5px solid ${button?.borderColor || button?.bgColor || resolvedButtonBgColor}`,
      borderColor:
        button?.borderColor ||
        button?.bgColor ||
        resolvedButtonBgColor,
      borderRadius: baseButtonStyle.borderRadius || resolvedCardRadius,
    };
  };

  const primaryButtonInlineStyle = getSectionButtonInlineStyle(
    resolvedPrimaryButton,
    'primary',
  );
  const secondaryButtonInlineStyle = getSectionButtonInlineStyle(
    resolvedSecondaryButton,
    'secondary',
  );

  const backdropOverlayOpacity = backgroundImage
    ? Math.max(0.16, Math.min(overlayOpacity ?? 0.52, 0.85))
    : 0;

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!carouselTrackRef.current) return;

    const stepWidth =
      carouselTrackRef.current.firstElementChild instanceof HTMLElement
        ? carouselTrackRef.current.firstElementChild.getBoundingClientRect()
            .width + resolvedCarouselGap.px
        : 340;

    carouselTrackRef.current.scrollBy({
      left: direction === 'next' ? stepWidth : -stepWidth,
      behavior: 'smooth',
    });
  };

  const renderPrice = (item: PreparedMenuItem) => {
    void item;
    return null;
  };

  const renderDietary = (item: PreparedMenuItem) => {
    if (!showDietaryInfo || !item.dietary?.length) return null;

    return (
      <div className={styles.cardDietary}>
        {item.dietary.map((diet) => (
          <span
            key={`${item.name}-${diet}`}
            className={styles.dietaryBadge}
            style={{
              borderColor: resolvedBadgeColor,
              color: resolvedBadgeColor,
            }}
          >
            {diet}
          </span>
        ))}
      </div>
    );
  };

  const getButtonGroupClassName = (alignment?: string) =>
    alignment === 'center'
      ? styles.menuButtonGroupCenter
      : styles.menuButtonGroupStart;

  const renderItemActions = (
    item: PreparedMenuItem,
    options?: {
      className?: string;
      primaryClassName?: string;
      secondaryClassName?: string;
    },
  ) => {
    const primaryAction = buildCardAction(item, resolvedPrimaryButton);
    const secondaryAction = buildSecondaryCardAction(item);

    if (!primaryAction && !secondaryAction) {
      return null;
    }

    return (
      <div className={options?.className || styles.menuButtonGroupStart}>
        {primaryAction ? (
          <a
            href={primaryAction.href}
            className={joinClasses(
              styles.itemButton,
              styles.itemButtonSolid,
              options?.primaryClassName,
            )}
            style={primaryButtonInlineStyle}
          >
            {primaryAction.label}
          </a>
        ) : null}
        {secondaryAction ? (
          <a
            href={secondaryAction.href}
            className={joinClasses(
              styles.itemButton,
              styles.itemButtonOutline,
              options?.secondaryClassName,
            )}
            style={secondaryButtonInlineStyle}
          >
            {secondaryAction.label}
          </a>
        ) : null}
      </div>
    );
  };

  const renderSectionButtons = (
    className: string,
    primaryClassName: string,
    secondaryClassName: string,
  ) => {
    if (!resolvedPrimaryButton?.label && !resolvedSecondaryButton?.label) {
      return null;
    }

    return (
      <div className={className}>
        {resolvedPrimaryButton?.label ? (
          <a
            href={resolvedPrimaryButton.href}
            className={primaryClassName}
            style={primaryButtonInlineStyle}
          >
            {resolvedPrimaryButton.label}
          </a>
        ) : null}
        {resolvedSecondaryButton?.label ? (
          <a
            href={resolvedSecondaryButton.href}
            className={secondaryClassName}
            style={secondaryButtonInlineStyle}
          >
            {resolvedSecondaryButton.label}
          </a>
        ) : null}
      </div>
    );
  };

  const renderSymbol = (item: PreparedMenuItem, index: number) => {
    const showFallbackIcon =
      currentLayoutSettings.showIcons !== false || layout !== 'featured-grid';
    const media = showImages
      ? resolveItemMedia(item, headerImage, backgroundImage)
      : undefined;

    if (media) {
      return (
        <div className={styles.featureThumb}>
          <img src={media} alt={item.name} />
        </div>
      );
    }

    if (!showFallbackIcon) {
      return (
        <div
          className={styles.featureThumb}
          style={{
            background:
              'linear-gradient(135deg, rgba(226,232,240,0.95), rgba(241,245,249,1))',
          }}
        />
      );
    }

    return (
      <div className={styles.featureIcon}>{getFallbackSymbol(item, index)}</div>
    );
  };

  const renderImageCard = (
    item: PreparedMenuItem,
    index: number,
    options?: { overlay?: boolean; compact?: boolean; centered?: boolean },
  ) => {
    const defaultOverlayPosition = layout === 'grid' ? 'center' : 'bottom-left';
    const imageAspectRatio = getAspectRatioValue(
      getGridAlignedImageAspectRatio(
        layout as MenuLayout,
        layoutString('imageAspectRatio', 'mobileImageAspectRatio', 'landscape'),
      ),
    );
    const overlayPosition = layoutString(
      'overlayTextPosition',
      'mobileOverlayTextPosition',
      defaultOverlayPosition,
    );
    const overlayAlignment =
      overlayPosition === 'center' || overlayPosition === 'bottom-center'
        ? 'center'
        : resolvedItemTextAlign;
    const media = showImages
      ? resolveItemMedia(item, headerImage, backgroundImage)
      : undefined;
    const itemEyebrow = getItemEyebrowLabel(item, showCategoryIcons);
    const mediaHref = item.imageLink?.trim();
    const mediaContent = media ? (
      <img src={media} alt={item.name} />
    ) : (
      <div className={styles.cardPlaceholder}>
        <span>{getFallbackSymbol(item, index)}</span>
      </div>
    );

    return (
      <article
        key={`${item.categoryName}-${item.name}-${index}`}
        className={joinClasses(
          styles.imageCard,
          options?.overlay && styles.imageCardOverlay,
          options?.compact && styles.imageCardCompact,
          options?.centered && styles.imageCardCentered,
        )}
        style={{
          backgroundColor: resolvedCardBgColor,
          borderRadius: 0,
          boxShadow: resolvedCardShadow,
          textAlign: resolvedItemTextAlign as CSSProperties['textAlign'],
        }}
      >
        <div
          className={styles.cardMedia}
          style={{ aspectRatio: imageAspectRatio, minHeight: 0 }}
        >
          {mediaHref ? (
            <a
              href={mediaHref}
              className={styles.cardMediaLink}
              aria-label={`Open ${item.name}`}
            >
              {mediaContent}
              {options?.overlay ? <div className={styles.cardScrim} /> : null}
            </a>
          ) : (
            <>
              {mediaContent}
              {options?.overlay ? <div className={styles.cardScrim} /> : null}
            </>
          )}
        </div>
        <div
          className={joinClasses(
            styles.cardBody,
            options?.overlay && styles.cardBodyOverlay,
          )}
          style={
            options?.overlay
              ? getOverlayBodyStyle(overlayPosition, overlayAlignment)
              : {
                  padding: resolvedItemPadding,
                  textAlign:
                    resolvedItemTextAlign as CSSProperties['textAlign'],
                }
          }
        >
          {itemEyebrow ? (
            <div className={styles.cardEyebrow} style={sharedSubtitleTextStyle}>
              {itemEyebrow}
            </div>
          ) : null}
          <div
            className={styles.cardTitleRow}
            style={getTitleRowStyle(
              options?.overlay ? overlayAlignment : resolvedItemTextAlign,
            )}
          >
            <h3 className={styles.cardTitle} style={sharedItemTitleTextStyle}>
              {item.name}
            </h3>
            {renderPrice(item)}
          </div>
          {showDescriptions && item.description ? (
            <p
              className={styles.cardDescription}
              style={sharedItemSubtitleTextStyle}
            >
              {item.description}
            </p>
          ) : null}
          {renderDietary(item)}
          {renderItemActions(item, {
            className: getButtonGroupClassName(
              options?.overlay ? overlayAlignment : resolvedItemTextAlign,
            ),
          })}
        </div>
      </article>
    );
  };

  const renderSplitCard = (
    item: PreparedMenuItem,
    index: number,
    reverse = false,
  ) => {
    const media = showImages
      ? resolveItemMedia(item, headerImage, backgroundImage)
      : undefined;
    const splitCardTextAlign = String(
      currentLayoutSettings.contentAlignment || resolvedItemTextAlign,
    );
    const itemEyebrow = getItemEyebrowLabel(item, showCategoryIcons);
    const imageAspectRatio = getAspectRatioValue(
      getGridAlignedImageAspectRatio(
        layout as MenuLayout,
        layoutString('imageAspectRatio', 'mobileImageAspectRatio', 'landscape'),
      ),
    );

    return (
      <article
        key={`${item.categoryName}-${item.name}-${index}`}
        className={styles.imageCard}
        style={{
          backgroundColor: resolvedCardBgColor,
          borderRadius: 0,
          boxShadow: resolvedCardShadow,
          display: 'grid',
          gridTemplateColumns:
            viewport === 'mobile' ||
            currentLayoutSettings.stackOnMobile !== false
              ? '1fr'
              : 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
          overflow: 'hidden',
        }}
      >
        <div
          className={styles.cardMedia}
          style={{
            aspectRatio: imageAspectRatio,
            minHeight: 0,
            order: reverse ? 2 : 1,
          }}
        >
          {media ? (
            <img src={media} alt={item.name} />
          ) : (
            <div className={styles.cardPlaceholder}>
              <span>{getFallbackSymbol(item, index)}</span>
            </div>
          )}
        </div>
        <div
          className={styles.cardBody}
          style={{
            padding: resolvedItemPadding,
            order: reverse ? 1 : 2,
            textAlign: splitCardTextAlign as CSSProperties['textAlign'],
          }}
        >
          {itemEyebrow ? (
            <div className={styles.cardEyebrow} style={sharedSubtitleTextStyle}>
              {itemEyebrow}
            </div>
          ) : null}
          <div
            className={styles.cardTitleRow}
            style={getTitleRowStyle(splitCardTextAlign)}
          >
            <h3 className={styles.cardTitle} style={sharedItemTitleTextStyle}>
              {item.name}
            </h3>
            {renderPrice(item)}
          </div>
          {showDescriptions && item.description ? (
            <p
              className={styles.cardDescription}
              style={sharedItemSubtitleTextStyle}
            >
              {item.description}
            </p>
          ) : null}
          {renderItemActions(item, {
            className: getButtonGroupClassName(splitCardTextAlign),
          })}
        </div>
      </article>
    );
  };

  const renderPromoCard = (item: PreparedMenuItem, index: number) => {
    const actions = renderItemActions(item, {
      className: styles.menuButtonGroupCenter,
    });
    const promoCardStyle = String(currentLayoutSettings.cardStyle || 'soft');
    const itemEyebrow = getItemEyebrowLabel(item, showCategoryIcons);

    return (
      <article
        key={`${item.categoryName}-${item.name}-${index}`}
        className={styles.promoCard}
        style={{
          backgroundColor:
            promoCardStyle === 'minimal'
              ? 'transparent'
              : promoCardStyle === 'glass'
                ? 'rgba(255,255,255,0.72)'
                : resolvedCardBgColor,
          color: resolvedBodyTextColor,
          textAlign: (currentLayoutSettings.contentAlignment ||
            'center') as CSSProperties['textAlign'],
          boxShadow: resolvedCardShadow,
          borderRadius: resolvedCardRadius,
        }}
      >
        {itemEyebrow ? (
          <div
            className={styles.cardEyebrow}
            style={{
              ...sharedSubtitleTextStyle,
              color: resolvedAccentColor,
            }}
          >
            {itemEyebrow}
          </div>
        ) : null}
        <h3 className={styles.promoTitle} style={sharedItemTitleTextStyle}>
          {item.name}
        </h3>
        {showDescriptions && item.description ? (
          <p
            className={styles.promoDescription}
            style={sharedItemSubtitleTextStyle}
          >
            {item.description}
          </p>
        ) : null}
        {actions}
      </article>
    );
  };

  const renderCategoryBlock = (
    category: MenuCategory,
    items: PreparedMenuItem[],
    itemsClassName: string,
    renderer: (item: PreparedMenuItem, index: number) => React.ReactNode,
    showCategoryHeader = displayCategories.length > 1,
    itemsStyle?: CSSProperties,
  ) => (
    <section key={category.name} className={styles.menuCategory}>
      {showCategoryHeader ? (
        <div className={styles.categoryHeader}>
          <div>
            <div className={styles.cardEyebrow} style={sharedSubtitleTextStyle}>
              {showCategoryIcons && category.icon
                ? `${category.icon} Menu Category`
                : 'Menu Category'}
            </div>
            <h3 className={styles.categoryName} style={sharedTitleTextStyle}>
              {category.name}
            </h3>
            {category.description ? (
              <p
                className={styles.categoryDescription}
                style={sharedBodyTextStyle}
              >
                {category.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={itemsClassName} style={itemsStyle}>
        {items.map(renderer)}
      </div>
    </section>
  );

  const renderGridLayouts = (
    itemsClassName: string,
    rendererOptions?: Parameters<typeof renderImageCard>[2],
    itemsStyle?: CSSProperties,
  ) =>
    displayCategories.map((category) =>
      renderCategoryBlock(
        category,
        (category.items || []).map(
          (item): PreparedMenuItem => ({
            ...item,
            categoryName: item.category || category.name,
            categoryDescription: category.description,
            categoryIcon: category.icon,
          }),
        ),
        itemsClassName,
        (item, index) => renderImageCard(item, index, rendererOptions),
        displayCategories.length > 1,
        itemsStyle,
      ),
    );

  const renderLayoutContent = () => {
    switch (layout) {
      case 'list':
        if (useDirectLayoutCards) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.promoGrid}
                style={{
                  gap: resolvedListGap.css,
                  gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('cardCount', 'mobileCardCount', 2))}, minmax(0, 1fr))`,
                }}
              >
                {directItems.map(renderPromoCard)}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {displayCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.promoGrid,
                renderPromoCard,
                displayCategories.length > 1,
                {
                  gap: resolvedListGap.css,
                  gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('cardCount', 'mobileCardCount', 2))}, minmax(0, 1fr))`,
                },
              ),
            )}
          </div>
        );

      case 'masonry':
        if (useDirectLayoutCards) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.masonryGrid}
                style={{
                  columnCount: layoutNumber('columns', 'mobileColumns', 2),
                  columnGap: resolvedMasonryGap.css,
                }}
              >
                {directItems.map((item, index) => renderImageCard(item, index))}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {displayCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.masonryGrid,
                (item, index) => renderImageCard(item, index),
                displayCategories.length > 1,
                {
                  columnCount: layoutNumber('columns', 'mobileColumns', 2),
                  columnGap: resolvedMasonryGap.css,
                },
              ),
            )}
          </div>
        );

      case 'carousel': {
        const carouselGap = resolvedCarouselGap.px;
        const carouselVisibleCards = Math.max(
          1,
          layoutNumber('cardCount', 'mobileCardCount', 3),
        );
        const carouselAspectRatio = getAspectRatioValue(
          getGridAlignedImageAspectRatio(
            'carousel',
            layoutString(
              'imageAspectRatio',
              'mobileImageAspectRatio',
              'landscape',
            ),
          ),
        );
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div
              className={styles.carouselShell}
              style={{ gap: resolvedRowGap }}
            >
              <div className={styles.carouselViewport}>
                {currentLayoutSettings.showArrows !== false ? (
                  <button
                    type="button"
                    className={joinClasses(
                      styles.carouselNav,
                      styles.carouselNavPrev,
                    )}
                    onClick={() => scrollCarousel('prev')}
                    aria-label="Scroll previous menu items"
                  >
                    {'<'}
                  </button>
                ) : null}
                <div
                  ref={carouselTrackRef}
                  className={styles.carouselTrack}
                  style={{
                    gap: `${carouselGap}px`,
                    gridAutoColumns: `clamp(${viewport === 'mobile' ? 250 : 280}px, calc((100% - ${
                      carouselGap * (carouselVisibleCards - 1)
                    }px) / ${carouselVisibleCards}), ${
                      viewport === 'mobile' ? 320 : 380
                    }px)`,
                    scrollSnapType: `x ${currentLayoutSettings.snapBehavior || 'proximity'}`,
                  }}
                >
                  {spotlightDirectItems.map((item, index) => {
                    const media =
                      showImages &&
                      resolveItemMedia(item, headerImage, backgroundImage);

                    return (
                      <article
                        key={`${item.categoryName}-${item.name}-${index}`}
                        className={styles.carouselCard}
                        style={{
                          borderRadius: 0,
                          boxShadow: resolvedCardShadow,
                          aspectRatio: carouselAspectRatio,
                          minHeight: viewport === 'mobile' ? '210px' : '260px',
                          transform:
                            currentLayoutSettings.cardAnimation === 'lift'
                              ? 'translateY(-2px)'
                              : undefined,
                          opacity:
                            currentLayoutSettings.cardAnimation === 'fade'
                              ? 0.96
                              : 1,
                        }}
                      >
                        <div className={styles.carouselCardMedia}>
                          {media ? (
                            <img src={media} alt={item.name} />
                          ) : (
                            <div className={styles.cardPlaceholder}>
                              <span>{getFallbackSymbol(item, index)}</span>
                            </div>
                          )}
                          <div className={styles.cardScrim} />
                        </div>
                        <div
                          className={styles.carouselCardBody}
                          style={{
                            ...getOverlayBodyStyle(
                              String(
                                layoutString(
                                  'overlayTextPosition',
                                  'mobileOverlayTextPosition',
                                  'bottom-left',
                                ),
                              ),
                              resolvedItemTextAlign,
                            ),
                            minHeight: '100%',
                          }}
                        >
                          {getItemEyebrowLabel(item, showCategoryIcons) ? (
                            <div
                              className={styles.cardEyebrow}
                              style={sharedSubtitleTextStyle}
                            >
                              {getItemEyebrowLabel(item, showCategoryIcons)}
                            </div>
                          ) : null}
                          <h3
                            className={styles.cardTitle}
                            style={sharedItemTitleTextStyle}
                          >
                            {item.name}
                          </h3>
                          {showDescriptions && item.description ? (
                            <p
                              className={styles.carouselCardDescription}
                              style={sharedItemSubtitleTextStyle}
                            >
                              {item.description}
                            </p>
                          ) : null}
                          {renderItemActions(item, {
                            className: getButtonGroupClassName(
                              currentLayoutSettings.overlayTextPosition === 'center' ||
                                currentLayoutSettings.overlayTextPosition ===
                                  'bottom-center'
                                ? 'center'
                                : resolvedItemTextAlign,
                            ),
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {currentLayoutSettings.showArrows !== false ? (
                  <button
                    type="button"
                    className={joinClasses(
                      styles.carouselNav,
                      styles.carouselNavNext,
                    )}
                    onClick={() => scrollCarousel('next')}
                    aria-label="Scroll next menu items"
                  >
                    {'>'}
                  </button>
                ) : null}
              </div>
              {currentLayoutSettings.showDots !== false ? (
                <div className="flex justify-center gap-2">
                  {spotlightDirectItems.map((item, index) => (
                    <span
                      key={`${item.name}-dot-${index}`}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          index === 0
                            ? resolvedAccentColor
                            : 'rgba(203,213,225,0.9)',
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      }

      case 'tabs':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div
              className={styles.tabShell}
              style={{
                gridTemplateColumns:
                  viewport === 'mobile' ||
                  currentLayoutSettings.tabOrientation === 'top'
                    ? '1fr'
                    : `minmax(0, 1fr) minmax(280px, ${Number(
                        currentLayoutSettings.sideTabWidth || 360,
                      )}px)`,
                gap: resolvedColumnSpacing,
              }}
            >
              <div
                className={styles.tabIntro}
                style={
                  headerImage
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.78) 100%), url(${headerImage})`,
                        borderRadius: 0,
                        boxShadow: resolvedCardShadow,
                      }
                    : {
                        borderRadius: resolvedCardRadius,
                        boxShadow: resolvedCardShadow,
                      }
                }
              >
                {normalizedSubtitle ? (
                  <div className={styles.tabEyebrow} style={sharedSubtitleTextStyle}>
                    {normalizedSubtitle}
                  </div>
                ) : null}
                {normalizedTitle ? (
                  <h3 className={styles.tabIntroTitle} style={sharedTitleTextStyle}>
                    {normalizedTitle}
                  </h3>
                ) : null}
                {normalizedDescription ? (
                  <p className={styles.tabIntroDescription} style={sharedBodyTextStyle}>
                    {normalizedDescription}
                  </p>
                ) : null}
                {renderSectionButtons(
                  styles.menuButtonGroupStart,
                  styles.itemButton,
                  styles.itemButton,
                )}
              </div>
              <div
                className={styles.tabSelectors}
                style={{
                  gap: `${layoutNumber('tabSpacing', 'mobileTabSpacing', 14)}px`,
                }}
              >
                {displayCategories.map((category, index) => (
                  <button
                    type="button"
                    key={category.name}
                    className={joinClasses(
                      styles.tabButton,
                      index === activeCategoryIndex && styles.tabButtonActive,
                    )}
                    onClick={() => setActiveCategoryIndex(index)}
                    style={{
                      borderRadius:
                        currentLayoutSettings.tabStyle === 'underline'
                          ? '1rem'
                          : resolvedCardRadius,
                      borderColor:
                        index === activeCategoryIndex
                          ? resolvedActiveTabColor
                          : resolvedCardBorderColor,
                      background:
                        index === activeCategoryIndex
                          ? currentLayoutSettings.tabStyle === 'underline'
                            ? '#ffffff'
                            : resolvedAccordionActiveColor
                          : '#ffffff',
                      boxShadow:
                        index === activeCategoryIndex
                          ? resolvedCardShadow
                          : 'none',
                    }}
                  >
                    <div className={styles.tabButtonCopy}>
                      <span
                        className={styles.tabButtonTitle}
                        style={sharedTitleTextStyle}
                      >
                        {category.name}
                      </span>
                      <span
                        className={styles.tabButtonDescription}
                        style={sharedBodyTextStyle}
                      >
                        {category.description ||
                          `${(category.items || []).length} item${(category.items || []).length === 1 ? '' : 's'} available`}
                      </span>
                    </div>
                    <span className={styles.tabButtonArrow}>{'>'}</span>
                  </button>
                ))}
              </div>
            </div>
            {activeCategory ? (
              <div className={styles.tabContent}>
                <div className={styles.tabContentHeader}>
                  <div className={styles.cardEyebrow} style={sharedSubtitleTextStyle}>
                    Active Category
                  </div>
                  <h3 className={styles.categoryName} style={sharedTitleTextStyle}>
                    {activeCategory.name}
                  </h3>
                  {activeCategory.description ? (
                    <p
                      className={styles.categoryDescription}
                      style={sharedBodyTextStyle}
                    >
                      {activeCategory.description}
                    </p>
                  ) : null}
                </div>
                <div
                  className={styles.tabItemsGrid}
                  style={{
                    gap: resolvedGridGap,
                    gridTemplateColumns:
                      viewport === 'mobile'
                        ? '1fr'
                        : 'repeat(auto-fit, minmax(min(100%, 280px), 360px))',
                    justifyContent: 'start',
                  }}
                >
                  {(activeCategory.items || []).map((item, index) =>
                    renderImageCard(
                      {
                        ...item,
                        categoryName: item.category || activeCategory.name,
                        categoryDescription: activeCategory.description,
                        categoryIcon: activeCategory.icon,
                      },
                      index,
                      { compact: true },
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'accordion':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div
              className={styles.accordionStack}
              style={{
                gap: `${layoutNumber('itemSpacing', 'mobileItemSpacing', 16)}px`,
              }}
            >
              {displayCategories.map((category, categoryIndex) => {
                const isOpen = categoryIndex === expandedCategoryIndex;
                const accordionIcon =
                  currentLayoutSettings.iconStyle === 'chevron'
                    ? isOpen
                      ? 'v'
                      : '>'
                    : currentLayoutSettings.iconStyle === 'caret'
                      ? isOpen
                        ? '^'
                        : 'v'
                      : isOpen
                        ? '-'
                        : '+';

                return (
                  <article
                    key={category.name}
                    className={styles.accordionPanel}
                    style={{
                      backgroundColor:
                        currentLayoutSettings.surfaceMode === 'flat'
                          ? 'transparent'
                          : resolvedCardBgColor,
                      borderRadius: resolvedCardRadius,
                      boxShadow:
                        currentLayoutSettings.surfaceMode === 'flat'
                          ? 'none'
                          : resolvedCardShadow,
                    }}
                  >
                    <button
                      type="button"
                      className={joinClasses(
                        styles.accordionTrigger,
                        isOpen && styles.accordionTriggerActive,
                      )}
                      onClick={() =>
                        setExpandedCategoryIndex(isOpen ? -1 : categoryIndex)
                      }
                      style={{
                        borderRadius: resolvedCardRadius,
                        borderColor: isOpen
                          ? resolvedActiveTabColor
                          : resolvedCardBorderColor,
                        backgroundColor: isOpen
                          ? resolvedAccordionActiveColor
                          : '#ffffff',
                      }}
                    >
                      <div className={styles.accordionTriggerCopy}>
                        <span
                          className={styles.tabButtonTitle}
                          style={sharedTitleTextStyle}
                        >
                          {category.name}
                        </span>
                        <span
                          className={styles.tabButtonDescription}
                          style={sharedBodyTextStyle}
                        >
                          {category.description ||
                            `${(category.items || []).length} item${(category.items || []).length === 1 ? '' : 's'} in this group`}
                        </span>
                      </div>
                      <span className={styles.accordionArrow}>
                        {accordionIcon}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className={styles.accordionBody}>
                        {(category.items || []).map((item, index) => {
                          const preparedItem: PreparedMenuItem = {
                            ...item,
                            categoryName: item.category || category.name,
                            categoryDescription: category.description,
                            categoryIcon: category.icon,
                          };
                          const media =
                            showImages &&
                            resolveItemMedia(
                              preparedItem,
                              headerImage,
                              backgroundImage,
                            );

                          return (
                            <div
                              key={`${category.name}-${item.name}-${index}`}
                              className={styles.accordionItemRow}
                              style={{
                                borderTop:
                                  currentLayoutSettings.dividerStyle === 'none'
                                    ? 'none'
                                    : `1px solid ${resolvedDividerColor}`,
                                transition:
                                  currentLayoutSettings.revealItems === true
                                    ? 'opacity 220ms ease, transform 220ms ease'
                                    : undefined,
                              }}
                            >
                              <div className={styles.accordionItemRowMain}>
                                {media ? (
                                  <div className={styles.accordionThumb}>
                                    <img src={media} alt={item.name} />
                                  </div>
                                ) : null}
                                <div>
                                  <h4
                                    className={styles.accordionItemTitle}
                                    style={sharedItemTitleTextStyle}
                                  >
                                    {item.name}
                                  </h4>
                                  {showDescriptions && item.description ? (
                                    <p
                                      className={
                                        styles.accordionItemDescription
                                      }
                                      style={sharedItemSubtitleTextStyle}
                                    >
                                      {item.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className={styles.accordionItemMeta}>
                                {renderPrice(preparedItem)}
                                {renderItemActions(preparedItem)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        );

      case 'two-column':
        if (useDirectLayoutCards) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.twoColumnGrid}
                style={{
                  gap: resolvedTwoColumnGap.css,
                  gridTemplateColumns:
                    viewport === 'mobile' &&
                    currentLayoutSettings.stackOnMobile !== false
                      ? '1fr'
                      : getColumnRatioValue(
                          String(currentLayoutSettings.columnRatio || '1:1'),
                        ),
                }}
              >
                {directItems.map((item, index) =>
                  currentLayoutSettings.imagePosition === 'left'
                    ? renderSplitCard(item, index)
                    : currentLayoutSettings.imagePosition === 'right'
                      ? renderSplitCard(item, index, true)
                      : renderImageCard(item, index),
                )}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {renderGridLayouts(styles.twoColumnGrid, undefined, {
              gap: resolvedTwoColumnGap.css,
              gridTemplateColumns:
                viewport === 'mobile' &&
                currentLayoutSettings.stackOnMobile !== false
                  ? '1fr'
                  : getColumnRatioValue(
                      String(currentLayoutSettings.columnRatio || '1:1'),
                    ),
            })}
          </div>
        );

      case 'single-column':
        if (useDirectLayoutCards) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.singleColumnGrid}
                style={{
                  gap: resolvedSingleColumnGap.css,
                  maxWidth: getContentWidthValue(
                    String(currentLayoutSettings.contentWidth || 'medium'),
                  ),
                  marginInline:
                    currentLayoutSettings.centered === false ? '0' : 'auto',
                }}
              >
                {directItems.map((item, index) =>
                  renderImageCard(item, index, {
                    centered: currentLayoutSettings.centered !== false,
                  }),
                )}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {displayCategories.map((category) =>
              renderCategoryBlock(
                category,
                (category.items || []).map(
                  (item): PreparedMenuItem => ({
                    ...item,
                    categoryName: item.category || category.name,
                    categoryDescription: category.description,
                    categoryIcon: category.icon,
                  }),
                ),
                styles.singleColumnGrid,
                (item, index) =>
                  renderImageCard(item, index, { centered: true }),
                displayCategories.length > 1,
                {
                  gap: resolvedSingleColumnGap.css,
                  maxWidth:
                    currentLayoutSettings.contentWidth === 'narrow'
                      ? getContentWidthValue('narrow')
                      : currentLayoutSettings.contentWidth === 'wide'
                        ? getContentWidthValue('wide')
                        : getContentWidthValue('medium'),
                  marginInline:
                    currentLayoutSettings.centered === false ? '0' : 'auto',
                },
              ),
            )}
          </div>
        );

      case 'featured-grid':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div
              className={styles.featureGrid}
              style={{
                gap: resolvedFeatureGap.css,
                gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 3))}, minmax(0, 1fr))`,
              }}
            >
              {spotlightDirectItems.slice(0, 3).map((item, index) => (
                <article
                  key={`${item.categoryName}-${item.name}-${index}`}
                  className={styles.featureCard}
                  style={{
                    backgroundColor: resolvedCardBgColor,
                    borderRadius: resolvedCardRadius,
                    boxShadow: resolvedCardShadow,
                  }}
                >
                  {renderSymbol(item, index)}
                  <h3
                    className={styles.featureTitle}
                    style={sharedItemTitleTextStyle}
                  >
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p
                      className={styles.featureDescription}
                      style={sharedItemSubtitleTextStyle}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        );

      case 'minimal':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div
              className={styles.minimalGrid}
              style={{
                gap: resolvedFeatureGap.css,
                gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 3))}, minmax(0, 1fr))`,
              }}
            >
              {spotlightDirectItems.slice(0, 3).map((item, index) => (
                <article
                  key={`${item.categoryName}-${item.name}-${index}`}
                  className={styles.minimalCard}
                >
                  {renderSymbol(item, index)}
                  <h3
                    className={styles.minimalTitle}
                    style={sharedItemTitleTextStyle}
                  >
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p
                      className={styles.minimalDescription}
                      style={sharedItemSubtitleTextStyle}
                    >
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            {currentLayoutSettings.dividerVisible !== false ? (
              <div className={styles.minimalDivider} />
            ) : null}
          </div>
        );

      case 'grid':
      default:
        if (useDirectLayoutCards) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.twoColumnGrid}
                style={{
                  gap: resolvedGridLayoutGap.css,
                  gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 2))}, minmax(0, 1fr))`,
                }}
              >
                {directItems.map((item, index) =>
                  renderImageCard(item, index, { overlay: true }),
                )}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {renderGridLayouts(
              styles.twoColumnGrid,
              { overlay: true },
              {
                gap: resolvedGridLayoutGap.css,
                gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 2))}, minmax(0, 1fr))`,
              },
            )}
          </div>
        );
    }
  };

  return (
    <section
      ref={reveal.ref}
      className={joinClasses(
        styles.menuSection,
        viewport === 'mobile' && styles.mobileViewport,
        className,
      )}
      style={containerStyle}
    >
      {backgroundImage ? (
        <>
          <div
            className={styles.menuBackdrop}
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div
            className={styles.menuBackdropOverlay}
            style={{
              backgroundColor: overlayColor,
              opacity: backdropOverlayOpacity,
            }}
          />
        </>
      ) : null}

      <div className={styles.menuContainer}>
        {hasHeaderContent ? (
          <div
            className={joinClasses(
              styles.menuHeader,
              resolvedHeaderAlign === 'left'
                ? styles.alignLeft
                : resolvedHeaderAlign === 'right'
                  ? styles.alignRight
                  : styles.alignCenter,
            )}
            style={{
              textAlign: resolvedHeaderAlign as CSSProperties['textAlign'],
              justifyItems:
                resolvedHeaderAlign === 'left'
                  ? 'start'
                  : resolvedHeaderAlign === 'right'
                    ? 'end'
                    : 'center',
            }}
          >
            {normalizedTitle ? (
              <h2 className={styles.menuTitle} style={titleStyle}>
                {normalizedTitle}
              </h2>
            ) : null}
            {normalizedSubtitle ? (
              <p
                className={styles.menuSubtitle}
                style={{
                  ...subtitleStyle,
                  color: resolvedSubtitleTextColor,
                }}
              >
                {normalizedSubtitle}
              </p>
            ) : null}
            {normalizedDescription ? (
              <p
                className={styles.menuDescription}
                style={{
                  ...bodyStyle,
                  color: resolvedBodyTextColor,
                }}
              >
                {normalizedDescription}
              </p>
            ) : null}
          </div>
        ) : null}

        {(
          categoryDrivenLayout
            ? displayCategories.length > 0
            : directItems.length > 0
        ) ? (
          renderLayoutContent()
        ) : (
          <div className={styles.emptyState}>
            <p style={sharedBodyTextStyle}>No menu items available.</p>
          </div>
        )}

        {categoryDrivenLayout
          ? renderSectionButtons(
              joinClasses(styles.menuCta, styles.menuButtonGroupCenter),
              styles.ctaButton,
              styles.ctaButton,
            )
          : null}
      </div>
    </section>
  );
}
