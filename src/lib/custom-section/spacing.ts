import type {
  CustomSectionConfig,
  CustomSectionViewport,
} from '@/types/custom-section.types';

export type CustomSectionSpacingTier = 'desktop' | 'tablet' | 'mobile';

type CustomSectionSpacingScale = {
  sectionPaddingY: string;
  sectionPaddingX: string;
  internalGap: string;
  surfacePadding: string;
  surfacePaddingLarge: string;
  surfacePaddingCompact: string;
  accentShellPadding: string;
  overlapOffset: string;
};

export const CUSTOM_SECTION_SPACING_SCALE: Record<
  CustomSectionSpacingTier,
  CustomSectionSpacingScale
> = {
  desktop: {
    sectionPaddingY: '5rem',
    sectionPaddingX: '5rem',
    internalGap: '5rem',
    surfacePadding: '2rem',
    surfacePaddingLarge: '2.5rem',
    surfacePaddingCompact: '1.75rem',
    accentShellPadding: '1.25rem',
    overlapOffset: '4.5rem',
  },
  tablet: {
    sectionPaddingY: '3rem',
    sectionPaddingX: '3rem',
    internalGap: '3rem',
    surfacePadding: '1.75rem',
    surfacePaddingLarge: '2rem',
    surfacePaddingCompact: '1.5rem',
    accentShellPadding: '1.125rem',
    overlapOffset: '3rem',
  },
  mobile: {
    sectionPaddingY: '2rem',
    sectionPaddingX: '1rem',
    internalGap: '1rem',
    surfacePadding: '1.5rem',
    surfacePaddingLarge: '1.5rem',
    surfacePaddingCompact: '1.25rem',
    accentShellPadding: '1rem',
    overlapOffset: '0',
  },
};

export const CUSTOM_SECTION_SHARED_SPACING_DEFAULTS = {
  sectionPaddingY: CUSTOM_SECTION_SPACING_SCALE.desktop.sectionPaddingY,
  sectionPaddingX: CUSTOM_SECTION_SPACING_SCALE.desktop.sectionPaddingX,
  mobileSectionPaddingY: CUSTOM_SECTION_SPACING_SCALE.mobile.sectionPaddingY,
  mobileSectionPaddingX: CUSTOM_SECTION_SPACING_SCALE.mobile.sectionPaddingX,
  contentGap: CUSTOM_SECTION_SPACING_SCALE.desktop.internalGap,
  mobileContentGap: CUSTOM_SECTION_SPACING_SCALE.mobile.internalGap,
} as const;

const LEGACY_DESKTOP_SECTION_PADDING_Y = new Set(['4rem']);
const LEGACY_DESKTOP_SECTION_PADDING_X = new Set(['1.5rem']);
const LEGACY_MOBILE_SECTION_PADDING = new Set(['1.5rem', '2rem', '4rem', '5rem']);
const LEGACY_DESKTOP_INTERNAL_GAP = new Set(['2rem']);
const LEGACY_MOBILE_INTERNAL_GAP = new Set(['1.25rem', '2rem', '5rem']);

function shouldUseSharedToken(
  value: string | undefined,
  sharedDefault: string,
  legacyValues: Set<string>,
) {
  return !value || value === sharedDefault || legacyValues.has(value);
}

function resolveCanonicalValue(
  value: string | undefined,
  sharedDefault: string,
  legacyValues: Set<string>,
) {
  return shouldUseSharedToken(value, sharedDefault, legacyValues)
    ? sharedDefault
    : value;
}

function resolveResponsiveValue(
  value: string | undefined,
  sharedDefault: string,
  tierValue: string,
  legacyValues: Set<string>,
) {
  return shouldUseSharedToken(value, sharedDefault, legacyValues)
    ? tierValue
    : value || tierValue;
}

