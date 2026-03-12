import type { GalleryConfig } from '@/types/gallery.types';

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

export const GALLERY_LAYOUT_OPTIONS: GalleryLayoutOption[] = [
  {
    value: 'showcase',
    name: 'Showcase',
    description: 'Center hero with side previews',
  },
  {
    value: 'spotlight',
    name: 'Spotlight',
    description: 'Center-stage layered showcase',
  },
  {
    value: 'mosaic',
    name: 'Mosaic',
    description: 'Editorial collage layout',
  },
  {
    value: 'editorial',
    name: 'Editorial',
    description: 'Hero frame with supporting tiles',
  },
  {
    value: 'filmstrip',
    name: 'Filmstrip',
    description: 'Horizontal reel with depth',
  },
  {
    value: 'grid',
    name: 'Grid',
    description: 'Uniform layout',
  },
  {
    value: 'masonry',
    name: 'Masonry',
    description: 'Pinterest style',
  },
  {
    value: 'carousel',
    name: 'Carousel',
    description: 'Sliding gallery',
  },
];

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
