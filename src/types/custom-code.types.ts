/**
 * Type definitions for custom code configuration
 */

export type CustomCodeType = 'html' | 'iframe';

export interface CustomCodeConfig {
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
};
