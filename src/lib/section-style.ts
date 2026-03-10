import type {
  GlobalStyleConfig,
  ButtonStyle,
} from '@/types/global-style.types';
import { DEFAULT_GLOBAL_STYLE_CONFIG } from '@/types/global-style.types';
import type {
  SectionStyleConfig,
  SectionButtonStyleVariant,
} from '@/types/section-style.types';
import type { CSSProperties } from 'react';

type ResolvedSectionStyleConfig = SectionStyleConfig & {
  is_custom: boolean;
  buttonStyleVariant: SectionButtonStyleVariant;
  titleFontFamily: string;
  titleFontSize: string;
  titleMobileFontSize?: string;
  titleMobileFontFamily?: string;
  titleFontWeight: number;
  titleMobileFontWeight?: number;
  titleMobileFontStyle?: 'normal' | 'italic';
  titleMobileColor?: string;
  titleMobileTextTransform?: SectionStyleConfig['titleTextTransform'];
  titleMobileLineHeight?: string;
  titleMobileLetterSpacing?: string;
  titleColor: string;
  subtitleFontFamily: string;
  subtitleFontSize: string;
  subtitleMobileFontSize?: string;
  subtitleMobileFontFamily?: string;
  subtitleFontWeight: number;
  subtitleMobileFontWeight?: number;
  subtitleMobileFontStyle?: 'normal' | 'italic';
  subtitleMobileColor?: string;
  subtitleMobileTextTransform?: SectionStyleConfig['subtitleTextTransform'];
  subtitleMobileLineHeight?: string;
  subtitleMobileLetterSpacing?: string;
  subtitleColor: string;
  bodyFontFamily: string;
  bodyFontSize: string;
  bodyMobileFontSize?: string;
  bodyMobileFontFamily?: string;
  bodyFontWeight: number;
  bodyMobileFontWeight?: number;
  bodyMobileFontStyle?: 'normal' | 'italic';
  bodyMobileColor?: string;
  bodyMobileTextTransform?: SectionStyleConfig['bodyTextTransform'];
  bodyMobileLineHeight?: string;
  bodyMobileLetterSpacing?: string;
  bodyColor: string;
};

function toStringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function toNumberValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toOptionalStringValue(
  value: unknown,
  fallback?: string,
): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return fallback;
}

export function mergeGlobalStyleConfig(
  globalStyles?: GlobalStyleConfig | null,
): GlobalStyleConfig {
  return {
    ...DEFAULT_GLOBAL_STYLE_CONFIG,
    ...(globalStyles || {}),
    title: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.title,
      ...(globalStyles?.title || {}),
    },
    subheading: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.subheading,
      ...(globalStyles?.subheading || {}),
    },
    paragraph: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.paragraph,
      ...(globalStyles?.paragraph || {}),
    },
    primaryButton: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.primaryButton,
      ...(globalStyles?.primaryButton || {}),
    },
    secondaryButton: {
      ...DEFAULT_GLOBAL_STYLE_CONFIG.secondaryButton,
      ...(globalStyles?.secondaryButton || {}),
    },
  };
}

