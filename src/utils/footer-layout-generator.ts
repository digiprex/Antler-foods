/**
 * Footer Layout Generator Utility
 *
 * This utility provides functions to generate footer configurations
 * based on the layout definitions in footer-layouts.json
 */

import footerLayoutsData from '@/data/footer-layouts.json';

export interface FooterLayoutConfig {
  id: string;
  name: string;
  description: string;
  columns: number;
}

export interface FooterConfig {
  restaurantName?: string;
  logoUrl?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  linkSections?: Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;
  socialLinks?: Array<{ platform: string; url: string; icon?: string }>;
  layout?: string;
  bgColor?: string;
  textColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  borderColor?: string;
  fontFamily?: string;
  fontSize?: string;
  copyrightText?: string;
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterPlaceholder?: string;
}

export interface GenerateFooterOptions {
  config?: Partial<FooterConfig>;
  layoutId?: string;
  themeColors?: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
}

/**
 * Get footer layout configuration by ID
 * @param layoutId - The layout ID from footer-layouts.json (e.g., 'default', 'minimal')
 * @returns The footer layout configuration or null if not found
 */
export function getFooterLayoutById(layoutId: string) {
  return footerLayoutsData.layouts.find(layout => layout.id === layoutId) || null;
}

/**
 * Get all available footer layouts
 * @returns Array of all footer layout configurations
 */
export function getAllFooterLayouts() {
  return footerLayoutsData.layouts;
}

/**
 * Validate if a layout ID exists
 * @param layoutId - The layout ID to validate
 * @returns True if the layout exists, false otherwise
 */
