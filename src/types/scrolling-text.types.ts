/**
 * Type definitions for scrolling text configuration
 */

export interface ScrollingTextConfig {
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
};

/**
 * Scroll speed configurations (pixels per second)
 */
export const SCROLL_SPEEDS = {
  slow: 30,
  medium: 50,
  fast: 80,
} as const;
