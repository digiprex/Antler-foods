export type SectionButtonStyleVariant = 'primary' | 'secondary';

export interface SectionStyleConfig {
  is_custom?: boolean;
  buttonStyleVariant?: SectionButtonStyleVariant;

  titleFontFamily?: string;
  titleFontSize?: string;
  titleFontWeight?: number;
  titleColor?: string;

  subtitleFontFamily?: string;
  subtitleFontSize?: string;
  subtitleFontWeight?: number;
  subtitleColor?: string;

  bodyFontFamily?: string;
  bodyFontSize?: string;
  bodyFontWeight?: number;
  bodyColor?: string;
}

export const SECTION_STYLE_KEYS = [
  'is_custom',
  'buttonStyleVariant',
  'titleFontFamily',
  'titleFontSize',
  'titleFontWeight',
  'titleColor',
  'subtitleFontFamily',
  'subtitleFontSize',
  'subtitleFontWeight',
  'subtitleColor',
  'bodyFontFamily',
  'bodyFontSize',
  'bodyFontWeight',
  'bodyColor',
] as const;

export type SectionStyleKey = (typeof SECTION_STYLE_KEYS)[number];
