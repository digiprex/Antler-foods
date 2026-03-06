import type { HeroConfig } from '@/types/hero.types';

export interface HeroLayoutMediaCapabilities {
  showHeroImage: boolean;
  showBackgroundVideo: boolean;
  showBackgroundImage: boolean;
}

const DEFAULT_CAPABILITIES: HeroLayoutMediaCapabilities = {
  showHeroImage: false,
  showBackgroundVideo: false,
  showBackgroundImage: true,
};

export function getHeroLayoutMediaCapabilities(
  layout: HeroConfig['layout'] | undefined,
): HeroLayoutMediaCapabilities {
  switch (layout) {
    case 'split':
    case 'split-reverse':
    case 'side-by-side':
    case 'offset':
    case 'with-features':
      return {
        showHeroImage: true,
        showBackgroundVideo: false,
        showBackgroundImage: false,
      };

    case 'video-background':
      return {
        showHeroImage: false,
        showBackgroundVideo: true,
        showBackgroundImage: false,
      };

    case 'minimal':
    case 'full-height':
    case 'default':
    case 'centered-large':
      return {
        showHeroImage: false,
        showBackgroundVideo: false,
        showBackgroundImage: true,
      };

    default:
      return DEFAULT_CAPABILITIES;
  }
}
