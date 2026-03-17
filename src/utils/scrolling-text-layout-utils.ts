/**
 * Scrolling Text Layout Utilities
 *
 * Provides utility functions to access scrolling text layout configurations from JSON
 */

import scrollingTextLayoutsData from '@/data/scrolling-text-layouts.json';
import type { ScrollingTextConfig } from '@/types/scrolling-text.types';

export type ScrollingTextLayoutValue = NonNullable<ScrollingTextConfig['layout']>;

interface ScrollingTextLayoutOption {
  id: ScrollingTextLayoutValue;
  name: string;
  description: string;
  badge?: string;
}

/**
 * Get all scrolling text layout options
 */
export function getScrollingTextLayoutOptions(): ScrollingTextLayoutOption[] {
  return scrollingTextLayoutsData.layouts.map(layout => ({
    id: layout.id as ScrollingTextLayoutValue,
    name: layout.name,
    description: layout.description,
    badge: layout.badge,
  }));
}

/**
 * Get a specific scrolling text layout by ID
 */
export function getScrollingTextLayoutById(layoutId: ScrollingTextLayoutValue): ScrollingTextLayoutOption | undefined {
  const layout = scrollingTextLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    id: layout.id as ScrollingTextLayoutValue,
    name: layout.name,
    description: layout.description,
    badge: layout.badge,
  };
}

/**
 * Get scrolling text layout name by ID
 */
export function getScrollingTextLayoutName(layoutId: ScrollingTextLayoutValue): string {
  const layout = getScrollingTextLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get scrolling text layout description by ID
 */
export function getScrollingTextLayoutDescription(layoutId: ScrollingTextLayoutValue): string {
  const layout = getScrollingTextLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get scrolling text layout badge by ID
 */
export function getScrollingTextLayoutBadge(layoutId: ScrollingTextLayoutValue): string | undefined {
  const layout = getScrollingTextLayoutById(layoutId);
  return layout?.badge;
}

/**
 * Check if a layout ID is valid
 */
export function isValidScrollingTextLayout(layoutId: string): layoutId is ScrollingTextLayoutValue {
  return scrollingTextLayoutsData.layouts.some(layout => layout.id === layoutId);
}
