/**
 * Navbar Layout Generator Utility
 *
 * This utility provides functions to generate navbar configurations
 * based on the layout definitions in navbar-layouts.json
 */

import navbarLayoutsData from '@/data/navbar-layouts.json';

export interface NavbarLayoutConfig {
  id: string;
  name: string;
  description: string;
  layout: string; // The layout ID from navbar-layouts.json
}

export interface NavbarConfig {
  restaurantName?: string;
  logoUrl?: string;
  logoSize?: number;
  leftNavItems?: Array<{ label: string; href: string }>;
  rightNavItems?: Array<{ label: string; href: string }>;
  ctaButton?: { label: string; href: string };
  showCtaButton?: boolean; // Show/hide CTA button
  layout?: 'default' | 'centered' | 'logo-center' | 'stacked' | 'split' | 'logo-left-items-left' | 'bordered-centered';
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: string;
  borderColor?: string;
  borderWidth?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  additionalText?: string; // For split layout
}

export interface GenerateNavbarOptions {
  config?: Partial<NavbarConfig>;
  layoutId?: string;
  themeColors?: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  position?: 'fixed' | 'sticky' | 'relative' | 'absolute' | 'static';
}

/**
 * Get navbar layout configuration by ID
 * @param layoutId - The layout ID from navbar-layouts.json (e.g., 'default', 'centered')
 * @returns The navbar layout configuration or null if not found
 */
export function getNavbarLayoutById(layoutId: string) {
  return navbarLayoutsData.layouts.find(layout => layout.id === layoutId) || null;
}

/**
 * Get all available navbar layouts
 * @returns Array of all navbar layout configurations
 */
export function getAllNavbarLayouts() {
  return navbarLayoutsData.layouts;
}

/**
 * Validate if a layout ID exists
 * @param layoutId - The layout ID to validate
 * @returns True if the layout exists, false otherwise
 */
