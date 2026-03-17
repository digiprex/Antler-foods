/**
 * Location Layout Utilities
 *
 * Provides utility functions to access location layout configurations from JSON
 */

import locationLayoutsData from '@/data/location-layouts.json';
import type { LocationConfig } from '@/types/location.types';

export type LocationLayoutValue = NonNullable<LocationConfig['layout']>;

interface LocationLayoutOption {
  value: LocationLayoutValue;
  name: string;
  description: string;
  icon: string;
}

/**
 * Get all location layout options formatted for form usage
 */
export function getLocationLayoutOptions(): LocationLayoutOption[] {
  return locationLayoutsData.layouts.map(layout => ({
    value: layout.id as LocationLayoutValue,
    name: layout.name,
    description: layout.description,
    icon: layout.icon,
  }));
}

/**
 * Get a specific location layout by ID
 */
export function getLocationLayoutById(layoutId: LocationLayoutValue): LocationLayoutOption | undefined {
  const layout = locationLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as LocationLayoutValue,
    name: layout.name,
    description: layout.description,
    icon: layout.icon,
  };
}

/**
 * Get location layout name by ID
 */
export function getLocationLayoutName(layoutId: LocationLayoutValue): string {
  const layout = getLocationLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get location layout description by ID
 */
export function getLocationLayoutDescription(layoutId: LocationLayoutValue): string {
  const layout = getLocationLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get location layout support text by ID
 */
export function getLocationLayoutSupportText(layoutId: LocationLayoutValue): string {
  const layout = locationLayoutsData.layouts.find(layout => layout.id === layoutId);
  return layout?.supportText || '';
}

/**
 * Get all layout support texts as a record
 */
export function getLocationLayoutSupportTexts(): Record<string, string> {
  const supportTexts: Record<string, string> = {};
  locationLayoutsData.layouts.forEach(layout => {
    supportTexts[layout.id] = layout.supportText;
  });
  return supportTexts;
}

/**
 * Check if a layout ID is valid
 */
export function isValidLocationLayout(layoutId: string): layoutId is LocationLayoutValue {
  return locationLayoutsData.layouts.some(layout => layout.id === layoutId);
}
