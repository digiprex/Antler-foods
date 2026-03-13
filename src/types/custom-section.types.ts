/**
 * Custom Section Types
 *
 * Schema for the custom section builder and storefront renderer.
 * The API stores these values directly inside the template config JSON.
 */

import type { SectionScrollRevealAnimation, SectionStyleConfig, SectionSurfaceShadow } from './section-style.types';

export const CUSTOM_SECTION_LAYOUT_VALUES = [
  'layout-1',
  'layout-2',
  'layout-3',
  'layout-4',
  'layout-5',
  'layout-6',
  'layout-7',
  'layout-8',
  'layout-9',
  'layout-10',
  'layout-11',
  'layout-12',
  'layout-13',
  'layout-14',
  'layout-15',
  'layout-16',
  'layout-17',
  'layout-18',
  'layout-19',
  'layout-20',
  'layout-21',
  'layout-22',
  'layout-23',
  'layout-24',
  'layout-25',
  'layout-26',
  'layout-27',
  'layout-28',
  'layout-29',
  'layout-30',
  'layout-31',
  'layout-32',
] as const;

export type CustomSectionLayout = (typeof CUSTOM_SECTION_LAYOUT_VALUES)[number];
export type CustomSectionViewport = 'desktop' | 'mobile';
export type CustomSectionContentAlign = 'left' | 'center' | 'right';
export type CustomSectionVerticalAlign = 'start' | 'center' | 'end';
export type CustomSectionMediaShape = 'soft' | 'rounded' | 'arched' | 'circle';
export type CustomSectionHoverEffect = 'lift' | 'spotlight' | 'reveal';
export type CustomSectionTransitionStyle = 'fade' | 'slide' | 'soft-zoom';
export type CustomSectionAnimationSpeed = 'fast' | 'normal' | 'slow';

export interface CustomSectionImage {
  url: string;
  alt: string;
}