export function getSectionStyleDefaults(
  globalStyles?: GlobalStyleConfig | null,
): ResolvedSectionStyleConfig {
  const mergedGlobal = mergeGlobalStyleConfig(globalStyles);
  return {
    is_custom: false,
    buttonStyleVariant: 'primary',
    titleFontFamily: mergedGlobal.title?.fontFamily || 'Inter, system-ui, sans-serif',
    titleFontSize: mergedGlobal.title?.fontSize || '2.25rem',
    titleMobileFontSize: undefined,
    titleMobileFontFamily: undefined,
    titleFontWeight: mergedGlobal.title?.fontWeight || 700,
    titleMobileFontWeight: undefined,
    titleFontStyle: undefined,
    titleMobileFontStyle: undefined,
    titleColor: mergedGlobal.title?.color || '#111827',
    titleMobileColor: undefined,
    titleTextTransform: undefined,
    titleMobileTextTransform: undefined,
    titleLineHeight: undefined,
    titleMobileLineHeight: undefined,
    titleLetterSpacing: undefined,
    titleMobileLetterSpacing: undefined,
    subtitleFontFamily:
      mergedGlobal.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
    subtitleFontSize: mergedGlobal.subheading?.fontSize || '1.5rem',
    subtitleMobileFontSize: undefined,
    subtitleMobileFontFamily: undefined,
    subtitleFontWeight: mergedGlobal.subheading?.fontWeight || 600,
    subtitleMobileFontWeight: undefined,
    subtitleFontStyle: undefined,
    subtitleMobileFontStyle: undefined,
    subtitleColor: mergedGlobal.subheading?.color || '#374151',
    subtitleMobileColor: undefined,
    subtitleTextTransform: undefined,
    subtitleMobileTextTransform: undefined,
    subtitleLineHeight: undefined,
    subtitleMobileLineHeight: undefined,
    subtitleLetterSpacing: undefined,
    subtitleMobileLetterSpacing: undefined,
    bodyFontFamily: mergedGlobal.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
    bodyFontSize: mergedGlobal.paragraph?.fontSize || '1rem',
    bodyMobileFontSize: undefined,
    bodyMobileFontFamily: undefined,
    bodyFontWeight: mergedGlobal.paragraph?.fontWeight || 400,
    bodyMobileFontWeight: undefined,
    bodyFontStyle: undefined,
    bodyMobileFontStyle: undefined,
    bodyColor: mergedGlobal.paragraph?.color || '#6b7280',
    bodyMobileColor: undefined,
    bodyTextTransform: undefined,
    bodyMobileTextTransform: undefined,
    bodyLineHeight: undefined,
    bodyMobileLineHeight: undefined,
    bodyLetterSpacing: undefined,
    bodyMobileLetterSpacing: undefined,
  };
}

