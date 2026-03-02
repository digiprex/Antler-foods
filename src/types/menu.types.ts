/**
 * Type definitions for dynamic menu section configuration
 * These types define the structure of data that will come from the database/API
 */

export interface MenuItem {
  id?: string;
  name: string;
  description?: string;
  price: string;
  image?: string;
  category?: string;
  featured?: boolean;
  dietary?: string[]; // e.g., ['vegetarian', 'gluten-free', 'vegan']
}

export interface MenuCategory {
  id?: string;
  name: string;
  description?: string;
  items?: MenuItem[];
  icon?: string;
}

export interface MenuButton {
  id?: string;
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface MenuConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Content
  title: string;
  subtitle?: string;
  description?: string;

  // Menu Data
  categories?: MenuCategory[];
  featuredItems?: MenuItem[];

  // Call-to-action button
  ctaButton?: MenuButton;

  // Media
  backgroundImage?: string;
  headerImage?: string;

  // Layout options
  layout?:
    | 'grid'                // Grid layout with cards
    | 'list'                // Simple list layout
    | 'masonry'             // Pinterest-style masonry
    | 'carousel'            // Carousel/slider layout
    | 'tabs'                // Tabbed categories
    | 'accordion'           // Accordion/collapsible categories
    | 'two-column'          // Two-column layout
    | 'single-column'       // Single column centered
    | 'featured-grid'       // Featured items in grid
    | 'minimal';            // Minimal text-only layout

  // Styling
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  cardBgColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;

  // Display Options
  showPrices?: boolean;
  showImages?: boolean;
  showDescriptions?: boolean;
  showDietaryInfo?: boolean;
  showCategoryIcons?: boolean;

  // Category Display
  categoryLayout?: 'tabs' | 'dropdown' | 'sidebar' | 'all'; // How to display categories

  // Text alignment
  textAlign?: 'left' | 'center' | 'right';

  // Spacing
  paddingTop?: string;
  paddingBottom?: string;
  itemSpacing?: string;

  // Grid columns (for grid layouts)
  columns?: number; // Number of columns (2, 3, or 4)

  // Additional options
  contentMaxWidth?: string;
  enableSearch?: boolean;
  enableFilters?: boolean;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for menu configuration
 */
export interface MenuConfigResponse {
  success: boolean;
  data: MenuConfig;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_MENU_CONFIG: MenuConfig = {
  title: 'Our Menu',
  subtitle: 'Discover our delicious offerings',
  description: 'Explore our carefully curated selection of dishes',
  layout: 'grid',
  bgColor: '#ffffff',
  textColor: '#000000',
  accentColor: '#3b82f6',
  cardBgColor: '#f9fafb',
  textAlign: 'center',
  paddingTop: '4rem',
  paddingBottom: '4rem',
  columns: 3,
  showPrices: true,
  showImages: true,
  showDescriptions: true,
  showDietaryInfo: true,
  showCategoryIcons: false,
  categoryLayout: 'tabs',
  contentMaxWidth: '1200px',
  enableSearch: false,
  enableFilters: false,
  categories: [],
  featuredItems: [],
};
