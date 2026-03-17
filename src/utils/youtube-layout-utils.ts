/**
 * YouTube Layout Utilities
 *
 * Provides utility functions to access YouTube layout configurations from JSON
 */

import youtubeLayoutsData from '@/data/youtube-layouts.json';
import type { YouTubeConfig } from '@/types/youtube.types';

export type YouTubeLayoutValue = NonNullable<YouTubeConfig['layout']>;

interface YouTubeLayoutOption {
  value: YouTubeLayoutValue;
  name: string;
  description: string;
  support: string;
}

/**
 * Get all YouTube layout options formatted for form usage
 */
export function getYouTubeLayoutOptions(): YouTubeLayoutOption[] {
  return youtubeLayoutsData.layouts.map(layout => ({
    value: layout.id as YouTubeLayoutValue,
    name: layout.name,
    description: layout.description,
    support: layout.support,
  }));
}

/**
 * Get a specific YouTube layout by ID
 */
export function getYouTubeLayoutById(layoutId: YouTubeLayoutValue): YouTubeLayoutOption | undefined {
  const layout = youtubeLayoutsData.layouts.find(layout => layout.id === layoutId);
  if (!layout) return undefined;

  return {
    value: layout.id as YouTubeLayoutValue,
    name: layout.name,
    description: layout.description,
    support: layout.support,
  };
}

/**
 * Get YouTube layout name by ID
 */
export function getYouTubeLayoutName(layoutId: YouTubeLayoutValue): string {
  const layout = getYouTubeLayoutById(layoutId);
  return layout?.name || layoutId;
}

/**
 * Get YouTube layout description by ID
 */
export function getYouTubeLayoutDescription(layoutId: YouTubeLayoutValue): string {
  const layout = getYouTubeLayoutById(layoutId);
  return layout?.description || '';
}

/**
 * Get YouTube layout support text by ID
 */
export function getYouTubeLayoutSupportText(layoutId: YouTubeLayoutValue): string {
  const layout = getYouTubeLayoutById(layoutId);
  return layout?.support || '';
}

/**
 * Check if a layout ID is valid
 */
export function isValidYouTubeLayout(layoutId: string): layoutId is YouTubeLayoutValue {
  return youtubeLayoutsData.layouts.some(layout => layout.id === layoutId);
}
