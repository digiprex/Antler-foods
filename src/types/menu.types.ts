/**
 * Type definitions for dynamic menu section configuration
 * These types define the structure of data that will come from the database/API
 */

import type {
  SectionStyleConfig,
  SectionSurfaceShadow,
} from '@/types/section-style.types';
import { MENU_SHARED_SPACING_DEFAULTS } from '@/lib/menu-spacing';

export type MenuLayout =
  | 'grid'
  | 'list'
  | 'masonry'
  | 'carousel'
  | 'tabs'
  | 'accordion'
  | 'two-column'
  | 'single-column'
  | 'featured-grid'
  | 'minimal';

export type MenuImageAspectRatio = 'square' | 'portrait' | 'landscape' | 'wide';
export type MenuOverlayTextPosition =
  | 'top-left'
  | 'center'
  | 'bottom-left'
  | 'bottom-center';
export type MenuCardStyle = 'soft' | 'outlined' | 'glass' | 'minimal';
export type MenuContentAlignment = 'left' | 'center' | 'right';
export type MenuTabAlignment = 'left' | 'center' | 'right' | 'stretch';
export type MenuTabStyle = 'pill' | 'underline' | 'segmented';
export type MenuTabOrientation = 'top' | 'side';
export type MenuAccordionIconStyle = 'plus-minus' | 'chevron' | 'caret';
export type MenuDividerStyle = 'line' | 'soft' | 'none';
export type MenuSurfaceMode = 'card' | 'flat';
export type MenuColumnRatio = '1:1' | '5:4' | '4:5' | '3:2';
export type MenuStackStyle = 'stacked' | 'offset';
export type MenuHierarchyStyle = 'balanced' | 'title-first' | 'price-first';
export type MenuPanelTransition = 'none' | 'fade' | 'slide';
export type MenuCardAnimation = 'none' | 'lift' | 'fade';
export type MenuSnapBehavior = 'proximity' | 'mandatory';
export type MenuContentWidth = 'narrow' | 'medium' | 'wide';

export interface MenuGridLayoutSettings {
  columns?: number;
  mobileColumns?: number;
  gap?: number;
  mobileGap?: number;
  imageAspectRatio?: MenuImageAspectRatio;
  mobileImageAspectRatio?: MenuImageAspectRatio;
  overlayTextPosition?: MenuOverlayTextPosition;
  mobileOverlayTextPosition?: MenuOverlayTextPosition;
}

export interface MenuListLayoutSettings {
  cardCount?: number;
  mobileCardCount?: number;
  cardStyle?: MenuCardStyle;
  contentAlignment?: MenuContentAlignment;
  cardGap?: number;
  mobileCardGap?: number;
}

export interface MenuMasonryLayoutSettings {
  columns?: number;
  mobileColumns?: number;
  gap?: number;
  mobileGap?: number;
  imageAspectRatio?: MenuImageAspectRatio;
  mobileImageAspectRatio?: MenuImageAspectRatio;
}

export interface MenuCarouselLayoutSettings {
  cardCount?: number;
  mobileCardCount?: number;
  slideSpacing?: number;
  mobileSlideSpacing?: number;
  autoplay?: boolean;
  snapBehavior?: MenuSnapBehavior;
  imageAspectRatio?: MenuImageAspectRatio;
  mobileImageAspectRatio?: MenuImageAspectRatio;
  overlayTextPosition?: MenuOverlayTextPosition;
  mobileOverlayTextPosition?: MenuOverlayTextPosition;
  showArrows?: boolean;
  showDots?: boolean;
  cardAnimation?: MenuCardAnimation;
}

export interface MenuTabsLayoutSettings {
  tabAlignment?: MenuTabAlignment;
  tabStyle?: MenuTabStyle;
  tabOrientation?: MenuTabOrientation;
  tabSpacing?: number;
  mobileTabSpacing?: number;
  sideTabWidth?: number;
  panelTransition?: MenuPanelTransition;
}

export interface MenuAccordionLayoutSettings {
  itemSpacing?: number;
  mobileItemSpacing?: number;
  iconStyle?: MenuAccordionIconStyle;
  defaultExpandedItem?: number;
  dividerStyle?: MenuDividerStyle;
  surfaceMode?: MenuSurfaceMode;
  revealItems?: boolean;
}

