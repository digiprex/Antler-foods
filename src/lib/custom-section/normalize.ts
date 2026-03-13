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
    is_custom: source?.is_custom ?? true,
    buttonStyleVariant: source?.buttonStyleVariant || DEFAULT_CUSTOM_SECTION_CONFIG.buttonStyleVariant,
  };

  const layout = merged.layout || DEFAULT_CUSTOM_SECTION_CONFIG.layout;
  const definition = getCustomSectionLayoutDefinition(layout);

  const accentColor = merged.styleConfig?.accentColor || DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.accentColor || '#7c3aed';
  const overlayColor = merged.overlayColor || merged.styleConfig?.overlayColor || '#0f172a';
  const overlayOpacity = merged.overlayOpacity ?? merged.styleConfig?.overlayOpacity ?? 0.48;

  merged.layout = layout;
  merged.sectionMaxWidth = merged.sectionMaxWidth || merged.contentMaxWidth || DEFAULT_CUSTOM_SECTION_CONFIG.sectionMaxWidth;
  merged.contentMaxWidth = merged.contentMaxWidth || merged.sectionMaxWidth || DEFAULT_CUSTOM_SECTION_CONFIG.contentMaxWidth;
  merged.sectionPaddingY = merged.sectionPaddingY || merged.paddingTop || DEFAULT_CUSTOM_SECTION_CONFIG.sectionPaddingY;
  merged.paddingTop = merged.paddingTop || merged.sectionPaddingY || DEFAULT_CUSTOM_SECTION_CONFIG.paddingTop;
  merged.paddingBottom = merged.paddingBottom || merged.sectionPaddingY || DEFAULT_CUSTOM_SECTION_CONFIG.paddingBottom;
  merged.minHeight = merged.minHeight || merged.responsive?.mobileMinHeight || DEFAULT_CUSTOM_SECTION_CONFIG.minHeight;
  merged.sectionTextAlign = merged.sectionTextAlign || merged.textAlign || DEFAULT_CUSTOM_SECTION_CONFIG.sectionTextAlign;
  merged.textAlign = merged.textAlign || merged.sectionTextAlign || 'left';
  merged.bgColor = merged.bgColor || merged.styleConfig?.sectionBackgroundColor || DEFAULT_CUSTOM_SECTION_CONFIG.bgColor;
  merged.textColor = merged.textColor || merged.titleColor || DEFAULT_CUSTOM_SECTION_CONFIG.textColor;
  merged.overlayColor = overlayColor;
  merged.overlayOpacity = overlayOpacity;
  merged.styleConfig = {
    ...merged.styleConfig,
    sectionBackgroundColor: merged.styleConfig?.sectionBackgroundColor || merged.bgColor,
    accentColor,
    mutedAccentColor:
      merged.styleConfig?.mutedAccentColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.mutedAccentColor,
    overlayColor,
    overlayOpacity,
    buttonBackgroundColor:
      merged.styleConfig?.buttonBackgroundColor || accentColor,
    buttonTextColor:
      merged.styleConfig?.buttonTextColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.buttonTextColor,
    buttonSecondaryBackgroundColor:
      merged.styleConfig?.buttonSecondaryBackgroundColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.buttonSecondaryBackgroundColor,
    buttonSecondaryTextColor:
      merged.styleConfig?.buttonSecondaryTextColor || accentColor,
    buttonBorderColor:
      merged.styleConfig?.buttonBorderColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.buttonBorderColor,
    badgeBackgroundColor:
      merged.styleConfig?.badgeBackgroundColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.badgeBackgroundColor,
    badgeTextColor:
      merged.styleConfig?.badgeTextColor || accentColor,
    borderColor:
      merged.styleConfig?.borderColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.borderColor,
    contentSurfaceBackground:
      merged.styleConfig?.contentSurfaceBackground ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.contentSurfaceBackground,
    cardBackgroundColor:
      merged.styleConfig?.cardBackgroundColor ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardBackgroundColor,
    cardBorderRadius:
      merged.styleConfig?.cardBorderRadius ||
      merged.surfaceBorderRadius ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardBorderRadius,
    cardShadow:
      merged.styleConfig?.cardShadow ||
      merged.surfaceShadow ||
      DEFAULT_CUSTOM_SECTION_CONFIG.styleConfig?.cardShadow,
  };
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