export function applyCustomSectionSharedSpacingDefaults(
  config: CustomSectionConfig,
): CustomSectionConfig {
  return {
    ...config,
    sectionPaddingY: resolveCanonicalValue(
      config.sectionPaddingY,
      CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingY,
      LEGACY_DESKTOP_SECTION_PADDING_Y,
    ),
    sectionPaddingX: resolveCanonicalValue(
      config.sectionPaddingX,
      CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingX,
      LEGACY_DESKTOP_SECTION_PADDING_X,
    ),
    mobileSectionPaddingY: resolveCanonicalValue(
      config.mobileSectionPaddingY,
      CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY,
      LEGACY_MOBILE_SECTION_PADDING,
    ),
    mobileSectionPaddingX: resolveCanonicalValue(
      config.mobileSectionPaddingX,
      CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX,
      LEGACY_MOBILE_SECTION_PADDING,
    ),
    layoutSettings: {
      ...(config.layoutSettings || {}),
      contentGap: resolveCanonicalValue(
        config.layoutSettings?.contentGap,
        CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.contentGap,
        LEGACY_DESKTOP_INTERNAL_GAP,
      ),
    },
    responsive: {
      ...(config.responsive || {}),
      mobileContentGap: resolveCanonicalValue(
        config.responsive?.mobileContentGap,
        CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileContentGap,
        LEGACY_MOBILE_INTERNAL_GAP,
      ),
    },
  };
}

export function resolveCustomSectionSpacingTier({
  viewport,
  previewMode,
  windowWidth,
}: {
  viewport: CustomSectionViewport;
  previewMode?: CustomSectionViewport;
  windowWidth?: number;
}): CustomSectionSpacingTier {
  if (previewMode) {
    return previewMode;
  }

  if (viewport === 'mobile') {
    return 'mobile';
  }

  if (typeof windowWidth === 'number' && windowWidth < 1024) {
    return 'tablet';
  }

  return 'desktop';
}

export function resolveCustomSectionSpacing({
  config,
  viewport,
  tier,
}: {
  config: CustomSectionConfig;
  viewport: CustomSectionViewport;
  tier: CustomSectionSpacingTier;
}) {
  const scale = CUSTOM_SECTION_SPACING_SCALE[tier];

  return {
    sectionPaddingY:
      viewport === 'mobile'
        ? resolveResponsiveValue(
            config.mobileSectionPaddingY,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY,
            CUSTOM_SECTION_SPACING_SCALE.mobile.sectionPaddingY,
            LEGACY_MOBILE_SECTION_PADDING,
          )
        : resolveResponsiveValue(
            config.sectionPaddingY,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingY,
            scale.sectionPaddingY,
            LEGACY_DESKTOP_SECTION_PADDING_Y,
          ),
    sectionPaddingX:
      viewport === 'mobile'
        ? resolveResponsiveValue(
            config.mobileSectionPaddingX,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX,
            CUSTOM_SECTION_SPACING_SCALE.mobile.sectionPaddingX,
            LEGACY_MOBILE_SECTION_PADDING,
          )
        : resolveResponsiveValue(
            config.sectionPaddingX,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingX,
            scale.sectionPaddingX,
            LEGACY_DESKTOP_SECTION_PADDING_X,
          ),
    internalGap:
      viewport === 'mobile'
        ? resolveResponsiveValue(
            config.responsive?.mobileContentGap,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileContentGap,
            CUSTOM_SECTION_SPACING_SCALE.mobile.internalGap,
            LEGACY_MOBILE_INTERNAL_GAP,
          )
        : resolveResponsiveValue(
            config.layoutSettings?.contentGap,
            CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.contentGap,
            scale.internalGap,
            LEGACY_DESKTOP_INTERNAL_GAP,
          ),
    surfacePadding: scale.surfacePadding,
    surfacePaddingLarge: scale.surfacePaddingLarge,
    surfacePaddingCompact: scale.surfacePaddingCompact,
    accentShellPadding: scale.accentShellPadding,
    overlapOffset: scale.overlapOffset,
  };
}

export function getCustomSectionGapPlaceholder(
  viewport: CustomSectionViewport,
) {
  return viewport === 'mobile'
    ? CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileContentGap
    : CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.contentGap;
}
