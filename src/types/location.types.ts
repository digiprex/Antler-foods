/**
 * Type definitions for location configuration
 */

export interface LocationConfig {
  id?: string;
  restaurant_id?: string;
  page_id?: string;
  google_place_id?: string;
  template_id?: string;

  // Display options
  enabled?: boolean;
  layout?: 'default' | 'grid' | 'list' | 'map' | 'cards' | 'compact' | 'sidebar' | 'fullscreen';
  showTitle?: boolean;
  showDescription?: boolean;
  showMap?: boolean;
  showDirections?: boolean;
  showAddress?: boolean;
  showHours?: boolean;

  // Content
  title?: string;
  subtitle?: string;
  description?: string;
  locations?: LocationItem[];

  // Styling
  bgColor?: string;
  textColor?: string;
  maxWidth?: string;
  is_custom?: boolean;
  buttonStyleVariant?: 'primary' | 'secondary';
  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: number;
  titleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: number;
  subtitleColor?: string;
  descriptionFontFamily?: string;
  descriptionFontSize?: string;
  descriptionFontWeight?: number;
  descriptionColor?: string;
  bodyFontFamily?: string;
  bodyFontSize?: string;
  bodyFontWeight?: number;
  bodyColor?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface LocationItem {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  hours?: string;
  description?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  featured?: boolean;
}

export interface LocationConfigResponse {
  success: boolean;
  data: LocationConfig;
  error?: string;
}

export const DEFAULT_LOCATION_CONFIG: LocationConfig = {
  title: 'Our Locations',
  subtitle: '',
  description: 'Visit us at any of our convenient locations',
  enabled: true,
  layout: 'default',
  showTitle: true,
  showDescription: true,
  showMap: true,
  showDirections: true,
  showAddress: true,
  showHours: true,
  bgColor: '#ffffff',
  textColor: '#000000',
  maxWidth: '1200px',
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
  descriptionFontFamily: 'Inter, system-ui, sans-serif',
  descriptionFontSize: '1rem',
  descriptionFontWeight: 400,
  descriptionColor: '#6b7280',
  bodyFontFamily: 'Inter, system-ui, sans-serif',
  bodyFontSize: '1rem',
  bodyFontWeight: 400,
  bodyColor: '#6b7280',
  locations: [],
};
