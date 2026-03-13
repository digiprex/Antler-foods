import type { SectionStyleConfig } from '@/types/section-style.types';
import type {
  CustomSectionAnimationSettings,
  CustomSectionConfig,
  CustomSectionLayout,
  CustomSectionStyleSettings,
} from '@/types/custom-section.types';
import { DEFAULT_CUSTOM_SECTION_CONFIG } from '@/types/custom-section.types';
import { createLayoutItems, getCustomSectionLayoutDefinition } from './layouts';

function mergeStyleConfig(
  base?: CustomSectionStyleSettings,
  incoming?: CustomSectionStyleSettings,
): CustomSectionStyleSettings {
  return {
    ...(base || {}),
    ...(incoming || {}),
  };
}

function mergeAnimationConfig(
  base?: CustomSectionAnimationSettings,
  incoming?: CustomSectionAnimationSettings,
): CustomSectionAnimationSettings {
  return {
    ...(base || {}),
    ...(incoming || {}),
  };
}

export function getDefaultCustomSectionConfig(
  layout: CustomSectionLayout = DEFAULT_CUSTOM_SECTION_CONFIG.layout,
  sectionStyleDefaults?: Partial<SectionStyleConfig>,
): CustomSectionConfig {
  return normalizeCustomSectionConfig(
    {
      ...DEFAULT_CUSTOM_SECTION_CONFIG,
      ...(sectionStyleDefaults || {}),
      layout,
    },
    sectionStyleDefaults,
  );
}

export function normalizeCustomSectionConfig(
  source?: Partial<CustomSectionConfig> | null,
  sectionStyleDefaults?: Partial<SectionStyleConfig>,
): CustomSectionConfig {
  const merged: CustomSectionConfig = {
    ...DEFAULT_CUSTOM_SECTION_CONFIG,
    ...(sectionStyleDefaults || {}),
    ...(source || {}),
    primaryButton: source?.primaryButton
      ? {
        label: source.primaryButton.label || '',
        href: source.primaryButton.href || '',
        variant: source.primaryButton.variant || 'primary',
        bgColor: source.primaryButton.bgColor,
        textColor: source.primaryButton.textColor,
        borderColor: source.primaryButton.borderColor,
      }
      : DEFAULT_CUSTOM_SECTION_CONFIG.primaryButton,
    secondaryButton: source?.secondaryButton
      ? {
        label: source.secondaryButton.label || '',
        href: source.secondaryButton.href || '',
        variant: source.secondaryButton.variant || 'outline',
        bgColor: source.secondaryButton.bgColor,
        textColor: source.secondaryButton.textColor,
        borderColor: source.secondaryButton.borderColor,
      }
      : DEFAULT_CUSTOM_SECTION_CONFIG.secondaryButton,
    image: source?.image || DEFAULT_CUSTOM_SECTION_CONFIG.image,
    secondaryImage: source?.secondaryImage || DEFAULT_CUSTOM_SECTION_CONFIG.secondaryImage,
    fallbackImage: source?.fallbackImage || DEFAULT_CUSTOM_SECTION_CONFIG.fallbackImage,
    layoutSettings: {
      ...(DEFAULT_CUSTOM_SECTION_CONFIG.layoutSettings || {}),
      ...(source?.layoutSettings || {}),
    },
    responsive: {
      ...(DEFAULT_CUSTOM_SECTION_CONFIG.responsive || {}),
      ...(source?.responsive || {}),
    },
    styleConfig: mergeStyleConfig(DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig, source?.styleConfig),
    animation: mergeAnimationConfig(DEFAULT_CUSTOM_SECTION_CONFIG.animation, source?.animation),
    is_custom: source?.is_custom ?? false,
    buttonStyleVariant: source?.buttonStyleVariant || DEFAULT_CUSTOM_SECTION_CONFIG.buttonStyleVariant,
  };

  const layout = merged.layout || DEFAULT_CUSTOM_SECTION_CONFIG.layout;
  const definition = getCustomSectionLayoutDefinition(layout);

  const overlayColor = merged.overlayColor || merged.styleConfig?.overlayColor || '#0f172a';
  const overlayOpacity = merged.overlayOpacity ?? merged.styleConfig?.overlayOpacity ?? 0.48;
  const isCustom = merged.is_custom === true;

  merged.layout = layout;
  merged.sectionMaxWidth = merged.sectionMaxWidth || merged.contentMaxWidth || DEFAULT_CUSTOM_SECTION_CONFIG.sectionMaxWidth;
  merged.sectionPaddingY = merged.sectionPaddingY || DEFAULT_CUSTOM_SECTION_CONFIG.sectionPaddingY;
  merged.sectionTextAlign = merged.sectionTextAlign || merged.textAlign || DEFAULT_CUSTOM_SECTION_CONFIG.sectionTextAlign;
  merged.textAlign = merged.textAlign || merged.sectionTextAlign || 'left';
  merged.overlayColor = overlayColor;
  merged.overlayOpacity = overlayOpacity;

  // When Use Global Styles is ON (is_custom === false), do NOT inject hardcoded color
  // fallbacks into styleConfig — the renderer will use globalStyles from the API instead.
  if (isCustom) {
    // Section has explicit per-section colors — preserve them as-is (explicit overrides)
    merged.styleConfig = {
      ...merged.styleConfig,
      overlayColor,
      overlayOpacity,
      cardBorderRadius:
        merged.styleConfig?.cardBorderRadius ||
        merged.surfaceBorderRadius ||
        DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardBorderRadius,
      cardShadow:
        merged.styleConfig?.cardShadow ||
        merged.surfaceShadow ||
        DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardShadow,
    };
  } else {
    // Use Global Styles: only keep structural non-color values; strip theme colors
    // so the renderer falls back to the fetched global CSS theme
    merged.styleConfig = {
      overlayColor,
      overlayOpacity,
      borderColor: merged.styleConfig?.borderColor,
      cardBorderRadius:
        merged.styleConfig?.cardBorderRadius ||
        merged.surfaceBorderRadius ||
        DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardBorderRadius,
      cardShadow:
        merged.styleConfig?.cardShadow ||
        merged.surfaceShadow ||
        DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardShadow,
    };
    // Also clear out per-section typography — global theme takes over
    merged.bgColor = undefined;
    merged.textColor = undefined;
    merged.titleColor = undefined;
    merged.subtitleColor = undefined;
    merged.bodyColor = undefined;
  }
  merged.items = createLayoutItems(layout, merged.items);

  if (!definition.supportsItems) {
    merged.items = merged.items?.filter(Boolean);
  }

  return merged;
}

export function getCustomSectionEditorSummary(config: CustomSectionConfig) {
  const definition = getCustomSectionLayoutDefinition(config.layout);
  const itemCount = definition.supportsItems ? config.items?.length || 0 : 0;
  return {
    definition,
    itemCount,
    hasVideo: Boolean(config.videoUrl),
    hasPrimaryMedia:
      Boolean(config.image?.url) ||
      Boolean(config.backgroundImage) ||
      Boolean(config.videoUrl),
  };
}
