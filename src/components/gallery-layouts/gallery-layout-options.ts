import type { GalleryConfig } from '@/types/gallery.types';
import { getGalleryLayoutOptions } from '@/utils/gallery-layout-utils';

export type GalleryLayoutValue =
  | 'showcase'
  | 'spotlight'
  | 'mosaic'
  | 'editorial'
  | 'filmstrip'
  | 'grid'
  | 'masonry'
  | 'carousel';

export interface GalleryLayoutOption {
  value: GalleryLayoutValue;
  name: string;
  description: string;
}

// Get gallery layout options from JSON
export const GALLERY_LAYOUT_OPTIONS = getGalleryLayoutOptions();

export function normalizeGalleryLayout(
  layout?: GalleryConfig['layout'],
): GalleryLayoutValue {
  if (!layout) {
    return 'grid';
  }

  if (layout === 'slider') {
    return 'carousel';
  }

  if (
    layout === 'showcase' ||
    layout === 'spotlight' ||
    layout === 'mosaic' ||
    layout === 'editorial' ||
    layout === 'filmstrip' ||
    layout === 'grid' ||
    layout === 'masonry' ||
    layout === 'carousel'
  ) {
    return layout;
  }

  return 'grid';
}
