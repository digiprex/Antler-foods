/**
 * Type definitions for dynamic hero section configuration
 * These types define the structure of data that will come from the database/API
 */

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

export interface HeroConfig {
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
    | 'minimal'              // Minimal centered text
    | 'video-background'     // Full-screen video background
    | 'side-by-side'         // Two equal columns
    | 'offset'               // Offset text with image
    | 'full-height'          // Full viewport height
    | 'with-features';       // Hero with feature cards below
  
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
};
