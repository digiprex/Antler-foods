import {
  CUSTOM_SECTION_SHARED_SPACING_DEFAULTS,
  CUSTOM_SECTION_SPACING_SCALE,
  resolveCustomSectionSpacingTier,
  type CustomSectionSpacingTier,
} from '@/lib/custom-section/spacing';

export type MenuViewport = 'desktop' | 'mobile';
export type MenuSpacingTier = CustomSectionSpacingTier;

type MenuSpacingConfig = {
  sectionPaddingY?: string;
  sectionPaddingX?: string;
  mobileSectionPaddingY?: string;
  mobileSectionPaddingX?: string;
  paddingTop?: string;
  paddingBottom?: string;
  itemSpacing?: string;
  mobileItemSpacing?: string;
  cardGap?: string;
  mobileCardGap?: string;
  gridGap?: string;
  mobileGridGap?: string;
  rowSpacing?: string;
  mobileRowSpacing?: string;
  columnSpacing?: string;
  mobileColumnSpacing?: string;
};

export const MENU_SHARED_SPACING_DEFAULTS = {
  sectionPaddingY: CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingY,
  sectionPaddingX: CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.sectionPaddingX,
  mobileSectionPaddingY:
    CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY,
  mobileSectionPaddingX:
    CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX,
  internalGap: CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.contentGap,
  mobileInternalGap: CUSTOM_SECTION_SHARED_SPACING_DEFAULTS.mobileContentGap,
} as const;

const LEGACY_DESKTOP_SECTION_PADDING_Y = new Set(['4rem']);
const LEGACY_DESKTOP_SECTION_PADDING_X = new Set(['1.5rem']);
const LEGACY_MOBILE_SECTION_PADDING = new Set([
  '1rem',
  '1.25rem',
  '1.5rem',
  '4rem',
  '5rem',
]);
const LEGACY_MENU_DESKTOP_GAP = new Set(['1rem', '1.25rem', '1.4rem', '1.5rem']);
const LEGACY_MENU_MOBILE_GAP = new Set(['0.875rem', '1rem']);

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

function getTierGap(tier: MenuSpacingTier, viewport: MenuViewport) {
  return viewport === 'mobile'
    ? CUSTOM_SECTION_SPACING_SCALE.mobile.internalGap
    : CUSTOM_SECTION_SPACING_SCALE[tier].internalGap;
}

export function applyMenuSharedSpacingDefaults<T extends MenuSpacingConfig>(
  config: T,
): T {
  return {
    ...config,
    sectionPaddingY: resolveCanonicalValue(
      config.sectionPaddingY,
      MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
      LEGACY_DESKTOP_SECTION_PADDING_Y,
    ),
    sectionPaddingX: resolveCanonicalValue(
      config.sectionPaddingX,
      MENU_SHARED_SPACING_DEFAULTS.sectionPaddingX,
      LEGACY_DESKTOP_SECTION_PADDING_X,
    ),
    mobileSectionPaddingY: resolveCanonicalValue(
      config.mobileSectionPaddingY,
      MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY,
      LEGACY_MOBILE_SECTION_PADDING,
    ),
    mobileSectionPaddingX: resolveCanonicalValue(
      config.mobileSectionPaddingX,
      MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX,
      LEGACY_MOBILE_SECTION_PADDING,
    ),
    paddingTop: resolveCanonicalValue(
      config.paddingTop,
      MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
      LEGACY_DESKTOP_SECTION_PADDING_Y,
    ),
    paddingBottom: resolveCanonicalValue(
      config.paddingBottom,
      MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY,
      LEGACY_DESKTOP_SECTION_PADDING_Y,
    ),
    itemSpacing: resolveCanonicalValue(
      config.itemSpacing,
      MENU_SHARED_SPACING_DEFAULTS.internalGap,
      LEGACY_MENU_DESKTOP_GAP,
    ),
    mobileItemSpacing: resolveCanonicalValue(
      config.mobileItemSpacing,
      MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
      LEGACY_MENU_MOBILE_GAP,
    ),
    cardGap: resolveCanonicalValue(
      config.cardGap,
      MENU_SHARED_SPACING_DEFAULTS.internalGap,
      LEGACY_MENU_DESKTOP_GAP,
    ),
    mobileCardGap: resolveCanonicalValue(
      config.mobileCardGap,
      MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
      LEGACY_MENU_MOBILE_GAP,
    ),
    gridGap: resolveCanonicalValue(
      config.gridGap,
      MENU_SHARED_SPACING_DEFAULTS.internalGap,
      LEGACY_MENU_DESKTOP_GAP,
    ),
    mobileGridGap: resolveCanonicalValue(
      config.mobileGridGap,
      MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
      LEGACY_MENU_MOBILE_GAP,
    ),
    rowSpacing: resolveCanonicalValue(
      config.rowSpacing,
      MENU_SHARED_SPACING_DEFAULTS.internalGap,
      LEGACY_MENU_DESKTOP_GAP,
    ),
    mobileRowSpacing: resolveCanonicalValue(
      config.mobileRowSpacing,
      MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
      LEGACY_MENU_MOBILE_GAP,
    ),
    columnSpacing: resolveCanonicalValue(
      config.columnSpacing,
      MENU_SHARED_SPACING_DEFAULTS.internalGap,
      LEGACY_MENU_DESKTOP_GAP,
    ),
    mobileColumnSpacing: resolveCanonicalValue(
      config.mobileColumnSpacing,
      MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
      LEGACY_MENU_MOBILE_GAP,
    ),
  };
}