export interface CustomSectionButton {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface CustomSectionItem {
  id: string;
  badge?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image?: CustomSectionImage;
  ctaLabel?: string;
  ctaHref?: string;
  statLabel?: string;
  statValue?: string;
}

export interface CustomSectionLayoutSettings {
  contentAlignment?: CustomSectionContentAlign;
  verticalAlignment?: CustomSectionVerticalAlign;
  mediaRatio?: string;
  contentWidth?: string;
  contentGap?: string;
  cardSpacing?: string;
  cardColumns?: number;
  stackOnMobile?: boolean;
  mediaShape?: CustomSectionMediaShape;
  buttonStyle?: 'solid' | 'outline' | 'soft';
  hoverEffect?: CustomSectionHoverEffect;
  transitionStyle?: CustomSectionTransitionStyle;
  autoplay?: boolean;
  autoplayInterval?: number;
}

export interface CustomSectionResponsiveSettings {
  mobileContentAlignment?: CustomSectionContentAlign;
  mobileContentWidth?: string;
  mobileContentGap?: string;
  mobileMediaRatio?: string;
  mobileCardColumns?: number;
  mobileMinHeight?: string;
  mobileMediaFirst?: boolean;
}

export interface CustomSectionStyleSettings {
  sectionBackgroundColor?: string;
  contentSurfaceBackground?: string;
  cardBackgroundColor?: string;
  accentColor?: string;
  mutedAccentColor?: string;
  borderColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  buttonBackgroundColor?: string;
  buttonTextColor?: string;
  buttonSecondaryBackgroundColor?: string;
  buttonSecondaryTextColor?: string;
  buttonBorderColor?: string;
  badgeBackgroundColor?: string;
  badgeTextColor?: string;
  cardBorderRadius?: string;
  cardShadow?: SectionSurfaceShadow;
}

export interface CustomSectionAnimationSettings {
  enabled?: boolean;
  preset?: SectionScrollRevealAnimation;
  speed?: CustomSectionAnimationSpeed;
}

export interface CustomSectionConfig extends Partial<SectionStyleConfig> {
  headline: string;
  eyebrow?: string;
  badgeText?: string;
  subheadline?: string;
  description?: string;
  primaryButtonEnabled?: boolean;
  secondaryButtonEnabled?: boolean;
  primaryButton?: CustomSectionButton;
  secondaryButton?: CustomSectionButton;
  image?: CustomSectionImage;
  secondaryImage?: CustomSectionImage;
  fallbackImage?: CustomSectionImage;
  videoUrl?: string;
  backgroundImage?: string;
  layout: CustomSectionLayout;
  items?: CustomSectionItem[];
  bgColor?: string;
  textColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textAlign?: CustomSectionContentAlign;
  paddingTop?: string;
  paddingBottom?: string;
  minHeight?: string;
  contentMaxWidth?: string;
  layoutSettings?: CustomSectionLayoutSettings;
  responsive?: CustomSectionResponsiveSettings;
  styleConfig?: CustomSectionStyleSettings;
  animation?: CustomSectionAnimationSettings;
  restaurant_id?: string;
  page_id?: string | null;
  template_id?: string | null;
}

export const DEFAULT_CUSTOM_SECTION_CONFIG: CustomSectionConfig = {
  headline: 'Craft a story-driven section',
  eyebrow: 'Custom Section',
  subheadline: 'Flexible layout builder',
  description: 'Create promotional sections with media, polished typography, and layout-specific content blocks.',
  layout: 'layout-1',
  bgColor: undefined,
  textColor: undefined,
  textAlign: 'left',
  // Spacing / layout intentionally removed — controlled by Global CSS only
  is_custom: false,
  buttonStyleVariant: 'primary',
  // Typography inherits from global theme when is_custom === false
  sectionTextAlign: 'left',
  sectionMaxWidth: '1200px',
  sectionPaddingY: '5rem',
  sectionPaddingX: '1.5rem',
  surfaceBorderRadius: '1.75rem',
  surfaceShadow: 'soft',
  enableScrollReveal: false,
  scrollRevealAnimation: 'fade-up',
  layoutSettings: {
    contentAlignment: 'left',
    verticalAlignment: 'center',
    mediaRatio: '4 / 3',
    contentWidth: '560px',
    contentGap: '2rem',
    cardSpacing: '1.25rem',
    cardColumns: 3,
    stackOnMobile: true,
    mediaShape: undefined,
    buttonStyle: 'solid',
    hoverEffect: 'lift',
    transitionStyle: 'fade',
    autoplay: true,
    autoplayInterval: 5,
  },
  responsive: {
    mobileContentAlignment: 'left',
    mobileContentWidth: '100%',
    mobileContentGap: '1.25rem',
    mobileMediaRatio: '4 / 3',
    mobileCardColumns: 1,
    mobileMinHeight: '420px',
    mobileMediaFirst: true,
  },
  // styleConfig is intentionally empty — all colors come from Global CSS theme
  styleConfig: {
    overlayColor: '#0f172a',
    overlayOpacity: 0.48,
    borderColor: '#e2e8f0',
    cardBorderRadius: '1.5rem',
    cardShadow: 'soft',
  },
  animation: {
    enabled: false,
    preset: 'fade-up',
    speed: 'normal',
  },
  primaryButtonEnabled: true,
  secondaryButtonEnabled: true,
  primaryButton: {
    label: 'Explore More',
    href: '/menu',
    variant: 'primary',
  },
  secondaryButton: {
    label: 'Reserve Table',
    href: '/contact',
    variant: 'outline',
  },
  items: [
    {
      id: 'item-1',
      badge: 'Signature',
      title: 'Chef-led tasting moment',
      description: 'Introduce a premium menu story with supporting media and a direct call to action.',
      statLabel: 'Guests',
      statValue: '120+',
    },
    {
      id: 'item-2',
      badge: 'Popular',
      title: 'Flexible content blocks',
      description: 'Highlight offers, private events, seasonal launches, or service details in reusable cards.',
      statLabel: 'Layouts',
      statValue: '32',
    },
    {
      id: 'item-3',
      badge: 'Responsive',
      title: 'Desktop and mobile tuning',
      description: 'Adjust spacing, alignment, media balance, and styling separately for smaller screens.',
      statLabel: 'Preview',
      statValue: 'Live',
    },
  ],
};
