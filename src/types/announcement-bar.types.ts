/**
 * Type definitions for dynamic announcement bar configuration
 * These types define the structure of data that will come from the database/API
 */

export interface SocialMediaIcon {
  id?: string;
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'whatsapp' | 'gmb';
  url: string;
  order?: number;
}

export interface AnnouncementBarConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Visibility
  isEnabled: boolean;

  // Content
  text?: string;
  address?: string;
  phone?: string;
  email?: string;

  // Contact Details Display Options
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;

  // Social Media
  socialMediaIcons: SocialMediaIcon[];
  showSocialMedia?: boolean;

  // Layout and styling
  layout?: 'text-only' | 'contact-info' | 'social-only' | 'contact-social' | 'full';
  position?: 'top' | 'bottom';
  
  // Colors
  bgColor?: string;
  textColor?: string;
  linkColor?: string;
  
  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';

  // Spacing
  padding?: string;
  height?: string;
  
  // Animation
  isScrolling?: boolean;
  scrollSpeed?: number;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for announcement bar configuration
 */
export interface AnnouncementBarConfigResponse {
  success: boolean;
  data: AnnouncementBarConfig | null;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_ANNOUNCEMENT_BAR_CONFIG: AnnouncementBarConfig = {
  isEnabled: false,
  text: 'Welcome to our restaurant!',
  address: '',
  phone: '',
  email: '',
  showAddress: true,
  showPhone: true,
  showEmail: true,
  socialMediaIcons: [],
  showSocialMedia: true,
  layout: 'text-only',
  position: 'top',
  bgColor: '#000000',
  textColor: '#ffffff',
  linkColor: '#ffffff',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '14px',
  fontWeight: 400,
  textTransform: 'none',
  padding: '8px 16px',
  height: 'auto',
  isScrolling: false,
  scrollSpeed: 50,
};

/**
 * Social media platform configuration type
 */
export interface SocialMediaPlatformConfig {
  name: string;
  icon: () => React.ReactNode;
  color: string;
  placeholder: string;
}