export interface MenuTwoColumnLayoutSettings {
  columnRatio?: MenuColumnRatio;
  imagePosition?: 'top' | 'left' | 'right';
  imageAspectRatio?: MenuImageAspectRatio;
  mobileImageAspectRatio?: MenuImageAspectRatio;
  contentAlignment?: MenuContentAlignment;
  cardGap?: number;
  mobileCardGap?: number;
  stackOnMobile?: boolean;
}

export interface MenuSingleColumnLayoutSettings {
  contentWidth?: MenuContentWidth;
  centered?: boolean;
  cardSpacing?: number;
  mobileCardSpacing?: number;
  stackStyle?: MenuStackStyle;
  imageAspectRatio?: MenuImageAspectRatio;
  mobileImageAspectRatio?: MenuImageAspectRatio;
}

export interface MenuFeaturedGridLayoutSettings {
  columns?: number;
  mobileColumns?: number;
  showIcons?: boolean;
  cardStyle?: MenuCardStyle;
  contentHierarchy?: MenuHierarchyStyle;
  cardGap?: number;
  mobileCardGap?: number;
}

export interface MenuMinimalLayoutSettings {
  columns?: number;
  mobileColumns?: number;
  showIcons?: boolean;
  dividerVisible?: boolean;
  contentHierarchy?: MenuHierarchyStyle;
  cardGap?: number;
  mobileCardGap?: number;
}

export interface MenuLayoutSettings {
  grid?: MenuGridLayoutSettings;
  list?: MenuListLayoutSettings;
  masonry?: MenuMasonryLayoutSettings;
  carousel?: MenuCarouselLayoutSettings;
  tabs?: MenuTabsLayoutSettings;
  accordion?: MenuAccordionLayoutSettings;
  'two-column'?: MenuTwoColumnLayoutSettings;
  'single-column'?: MenuSingleColumnLayoutSettings;
  'featured-grid'?: MenuFeaturedGridLayoutSettings;
  minimal?: MenuMinimalLayoutSettings;
}

export interface MenuItem {
  id?: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  imageLink?: string;
  backgroundImage?: string; // Background image for the item card
  category?: string;
  featured?: boolean;
  dietary?: string[]; // e.g., ['vegetarian', 'gluten-free', 'vegan']
  ctaLabel?: string; // Call-to-action button label
  ctaLink?: string; // Call-to-action button link
  badge?: string;
}

export interface MenuCategory {
  id?: string;
  name: string;
  description?: string;
  items?: MenuItem[];
  icon?: string;
}

export interface MenuButton {
  id?: string;
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface MenuConfig extends SectionStyleConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Content
  title: string;
  subtitle?: string;
  description?: string;

  // Menu Data
  categories?: MenuCategory[];
  featuredItems?: MenuItem[];
  layoutItems?: MenuItem[];
  primaryButtonEnabled?: boolean;
  secondaryButtonEnabled?: boolean;
  primaryButton?: MenuButton;
  secondaryButton?: MenuButton;
  // Legacy shared CTA field kept for backward compatibility.
  ctaButton?: MenuButton;
  headerImage?: string;
  backgroundImage?: string;

  // Layout options
  layout?: MenuLayout;
  layoutSettings?: MenuLayoutSettings;

  // Styling
  bgColor?: string;
  mobileBgColor?: string;
  textColor?: string;
  mobileTextColor?: string;
  accentColor?: string;
  mobileAccentColor?: string;
  cardBgColor?: string;
  mobileCardBgColor?: string;
  cardBorderColor?: string;
  mobileCardBorderColor?: string;
  dividerColor?: string;
  mobileDividerColor?: string;
  badgeColor?: string;
  mobileBadgeColor?: string;
  buttonBgColor?: string;
  mobileButtonBgColor?: string;
  buttonTextColor?: string;
  mobileButtonTextColor?: string;
  priceColor?: string;
  mobilePriceColor?: string;
  activeTabColor?: string;
  mobileActiveTabColor?: string;
  accordionActiveColor?: string;
  mobileAccordionActiveColor?: string;
  cardRadius?: string;
  mobileCardRadius?: string;
  cardShadow?: SectionSurfaceShadow;
  mobileCardShadow?: SectionSurfaceShadow;
  overlayColor?: string;
  overlayOpacity?: number;

