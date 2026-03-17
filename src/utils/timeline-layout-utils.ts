/**
 * Timeline Layout Utilities
 *
 * Provides utility functions to access timeline layout configurations from JSON
 */

import timelineLayoutsData from '@/data/timeline-layouts.json';

export type TimelineEditorLayoutValue = 'alternating' | 'left' | 'right' | 'center';

interface TimelineLayoutOption {
  id: TimelineEditorLayoutValue;
  name: string;
  description: string;
  badge?: string;
}

/**
 * Get all timeline layout options
 */
export function getTimelineLayoutOptions(): TimelineLayoutOption[] {
  return timelineLayoutsData.layouts.map(layout => ({
    id: layout.id as TimelineEditorLayoutValue,
    name: layout.name,
    description: layout.description,
    badge: layout.badge,
  }));
}

/**
 * Get a specific timeline layout by ID
 */
export function getTimelineLayoutById(layoutId: TimelineEditorLayoutValue): TimelineLayoutOption | undefined {
  const layout = timelineLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    id: layout.id as TimelineEditorLayoutValue,
    name: layout.name,
    description: layout.description,
    badge: layout.badge,
  };
}

/**
 * Get timeline layout name by ID
 */
export function getTimelineLayoutName(layoutId: TimelineEditorLayoutValue): string {
  const layout = getTimelineLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get timeline layout description by ID
 */
export function getTimelineLayoutDescription(layoutId: TimelineEditorLayoutValue): string {
  const layout = getTimelineLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get timeline layout badge by ID
 */
export function getTimelineLayoutBadge(layoutId: TimelineEditorLayoutValue): string | undefined {
  const layout = getTimelineLayoutById(layoutId);
  return layout?.badge;
}

/**
 * Check if a layout ID is valid
 */
export function isValidTimelineLayout(layoutId: string): layoutId is TimelineEditorLayoutValue {
  return timelineLayoutsData.layouts.some(layout => layout.id === layoutId);
}

/**
 * Get all timeline layout IDs
 */
export function getTimelineLayoutIds(): TimelineEditorLayoutValue[] {
  return timelineLayoutsData.layouts.map(layout => layout.id as TimelineEditorLayoutValue);
}
