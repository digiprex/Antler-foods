/**
 * Hero Layout Media Capabilities
 *
 * This module provides functionality to determine what media types
 * a hero layout supports based on the dynamic layout configuration
 * loaded from hero-layouts.json
 */

import type { HeroConfig } from '@/types/hero.types';
import {
  getHeroLayoutMediaCapabilities as getCapabilitiesFromJson,
  type HeroLayoutMediaCapabilities
} from '@/utils/hero-layout-utils';

export type { HeroLayoutMediaCapabilities };

const DEFAULT_CAPABILITIES: HeroLayoutMediaCapabilities = {
  showHeroImage: false,
  showBackgroundVideo: false,
  showBackgroundImage: true,
};

/**
 * Get media capabilities for a hero layout
 * Now dynamically loads from hero-layouts.json instead of hardcoded switch statement
 * @param layout - The hero layout ID
 * @returns Media capabilities object indicating what media types the layout supports
 */
export function getHeroLayoutMediaCapabilities(
  layout: HeroConfig['layout'] | undefined,
): HeroLayoutMediaCapabilities {
  // Use the utility function to get capabilities from JSON
  const capabilities = getCapabilitiesFromJson(layout);

  // Return capabilities from JSON or fallback to default
  return capabilities || DEFAULT_CAPABILITIES;
}
