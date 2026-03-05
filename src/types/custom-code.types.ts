/**
 * Type definitions for custom code configuration
 */

import type { SectionStyleConfig } from '@/types/section-style.types';

export type CustomCodeType = 'html' | 'iframe';

export interface CustomCodeConfig extends SectionStyleConfig {
  id?: string;
  restaurant_id?: string;
  page_id?: string;

  // Visibility
  isEnabled: boolean;

  // Code Type
  codeType: CustomCodeType;

  // Content
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  iframeUrl?: string;

  // Iframe Settings
  iframeHeight?: string;
  iframeWidth?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for custom code configuration
 */
export interface CustomCodeConfigResponse {
  success: boolean;
  data: CustomCodeConfig | null;
  error?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CUSTOM_CODE_CONFIG: CustomCodeConfig = {
  isEnabled: false,
  codeType: 'html',
  htmlCode: '',
  cssCode: '',
  jsCode: '',
  iframeUrl: '',
  iframeHeight: '500px',
  iframeWidth: '100%',
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
