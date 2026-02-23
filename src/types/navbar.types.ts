/**
 * Type definitions for dynamic navbar configuration
 * These types define the structure of data that will come from the database/API
 */

export interface NavItem {
  id?: string;
  label: string;
  href: string;
  order?: number;
}

export interface CTAButton {
  id?: string;
  label: string;
  href: string;
  bgColor?: string;
  textColor?: string;
}

export interface NavbarConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations
  // Logo configuration
  logoUrl?: string;
  restaurantName: string;
  
  // Navigation items
  leftNavItems: NavItem[];
  rightNavItems: NavItem[];
  
  // CTA Button (e.g., "Order Online") - optional
  ctaButton?: CTAButton;
  
  // Layout and styling
  layout?: 'default' | 'centered' | 'logo-center' | 'stacked' | 'split' | 'logo-left-items-left' | 'bordered-centered';
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  zIndex?: number;
  
  // Colors
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  borderColor?: string;
  borderWidth?: string;
  
  // Additional features
  bagCount?: number;
  additionalText?: string; // For split layout
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for navbar configuration
 */
export interface NavbarConfigResponse {
  success: boolean;
  data: NavbarConfig;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_NAVBAR_CONFIG: NavbarConfig = {
  restaurantName: "Maison de Noir",
  leftNavItems: [
    { label: 'Collection', href: '#collection', order: 1 },
    { label: 'Archive', href: '#archive', order: 2 },
  ],
  rightNavItems: [],
  ctaButton: {
    label: 'Order Online',
    href: '#order',
  },
  layout: 'bordered-centered',
  position: 'absolute',
  zIndex: 1,
  bgColor: 'white',
  textColor: 'black',
  buttonBgColor: 'black',
  buttonTextColor: 'white',
  borderColor: '#000000',
  borderWidth: '2px',
  bagCount: 0,
};
