import type { HeroButton, HeroConfig } from '@/types/hero.types';
import { DEFAULT_HERO_CONFIG } from '@/types/hero.types';

function mergeButtonConfig(
  fallback: HeroButton | undefined,
  value: HeroButton | null | undefined,
): HeroButton | undefined {
  if (value === null) {
    return undefined;
  }

  if (!value) {
    return fallback ? { ...fallback } : undefined;
  }

  return fallback ? { ...fallback, ...value } : { ...value };
}

function resolveButtonEnabled(
  explicitValue: boolean | undefined,
  buttonValue: HeroButton | null | undefined,
  fallback = true,
): boolean {
  if (typeof explicitValue === 'boolean') {
    return explicitValue;
  }

  if (buttonValue === null) {
    return false;
  }

  if (buttonValue !== undefined) {
    return true;
  }

  return fallback;
}

function normalizeSecondaryHeroButton(
  button: HeroButton | undefined,
): HeroButton | undefined {
  if (!button) {
    return button;
  }

  // Legacy hero configs stored the second CTA as `outline`, but the hero editor
  // does not expose variant controls. Promote it to the dedicated secondary slot
  // so global secondary button styles apply consistently on live sites.
  if (button.variant === 'outline') {
    return {
      ...button,
      variant: 'secondary',
    };
  }

  return button;
}

export function mergeHeroConfig(
  sourceConfig?: Partial<HeroConfig> | null,
): HeroConfig {
  const source = sourceConfig || {};

  const primaryButton = mergeButtonConfig(
    DEFAULT_HERO_CONFIG.primaryButton,
    source.primaryButton as HeroButton | null | undefined,
  );
  const secondaryButton = mergeButtonConfig(
    DEFAULT_HERO_CONFIG.secondaryButton,
    source.secondaryButton as HeroButton | null | undefined,
  );

  return {
    ...DEFAULT_HERO_CONFIG,
    ...source,
    primaryButton,
    secondaryButton: normalizeSecondaryHeroButton(secondaryButton),
    primaryButtonEnabled: resolveButtonEnabled(
      source.primaryButtonEnabled,
      source.primaryButton as HeroButton | null | undefined,
      DEFAULT_HERO_CONFIG.primaryButtonEnabled ?? true,
    ),
    secondaryButtonEnabled: resolveButtonEnabled(
      source.secondaryButtonEnabled,
      source.secondaryButton as HeroButton | null | undefined,
      DEFAULT_HERO_CONFIG.secondaryButtonEnabled ?? true,
    ),
    contentAnimation:
      source.contentAnimation ?? DEFAULT_HERO_CONFIG.contentAnimation ?? 'none',
    defaultContentPanelEnabled:
      source.defaultContentPanelEnabled ??
      DEFAULT_HERO_CONFIG.defaultContentPanelEnabled ??
      false,
    defaultContentPanelBackgroundColor:
      source.defaultContentPanelBackgroundColor ??
      DEFAULT_HERO_CONFIG.defaultContentPanelBackgroundColor ??
      '#ffffff',
    defaultContentPanelMaxWidth:
      source.defaultContentPanelMaxWidth ??
      DEFAULT_HERO_CONFIG.defaultContentPanelMaxWidth ??
      '860px',
  };
}

export function getRenderableHeroButtons(
  sourceConfig?: Partial<HeroConfig> | null,
) {
  const resolvedConfig = mergeHeroConfig(sourceConfig);

  return {
    primaryButton:
      resolvedConfig.primaryButtonEnabled === false
        ? undefined
        : resolvedConfig.primaryButton,
    secondaryButton:
      resolvedConfig.secondaryButtonEnabled === false
        ? undefined
        : resolvedConfig.secondaryButton,
  };
}