export function resolveMenuSpacingTier({
  viewport,
  previewMode,
  windowWidth,
}: {
  viewport: MenuViewport;
  previewMode?: MenuViewport;
  windowWidth?: number;
}): MenuSpacingTier {
  return resolveCustomSectionSpacingTier({
    viewport,
    previewMode,
    windowWidth,
  });
}

export function resolveMenuSectionPadding({
  desktopValue,
  mobileValue,
  viewport,
  tier,
  axis,
}: {
  desktopValue: string | undefined;
  mobileValue: string | undefined;
  viewport: MenuViewport;
  tier: MenuSpacingTier;
  axis: 'x' | 'y';
}) {
  const sharedDefault =
    axis === 'x'
      ? MENU_SHARED_SPACING_DEFAULTS.sectionPaddingX
      : MENU_SHARED_SPACING_DEFAULTS.sectionPaddingY;
  const mobileSharedDefault =
    axis === 'x'
      ? MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingX
      : MENU_SHARED_SPACING_DEFAULTS.mobileSectionPaddingY;
  const desktopLegacyValues =
    axis === 'x'
      ? LEGACY_DESKTOP_SECTION_PADDING_X
      : LEGACY_DESKTOP_SECTION_PADDING_Y;
  const tierPadding = CUSTOM_SECTION_SPACING_SCALE[tier].sectionPadding;

  return viewport === 'mobile'
    ? resolveResponsiveValue(
        mobileValue,
        mobileSharedDefault,
        CUSTOM_SECTION_SPACING_SCALE.mobile.sectionPadding,
        LEGACY_MOBILE_SECTION_PADDING,
      )
    : resolveResponsiveValue(
        desktopValue,
        sharedDefault,
        tierPadding,
        desktopLegacyValues,
      );
}

export function resolveMenuInternalGap({
  desktopValue,
  mobileValue,
  viewport,
  tier,
}: {
  desktopValue: string | undefined;
  mobileValue: string | undefined;
  viewport: MenuViewport;
  tier: MenuSpacingTier;
}) {
  return viewport === 'mobile'
    ? resolveResponsiveValue(
        mobileValue,
        MENU_SHARED_SPACING_DEFAULTS.mobileInternalGap,
        CUSTOM_SECTION_SPACING_SCALE.mobile.internalGap,
        LEGACY_MENU_MOBILE_GAP,
      )
    : resolveResponsiveValue(
        desktopValue,
        MENU_SHARED_SPACING_DEFAULTS.internalGap,
        getTierGap(tier, viewport),
        LEGACY_MENU_DESKTOP_GAP,
      );
}

export function spacingValueToPixels(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.endsWith('rem')) {
    return Number.parseFloat(trimmed) * 16;
  }

  if (trimmed.endsWith('px')) {
    return Number.parseFloat(trimmed);
  }

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}
