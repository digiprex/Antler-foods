/**
 * Custom Section Layout Utility
 *
 * This utility provides functions to access custom section layout configurations
 * from the custom-section-layouts.json file
 */

import customSectionLayoutsData from '@/data/custom-section-layouts.json';
import type { CustomSectionConfig } from '@/types/custom-section.types';

export interface CustomSectionMediaSupport {
  image: boolean;
  video: boolean;
  backgroundImage: boolean;
}

export interface CustomSectionLayoutConfig {
  id: string;
  name: string;
  description: string;
  mediaSupport: CustomSectionMediaSupport;
  features: string[];
  preview: {
    type: string;
    imagePosition?: string;
    content?: string;
  };
}

/**
 * Get all available custom section layouts
 * @returns Array of all custom section layout configurations
 */
export function getAllCustomSectionLayouts(): CustomSectionLayoutConfig[] {
  return customSectionLayoutsData.layouts as CustomSectionLayoutConfig[];
}

/**
 * Get custom section layout configuration by ID
 * @param layoutId - The layout ID from custom-section-layouts.json (e.g., 'layout-1', 'layout-2')
 * @returns The custom section layout configuration or null if not found
 */
export function getCustomSectionLayoutById(
  layoutId: string
): CustomSectionLayoutConfig | null {
  return (
    (customSectionLayoutsData.layouts.find(
      (layout) => layout.id === layoutId
    ) as CustomSectionLayoutConfig) || null
  );
}

/**
 * Get the default custom section layout
 * @returns The default custom section layout configuration (layout-1)
 */
export function getDefaultCustomSectionLayout(): CustomSectionLayoutConfig {
  return (
    getCustomSectionLayoutById('layout-1') ||
    (customSectionLayoutsData.layouts[0] as CustomSectionLayoutConfig)
  );
}

/**
 * Validate if a layout ID exists
 * @param layoutId - The layout ID to validate
 * @returns True if the layout exists, false otherwise
 */
export function isValidCustomSectionLayoutId(layoutId: string): boolean {
  return customSectionLayoutsData.layouts.some(
    (layout) => layout.id === layoutId
  );
}

/**
 * Get media support information for a specific layout
 * @param layoutId - The layout ID
 * @returns Media support object or null if layout not found
 */
export function getCustomSectionMediaSupport(
  layoutId: string | undefined
): CustomSectionMediaSupport | null {
  if (!layoutId) {
    return null;
  }

  const layout = getCustomSectionLayoutById(layoutId);
  return layout ? layout.mediaSupport : null;
}

/**
 * Get all layout IDs
 * @returns Array of all layout IDs
 */
export function getAllCustomSectionLayoutIds(): string[] {
  return customSectionLayoutsData.layouts.map((layout) => layout.id);
}

/**
 * Type guard to check if a string is a valid custom section layout ID
 * @param layoutId - The layout ID to check
 * @returns The layout ID as a valid type if valid, otherwise 'layout-1'
 */
export function toValidCustomSectionLayoutId(
  layoutId: string | undefined
): CustomSectionConfig['layout'] {
  const validLayouts = getAllCustomSectionLayoutIds();
  return validLayouts.includes(layoutId || '')
    ? (layoutId as CustomSectionConfig['layout'])
    : 'layout-1';
}

/**
 * Get layouts that support images
 * @returns Array of layouts that can display images
 */
export function getImageSupportedCustomSectionLayouts(): CustomSectionLayoutConfig[] {
  return getAllCustomSectionLayouts().filter(
    (layout) => layout.mediaSupport.image
  );
}

/**
 * Get layouts that support videos
 * @returns Array of layouts that can display videos
 */
export function getVideoSupportedCustomSectionLayouts(): CustomSectionLayoutConfig[] {
  return getAllCustomSectionLayouts().filter(
    (layout) => layout.mediaSupport.video
  );
}

/**
 * Get layouts that support background images
 * @returns Array of layouts that can display background images
 */
export function getBackgroundImageSupportedCustomSectionLayouts(): CustomSectionLayoutConfig[] {
  return getAllCustomSectionLayouts().filter(
    (layout) => layout.mediaSupport.backgroundImage
  );
}

/**
 * Check if a layout supports a specific media type
 * @param layoutId - The layout ID
 * @param mediaType - The media type to check ('image', 'video', 'backgroundImage')
 * @returns True if the layout supports the media type
 */
