/**
 * Type definitions for dynamic gallery section configuration
 * These types define the structure of data that will come from the database/API
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

export interface GalleryImage {
  id?: string;
  url: string;
  alt: string;
  title?: string;
  description?: string;
  category?: string;
  order?: number;
}

export interface GalleryConfig extends SectionStyleConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Content
  title?: string;
  subtitle?: string;
  description?: string;

  // Images
  images: GalleryImage[];

  // Layout options
  layout?:
    | 'showcase'
    | 'spotlight'
    | 'mosaic'
    | 'editorial'
    | 'filmstrip'
    | 'grid'
    | 'masonry'
    | 'carousel'
    | 'slider';
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: string;
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto';

  // Styling
  bgColor?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  maxWidth?: string;

  // Behavior
  showCaptions?: boolean;
  showCategories?: boolean;
  enableLightbox?: boolean;
  enableScrollAnimation?: boolean;
  autoplay?: boolean;
  autoplaySpeed?: number;

  // Metadata
  created_at?: string;
  updated_at?: string;
}

export interface GalleryConfigResponse {
  success: boolean;
  data: GalleryConfig;
  error?: string;
}

export const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  title: '',
  subtitle: '',
  description: '',
  images: [],
  layout: 'grid',
  columns: 3,
  gap: '1rem',
  aspectRatio: 'square',
  bgColor: '#ffffff',
  textColor: '#000000',
  padding: '4rem 2rem',
  margin: '0',
  maxWidth: '1200px',
  showCaptions: true,
  showCategories: false,
  enableLightbox: true,
  enableScrollAnimation: false,
  autoplay: false,
  autoplaySpeed: 3000,
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
  bodyFontFamily: 'Inter, system-ui, sans-serif',
  bodyFontSize: '1rem',
  bodyFontWeight: 400,
  bodyColor: '#6b7280',
};