export function buildSectionStyleConfig(
  sourceConfig: Partial<SectionStyleConfig> | null | undefined,
  globalStyles?: GlobalStyleConfig | null,
): ResolvedSectionStyleConfig {
  const defaults = getSectionStyleDefaults(globalStyles);
  const source = sourceConfig || {};
  const isCustom = source.is_custom === true;

  const buttonStyleVariant: SectionButtonStyleVariant =
    source.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary';

  if (!isCustom) {
    return {
      ...defaults,
      is_custom: false,
      buttonStyleVariant,
    };
  }

  return {
    is_custom: true,
    buttonStyleVariant,
    titleFontFamily: toStringValue(source.titleFontFamily, defaults.titleFontFamily),
    titleFontSize: toStringValue(source.titleFontSize, defaults.titleFontSize),
    titleMobileFontSize: toOptionalStringValue(
      source.titleMobileFontSize,
      defaults.titleMobileFontSize,
    ),
    titleMobileFontFamily: toOptionalStringValue(
      source.titleMobileFontFamily,
      defaults.titleMobileFontFamily,
    ),
    titleFontWeight: toNumberValue(source.titleFontWeight, defaults.titleFontWeight),
    titleMobileFontWeight:
      source.titleMobileFontWeight !== undefined
        ? toNumberValue(source.titleMobileFontWeight, defaults.titleFontWeight)
        : defaults.titleMobileFontWeight,
    titleFontStyle: toOptionalStringValue(source.titleFontStyle, defaults.titleFontStyle),
    titleMobileFontStyle: toOptionalStringValue(
      source.titleMobileFontStyle,
      defaults.titleMobileFontStyle,
    ) as SectionStyleConfig['titleMobileFontStyle'],
    titleColor: toStringValue(source.titleColor, defaults.titleColor),
    titleMobileColor: toOptionalStringValue(
      source.titleMobileColor,
      defaults.titleMobileColor,
    ),
    titleTextTransform: toOptionalStringValue(
      source.titleTextTransform,
      defaults.titleTextTransform,
    ) as SectionStyleConfig['titleTextTransform'],
    titleMobileTextTransform: toOptionalStringValue(
      source.titleMobileTextTransform,
      defaults.titleMobileTextTransform,
    ) as SectionStyleConfig['titleMobileTextTransform'],
    titleLineHeight: toOptionalStringValue(source.titleLineHeight, defaults.titleLineHeight),
    titleMobileLineHeight: toOptionalStringValue(
      source.titleMobileLineHeight,
      defaults.titleMobileLineHeight,
    ),
    titleLetterSpacing: toOptionalStringValue(
      source.titleLetterSpacing,
      defaults.titleLetterSpacing,
    ),
    titleMobileLetterSpacing: toOptionalStringValue(
      source.titleMobileLetterSpacing,
      defaults.titleMobileLetterSpacing,
    ),
    subtitleFontFamily: toStringValue(
      source.subtitleFontFamily,
      defaults.subtitleFontFamily,
    ),
    subtitleFontSize: toStringValue(source.subtitleFontSize, defaults.subtitleFontSize),
    subtitleMobileFontSize: toOptionalStringValue(
      source.subtitleMobileFontSize,
      defaults.subtitleMobileFontSize,
    ),
    subtitleMobileFontFamily: toOptionalStringValue(
      source.subtitleMobileFontFamily,
      defaults.subtitleMobileFontFamily,
    ),
    subtitleFontWeight: toNumberValue(
      source.subtitleFontWeight,
      defaults.subtitleFontWeight,
    ),
    subtitleMobileFontWeight:
      source.subtitleMobileFontWeight !== undefined
        ? toNumberValue(source.subtitleMobileFontWeight, defaults.subtitleFontWeight)
        : defaults.subtitleMobileFontWeight,
    subtitleFontStyle: toOptionalStringValue(
      source.subtitleFontStyle,
      defaults.subtitleFontStyle,
    ),
    subtitleMobileFontStyle: toOptionalStringValue(
      source.subtitleMobileFontStyle,
      defaults.subtitleMobileFontStyle,
    ) as SectionStyleConfig['subtitleMobileFontStyle'],
    subtitleColor: toStringValue(source.subtitleColor, defaults.subtitleColor),
    subtitleMobileColor: toOptionalStringValue(
      source.subtitleMobileColor,
      defaults.subtitleMobileColor,
    ),
    subtitleTextTransform: toOptionalStringValue(
      source.subtitleTextTransform,
      defaults.subtitleTextTransform,
    ) as SectionStyleConfig['subtitleTextTransform'],
    subtitleMobileTextTransform: toOptionalStringValue(
      source.subtitleMobileTextTransform,
      defaults.subtitleMobileTextTransform,
    ) as SectionStyleConfig['subtitleMobileTextTransform'],
    subtitleLineHeight: toOptionalStringValue(
      source.subtitleLineHeight,
      defaults.subtitleLineHeight,
    ),
    subtitleMobileLineHeight: toOptionalStringValue(
      source.subtitleMobileLineHeight,
      defaults.subtitleMobileLineHeight,
    ),
    subtitleLetterSpacing: toOptionalStringValue(
      source.subtitleLetterSpacing,
      defaults.subtitleLetterSpacing,
    ),
    subtitleMobileLetterSpacing: toOptionalStringValue(
      source.subtitleMobileLetterSpacing,
      defaults.subtitleMobileLetterSpacing,
    ),
    bodyFontFamily: toStringValue(source.bodyFontFamily, defaults.bodyFontFamily),
    bodyFontSize: toStringValue(source.bodyFontSize, defaults.bodyFontSize),
    bodyMobileFontSize: toOptionalStringValue(
      source.bodyMobileFontSize,
      defaults.bodyMobileFontSize,
    ),
    bodyMobileFontFamily: toOptionalStringValue(
      source.bodyMobileFontFamily,
      defaults.bodyMobileFontFamily,
    ),
    bodyFontWeight: toNumberValue(source.bodyFontWeight, defaults.bodyFontWeight),
    bodyMobileFontWeight:
      source.bodyMobileFontWeight !== undefined
        ? toNumberValue(source.bodyMobileFontWeight, defaults.bodyFontWeight)
        : defaults.bodyMobileFontWeight,
    bodyFontStyle: toOptionalStringValue(source.bodyFontStyle, defaults.bodyFontStyle),
    bodyMobileFontStyle: toOptionalStringValue(
      source.bodyMobileFontStyle,
      defaults.bodyMobileFontStyle,
    ) as SectionStyleConfig['bodyMobileFontStyle'],
    bodyColor: toStringValue(source.bodyColor, defaults.bodyColor),
    bodyMobileColor: toOptionalStringValue(
      source.bodyMobileColor,
      defaults.bodyMobileColor,
    ),
    bodyTextTransform: toOptionalStringValue(
      source.bodyTextTransform,
      defaults.bodyTextTransform,
    ) as SectionStyleConfig['bodyTextTransform'],
    bodyMobileTextTransform: toOptionalStringValue(
      source.bodyMobileTextTransform,
      defaults.bodyMobileTextTransform,
    ) as SectionStyleConfig['bodyMobileTextTransform'],
    bodyLineHeight: toOptionalStringValue(source.bodyLineHeight, defaults.bodyLineHeight),
    bodyMobileLineHeight: toOptionalStringValue(
      source.bodyMobileLineHeight,
      defaults.bodyMobileLineHeight,
    ),
    bodyLetterSpacing: toOptionalStringValue(
      source.bodyLetterSpacing,
      defaults.bodyLetterSpacing,
    ),
    bodyMobileLetterSpacing: toOptionalStringValue(
      source.bodyMobileLetterSpacing,
      defaults.bodyMobileLetterSpacing,
    ),
  };
}