export function customSectionLayoutSupportsMediaType(
  layoutId: string,
  mediaType: 'image' | 'video' | 'backgroundImage'
): boolean {
  const layout = getCustomSectionLayoutById(layoutId);
  if (!layout) return false;

  switch (mediaType) {
    case 'image':
      return layout.mediaSupport.image;
    case 'video':
      return layout.mediaSupport.video;
    case 'backgroundImage':
      return layout.mediaSupport.backgroundImage;
    default:
      return false;
  }
}

/**
 * Get layout name by ID
 * @param layoutId - The layout ID
 * @returns The human-readable layout name or the ID if not found
 */
export function getCustomSectionLayoutName(layoutId: string): string {
  const layout = getCustomSectionLayoutById(layoutId);
  return layout ? layout.name : layoutId;
}

/**
 * Get layout description by ID
 * @param layoutId - The layout ID
 * @returns The layout description or empty string if not found
 */
export function getCustomSectionLayoutDescription(layoutId: string): string {
  const layout = getCustomSectionLayoutById(layoutId);
  return layout ? layout.description : '';
}

/**
 * Get layout features by ID
 * @param layoutId - The layout ID
 * @returns Array of feature descriptions or empty array if not found
 */
export function getCustomSectionLayoutFeatures(layoutId: string): string[] {
  const layout = getCustomSectionLayoutById(layoutId);
  return layout ? layout.features : [];
}

/**
 * Search layouts by name or description
 * @param searchTerm - The term to search for
 * @returns Array of matching layouts
 */
export function searchCustomSectionLayouts(
  searchTerm: string
): CustomSectionLayoutConfig[] {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return getAllCustomSectionLayouts().filter(
    (layout) =>
      layout.name.toLowerCase().includes(lowerSearchTerm) ||
      layout.description.toLowerCase().includes(lowerSearchTerm) ||
      layout.features.some((feature) =>
        feature.toLowerCase().includes(lowerSearchTerm)
      )
  );
}

/**
 * Group layouts by media capability
 * @returns Object with layouts grouped by what media they support
 */
export function getCustomSectionLayoutsByMediaCapability() {
  return {
    withImage: getImageSupportedCustomSectionLayouts(),
    withVideo: getVideoSupportedCustomSectionLayouts(),
    withBackgroundImage: getBackgroundImageSupportedCustomSectionLayouts(),
  };
}

/**
 * Get layout count
 * @returns Total number of available layouts
 */
export function getCustomSectionLayoutCount(): number {
  return customSectionLayoutsData.layouts.length;
}

/**
 * Get layouts by preview type
 * @param previewType - The preview type (e.g., 'split', 'overlay', 'video-overlay')
 * @returns Array of layouts with matching preview type
 */
export function getCustomSectionLayoutsByPreviewType(
  previewType: string
): CustomSectionLayoutConfig[] {
  return getAllCustomSectionLayouts().filter(
    (layout) => layout.preview.type === previewType
  );
}

/**
 * Get layouts suitable for specific content types
 * @param contentType - The content type ('text-only', 'image-heavy', 'video', 'mixed')
 * @returns Array of recommended layouts
 */
export function getCustomSectionLayoutsByContentType(
  contentType: 'text-only' | 'image-heavy' | 'video' | 'mixed'
): CustomSectionLayoutConfig[] {
  switch (contentType) {
    case 'text-only':
      return getAllCustomSectionLayouts().filter(
        (layout) =>
          !layout.mediaSupport.image &&
          !layout.mediaSupport.video &&
          !layout.mediaSupport.backgroundImage
      );
    case 'image-heavy':
      return getImageSupportedCustomSectionLayouts();
    case 'video':
      return getVideoSupportedCustomSectionLayouts();
    case 'mixed':
      return getAllCustomSectionLayouts().filter(
        (layout) =>
          layout.mediaSupport.image || layout.mediaSupport.backgroundImage
      );
    default:
      return getAllCustomSectionLayouts();
  }
}

/**
 * Convert layout options to format expected by form select components
 * @returns Array of layout options with value, name, and description
 */
export function getCustomSectionLayoutOptions(): Array<{
  value: string;
  name: string;
  description: string;
}> {
  return getAllCustomSectionLayouts().map((layout) => ({
    value: layout.id,
    name: layout.name,
    description: layout.description,
  }));
}
