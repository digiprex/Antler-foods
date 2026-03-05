/**
 * Type definitions for scrolling text configuration
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

export interface ScrollingTextConfig extends SectionStyleConfig {
  id?: string;
  restaurant_id?: string;
  page_id?: string;

  // Visibility
  isEnabled: boolean;

  // Content
  text: string;

  // Styling
  bgColor: string;
  textColor: string;
  fontSize?: string;

  // Animation
  scrollSpeed: 'slow' | 'medium' | 'fast';

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for scrolling text configuration
 */
export interface ScrollingTextConfigResponse {
  success: boolean;
  data: ScrollingTextConfig | null;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_SCROLLING_TEXT_CONFIG: ScrollingTextConfig = {
  isEnabled: false,
  text: 'Welcome to our restaurant!',
  bgColor: '#000000',
  textColor: '#ffffff',
  fontSize: '16px',
  scrollSpeed: 'medium',
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

/**
 * Scroll speed configurations (pixels per second)
 */
export const SCROLL_SPEEDS = {
  slow: 30,
  medium: 50,
  fast: 80,
} as const;