export function getSectionTypographyStyles(
  sourceConfig: Partial<SectionStyleConfig> | null | undefined,
  globalStyles?: GlobalStyleConfig | null,
) {
  const resolved = buildSectionStyleConfig(sourceConfig, globalStyles);
  return {
    resolved,
    titleStyle: {
      fontFamily: resolved.titleFontFamily,
      fontSize: resolved.titleFontSize,
      fontWeight: resolved.titleFontWeight,
      fontStyle: resolved.titleFontStyle,
      color: resolved.titleColor,
      textTransform: resolved.titleTextTransform,
      lineHeight: resolved.titleLineHeight,
      letterSpacing: resolved.titleLetterSpacing,
    } as const,
    subtitleStyle: {
      fontFamily: resolved.subtitleFontFamily,
      fontSize: resolved.subtitleFontSize,
      fontWeight: resolved.subtitleFontWeight,
      fontStyle: resolved.subtitleFontStyle,
      color: resolved.subtitleColor,
      textTransform: resolved.subtitleTextTransform,
      lineHeight: resolved.subtitleLineHeight,
      letterSpacing: resolved.subtitleLetterSpacing,
    } as const,
    bodyStyle: {
      fontFamily: resolved.bodyFontFamily,
      fontSize: resolved.bodyFontSize,
      fontWeight: resolved.bodyFontWeight,
      fontStyle: resolved.bodyFontStyle,
      color: resolved.bodyColor,
      textTransform: resolved.bodyTextTransform,
      lineHeight: resolved.bodyLineHeight,
      letterSpacing: resolved.bodyLetterSpacing,
    } as const,
  };
}

export function getSelectedGlobalButtonStyle(
  sourceConfig: Partial<SectionStyleConfig> | null | undefined,
  globalStyles?: GlobalStyleConfig | null,
): ButtonStyle {
  const mergedGlobal = mergeGlobalStyleConfig(globalStyles);
  const variant: SectionButtonStyleVariant =
    sourceConfig?.buttonStyleVariant === 'secondary' ? 'secondary' : 'primary';
  return variant === 'secondary'
    ? mergedGlobal.secondaryButton || DEFAULT_GLOBAL_STYLE_CONFIG.secondaryButton || {}
    : mergedGlobal.primaryButton || DEFAULT_GLOBAL_STYLE_CONFIG.primaryButton || {};
}

export function getButtonInlineStyle(buttonStyle?: ButtonStyle): CSSProperties {
  if (!buttonStyle) {
    return {};
  }

  return {
    backgroundColor: buttonStyle.backgroundColor,
    color: buttonStyle.color,
    fontFamily: buttonStyle.fontFamily,
    fontSize: buttonStyle.fontSize,
    fontWeight: buttonStyle.fontWeight,
    borderRadius: buttonStyle.borderRadius,
    border: buttonStyle.border,
    textTransform: buttonStyle.textTransform,
  };
}
