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
import styles from './menu.module.css';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import { useSectionViewport } from '@/hooks/use-section-viewport';
import { mergeMenuLayoutSettings } from '@/lib/menu-layout-schema';
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

function joinClasses(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function formatPrice(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^[\d.,]+$/.test(trimmed)) {
    return `$${trimmed}`;
  }

  return trimmed;
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
      item.ctaLink?.trim(),
  );
}

function buildDirectLayoutItems(
  layoutItems: MenuItem[] | undefined,
  title: string,
) {
  return (layoutItems || [])
    .filter(hasRenderableItemContent)
    .map(
      (item, index): PreparedMenuItem => ({
        ...item,
        name: item.name?.trim() || `Menu ${index + 1}`,
        categoryName: item.category || title || 'Menu Highlights',
        categoryDescription: undefined,
        categoryIcon: undefined,
      }),
    );
}

function getFallbackSymbol(item: PreparedMenuItem, index: number) {
  if (item.categoryIcon?.trim()) {
    return item.categoryIcon.trim().slice(0, 2);
  }

  const firstLetter = item.name?.trim().charAt(0);
  return firstLetter || PRESET_CATEGORY_SYMBOLS[index % PRESET_CATEGORY_SYMBOLS.length];
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
  const href = item.ctaLink || ctaButton?.href || '#menu';

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
  const href = button.href?.trim() || '#menu';

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
        justifyContent: 'flex-end',
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

export default function Menu({
  restaurant_id,
  title = 'Our Menu',
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
  showPrices = true,
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
  contentMaxWidth,
  mobileContentMaxWidth,
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
}: MenuProps) {
  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';

  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const viewport = useSectionViewport(previewMode);

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
    sectionPaddingY,
    mobileSectionPaddingY,
    sectionPaddingX,
    mobileSectionPaddingX,
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
  const { sectionStyle, contentStyle, surfaceStyle } = getSectionContainerStyles(
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
  const currentLayoutSettings = getLayoutRecord(layoutSettings, layout as MenuLayout);
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
  const resolvedCardRadius = resolveResponsiveValue(
    cardRadius,
    mobileCardRadius,
    viewport,
    (surfaceStyle.borderRadius as string) || '1.4rem',
  );
  const resolvedCardShadow = getSurfaceShadowValue(
    resolveResponsiveValue(cardShadow, mobileCardShadow, viewport, 'soft'),
  );
  const resolvedCardGap = resolveResponsiveValue(
    cardGap,
    mobileCardGap,
    viewport,
    '1.25rem',
  );
  const resolvedGridGap = resolveResponsiveValue(
    gridGap,
    mobileGridGap,
    viewport,
    '1.4rem',
  );
  const resolvedRowGap = resolveResponsiveValue(
    rowSpacing,
    mobileRowSpacing,
    viewport,
    '1.5rem',
  );
  const resolvedItemPadding = resolveResponsiveValue(
    itemPadding,
    mobileItemPadding,
    viewport,
    '1.25rem',
  );
  const resolvedColumnSpacing = resolveResponsiveValue(
    columnSpacing,
    mobileColumnSpacing,
    viewport,
    '1.5rem',
  );
  const resolvedContainerWidth = resolveResponsiveValue(
    contentMaxWidth,
    mobileContentMaxWidth,
    viewport,
    (contentStyle.maxWidth as string) || '1200px',
  );
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
  const resolvedItemTextAlign = resolveResponsiveValue(
    itemTextAlign,
    mobileItemTextAlign,
    viewport,
    'left',
  );

  const categoryDrivenLayout = layout === 'tabs' || layout === 'accordion';
  const preparedCategories = buildPreparedCategories(
    categories,
    featuredItems,
    title || 'Our Menu',
    { preserveEmptyCategories: categoryDrivenLayout },
  );
  const preparedItems = prepareItems(preparedCategories);
  const spotlightItems = buildFeaturedItems(featuredItems, preparedItems);
  const preparedLayoutItems = buildDirectLayoutItems(layoutItems, title || 'Our Menu');
  const highlightedItems = spotlightItems.slice(0, 8);
  const directItems = preparedLayoutItems.length > 0 ? preparedLayoutItems : preparedItems;
  const spotlightDirectItems =
    preparedLayoutItems.length > 0 ? preparedLayoutItems : highlightedItems;
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
    if (activeCategoryIndex >= preparedCategories.length) {
      setActiveCategoryIndex(0);
    }
  }, [activeCategoryIndex, preparedCategories.length]);

  useEffect(() => {
    if (expandedCategoryIndex >= preparedCategories.length) {
      setExpandedCategoryIndex(0);
    }
  }, [expandedCategoryIndex, preparedCategories.length]);

  useEffect(() => {
    if (layout !== 'accordion') {
      return;
    }

    const defaultExpanded = Number(
      currentLayoutSettings.defaultExpandedItem ?? 0,
    );
    if (defaultExpanded >= 0 && defaultExpanded < preparedCategories.length) {
      setExpandedCategoryIndex(defaultExpanded);
    }
  }, [
    currentLayoutSettings.defaultExpandedItem,
    layout,
    preparedCategories.length,
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
          layoutNumber('slideSpacing', 'mobileSlideSpacing', 16)
        : 320;

    const interval = window.setInterval(() => {
      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      const nextScrollLeft =
        track.scrollLeft + stepWidth >= maxScrollLeft ? 0 : track.scrollLeft + stepWidth;

      track.scrollTo({
        left: nextScrollLeft,
        behavior: 'smooth',
      });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [
    currentLayoutSettings.autoplay,
    currentLayoutSettings.slideSpacing,
    layout,
    spotlightDirectItems.length,
  ]);

  const activeCategory =
    preparedCategories[activeCategoryIndex] || preparedCategories[0] || null;

  const containerStyle: CSSProperties = {
    ...sectionStyle,
    ...reveal.style,
    backgroundColor: resolvedBgColor,
    ...bodyStyle,
    ['--menu-accent' as string]: resolvedAccentColor,
    ['--menu-card-bg' as string]: resolvedCardBgColor,
    ['--menu-text' as string]: resolvedTextColor,
    ['--menu-body' as string]: bodyStyle.color || resolvedTextColor,
    ['--menu-card-border' as string]: resolvedCardBorderColor,
    ['--menu-divider' as string]: resolvedDividerColor,
    ['--menu-price' as string]: resolvedPriceColor,
    ['--menu-badge' as string]: resolvedBadgeColor,
    ['--menu-card-radius' as string]: resolvedCardRadius,
    ['--menu-card-shadow' as string]: resolvedCardShadow,
    ['--menu-card-gap' as string]: resolvedCardGap,
    ['--menu-grid-gap' as string]: resolvedGridGap,
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

    if (variant === 'outline') {
      return {
        backgroundColor: 'transparent',
        color: button?.textColor || button?.borderColor || resolvedAccentColor,
        borderColor:
          button?.borderColor || button?.bgColor || resolvedAccentColor,
        borderRadius: resolvedCardRadius,
      };
    }

    if (variant === 'secondary') {
      return {
        backgroundColor: button?.bgColor || '#ffffff',
        color: button?.textColor || button?.borderColor || resolvedAccentColor,
        borderColor:
          button?.borderColor || button?.bgColor || resolvedAccentColor,
        borderRadius: resolvedCardRadius,
      };
    }

    return {
      ...ctaButtonStyle,
      backgroundColor:
        ctaButtonStyle.backgroundColor ||
        button?.bgColor ||
        resolvedButtonBgColor,
      color:
        ctaButtonStyle.color ||
        button?.textColor ||
        resolvedButtonTextColor,
      borderColor:
        ctaButtonStyle.borderColor ||
        button?.borderColor ||
        resolvedButtonBgColor,
      borderRadius: resolvedCardRadius,
    };
  };

  const primaryButtonInlineStyle = getSectionButtonInlineStyle(
    resolvedPrimaryButton,
    'primary',
  );
  const secondaryButtonInlineStyle = getSectionButtonInlineStyle(
    resolvedSecondaryButton,
    'outline',
  );

  const cardButtonInlineStyle: CSSProperties = {
    color: resolvedAccentColor,
    borderColor: resolvedAccentColor,
    backgroundColor: '#ffffff',
    borderRadius: '999px',
  };

  const backdropOverlayOpacity = backgroundImage
    ? Math.max(0.16, Math.min(overlayOpacity ?? 0.52, 0.85))
    : 0;

  const scrollCarousel = (direction: 'prev' | 'next') => {
    if (!carouselTrackRef.current) return;

    const stepWidth =
      carouselTrackRef.current.firstElementChild instanceof HTMLElement
        ? carouselTrackRef.current.firstElementChild.getBoundingClientRect().width +
          layoutNumber('slideSpacing', 'mobileSlideSpacing', 16)
        : 340;

    carouselTrackRef.current.scrollBy({
      left: direction === 'next' ? stepWidth : -stepWidth,
      behavior: 'smooth',
    });
  };

  const renderPrice = (item: PreparedMenuItem) => {
    if (!showPrices) return null;

    const price = formatPrice(item.price);
    if (!price) return null;

    return (
      <span className={styles.cardPrice} style={{ color: resolvedPriceColor }}>
        {price}
      </span>
    );
  };

  const renderDietary = (item: PreparedMenuItem) => {
    if (!showDietaryInfo || !item.dietary?.length) return null;

    return (
      <div className={styles.cardDietary}>
        {item.dietary.map((diet) => (
          <span
            key={`${item.name}-${diet}`}
            className={styles.dietaryBadge}
            style={{ borderColor: resolvedBadgeColor, color: resolvedBadgeColor }}
          >
            {diet}
          </span>
        ))}
      </div>
    );
  };

  const renderCardAction = (
    item: PreparedMenuItem,
    variant: 'outline' | 'solid' = 'outline',
  ) => {
    const action = buildCardAction(item, resolvedPrimaryButton);
    if (!action) return null;

    return (
      <a
        href={action.href}
        className={joinClasses(
          styles.itemButton,
          variant === 'solid' ? styles.itemButtonSolid : styles.itemButtonOutline,
        )}
        style={variant === 'solid' ? primaryButtonInlineStyle : cardButtonInlineStyle}
      >
        {action.label}
      </a>
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
    const media = showImages ? resolveItemMedia(item, headerImage, backgroundImage) : undefined;

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
          style={{ background: 'linear-gradient(135deg, rgba(226,232,240,0.95), rgba(241,245,249,1))' }}
        />
      );
    }

    return <div className={styles.featureIcon}>{getFallbackSymbol(item, index)}</div>;
  };

  const renderImageCard = (
    item: PreparedMenuItem,
    index: number,
    options?: { overlay?: boolean; compact?: boolean; centered?: boolean },
  ) => {
    const imageAspectRatio = getAspectRatioValue(
      layoutString('imageAspectRatio', 'mobileImageAspectRatio', 'landscape'),
    );
    const overlayPosition = layoutString(
      'overlayTextPosition',
      'mobileOverlayTextPosition',
      'bottom-left',
    );
    const media = showImages ? resolveItemMedia(item, headerImage, backgroundImage) : undefined;
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
          borderRadius: resolvedCardRadius,
          boxShadow: resolvedCardShadow,
          textAlign: resolvedItemTextAlign as CSSProperties['textAlign'],
        }}
      >
        <div className={styles.cardMedia} style={{ aspectRatio: imageAspectRatio, minHeight: 0 }}>
          {mediaHref ? (
            <a href={mediaHref} className={styles.cardMediaLink} aria-label={`Open ${item.name}`}>
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
              ? getOverlayBodyStyle(overlayPosition, resolvedItemTextAlign)
              : {
                  padding: resolvedItemPadding,
                  textAlign: resolvedItemTextAlign as CSSProperties['textAlign'],
                }
          }
        >
          <div className={styles.cardEyebrow}>
            {showCategoryIcons && item.categoryIcon
              ? `${item.categoryIcon} ${item.categoryName}`
              : item.categoryName}
          </div>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle} style={{ color: resolvedTextColor }}>
              {item.name}
            </h3>
            {renderPrice(item)}
          </div>
          {showDescriptions && item.description ? (
            <p className={styles.cardDescription} style={{ color: resolvedTextColor }}>
              {item.description}
            </p>
          ) : null}
          {renderDietary(item)}
          {item.badge ? (
            <span
              className={styles.dietaryBadge}
              style={{ borderColor: resolvedBadgeColor, color: resolvedBadgeColor }}
            >
              {item.badge}
            </span>
          ) : null}
          {renderCardAction(item)}
        </div>
      </article>
    );
  };

  const renderSplitCard = (
    item: PreparedMenuItem,
    index: number,
    reverse = false,
  ) => {
    const media = showImages ? resolveItemMedia(item, headerImage, backgroundImage) : undefined;
    const imageAspectRatio = getAspectRatioValue(
      layoutString('imageAspectRatio', 'mobileImageAspectRatio', 'landscape'),
    );

    return (
      <article
        key={`${item.categoryName}-${item.name}-${index}`}
        className={styles.imageCard}
        style={{
          backgroundColor: resolvedCardBgColor,
          borderRadius: resolvedCardRadius,
          boxShadow: resolvedCardShadow,
          display: 'grid',
          gridTemplateColumns:
            viewport === 'mobile' || currentLayoutSettings.stackOnMobile !== false
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
            textAlign: (currentLayoutSettings.contentAlignment ||
              resolvedItemTextAlign) as CSSProperties['textAlign'],
          }}
        >
          <div className={styles.cardEyebrow}>{item.categoryName}</div>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle} style={{ color: resolvedTextColor }}>
              {item.name}
            </h3>
            {renderPrice(item)}
          </div>
          {showDescriptions && item.description ? (
            <p className={styles.cardDescription} style={{ color: resolvedTextColor }}>
              {item.description}
            </p>
          ) : null}
          {item.badge ? (
            <span
              className={styles.dietaryBadge}
              style={{ borderColor: resolvedBadgeColor, color: resolvedBadgeColor }}
            >
              {item.badge}
            </span>
          ) : null}
          {renderCardAction(item)}
        </div>
      </article>
    );
  };

  const renderPromoCard = (item: PreparedMenuItem, index: number) => (
    <article
      key={`${item.categoryName}-${item.name}-${index}`}
      className={styles.promoCard}
      style={{
        backgroundColor:
          currentLayoutSettings.cardStyle === 'outlined'
            ? resolvedCardBgColor
            : resolvedButtonBgColor,
        color:
          currentLayoutSettings.cardStyle === 'outlined'
            ? resolvedTextColor
            : resolvedButtonTextColor,
        textAlign: (currentLayoutSettings.contentAlignment ||
          'center') as CSSProperties['textAlign'],
        boxShadow: resolvedCardShadow,
        borderRadius: resolvedCardRadius,
      }}
    >
      <div
        className={styles.cardEyebrow}
        style={{
          color:
            currentLayoutSettings.cardStyle === 'outlined'
              ? resolvedAccentColor
              : 'rgba(255,255,255,0.86)',
        }}
      >
        {item.categoryName}
      </div>
      <h3 className={styles.promoTitle}>{item.name}</h3>
      {showDescriptions && item.description ? (
        <p
          className={styles.promoDescription}
          style={{
            color:
              currentLayoutSettings.cardStyle === 'outlined'
                ? resolvedTextColor
                : 'rgba(255,255,255,0.88)',
          }}
        >
          {item.description}
        </p>
      ) : null}
      {renderCardAction(item, 'solid')}
    </article>
  );

  const renderCategoryBlock = (
    category: MenuCategory,
    items: PreparedMenuItem[],
    itemsClassName: string,
    renderer: (item: PreparedMenuItem, index: number) => React.ReactNode,
    showCategoryHeader = preparedCategories.length > 1,
    itemsStyle?: CSSProperties,
  ) => (
    <section key={category.name} className={styles.menuCategory}>
      {showCategoryHeader ? (
        <div className={styles.categoryHeader}>
          <div>
            <div className={styles.cardEyebrow}>
              {showCategoryIcons && category.icon ? `${category.icon} Menu Category` : 'Menu Category'}
            </div>
            <h3 className={styles.categoryName} style={{ color: resolvedTextColor }}>
              {category.name}
            </h3>
            {category.description ? (
              <p className={styles.categoryDescription} style={{ color: resolvedTextColor }}>
                {category.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={itemsClassName} style={itemsStyle}>{items.map(renderer)}</div>
    </section>
  );

  const renderGridLayouts = (
    itemsClassName: string,
    rendererOptions?: Parameters<typeof renderImageCard>[2],
    itemsStyle?: CSSProperties,
  ) =>
    preparedCategories.map((category) =>
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
        preparedCategories.length > 1,
        itemsStyle,
      ),
    );

  const renderLayoutContent = () => {
    switch (layout) {
      case 'list':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.promoGrid}
                style={{
                  gap: `${layoutNumber('cardGap', 'mobileCardGap', 20)}px`,
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
            {preparedCategories.map((category) =>
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
                preparedCategories.length > 1,
                {
                  gap: `${layoutNumber('cardGap', 'mobileCardGap', 20)}px`,
                  gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('cardCount', 'mobileCardCount', 2))}, minmax(0, 1fr))`,
                },
              ),
            )}
          </div>
        );

      case 'masonry':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.masonryGrid}
                style={{
                  columnCount: layoutNumber('columns', 'mobileColumns', 2),
                  columnGap: `${layoutNumber('gap', 'mobileGap', 22)}px`,
                }}
              >
                {directItems.map((item, index) => renderImageCard(item, index))}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {preparedCategories.map((category) =>
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
                preparedCategories.length > 1,
                {
                  columnCount: layoutNumber('columns', 'mobileColumns', 2),
                  columnGap: `${layoutNumber('gap', 'mobileGap', 22)}px`,
                },
              ),
            )}
          </div>
        );

      case 'carousel':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div className={styles.carouselShell} style={{ gap: resolvedRowGap }}>
              <div className={styles.carouselIntro}>
                <div className={styles.cardEyebrow}>{subtitle || 'Curated picks'}</div>
                <h3 className={styles.carouselTitle} style={{ color: resolvedTextColor }}>
                  {title || 'Best menu selections in town'}
                </h3>
                {description ? (
                  <p className={styles.carouselDescription} style={{ color: resolvedTextColor }}>
                    {description}
                  </p>
                ) : null}
              </div>
              <div className={styles.carouselViewport}>
                {currentLayoutSettings.showArrows !== false ? (
                  <button
                    type="button"
                    className={joinClasses(styles.carouselNav, styles.carouselNavPrev)}
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
                    gap: `${layoutNumber('slideSpacing', 'mobileSlideSpacing', 16)}px`,
                    gridAutoColumns: `minmax(calc((100% - ${
                      layoutNumber('slideSpacing', 'mobileSlideSpacing', 16) *
                      (Math.max(1, layoutNumber('cardCount', 'mobileCardCount', 3)) - 1)
                    }px) / ${Math.max(1, layoutNumber('cardCount', 'mobileCardCount', 3))}, 1fr)`,
                    scrollSnapType: `x ${currentLayoutSettings.snapBehavior || 'proximity'}`,
                  }}
                >
                  {spotlightDirectItems.map((item, index) => {
                    const media =
                      showImages && resolveItemMedia(item, headerImage, backgroundImage);

                    return (
                      <article
                        key={`${item.categoryName}-${item.name}-${index}`}
                        className={styles.carouselCard}
                        style={{
                          borderRadius: resolvedCardRadius,
                          boxShadow: resolvedCardShadow,
                          transform:
                            currentLayoutSettings.cardAnimation === 'lift'
                              ? 'translateY(-2px)'
                              : undefined,
                          opacity:
                            currentLayoutSettings.cardAnimation === 'fade' ? 0.96 : 1,
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
                          style={getOverlayBodyStyle(
                            String(
                              layoutString('overlayTextPosition', 'mobileOverlayTextPosition', 'bottom-left'),
                            ),
                            resolvedItemTextAlign,
                          )}
                        >
                          <div className={styles.cardEyebrow}>{item.categoryName}</div>
                          <h3 className={styles.cardTitle} style={{ color: '#ffffff' }}>
                            {item.name}
                          </h3>
                          {showDescriptions && item.description ? (
                            <p className={styles.carouselCardDescription}>{item.description}</p>
                          ) : null}
                          {renderCardAction(item)}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {currentLayoutSettings.showArrows !== false ? (
                  <button
                    type="button"
                    className={joinClasses(styles.carouselNav, styles.carouselNavNext)}
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
                          index === 0 ? resolvedAccentColor : 'rgba(203,213,225,0.9)',
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );

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
                        borderRadius: resolvedCardRadius,
                        boxShadow: resolvedCardShadow,
                      }
                    : {
                        borderRadius: resolvedCardRadius,
                        boxShadow: resolvedCardShadow,
                      }
                }
              >
                <div className={styles.tabEyebrow}>
                  {subtitle || 'Order directly from our website'}
                </div>
                <h3 className={styles.tabIntroTitle}>
                  {title || 'Best menu selections in town'}
                </h3>
                <p className={styles.tabIntroDescription}>
                  {description ||
                    'Use categories to highlight different collections and help guests scan faster.'}
                </p>
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
                {preparedCategories.map((category, index) => (
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
                      boxShadow: index === activeCategoryIndex ? resolvedCardShadow : 'none',
                    }}
                  >
                    <div className={styles.tabButtonCopy}>
                      <span className={styles.tabButtonTitle} style={{ color: resolvedTextColor }}>{category.name}</span>
                      <span className={styles.tabButtonDescription}>
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
                  <div className={styles.cardEyebrow}>Active Category</div>
                  <h3 className={styles.categoryName} style={{ color: resolvedTextColor }}>
                    {activeCategory.name}
                  </h3>
                  {activeCategory.description ? (
                    <p className={styles.categoryDescription} style={{ color: resolvedTextColor }}>
                      {activeCategory.description}
                    </p>
                  ) : null}
                </div>
                <div className={styles.tabItemsGrid} style={{ gap: resolvedGridGap }}>
                  {(activeCategory.items || []).map((item, index) =>
                    renderImageCard(
                      {
                        ...item,
                        categoryName: item.category || activeCategory.name,
                        categoryDescription: activeCategory.description,
                        categoryIcon: activeCategory.icon,
                      },
                      index,
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
              {preparedCategories.map((category, categoryIndex) => {
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
                        borderColor: isOpen ? resolvedActiveTabColor : resolvedCardBorderColor,
                        backgroundColor: isOpen ? resolvedAccordionActiveColor : '#ffffff',
                      }}
                    >
                      <div className={styles.accordionTriggerCopy}>
                        <span className={styles.tabButtonTitle} style={{ color: resolvedTextColor }}>{category.name}</span>
                        <span className={styles.tabButtonDescription}>
                          {category.description ||
                            `${(category.items || []).length} item${(category.items || []).length === 1 ? '' : 's'} in this group`}
                        </span>
                      </div>
                      <span className={styles.accordionArrow}>{accordionIcon}</span>
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
                            showImages && resolveItemMedia(preparedItem, headerImage, backgroundImage);

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
                                  <h4 className={styles.accordionItemTitle} style={{ color: resolvedTextColor }}>
                                    {item.name}
                                  </h4>
                                  {showDescriptions && item.description ? (
                                    <p className={styles.accordionItemDescription} style={{ color: resolvedTextColor }}>
                                      {item.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className={styles.accordionItemMeta}>
                                {renderPrice(preparedItem)}
                                {renderCardAction(preparedItem)}
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
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.twoColumnGrid}
                style={{
                  gap: `${layoutNumber('cardGap', 'mobileCardGap', 22)}px`,
                  gridTemplateColumns:
                    viewport === 'mobile' && currentLayoutSettings.stackOnMobile !== false
                      ? '1fr'
                      : getColumnRatioValue(String(currentLayoutSettings.columnRatio || '1:1')),
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
              gap: `${layoutNumber('cardGap', 'mobileCardGap', 22)}px`,
              gridTemplateColumns:
                viewport === 'mobile' && currentLayoutSettings.stackOnMobile !== false
                  ? '1fr'
                  : getColumnRatioValue(String(currentLayoutSettings.columnRatio || '1:1')),
            })}
          </div>
        );

      case 'single-column':
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.singleColumnGrid}
                style={{
                  gap: `${layoutNumber('cardSpacing', 'mobileCardSpacing', 20)}px`,
                  maxWidth: getContentWidthValue(
                    String(currentLayoutSettings.contentWidth || 'medium'),
                  ),
                  marginInline: currentLayoutSettings.centered === false ? '0' : 'auto',
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
            {preparedCategories.map((category) =>
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
                (item, index) => renderImageCard(item, index, { centered: true }),
                preparedCategories.length > 1,
                {
                  gap: `${layoutNumber('cardSpacing', 'mobileCardSpacing', 20)}px`,
                  maxWidth:
                    currentLayoutSettings.contentWidth === 'narrow'
                      ? getContentWidthValue('narrow')
                      : currentLayoutSettings.contentWidth === 'wide'
                        ? getContentWidthValue('wide')
                        : getContentWidthValue('medium'),
                  marginInline: currentLayoutSettings.centered === false ? '0' : 'auto',
                },
              ),
            )}
          </div>
        );

      case 'featured-grid':
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            <div className={styles.featuredIntro}>
              <div className={styles.cardEyebrow}>{subtitle || 'Featured favorites'}</div>
              <h3 className={styles.featuredTitle} style={{ color: resolvedTextColor }}>
                {title || 'Best menu selections in town'}
              </h3>
            </div>
            <div
              className={styles.featureGrid}
              style={{
                gap: `${layoutNumber('cardGap', 'mobileCardGap', 20)}px`,
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
                  <h3 className={styles.featureTitle} style={{ color: resolvedTextColor }}>
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p className={styles.featureDescription} style={{ color: resolvedTextColor }}>
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
                gap: `${layoutNumber('cardGap', 'mobileCardGap', 20)}px`,
                gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 3))}, minmax(0, 1fr))`,
              }}
            >
              {spotlightDirectItems.slice(0, 3).map((item, index) => (
                <article
                  key={`${item.categoryName}-${item.name}-${index}`}
                  className={styles.minimalCard}
                >
                  {renderSymbol(item, index)}
                  <h3 className={styles.minimalTitle} style={{ color: resolvedTextColor }}>
                    {item.name}
                  </h3>
                  {showDescriptions && item.description ? (
                    <p className={styles.minimalDescription} style={{ color: resolvedTextColor }}>
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
            {currentLayoutSettings.dividerVisible !== false ? <div className={styles.minimalDivider} /> : null}
          </div>
        );

      case 'grid':
      default:
        if (preparedLayoutItems.length > 0) {
          return (
            <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
              <div
                className={styles.twoColumnGrid}
                style={{
                  gap: `${layoutNumber('gap', 'mobileGap', 24)}px`,
                  gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 2))}, minmax(0, 1fr))`,
                }}
              >
                {directItems.map((item, index) => renderImageCard(item, index, { overlay: true }))}
              </div>
            </div>
          );
        }
        return (
          <div className={styles.layoutBody} style={{ gap: resolvedRowGap }}>
            {renderGridLayouts(styles.twoColumnGrid, { overlay: true }, {
              gap: `${layoutNumber('gap', 'mobileGap', 24)}px`,
              gridTemplateColumns: `repeat(${Math.max(1, layoutNumber('columns', 'mobileColumns', 2))}, minmax(0, 1fr))`,
            })}
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
            style={{ backgroundColor: overlayColor, opacity: backdropOverlayOpacity }}
          />
        </>
      ) : null}

      <div className={styles.menuContainer} style={{ ...contentStyle, maxWidth: resolvedContainerWidth }}>
        <div
          className={joinClasses(
            styles.menuHeader,
            (sectionStyle.textAlign || textAlign) === 'left'
              ? styles.alignLeft
              : (sectionStyle.textAlign || textAlign) === 'right'
                ? styles.alignRight
                : styles.alignCenter,
          )}
        >
          {title ? (
            <h2 className={styles.menuTitle} style={titleStyle}>
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p className={styles.menuSubtitle} style={{ ...subtitleStyle, color: subtitleStyle.color || resolvedTextColor }}>
              {subtitle}
            </p>
          ) : null}
          {description ? (
            <p className={styles.menuDescription} style={{ ...bodyStyle, color: bodyStyle.color || resolvedTextColor }}>
              {description}
            </p>
          ) : null}
        </div>

        {(categoryDrivenLayout ? preparedCategories.length > 0 : directItems.length > 0) ? (
          renderLayoutContent()
        ) : (
          <div className={styles.emptyState}>
            <p style={{ color: resolvedTextColor }}>No menu items available.</p>
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
