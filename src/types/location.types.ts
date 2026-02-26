/**
 * Type definitions for location configuration
 */

export interface LocationConfig {
  id?: string;
  restaurant_id?: string;
  page_id?: string;
  google_place_id?: string;

  // Display options
  enabled?: boolean;
  layout?: 'default' | 'grid' | 'list' | 'map' | 'cards' | 'compact' | 'sidebar' | 'fullscreen';
  showTitle?: boolean;
  showDescription?: boolean;
  showMap?: boolean;
  showDirections?: boolean;

  // Content
  title?: string;
  description?: string;
  locations?: LocationItem[];

  // Styling
  bgColor?: string;
  textColor?: string;
  maxWidth?: string;

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
  description: 'Visit us at any of our convenient locations',
  enabled: false,
  layout: 'default',
  showTitle: true,
  showDescription: true,
  showMap: true,
  showDirections: true,
  bgColor: '#ffffff',
  textColor: '#000000',
  maxWidth: '1200px',
  locations: [],
};