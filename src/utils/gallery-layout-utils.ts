/**
 * Gallery Layout Utilities
 *
 * Provides utility functions to access gallery layout configurations from JSON
 */

import galleryLayoutsData from '@/data/gallery-layouts.json';
import type { GalleryLayoutValue } from '@/components/gallery-layouts/gallery-layout-options';

interface GalleryLayoutOption {
  value: GalleryLayoutValue;
  name: string;
  description: string;
}

/**
 * Get all gallery layout options formatted for form usage
 */
export function getGalleryLayoutOptions(): GalleryLayoutOption[] {
  return galleryLayoutsData.layouts.map(layout => ({
    value: layout.id as GalleryLayoutValue,
    name: layout.name,
    description: layout.description,
  }));
}

/**
 * Get a specific gallery layout by ID
 */
export function getGalleryLayoutById(layoutId: GalleryLayoutValue): GalleryLayoutOption | undefined {
  const layout = galleryLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as GalleryLayoutValue,
    name: layout.name,
    description: layout.description,
  };
}

/**
 * Get gallery layout name by ID
 */
export function getGalleryLayoutName(layoutId: GalleryLayoutValue): string {
  const layout = getGalleryLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get gallery layout description by ID
 */
export function getGalleryLayoutDescription(layoutId: GalleryLayoutValue): string {
  const layout = getGalleryLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Check if a layout ID is valid
 */
export function isValidGalleryLayout(layoutId: string): layoutId is GalleryLayoutValue {
  return galleryLayoutsData.layouts.some(layout => layout.id === layoutId);
}
