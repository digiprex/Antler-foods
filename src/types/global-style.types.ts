/**
 * Type definitions for global style configuration
 * These types define the structure for title, subheading, paragraph, and button styling
 * that will be stored in restaurants table under global_styles
 */

export interface FontStyle {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: number;
  color?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface ButtonStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: number;
  borderRadius?: string;
  size?: 'small' | 'medium' | 'large';
  border?: string;
  hoverBackgroundColor?: string;
  hoverColor?: string;
  fontFamily?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface GlobalStyleConfig {
  id?: string;
  restaurant_id?: string;

  // Title styling (H1, main headings)
  title?: FontStyle;

  // Subheading styling (H2, H3, section headings)
  subheading?: FontStyle;

  // Paragraph styling (body text, descriptions)
  paragraph?: FontStyle;

  // Button styling
  primaryButton?: ButtonStyle;
  secondaryButton?: ButtonStyle;

  // Base theme colors
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * API Response type for global style configuration
 */
export interface GlobalStyleConfigResponse {
  success: boolean;
  data: GlobalStyleConfig;
  error?: string;
}

/**
 * Default global style configuration values
 */
export const DEFAULT_GLOBAL_STYLE_CONFIG: GlobalStyleConfig = {
  title: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '2.25rem',
    fontWeight: 700,
    color: '#111827',
    lineHeight: '1.2',
    letterSpacing: '-0.025em',
    textTransform: 'none',
  },
  subheading: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#374151',
    lineHeight: '1.3',
    letterSpacing: '-0.015em',
    textTransform: 'none',
  },
  paragraph: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: '1rem',
    fontWeight: 400,
    color: '#6b7280',
    lineHeight: '1.6',
    letterSpacing: '0',
    textTransform: 'none',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '0.5rem',
    size: 'medium',
    border: 'none',
    hoverBackgroundColor: '#1d4ed8',
    hoverColor: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    textTransform: 'none',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '0.5rem',
    size: 'medium',
    border: '1px solid #d1d5db',
    hoverBackgroundColor: '#f9fafb',
    hoverColor: '#111827',
    fontFamily: 'Inter, system-ui, sans-serif',
    textTransform: 'none',
  },
  primaryColor: '#2563eb',
  secondaryColor: '#e5e7eb',
  accentColor: '#8b5cf6',
  backgroundColor: '#ffffff',
  textColor: '#111827',
};