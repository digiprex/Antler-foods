/**
 * FAQ Layout Utilities
 *
 * Provides utility functions to access FAQ layout configurations from JSON
 */

import faqLayoutsData from '@/data/faq-layouts.json';

export type FaqLayoutValue = 'list' | 'accordion' | 'grid';

interface FaqLayoutOption {
  value: FaqLayoutValue;
  name: string;
  description: string;
}

/**
 * Get all FAQ layout options formatted for form usage
 */
export function getFaqLayoutOptions(): FaqLayoutOption[] {
  return faqLayoutsData.layouts.map(layout => ({
    value: layout.id as FaqLayoutValue,
    name: layout.name,
    description: layout.description,
  }));
}

/**
 * Get a specific FAQ layout by ID
 */
export function getFaqLayoutById(layoutId: FaqLayoutValue): FaqLayoutOption | undefined {
  const layout = faqLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as FaqLayoutValue,
    name: layout.name,
    description: layout.description,
  };
}

/**
 * Get FAQ layout name by ID
 */
export function getFaqLayoutName(layoutId: FaqLayoutValue): string {
  const layout = getFaqLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get FAQ layout description by ID
 */
export function getFaqLayoutDescription(layoutId: FaqLayoutValue): string {
  const layout = getFaqLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Check if a layout ID is valid
 */
export function isValidFaqLayout(layoutId: string): layoutId is FaqLayoutValue {
  return faqLayoutsData.layouts.some(layout => layout.id === layoutId);
}