export function isValidNavbarLayoutId(layoutId: string): boolean {
  return navbarLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Type guard to check if a string is a valid navbar layout
 * @param layoutId - The layout ID to check
 * @returns The layout ID as the proper type if valid, otherwise 'default'
 */
function toValidLayoutId(layoutId: string): NavbarConfig['layout'] {
  const validLayouts = ['default', 'centered', 'logo-center', 'stacked', 'split', 'logo-left-items-left', 'bordered-centered'];
  return validLayouts.includes(layoutId) ? layoutId as NavbarConfig['layout'] : 'default';
}

/**
 * Get default navbar layout
 * @returns The default navbar layout configuration
 */
export function getDefaultNavbarLayout() {
  return navbarLayoutsData.layouts.find(layout => layout.id === 'default') || navbarLayoutsData.layouts[0];
}

/**
 * Generate complete navbar props based on layout ID, config, and theme colors
 * @param options - Configuration options for navbar generation
 * @returns Complete navbar props object that can be passed to the Navbar component
 */
export function generateCompleteNavbarProps(options: GenerateNavbarOptions): NavbarConfig {
  const {
    config = {},
    layoutId = 'default',
    themeColors = {},
    position = 'absolute'
  } = options;

  const layout = getNavbarLayoutById(layoutId);

  if (!layout) {
    console.warn(`Navbar layout "${layoutId}" not found, using default`);
  }

  const finalLayoutId = toValidLayoutId(layout ? layout.id : 'default');

  // Determine colors with fallbacks
  const primaryColor = themeColors.primaryColor || config.bgColor || '#ffffff';
  const accentColor = themeColors.accentColor || config.buttonBgColor || '#8b5cf6';
  const textColor = themeColors.textColor || config.textColor || '#000000';

  // Auto-calculate contrasting colors
  const buttonTextColor = config.buttonTextColor || getContrastColor(accentColor);
  const navTextColor = config.textColor || getContrastColor(primaryColor);

  // Default navigation items
  const defaultLeftNavItems = [
    { label: 'Menu', href: '#menu' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return {
    restaurantName: config.restaurantName || 'Restaurant',
    logoUrl: config.logoUrl,
    logoSize: config.logoSize || 40,
    leftNavItems: config.leftNavItems || defaultLeftNavItems,
    rightNavItems: config.rightNavItems || [],
    ctaButton: config.ctaButton,
    layout: finalLayoutId,
    position: position,
    bgColor: primaryColor,
    textColor: navTextColor,
    buttonBgColor: accentColor,
    buttonTextColor: buttonTextColor,
    buttonBorderRadius: config.buttonBorderRadius || '0.5rem',
    borderColor: config.borderColor || textColor,
    borderWidth: config.borderWidth || '2px',
    fontFamily: config.fontFamily || 'Poppins, sans-serif',
    fontSize: config.fontSize || '1rem',
    fontWeight: config.fontWeight || 400,
    textTransform: config.textTransform || 'uppercase',
    additionalText: config.additionalText,
  };
}

/**
 * Generate navbar props based on layout ID and theme colors (simplified version)
 * @param layoutId - The layout ID from navbar-layouts.json
 * @param colors - Theme colors (primaryColor, accentColor, backgroundColor, textColor)
 * @returns Navbar props object that can be passed to the Navbar component
 */
export function generateNavbarProps(
  layoutId: string,
  colors: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  }
) {
  const layout = getNavbarLayoutById(layoutId);

  if (!layout) {
    console.warn(`Navbar layout "${layoutId}" not found, using default`);
    return {
      layout: 'default' as const,
      bgColor: colors.primaryColor,
      textColor: colors.textColor,
      buttonBgColor: colors.accentColor,
    };
  }

  return {
    layout: toValidLayoutId(layout.id),
    bgColor: colors.primaryColor,
    textColor: colors.textColor,
    buttonBgColor: colors.accentColor,
    buttonTextColor: getContrastColor(colors.accentColor),
  };
}

/**
 * Generate navbar props from database config
 * This is the standardized way to generate navbar props across the application
 * @param dbConfig - Navbar configuration from database
 * @param overrides - Optional overrides for specific props
 * @returns Complete navbar props
 */
export function generateNavbarPropsFromConfig(
  dbConfig: any,
  overrides?: Partial<NavbarConfig>
): NavbarConfig {
  return {
    restaurantName: dbConfig?.restaurantName || overrides?.restaurantName || 'Restaurant',
    logoUrl: dbConfig?.logoUrl || overrides?.logoUrl,
    logoSize: dbConfig?.logoSize || overrides?.logoSize || 40,
    leftNavItems: dbConfig?.leftNavItems || overrides?.leftNavItems || [
      { label: 'Menu', href: '#menu' },
      { label: 'About', href: '#about' },
      { label: 'Contact', href: '#contact' },
    ],
    rightNavItems: dbConfig?.rightNavItems || overrides?.rightNavItems || [],
    ctaButton: dbConfig?.ctaButton || overrides?.ctaButton,
    showCtaButton: dbConfig?.showCtaButton !== undefined ? dbConfig.showCtaButton : (overrides?.showCtaButton !== undefined ? overrides.showCtaButton : true),
    layout: dbConfig?.layout || overrides?.layout || 'bordered-centered',
    position: dbConfig?.position || overrides?.position || 'absolute',
    bgColor: dbConfig?.bgColor || overrides?.bgColor || '#ffffff',
    textColor: dbConfig?.textColor || overrides?.textColor || '#000000',
    buttonBgColor: dbConfig?.buttonBgColor || overrides?.buttonBgColor || '#8b5cf6',
    buttonTextColor: dbConfig?.buttonTextColor || overrides?.buttonTextColor || getContrastColor(dbConfig?.buttonBgColor || overrides?.buttonBgColor || '#8b5cf6'),
    buttonBorderRadius: dbConfig?.buttonBorderRadius || overrides?.buttonBorderRadius || '0.5rem',
    borderColor: dbConfig?.borderColor || overrides?.borderColor || '#000000',
    borderWidth: dbConfig?.borderWidth || overrides?.borderWidth || '2px',
    fontFamily: dbConfig?.fontFamily || overrides?.fontFamily || 'Poppins, sans-serif',
    fontSize: dbConfig?.fontSize || overrides?.fontSize || '1rem',
    fontWeight: dbConfig?.fontWeight || overrides?.fontWeight || 400,
    textTransform: dbConfig?.textTransform || overrides?.textTransform || 'uppercase',
    additionalText: dbConfig?.additionalText || overrides?.additionalText,
  };
}

/**
 * Helper function to determine if a color is light or dark
 * Returns a contrasting color (black or white)
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark colors
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Extract navbar section from theme sections
 * @param sections - Array of theme sections
 * @returns The navbar section or null if not found
 */
export function getNavbarSectionFromTheme(sections: any[]): any | null {
  return sections.find(section => section.type?.toLowerCase() === 'navbar') || null;
}

/**
 * Get navbar layout ID from theme section
 * @param navbarSection - The navbar section from theme
 * @returns The layout ID or 'default' if not specified
 */
export function getNavbarLayoutIdFromSection(navbarSection: any): string {
  return navbarSection?.id || 'default';
}
