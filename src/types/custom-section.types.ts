/**
 * Custom Section Types
 * 
 * Type definitions for custom content sections with multiple layout options
 */

export interface CustomSectionImage {
  url: string;
  alt: string;
}

export interface CustomSectionButton {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
}

export interface CustomSectionConfig {
  headline: string;
  subheadline?: string;
  description?: string;
  primaryButton?: CustomSectionButton;
  secondaryButton?: CustomSectionButton;
  image?: CustomSectionImage;
  videoUrl?: string;
  backgroundImage?: string;
  layout: 'layout-1' | 'layout-2' | 'layout-3' | 'layout-4' | 'layout-5' | 'layout-6' | 'layout-7' | 'layout-8' | 'layout-9' |
          'layout-10' | 'layout-11' | 'layout-12' | 'layout-13' | 'layout-14' | 'layout-15' | 'layout-16' | 'layout-17' | 'layout-18' |
          'layout-19' | 'layout-20' | 'layout-21' | 'layout-22' | 'layout-23' | 'layout-24' | 'layout-25' | 'layout-26' | 'layout-27' |
          'layout-28' | 'layout-29' | 'layout-30' | 'layout-31' | 'layout-32';
  bgColor?: string;
  textColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textAlign?: 'left' | 'center' | 'right';
  paddingTop?: string;
  paddingBottom?: string;
  minHeight?: string;
  contentMaxWidth?: string;
  restaurant_id?: string;
}

export const DEFAULT_CUSTOM_SECTION_CONFIG: CustomSectionConfig = {
  headline: 'Custom Section Headline',
  subheadline: '',
  description: '',
  layout: 'layout-1',
  bgColor: '#ffffff',
  textColor: '#000000',
  textAlign: 'center',
  paddingTop: '4rem',
  paddingBottom: '4rem',
  minHeight: '400px',
  contentMaxWidth: '1200px',
};