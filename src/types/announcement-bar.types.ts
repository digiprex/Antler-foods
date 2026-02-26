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
  fontSize?: string;
  fontWeight?: string;
  
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
  fontSize: '14px',
  fontWeight: 'normal',
  padding: '8px 16px',
  height: 'auto',
  isScrolling: false,
  scrollSpeed: 50,
};

/**
 * Social media platform configurations
 */
export const SOCIAL_MEDIA_PLATFORMS = {
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    placeholder: 'https://facebook.com/yourpage'
  },
  twitter: {
    name: 'Twitter',
    icon: '🐦',
    color: '#1DA1F2',
    placeholder: 'https://twitter.com/youraccount'
  },
  instagram: {
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    placeholder: 'https://instagram.com/youraccount'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    placeholder: 'https://linkedin.com/company/yourcompany'
  },
  youtube: {
    name: 'YouTube',
    icon: '📺',
    color: '#FF0000',
    placeholder: 'https://youtube.com/channel/yourchannel'
  },
  tiktok: {
    name: 'TikTok',
    icon: '🎵',
    color: '#000000',
    placeholder: 'https://tiktok.com/@youraccount'
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    placeholder: 'https://wa.me/1234567890'
  },
  gmb: {
    name: 'Google My Business',
    icon: '🏢',
    color: '#4285F4',
    placeholder: 'https://g.page/yourbusiness'
  }
} as const;