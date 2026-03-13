/**
 * Hero Layout Utility
 *
 * This utility provides functions to access hero layout configurations
 * from the hero-layouts.json file
 */

import heroLayoutsData from '@/data/hero-layouts.json';
import type { HeroConfig } from '@/types/hero.types';

export interface HeroLayoutMediaCapabilities {
  showHeroImage: boolean;
  showBackgroundVideo: boolean;
  showBackgroundImage: boolean;
}

export interface HeroLayoutConfig {
  id: string;
  name: string;
  description: string;
  mediaCapabilities: HeroLayoutMediaCapabilities;
  features: string[];
  preview: {
    type: string;
    direction?: string;
    justify?: string;
    align?: string;
    columns?: number;
    fullHeight?: boolean;
    elements?: any[];
    sections?: any[];
  };
}

/**
 * Get all available hero layouts
 * @returns Array of all hero layout configurations
 */
export function getAllHeroLayouts(): HeroLayoutConfig[] {
  return heroLayoutsData.layouts as HeroLayoutConfig[];
}

/**
 * Get hero layout configuration by ID
 * @param layoutId - The layout ID from hero-layouts.json (e.g., 'default', 'split', 'video-background')
 * @returns The hero layout configuration or null if not found
 */
export function getHeroLayoutById(layoutId: string): HeroLayoutConfig | null {
  return (heroLayoutsData.layouts.find(layout => layout.id === layoutId) as HeroLayoutConfig) || null;
}

/**
 * Get the default hero layout
 * @returns The default hero layout configuration
 */
export function getDefaultHeroLayout(): HeroLayoutConfig {
  return getHeroLayoutById('default') || (heroLayoutsData.layouts[0] as HeroLayoutConfig);
}

/**
 * Validate if a layout ID exists
 * @param layoutId - The layout ID to validate
 * @returns True if the layout exists, false otherwise
 */
export function isValidHeroLayoutId(layoutId: string): boolean {
  return heroLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Get media capabilities for a specific layout
 * @param layoutId - The layout ID
 * @returns Media capabilities object or null if layout not found
 */
export function getHeroLayoutMediaCapabilities(
  layoutId: string | undefined
): HeroLayoutMediaCapabilities | null {
  if (!layoutId) {
    return null;
  }

  const layout = getHeroLayoutById(layoutId);
  return layout ? layout.mediaCapabilities : null;
}

/**
 * Get all layout IDs
 * @returns Array of all layout IDs
 */
export function getAllHeroLayoutIds(): string[] {
  return heroLayoutsData.layouts.map(layout => layout.id);
}

/**
 * Type guard to check if a string is a valid hero layout ID
 * @param layoutId - The layout ID to check
 * @returns The layout ID as a valid type if valid, otherwise 'default'
 */
export function toValidHeroLayoutId(layoutId: string | undefined): HeroConfig['layout'] {
  const validLayouts = getAllHeroLayoutIds();
  return validLayouts.includes(layoutId || '')
    ? (layoutId as HeroConfig['layout'])
    : 'default';
}

/**
 * Get layouts that support hero images
 * @returns Array of layouts that can display hero images
 */
export function getImageSupportedLayouts(): HeroLayoutConfig[] {
  return getAllHeroLayouts().filter(layout => layout.mediaCapabilities.showHeroImage);
}

/**
 * Get layouts that support background videos
 * @returns Array of layouts that can display background videos
 */
export function getVideoSupportedLayouts(): HeroLayoutConfig[] {
  return getAllHeroLayouts().filter(layout => layout.mediaCapabilities.showBackgroundVideo);
}

/**
 * Get layouts that support background images
 * @returns Array of layouts that can display background images
 */
export function getBackgroundImageSupportedLayouts(): HeroLayoutConfig[] {
  return getAllHeroLayouts().filter(layout => layout.mediaCapabilities.showBackgroundImage);
}

/**
 * Check if a layout supports a specific media type
 * @param layoutId - The layout ID
 * @param mediaType - The media type to check ('image', 'video', 'backgroundImage')
 * @returns True if the layout supports the media type
 */
export function layoutSupportsMediaType(
  layoutId: string,
  mediaType: 'image' | 'video' | 'backgroundImage'
): boolean {
  const layout = getHeroLayoutById(layoutId);
  if (!layout) return false;

  switch (mediaType) {
    case 'image':
      return layout.mediaCapabilities.showHeroImage;
    case 'video':
      return layout.mediaCapabilities.showBackgroundVideo;
    case 'backgroundImage':
      return layout.mediaCapabilities.showBackgroundImage;
    default:
      return false;
  }
}

/**
 * Get layout name by ID
 * @param layoutId - The layout ID
 * @returns The human-readable layout name or the ID if not found
 */
export function getHeroLayoutName(layoutId: string): string {
  const layout = getHeroLayoutById(layoutId);
  return layout ? layout.name : layoutId;
}

/**
 * Get layout description by ID
 * @param layoutId - The layout ID
 * @returns The layout description or empty string if not found
 */
export function getHeroLayoutDescription(layoutId: string): string {
  const layout = getHeroLayoutById(layoutId);
  return layout ? layout.description : '';
}

/**
 * Get layout features by ID
 * @param layoutId - The layout ID
 * @returns Array of feature descriptions or empty array if not found
 */
export function getHeroLayoutFeatures(layoutId: string): string[] {
  const layout = getHeroLayoutById(layoutId);
  return layout ? layout.features : [];
}

/**
 * Search layouts by name or description
 * @param searchTerm - The term to search for
 * @returns Array of matching layouts
 */
export function searchHeroLayouts(searchTerm: string): HeroLayoutConfig[] {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return getAllHeroLayouts().filter(
    layout =>
      layout.name.toLowerCase().includes(lowerSearchTerm) ||
      layout.description.toLowerCase().includes(lowerSearchTerm) ||
      layout.features.some(feature => feature.toLowerCase().includes(lowerSearchTerm))
  );
}

/**
 * Group layouts by media capability
 * @returns Object with layouts grouped by what media they support
 */
export function getLayoutsByMediaCapability() {
  return {
    withHeroImage: getImageSupportedLayouts(),
    withBackgroundVideo: getVideoSupportedLayouts(),
    withBackgroundImage: getBackgroundImageSupportedLayouts(),
  };
}
