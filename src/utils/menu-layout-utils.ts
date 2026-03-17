/**
 * Menu Layout Utilities
 *
 * Provides utility functions to access menu layout configurations from JSON
 */

import menuLayoutsData from '@/data/menu-layouts.json';
import type { MenuLayout } from '@/types/menu.types';

interface MenuLayoutOption {
  value: MenuLayout;
  name: string;
  description: string;
}

/**
 * Get all menu layout options formatted for form usage
 */
export function getMenuLayoutOptions(): MenuLayoutOption[] {
  return menuLayoutsData.layouts.map(layout => ({
    value: layout.id as MenuLayout,
    name: layout.name,
    description: layout.description,
  }));
}

/**
 * Get a specific menu layout by ID
 */
export function getMenuLayoutById(layoutId: MenuLayout): MenuLayoutOption | undefined {
  return menuLayoutsData.layouts.find(layout => layout.id === layoutId) as MenuLayoutOption | undefined;
}

/**
 * Get menu layout name by ID
 */
export function getMenuLayoutName(layoutId: MenuLayout): string {
  const layout = getMenuLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get menu layout description by ID
 */
export function getMenuLayoutDescription(layoutId: MenuLayout): string {
  const layout = getMenuLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Check if a layout ID is valid
 */
export function isValidMenuLayout(layoutId: string): layoutId is MenuLayout {
  return menuLayoutsData.layouts.some(layout => layout.id === layoutId);
}
