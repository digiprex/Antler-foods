/**
 * Type definitions for popup configuration
 */

export interface PopupConfig {
  id?: string;
  restaurant_id?: string;

  // Content
  title?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;

  // Display options
  enabled?: boolean;
  showOnLoad?: boolean;
  showButton?: boolean; // Toggle to show/hide button
  delay?: number; // Delay in seconds before showing
  frequency?: 'always' | 'once' | 'daily' | 'weekly';
  layout?: 'default' | 'image-left' | 'image-right' | 'image-bg' | 'image-only' | 'newsletter-image' | 'newsletter-text';

  // Styling
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  overlayColor?: string;
  maxWidth?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface PopupConfigResponse {
  success: boolean;
  data: PopupConfig;
  error?: string;
}

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  title: 'Welcome!',
  description: 'Check out our latest offers and specials',
  buttonText: 'View Menu',
  buttonUrl: '/menu',
  enabled: false,
  showOnLoad: true,
  showButton: false,
  delay: 2,
  frequency: 'once',
  layout: 'default',
  bgColor: '#ffffff',
  textColor: '#000000',
  buttonBgColor: '#000000',
  buttonTextColor: '#ffffff',
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  maxWidth: '500px',
};
