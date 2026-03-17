/**
 * Form Layout Utilities
 *
 * Provides utility functions to access form layout configurations from JSON
 */

import formLayoutsData from '@/data/form-layouts.json';

export type FormLayoutValue = 'centered' | 'split-right' | 'split-left' | 'image-top' | 'background-image';

interface FormLayoutOption {
  value: FormLayoutValue;
  title: string;
  description: string;
  badge?: string;
}

/**
 * Get all form layout options formatted for form usage
 */
export function getFormLayoutOptions(): FormLayoutOption[] {
  return formLayoutsData.layouts.map(layout => ({
    value: layout.id as FormLayoutValue,
    title: layout.name,
    description: layout.description,
    badge: layout.id === 'centered' ? 'Recommended' : undefined,
  }));
}

/**
 * Get a specific form layout by ID
 */
export function getFormLayoutById(layoutId: FormLayoutValue): FormLayoutOption | undefined {
  const layout = formLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as FormLayoutValue,
    title: layout.name,
    description: layout.description,
    badge: layout.id === 'centered' ? 'Recommended' : undefined,
  };
}

/**
 * Get form layout name by ID
 */
export function getFormLayoutName(layoutId: FormLayoutValue): string {
  const layout = getFormLayoutById(layoutId);
  return layout?.title || layoutId;
}

/**
 * Get form layout description by ID
 */
export function getFormLayoutDescription(layoutId: FormLayoutValue): string {
  const layout = getFormLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Check if a layout supports images
 */
export function formLayoutSupportsImage(layoutId: string): boolean {
  return ['split-right', 'split-left', 'image-top', 'background-image'].includes(layoutId);
}

/**
 * Check if a layout ID is valid
 */
export function isValidFormLayout(layoutId: string): layoutId is FormLayoutValue {
  return formLayoutsData.layouts.some(layout => layout.id === layoutId);
}