  // Display Options
  showPrices?: boolean;
  showImages?: boolean;
  showDescriptions?: boolean;
  showDietaryInfo?: boolean;
  showCategoryIcons?: boolean;

  // Category Display
  categoryLayout?: 'tabs' | 'dropdown' | 'sidebar' | 'all'; // How to display categories

  // Text alignment
  textAlign?: 'left' | 'center' | 'right';
  itemTextAlign?: 'left' | 'center' | 'right';
  mobileItemTextAlign?: 'left' | 'center' | 'right';

  // Spacing
  paddingTop?: string;
  paddingBottom?: string;
  itemSpacing?: string;
  mobileItemSpacing?: string;
  cardGap?: string;
  mobileCardGap?: string;
  gridGap?: string;
  mobileGridGap?: string;
  rowSpacing?: string;
  mobileRowSpacing?: string;
  itemPadding?: string;
  mobileItemPadding?: string;
  columnSpacing?: string;
  mobileColumnSpacing?: string;

  // Grid columns (for grid layouts)
  columns?: number; // Number of columns (2, 3, or 4)
  mobileColumns?: number;

  // Additional options
  contentMaxWidth?: string;
  mobileContentMaxWidth?: string;
  enableSearch?: boolean;
  enableFilters?: boolean;
  itemTitleSize?: string;
  mobileItemTitleSize?: string;
  itemTitleWeight?: number;
  mobileItemTitleWeight?: number;
  itemDescriptionSize?: string;
  mobileItemDescriptionSize?: string;
  itemLineHeight?: string;
  mobileItemLineHeight?: string;
  itemLetterSpacing?: string;
  mobileItemLetterSpacing?: string;
  priceTextSize?: string;
  mobilePriceTextSize?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for menu configuration
 */
export interface MenuConfigResponse {
  success: boolean;
  data: MenuConfig;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_MENU_CONFIG: MenuConfig = {
  title: '',
  subtitle: '',
  description: '',
  layout: 'grid',
  layoutSettings: {
    grid: {
      columns: 2,
      mobileColumns: 1,
      gap: 24,
      mobileGap: 16,
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      overlayTextPosition: 'center',
      mobileOverlayTextPosition: 'center',
    },
    list: {
      cardCount: 2,
      mobileCardCount: 1,
      cardStyle: 'soft',
      contentAlignment: 'center',
      cardGap: 20,
      mobileCardGap: 16,
    },
    masonry: {
      columns: 2,
      mobileColumns: 1,
      gap: 22,
      mobileGap: 16,
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
    },
    carousel: {
      cardCount: 3,
      mobileCardCount: 1,
      slideSpacing: 16,
      mobileSlideSpacing: 12,
      autoplay: false,
      snapBehavior: 'proximity',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      overlayTextPosition: 'bottom-left',
      mobileOverlayTextPosition: 'bottom-left',
      showArrows: true,
      showDots: true,
      cardAnimation: 'lift',
    },
    tabs: {
      tabAlignment: 'left',
      tabStyle: 'segmented',
      tabOrientation: 'side',
      tabSpacing: 14,
      mobileTabSpacing: 10,
      sideTabWidth: 360,
      panelTransition: 'fade',
    },
    accordion: {
      itemSpacing: 16,
      mobileItemSpacing: 12,
      iconStyle: 'plus-minus',
      defaultExpandedItem: 0,
      dividerStyle: 'soft',
      surfaceMode: 'card',
      revealItems: true,
    },
    'two-column': {
      columnRatio: '1:1',
      imagePosition: 'top',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      contentAlignment: 'left',
      cardGap: 22,
      mobileCardGap: 16,
      stackOnMobile: true,
    },
    'single-column': {
      contentWidth: 'medium',
      centered: true,
      cardSpacing: 20,
      mobileCardSpacing: 16,
      stackStyle: 'stacked',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
    },
    'featured-grid': {
      columns: 3,
      mobileColumns: 1,
      showIcons: true,
      cardStyle: 'soft',
      contentHierarchy: 'balanced',
      cardGap: 20,
      mobileCardGap: 14,
    },
    minimal: {
      columns: 3,
      mobileColumns: 1,
      showIcons: true,
      dividerVisible: true,
      contentHierarchy: 'balanced',
      cardGap: 20,
      mobileCardGap: 14,
    },
  },
  bgColor: '#ffffff',
  mobileBgColor: '#ffffff',
  textColor: '#000000',
  mobileTextColor: '#111827',
  accentColor: '#3b82f6',
  mobileAccentColor: '#7c3aed',
  cardBgColor: '#f9fafb',
  mobileCardBgColor: '#ffffff',
  cardBorderColor: 'rgba(148, 163, 184, 0.22)',
  mobileCardBorderColor: 'rgba(148, 163, 184, 0.22)',
  dividerColor: 'rgba(148, 163, 184, 0.24)',
  mobileDividerColor: 'rgba(148, 163, 184, 0.24)',
  badgeColor: '#7c3aed',
  mobileBadgeColor: '#7c3aed',
  buttonBgColor: '#7c3aed',
  mobileButtonBgColor: '#7c3aed',
  buttonTextColor: '#ffffff',
  mobileButtonTextColor: '#ffffff',
  priceColor: '#7c3aed',
  mobilePriceColor: '#7c3aed',
  activeTabColor: '#7c3aed',
  mobileActiveTabColor: '#7c3aed',
  accordionActiveColor: '#ede9fe',
  mobileAccordionActiveColor: '#ede9fe',
  cardRadius: '1rem',
  mobileCardRadius: '0.875rem',
  cardShadow: 'soft',
  mobileCardShadow: 'soft',
  textAlign: 'center',
  itemTextAlign: 'left',
  mobileItemTextAlign: 'left',
  sectionPaddingY: MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
  sectionPaddingX: MENU_SHARED_SPACING_DEFAULTS.sectionPaddingX,
  mobileSectionPaddingY: MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY,
  mobileSectionPaddingX: MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX,
  paddingTop: MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
  paddingBottom: MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
  itemSpacing: MENU_SHARED_SPACING_DEFAULTS.internalGap,
  mobileItemSpacing: MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
  cardGap: MENU_SHARED_SPACING_DEFAULTS.internalGap,
  mobileCardGap: MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
  gridGap: MENU_SHARED_SPACING_DEFAULTS.internalGap,
  mobileGridGap: MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
  rowSpacing: MENU_SHARED_SPACING_DEFAULTS.internalGap,
  mobileRowSpacing: MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
  itemPadding: '1.25rem',
  mobileItemPadding: '1rem',
  columnSpacing: MENU_SHARED_SPACING_DEFAULTS.internalGap,
  mobileColumnSpacing: MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
  columns: 3,
  mobileColumns: 1,
  showPrices: false,
  showImages: true,
  showDescriptions: true,
  showDietaryInfo: true,
  showCategoryIcons: false,
  categoryLayout: 'tabs',
  contentMaxWidth: '1200px',
  mobileContentMaxWidth: '100%',
  enableSearch: false,
  enableFilters: false,
  itemTitleSize: '1.125rem',
  mobileItemTitleSize: '1rem',
  itemTitleWeight: 700,
  mobileItemTitleWeight: 700,
  itemDescriptionSize: '0.95rem',
  mobileItemDescriptionSize: '0.9rem',
  itemLineHeight: '1.65',
  mobileItemLineHeight: '1.6',
  itemLetterSpacing: '0',
  mobileItemLetterSpacing: '0',
  priceTextSize: '1rem',
  mobilePriceTextSize: '0.95rem',
  is_custom: false,
  buttonStyleVariant: 'primary',
  titleFontFamily: 'Inter, system-ui, sans-serif',
  titleFontSize: '2.25rem',
  titleFontWeight: 700,
  titleColor: '#111827',
  subtitleFontFamily: 'Inter, system-ui, sans-serif',
  subtitleFontSize: '1.5rem',
  subtitleFontWeight: 600,
  subtitleColor: '#374151',
  bodyFontFamily: 'Inter, system-ui, sans-serif',
  bodyFontSize: '1rem',
  bodyFontWeight: 400,
  bodyColor: '#6b7280',
  categories: [],
  featuredItems: [],
  layoutItems: [],
};
