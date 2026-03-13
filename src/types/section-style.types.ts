export type SectionButtonStyleVariant = 'primary' | 'secondary';
export type SectionSurfaceShadow = 'none' | 'soft' | 'medium' | 'large';
export type SectionScrollRevealAnimation =
  | 'fade'
  | 'fade-up'
  | 'slide-up'
  | 'soft-reveal';
export type SectionTextAlign = 'left' | 'center' | 'right';

export interface SectionStyleConfig {
  is_custom?: boolean;
  buttonStyleVariant?: SectionButtonStyleVariant;

  titleFontFamily?: string;
  titleFontSize?: string;
  titleMobileFontSize?: string;
  titleMobileFontFamily?: string;
  titleFontWeight?: number;
  titleMobileFontWeight?: number;
  titleFontStyle?: 'normal' | 'italic';
  titleMobileFontStyle?: 'normal' | 'italic';
  titleColor?: string;
  titleMobileColor?: string;
  titleTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  titleMobileTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  titleLineHeight?: string;
  titleMobileLineHeight?: string;
  titleLetterSpacing?: string;
  titleMobileLetterSpacing?: string;

  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleMobileFontSize?: string;
  subtitleMobileFontFamily?: string;
  subtitleFontWeight?: number;
  subtitleMobileFontWeight?: number;
  subtitleFontStyle?: 'normal' | 'italic';
  subtitleMobileFontStyle?: 'normal' | 'italic';
  subtitleColor?: string;
  subtitleMobileColor?: string;
  subtitleTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  subtitleMobileTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  subtitleLineHeight?: string;
  subtitleMobileLineHeight?: string;
  subtitleLetterSpacing?: string;
  subtitleMobileLetterSpacing?: string;

  bodyFontFamily?: string;
  bodyFontSize?: string;
  bodyMobileFontSize?: string;
  bodyMobileFontFamily?: string;
  bodyFontWeight?: number;
  bodyMobileFontWeight?: number;
  bodyFontStyle?: 'normal' | 'italic';
  bodyMobileFontStyle?: 'normal' | 'italic';
  bodyColor?: string;
  bodyMobileColor?: string;
  bodyTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  bodyMobileTextTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  bodyLineHeight?: string;
  bodyMobileLineHeight?: string;
  bodyLetterSpacing?: string;
  bodyMobileLetterSpacing?: string;

  sectionTextAlign?: SectionTextAlign;
  mobileSectionTextAlign?: SectionTextAlign;
  sectionMaxWidth?: string;
  mobileSectionMaxWidth?: string;
  sectionPaddingY?: string;
  mobileSectionPaddingY?: string;
  sectionPaddingX?: string;
  mobileSectionPaddingX?: string;
  surfaceBorderRadius?: string;
  mobileSurfaceBorderRadius?: string;
  surfaceShadow?: SectionSurfaceShadow;
  mobileSurfaceShadow?: SectionSurfaceShadow;
  enableScrollReveal?: boolean;
  scrollRevealAnimation?: SectionScrollRevealAnimation;
}

export const SECTION_STYLE_KEYS = [
  'is_custom',
  'buttonStyleVariant',
  'titleFontFamily',
  'titleFontSize',
  'titleMobileFontSize',
  'titleMobileFontFamily',
  'titleFontWeight',
  'titleMobileFontWeight',
  'titleFontStyle',
  'titleMobileFontStyle',
  'titleColor',
  'titleMobileColor',
  'titleTextTransform',
  'titleMobileTextTransform',
  'titleLineHeight',
  'titleMobileLineHeight',
  'titleLetterSpacing',
  'titleMobileLetterSpacing',
  'subtitleFontFamily',
  'subtitleFontSize',
  'subtitleMobileFontSize',
  'subtitleMobileFontFamily',
  'subtitleFontWeight',
  'subtitleMobileFontWeight',
  'subtitleFontStyle',
  'subtitleMobileFontStyle',
  'subtitleColor',
  'subtitleMobileColor',
  'subtitleTextTransform',
  'subtitleMobileTextTransform',
  'subtitleLineHeight',
  'subtitleMobileLineHeight',
  'subtitleLetterSpacing',
  'subtitleMobileLetterSpacing',
  'bodyFontFamily',
  'bodyFontSize',
  'bodyMobileFontSize',
  'bodyMobileFontFamily',
  'bodyFontWeight',
  'bodyMobileFontWeight',
  'bodyFontStyle',
  'bodyMobileFontStyle',
  'bodyColor',
  'bodyMobileColor',
  'bodyTextTransform',
  'bodyMobileTextTransform',
  'bodyLineHeight',
  'bodyMobileLineHeight',
  'bodyLetterSpacing',
  'bodyMobileLetterSpacing',
  'sectionTextAlign',
  'mobileSectionTextAlign',
  'sectionMaxWidth',
  'mobileSectionMaxWidth',
  'sectionPaddingY',
  'mobileSectionPaddingY',
  'sectionPaddingX',
  'mobileSectionPaddingX',
  'surfaceBorderRadius',
  'mobileSurfaceBorderRadius',
  'surfaceShadow',
  'mobileSurfaceShadow',
  'enableScrollReveal',
  'scrollRevealAnimation',
] as const;

export type SectionStyleKey = (typeof SECTION_STYLE_KEYS)[number];