export function isValidFooterLayoutId(layoutId: string): boolean {
  return footerLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Get default footer layout
 * @returns The default footer layout configuration
 */
export function getDefaultFooterLayout() {
  return footerLayoutsData.layouts.find(layout => layout.id === 'default') || footerLayoutsData.layouts[0];
}

/**
 * Generate complete footer props based on layout ID, config, and theme colors
 * @param options - Configuration options for footer generation
 * @returns Complete footer props object that can be passed to the Footer component
 */
export function generateCompleteFooterProps(options: GenerateFooterOptions): FooterConfig {
  const {
    config = {},
    layoutId = 'default',
    themeColors = {},
  } = options;

  const layout = getFooterLayoutById(layoutId);

  if (!layout) {
    console.warn(`Footer layout "${layoutId}" not found, using default`);
  }

  const finalLayoutId = layout ? layout.id : 'default';

  // Determine colors with fallbacks
  const bgColor = config.bgColor || themeColors.primaryColor || '#1f2937';
  const textColor = config.textColor || themeColors.textColor || '#ffffff';
  const accentColor = themeColors.accentColor || '#8b5cf6';

  // Default link sections
  const defaultLinkSections = [
    {
      title: 'Menu',
      links: [
        { label: 'Appetizers', href: '#appetizers' },
        { label: 'Main Course', href: '#main' },
        { label: 'Desserts', href: '#desserts' },
        { label: 'Beverages', href: '#beverages' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Careers', href: '#careers' },
      ],
    },
  ];

  const defaultSocialLinks = [
    { platform: 'Facebook', url: '#', icon: 'facebook' },
    { platform: 'Instagram', url: '#', icon: 'instagram' },
    { platform: 'Twitter', url: '#', icon: 'twitter' },
  ];

  return {
    restaurantName: config.restaurantName || 'Restaurant',
    logoUrl: config.logoUrl,
    description: config.description || 'Fine dining experience with exceptional service.',
    address: config.address || '123 Main Street, City, State 12345',
    phone: config.phone || '(555) 123-4567',
    email: config.email || 'info@restaurant.com',
    hours: config.hours || 'Mon-Sun: 11:00 AM - 10:00 PM',
    linkSections: config.linkSections || defaultLinkSections,
    socialLinks: config.socialLinks || defaultSocialLinks,
    layout: finalLayoutId,
    bgColor: bgColor,
    textColor: textColor,
    linkColor: config.linkColor || accentColor,
    linkHoverColor: config.linkHoverColor || lightenColor(accentColor, 20),
    borderColor: config.borderColor || 'rgba(255, 255, 255, 0.1)',
    fontFamily: config.fontFamily || 'Poppins, sans-serif',
    fontSize: config.fontSize || '0.875rem',
    copyrightText: config.copyrightText || `© ${new Date().getFullYear()} ${config.restaurantName || 'Restaurant'}. All rights reserved.`,
    showNewsletter: config.showNewsletter ?? false,
    newsletterTitle: config.newsletterTitle || 'Subscribe to our newsletter',
    newsletterPlaceholder: config.newsletterPlaceholder || 'Enter your email',
  };
}

/**
 * Generate footer props based on layout ID and theme colors (simplified version)
 * @param layoutId - The layout ID from footer-layouts.json
 * @param colors - Theme colors (primaryColor, accentColor, backgroundColor, textColor)
 * @returns Footer props object that can be passed to the Footer component
 */
export function generateFooterProps(
  layoutId: string,
  colors: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  }
) {
  const layout = getFooterLayoutById(layoutId);

  if (!layout) {
    console.warn(`Footer layout "${layoutId}" not found, using default`);
    return {
      layout: 'default',
      bgColor: colors.primaryColor,
      textColor: colors.textColor,
      linkColor: colors.accentColor,
    };
  }

  return {
    layout: layout.id,
    bgColor: colors.primaryColor,
    textColor: colors.textColor,
    linkColor: colors.accentColor,
    linkHoverColor: lightenColor(colors.accentColor, 20),
  };
}

/**
 * Generate footer props from database config
 * This is the standardized way to generate footer props across the application
 * @param dbConfig - Footer configuration from database
 * @param overrides - Optional overrides for specific props
 * @returns Complete footer props
 */
export function generateFooterPropsFromConfig(
  dbConfig: any,
  overrides?: Partial<FooterConfig>
): FooterConfig {
  const defaultLinkSections = [
    {
      title: 'Menu',
      links: [
        { label: 'Appetizers', href: '#appetizers' },
        { label: 'Main Course', href: '#main' },
        { label: 'Desserts', href: '#desserts' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Contact', href: '#contact' },
      ],
    },
  ];

  const defaultSocialLinks = [
    { platform: 'Facebook', url: '#', icon: 'facebook' },
    { platform: 'Instagram', url: '#', icon: 'instagram' },
  ];

  const restaurantName = dbConfig?.restaurantName || overrides?.restaurantName || 'Restaurant';
  const bgColor = dbConfig?.bgColor || overrides?.bgColor || '#1f2937';
  const accentColor = dbConfig?.linkColor || overrides?.linkColor || '#8b5cf6';

  return {
    restaurantName,
    logoUrl: dbConfig?.logoUrl || overrides?.logoUrl,
    description: dbConfig?.description || overrides?.description || 'Fine dining experience.',
    address: dbConfig?.address || overrides?.address || '123 Main Street, City, State',
    phone: dbConfig?.phone || overrides?.phone || '(555) 123-4567',
    email: dbConfig?.email || overrides?.email || 'info@restaurant.com',
    hours: dbConfig?.hours || overrides?.hours || 'Mon-Sun: 11:00 AM - 10:00 PM',
    linkSections: dbConfig?.linkSections || overrides?.linkSections || defaultLinkSections,
    socialLinks: dbConfig?.socialLinks || overrides?.socialLinks || defaultSocialLinks,
    layout: dbConfig?.layout || overrides?.layout || 'default',
    bgColor,
    textColor: dbConfig?.textColor || overrides?.textColor || '#ffffff',
    linkColor: accentColor,
    linkHoverColor: dbConfig?.linkHoverColor || overrides?.linkHoverColor || lightenColor(accentColor, 20),
    borderColor: dbConfig?.borderColor || overrides?.borderColor || 'rgba(255, 255, 255, 0.1)',
    fontFamily: dbConfig?.fontFamily || overrides?.fontFamily || 'Poppins, sans-serif',
    fontSize: dbConfig?.fontSize || overrides?.fontSize || '0.875rem',
    copyrightText: dbConfig?.copyrightText || overrides?.copyrightText || `© ${new Date().getFullYear()} ${restaurantName}. All rights reserved.`,
    showNewsletter: dbConfig?.showNewsletter ?? overrides?.showNewsletter ?? false,
    newsletterTitle: dbConfig?.newsletterTitle || overrides?.newsletterTitle || 'Subscribe to our newsletter',
    newsletterPlaceholder: dbConfig?.newsletterPlaceholder || overrides?.newsletterPlaceholder || 'Enter your email',
  };
}

/**
 * Helper function to lighten a hex color
 * @param hex - Hex color code
 * @param percent - Percentage to lighten (0-100)
 * @returns Lightened hex color
 */
function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Lighten each channel
  const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Extract footer section from theme sections
 * @param sections - Array of theme sections
 * @returns The footer section or null if not found
 */
export function getFooterSectionFromTheme(sections: any[]): any | null {
  return sections.find(section => section.type?.toLowerCase() === 'footer') || null;
}

/**
 * Get footer layout ID from theme section
 * @param footerSection - The footer section from theme
 * @returns The layout ID or 'default' if not specified
 */
export function getFooterLayoutIdFromSection(footerSection: any): string {
  return footerSection?.id || 'default';
}
