/**
 * Type definitions for dynamic hero section configuration
 * These types define the structure of data that will come from the database/API
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

export type HeroContentAnimation =
  | 'none'
  | 'fade'
  | 'fade-up'
  | 'zoom'
  | 'cinematic';

export interface HeroButton {
  id?: string;
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface HeroFeature {
  id?: string;
  icon?: string;
  title: string;
  description?: string;
}

export interface HeroImage {
  url: string;
  alt: string;
  position?: 'left' | 'right' | 'center' | 'background';
}

export interface MinimalHeroImages {
  primary?: HeroImage;
  secondaryTop?: HeroImage;
  secondaryBottom?: HeroImage;
}

export interface SideBySideHeroImages {
  left?: HeroImage;
  center?: HeroImage;
  right?: HeroImage;
}

export type HeroImageObjectFit =
  | 'cover'
  | 'contain'
  | 'fill'
  | 'none'
  | 'scale-down';

export interface HeroConfig extends SectionStyleConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations
  
  // Content
  headline: string;
  subheadline?: string;
  description?: string;
  
  // Call-to-action buttons
  primaryButton?: HeroButton;
  secondaryButton?: HeroButton;
  primaryButtonEnabled?: boolean;
  secondaryButtonEnabled?: boolean;
  
  // Media
  image?: HeroImage;
  videoUrl?: string;
  backgroundImage?: string;
  imageBorderRadius?: string;
  imageObjectFit?: HeroImageObjectFit;
  minimalImages?: MinimalHeroImages;
  sideBySideImages?: SideBySideHeroImages;
  
  // Features/Benefits
  features?: HeroFeature[];
  
  // Layout options
  layout?:
    | 'default'              // Centered content with optional background
    | 'split'                // Text left, image right
    | 'split-reverse'        // Image left, text right
    | 'centered-large'       // Large centered hero
    | 'minimal'              // Text with 3-image grid
    | 'video-background'     // Full-screen video background
    | 'side-by-side'         // Three images in a row
    | 'offset'               // Image top, text below centered
    | 'full-height'          // Full viewport height
    | 'with-features'        // Hero with feature cards below
    | 'image-collage';       // Text with stacked/overlapping images
  
  // Styling
  bgColor?: string;
  mobileBgColor?: string;
  textColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  
  // Text alignment
  textAlign?: 'left' | 'center' | 'right';
  mobileTextAlign?: 'left' | 'center' | 'right';
  
  // Spacing
  paddingTop?: string;
  paddingBottom?: string;
  paddingInline?: string;
  mobilePaddingInline?: string;
  minHeight?: string;
  mobileMinHeight?: string;
  
  // Additional options
  showScrollIndicator?: boolean;
  contentMaxWidth?: string;
  contentAnimation?: HeroContentAnimation;
  defaultContentPanelEnabled?: boolean;
  defaultContentPanelBackgroundColor?: string;
  defaultContentPanelMobileBackgroundColor?: string;
  defaultContentPanelBorderRadius?: string;
  defaultContentPanelMobileBorderRadius?: string;
  defaultContentPanelMaxWidth?: string;
  defaultContentPanelMinHeight?: string;
  defaultContentPanelMarginTop?: string;
  defaultContentPanelMarginBottom?: string;
  defaultContentPanelMobileMaxWidth?: string;
  defaultContentPanelMobileMinHeight?: string;
  defaultContentPanelMobileMarginTop?: string;
  defaultContentPanelMobileMarginBottom?: string;
  videoContentPanelEnabled?: boolean;
  videoContentPanelBackgroundColor?: string;
  videoContentPanelMobileBackgroundColor?: string;
  videoContentPanelBorderRadius?: string;
  videoContentPanelMobileBorderRadius?: string;
  videoContentPanelMaxWidth?: string;
  videoContentPanelMinHeight?: string;
  videoContentPanelMarginTop?: string;
  videoContentPanelMarginBottom?: string;
  videoContentPanelMobileMaxWidth?: string;
  videoContentPanelMobileMinHeight?: string;
  videoContentPanelMobileMarginTop?: string;
  videoContentPanelMobileMarginBottom?: string;
  videoContentPanelPosition?: 'left' | 'center' | 'right';
  videoContentPanelMobilePosition?: 'left' | 'center' | 'right';
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for hero configuration
 */
export interface HeroConfigResponse {
  success: boolean;
  data: HeroConfig;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_HERO_CONFIG: HeroConfig = {
  headline: 'Welcome to Our Restaurant',
  subheadline: 'Experience culinary excellence',
  description: 'Discover exceptional dining with fresh ingredients and innovative flavors',
  primaryButton: {
    label: 'View Menu',
    href: '#menu',
    variant: 'primary',
  },
  primaryButtonEnabled: true,
  secondaryButton: {
    label: 'Book a Table',
    href: '#reservations',
    variant: 'outline',
  },
  secondaryButtonEnabled: true,
  layout: 'centered-large',
  bgColor: '#ffffff',
  mobileBgColor: '',
  textColor: '#000000',
  textAlign: 'center',
  mobileTextAlign: 'center',
  paddingTop: '6rem',
  paddingBottom: '6rem',
  paddingInline: '',
  mobilePaddingInline: '',
  minHeight: '600px',
  showScrollIndicator: false,
  contentMaxWidth: '1200px',
  contentAnimation: 'none',
  defaultContentPanelEnabled: false,
  defaultContentPanelBackgroundColor: '#ffffff',
  defaultContentPanelMobileBackgroundColor: '',
  defaultContentPanelBorderRadius: '2rem',
  defaultContentPanelMobileBorderRadius: '',
  defaultContentPanelMaxWidth: '860px',
  videoContentPanelEnabled: false,
  videoContentPanelBackgroundColor: 'rgba(15, 23, 42, 0.48)',
  videoContentPanelMobileBackgroundColor: '',
  videoContentPanelBorderRadius: '2rem',
  videoContentPanelMobileBorderRadius: '',
  videoContentPanelMaxWidth: '640px',
  videoContentPanelMinHeight: '',
  videoContentPanelMarginTop: '',
  videoContentPanelMarginBottom: '',
  videoContentPanelMobileMaxWidth: '',
  videoContentPanelMobileMinHeight: '',
  videoContentPanelMobileMarginTop: '',
  videoContentPanelMobileMarginBottom: '',
  videoContentPanelPosition: 'left',
  videoContentPanelMobilePosition: undefined,
  is_custom: false,
  buttonStyleVariant: 'primary',
  titleFontFamily: 'Inter, system-ui, sans-serif',
  titleFontSize: '2.25rem',
  titleMobileFontSize: '',
  titleFontWeight: 700,
  titleColor: '#111827',
  subtitleFontFamily: 'Inter, system-ui, sans-serif',
  subtitleFontSize: '1.5rem',
  subtitleMobileFontSize: '',
  subtitleFontWeight: 600,
  subtitleColor: '#374151',
  bodyFontFamily: 'Inter, system-ui, sans-serif',
  bodyFontSize: '1rem',
  bodyMobileFontSize: '',
  bodyFontWeight: 400,
  bodyColor: '#6b7280',
  imageBorderRadius: '',
  imageObjectFit: 'cover',
};
