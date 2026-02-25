/**
 * Type definitions for dynamic gallery section configuration
 * These types define the structure of data that will come from the database/API
 */

export interface GalleryImage {
  id?: string;
  url: string;
  alt: string;
  title?: string;
  description?: string;
  category?: string;
  order?: number;
}

export interface GalleryConfig {
  id?: string;
  restaurant_id?: string; // Restaurant ID for database operations

  // Content
  title?: string;
  subtitle?: string;
  description?: string;

  // Images
  images: GalleryImage[];

  // Layout options
  layout?: 'grid' | 'masonry' | 'carousel' | 'slider';
  columns?: 2 | 3 | 4 | 5 | 6;
  gap?: string;
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto';

  // Styling
  bgColor?: string;
  textColor?: string;
  padding?: string;
  maxWidth?: string;

  // Behavior
  showCaptions?: boolean;
  showCategories?: boolean;
  enableLightbox?: boolean;
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
  title: 'Our Gallery',
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
  maxWidth: '1200px',
  showCaptions: true,
  showCategories: false,
  enableLightbox: true,
  autoplay: false,
  autoplaySpeed: 3000,
};
