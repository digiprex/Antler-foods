/**
 * Type definitions for dynamic hero section configuration
 * These types define the structure of data that will come from the database/API
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

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
  
  // Media
  image?: HeroImage;
  videoUrl?: string;
  backgroundImage?: string;
  
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
  textColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  
  // Text alignment
  textAlign?: 'left' | 'center' | 'right';
  
  // Spacing
  paddingTop?: string;
  paddingBottom?: string;
  minHeight?: string;
  
  // Additional options
  showScrollIndicator?: boolean;
  contentMaxWidth?: string;
  
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
  secondaryButton: {
    label: 'Book a Table',
    href: '#reservations',
    variant: 'outline',
  },
  layout: 'centered-large',
  bgColor: '#ffffff',
  textColor: '#000000',
  textAlign: 'center',
  paddingTop: '6rem',
  paddingBottom: '6rem',
  minHeight: '600px',
  showScrollIndicator: false,
  contentMaxWidth: '1200px',
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
};
