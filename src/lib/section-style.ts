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
): Required<SectionStyleConfig> {
  const mergedGlobal = mergeGlobalStyleConfig(globalStyles);
  return {
    is_custom: false,
    buttonStyleVariant: 'primary',
    titleFontFamily: mergedGlobal.title?.fontFamily || 'Inter, system-ui, sans-serif',
    titleFontSize: mergedGlobal.title?.fontSize || '2.25rem',
    titleFontWeight: mergedGlobal.title?.fontWeight || 700,
    titleColor: mergedGlobal.title?.color || '#111827',
    subtitleFontFamily:
      mergedGlobal.subheading?.fontFamily || 'Inter, system-ui, sans-serif',
    subtitleFontSize: mergedGlobal.subheading?.fontSize || '1.5rem',
    subtitleFontWeight: mergedGlobal.subheading?.fontWeight || 600,
    subtitleColor: mergedGlobal.subheading?.color || '#374151',
    bodyFontFamily: mergedGlobal.paragraph?.fontFamily || 'Inter, system-ui, sans-serif',
    bodyFontSize: mergedGlobal.paragraph?.fontSize || '1rem',
    bodyFontWeight: mergedGlobal.paragraph?.fontWeight || 400,
    bodyColor: mergedGlobal.paragraph?.color || '#6b7280',
  };
}

export function buildSectionStyleConfig(
  sourceConfig: Partial<SectionStyleConfig> | null | undefined,
  globalStyles?: GlobalStyleConfig | null,
): Required<SectionStyleConfig> {
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
    titleFontWeight: toNumberValue(source.titleFontWeight, defaults.titleFontWeight),
    titleColor: toStringValue(source.titleColor, defaults.titleColor),
    subtitleFontFamily: toStringValue(
      source.subtitleFontFamily,
      defaults.subtitleFontFamily,
    ),
    subtitleFontSize: toStringValue(source.subtitleFontSize, defaults.subtitleFontSize),
    subtitleFontWeight: toNumberValue(
      source.subtitleFontWeight,
      defaults.subtitleFontWeight,
    ),
    subtitleColor: toStringValue(source.subtitleColor, defaults.subtitleColor),
    bodyFontFamily: toStringValue(source.bodyFontFamily, defaults.bodyFontFamily),
    bodyFontSize: toStringValue(source.bodyFontSize, defaults.bodyFontSize),
    bodyFontWeight: toNumberValue(source.bodyFontWeight, defaults.bodyFontWeight),
    bodyColor: toStringValue(source.bodyColor, defaults.bodyColor),
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
      color: resolved.titleColor,
    } as const,
    subtitleStyle: {
      fontFamily: resolved.subtitleFontFamily,
      fontSize: resolved.subtitleFontSize,
      fontWeight: resolved.subtitleFontWeight,
      color: resolved.subtitleColor,
    } as const,
    bodyStyle: {
      fontFamily: resolved.bodyFontFamily,
      fontSize: resolved.bodyFontSize,
      fontWeight: resolved.bodyFontWeight,
      color: resolved.bodyColor,
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
