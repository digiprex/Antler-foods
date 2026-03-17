import type {
  CustomSectionLayout,
  CustomSectionConfig,
  CustomSectionItem,
} from '@/types/custom-section.types';

export type CustomSectionFieldKey =
  | 'contentAlignment'
  | 'verticalAlignment'
  | 'mediaRatio'
  | 'contentWidth'
  | 'contentGap'
  | 'cardSpacing'
  | 'cardColumns'
  | 'stackOnMobile'
  | 'mediaShape'
  | 'buttonStyle'
  | 'hoverEffect'
  | 'transitionStyle'
  | 'autoplay'
  | 'autoplayInterval'
  | 'overlayOpacity';

export type CustomSectionMediaSlot =
  | 'image'
  | 'secondaryImage'
  | 'backgroundImage'
  | 'fallbackImage'
  | 'videoUrl';

export type CustomSectionLayoutFamily =
  | 'hero'
  | 'split'
  | 'stack'
  | 'gallery'
  | 'video'
  | 'cards'
  | 'carousel'
  | 'banner';

export interface CustomSectionLayoutDefinition {
  value: CustomSectionLayout;
  name: string;
  description: string;
  badge: string;
  family: CustomSectionLayoutFamily;
  summary: string;
  supportsItems?: boolean;
  defaultItemCount?: number;
  mediaSlots: CustomSectionMediaSlot[];
  layoutFields: CustomSectionFieldKey[];
  layoutNote?: string;
}

const HERO_FIELDS: CustomSectionFieldKey[] = [
  'contentAlignment',
  'verticalAlignment',
  'mediaRatio',
  'overlayOpacity',
  'buttonStyle',
];

const SPLIT_FIELDS: CustomSectionFieldKey[] = [
  'contentAlignment',
  'verticalAlignment',
  'mediaRatio',
  'contentGap',
  'stackOnMobile',
  'buttonStyle',
];

const GALLERY_FIELDS: CustomSectionFieldKey[] = [
  'contentAlignment',
  'mediaRatio',
  'contentGap',
  'cardSpacing',
  'cardColumns',
  'stackOnMobile',
];

const CARD_FIELDS: CustomSectionFieldKey[] = [
  'contentAlignment',
  'cardSpacing',
  'cardColumns',
  'buttonStyle',
];

const CAROUSEL_FIELDS: CustomSectionFieldKey[] = [
  'mediaRatio',
  'cardSpacing',
  'transitionStyle',
  'autoplay',
  'autoplayInterval',
  'hoverEffect',
];

export const CUSTOM_SECTION_LAYOUT_DEFINITIONS: CustomSectionLayoutDefinition[] = [
  {
    value: 'layout-1',
    name: 'Hero Overlay',
    description: 'Full-width image with overlay text',
    badge: 'Hero',
    family: 'hero',
    summary: 'Best for cinematic announcements with headline-led storytelling.',
    mediaSlots: ['backgroundImage'],
    layoutFields: HERO_FIELDS,
  },
  {
    value: 'layout-2',
    name: 'Split Left Image',
    description: 'Image on left, content on right',
    badge: 'Split',
    family: 'split',
    summary: 'Great for menu launches, chef features, or service explainers.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-3',
    name: 'Video Background',
    description: 'Video background with centered content',
    badge: 'Video',
    family: 'video',
    summary: 'Use motion-driven storytelling with a poster fallback image.',
    mediaSlots: ['videoUrl', 'fallbackImage'],
    layoutFields: HERO_FIELDS,
  },
  {
    value: 'layout-4',
    name: 'Curved Background',
    description: 'Curved accent surface with supporting image',
    badge: 'Feature',
    family: 'split',
    summary: 'Editorial split with a softer premium accent shell.',
    mediaSlots: ['image'],
    layoutFields: [...SPLIT_FIELDS, 'mediaShape'],
  },
  {
    value: 'layout-5',
    name: 'Circular Image',
    description: 'Circular media focus with descriptive copy',
    badge: 'Feature',
    family: 'split',
    summary: 'Ideal for chef portraits, founder messages, or spotlight content.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaShape', 'buttonStyle'],
  },
  {
    value: 'layout-6',
    name: 'Split Right Image',
    description: 'Content on left, image on right',
    badge: 'Split',
    family: 'split',
    summary: 'Reverse split layout for alternating sections down the page.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-7',
    name: 'Spaced Split',
    description: 'Airy split composition with more whitespace',
    badge: 'Split',
    family: 'split',
    summary: 'Designed for calmer layouts with more spacing around the media.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-8',
    name: 'Center with Sides',
    description: 'Centered content with side media panels',
    badge: 'Framed',
    family: 'gallery',
    summary: 'Strong for social proof, press quotes, or centered callouts.',
    mediaSlots: ['image', 'secondaryImage'],
    layoutFields: ['contentAlignment', 'contentGap', 'mediaShape', 'stackOnMobile'],
  },
  {
    value: 'layout-9',
    name: 'Image Top',
    description: 'Large image with bottom content block',
    badge: 'Editorial',
    family: 'stack',
    summary: 'Use a wide hero visual followed by focused explanatory copy.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'contentGap', 'buttonStyle'],
  },
  {
    value: 'layout-10',
    name: 'Content Below',
    description: 'Centered content following top media',
    badge: 'Editorial',
    family: 'stack',
    summary: 'A classic top-image presentation with balanced centered content.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'contentGap', 'buttonStyle'],
  },
  {
    value: 'layout-11',
    name: 'Two Column',
    description: 'Two-column split with image panels',
    badge: 'Gallery',
    family: 'gallery',
    summary: 'Pair two visuals or one visual with a supportive secondary frame.',
    mediaSlots: ['image', 'secondaryImage'],
    layoutFields: ['mediaRatio', 'contentGap', 'stackOnMobile', 'mediaShape'],
  },
  {
    value: 'layout-12',
    name: 'Boxed Content',
    description: 'Boxed content with side image',
    badge: 'Boxed',
    family: 'split',
    summary: 'Useful when you want a clearer content surface inside the section.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-13',
    name: 'Grid Center',
    description: 'Centered copy framed by two media surfaces',
    badge: 'Grid',
    family: 'gallery',
    summary: 'Keeps content central while media anchors the section edge-to-edge.',
    mediaSlots: ['image', 'secondaryImage'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'contentGap', 'stackOnMobile'],
  },
  {
    value: 'layout-14',
    name: 'Stacked Cards',
    description: 'Vertical card stack with repeated highlights',
    badge: 'Cards',
    family: 'cards',
    summary: 'Great for feature lists, process steps, or short promotional blocks.',
    supportsItems: true,
    defaultItemCount: 3,
    mediaSlots: [],
    layoutFields: CARD_FIELDS,
  },
  {
    value: 'layout-15',
    name: 'Asymmetric Split',
    description: 'Uneven split with one dominant media panel',
    badge: 'Split',
    family: 'split',
    summary: 'Adds variety by making the image side feel more dominant.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-16',
    name: 'Featured + Sidebar',
    description: 'Featured image with a supporting content column',
    badge: 'Feature',
    family: 'split',
    summary: 'Useful for destination-style storytelling with a supporting narrative rail.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-17',
    name: 'Magazine Style',
    description: 'Editorial composition with image and copy',
    badge: 'Editorial',
    family: 'split',
    summary: 'Feels closer to a magazine spread with text hierarchy and spacing.',
    mediaSlots: ['image'],
    layoutFields: [...SPLIT_FIELDS, 'buttonStyle'],
  },
  {
    value: 'layout-18',
    name: 'Overlapping Blocks',
    description: 'Layered media and content surfaces',
    badge: 'Layered',
    family: 'split',
    summary: 'Creates depth by partially overlapping the content card with media.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'overlayOpacity', 'buttonStyle'],
  },
  {
    value: 'layout-19',
    name: 'Modern Card',
    description: 'Single contemporary card with focused content',
    badge: 'Card',
    family: 'cards',
    summary: 'Good for concise promotional sections or restaurant updates.',
    mediaSlots: [],
    layoutFields: ['contentAlignment', 'buttonStyle'],
  },
  {
    value: 'layout-20',
    name: 'Accent Background',
    description: 'Split layout with a decorative accent surface',
    badge: 'Accent',
    family: 'split',
    summary: 'Adds brand-colored depth behind a split media presentation.',
    mediaSlots: ['image'],
    layoutFields: [...SPLIT_FIELDS, 'overlayOpacity'],
  },
  {
    value: 'layout-21',
    name: 'Hero Bottom',
    description: 'Hero media with a supporting content block below',
    badge: 'Hero',
    family: 'stack',
    summary: 'A strong launch section with an immersive image followed by details.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'contentGap', 'buttonStyle'],
  },
  {
    value: 'layout-22',
    name: 'Zigzag Pattern',
    description: 'Alternating item rows with image and content',
    badge: 'Story',
    family: 'gallery',
    summary: 'Use repeated content blocks that alternate left/right visual rhythm.',
    supportsItems: true,
    defaultItemCount: 3,
    mediaSlots: [],
    layoutFields: GALLERY_FIELDS,
  },
  {
    value: 'layout-23',
    name: 'Center Panels',
    description: 'Centered content framed by side panels',
    badge: 'Framed',
    family: 'cards',
    summary: 'Keeps the main message in the middle with decorative side framing.',
    mediaSlots: [],
    layoutFields: ['contentAlignment', 'cardSpacing'],
  },
  {
    value: 'layout-24',
    name: 'Full Screen Video',
    description: 'Full-screen video layout',
    badge: 'Video',
    family: 'video',
    summary: 'Maximum-impact section that relies on motion and overlay treatment.',
    mediaSlots: ['videoUrl', 'fallbackImage'],
    layoutFields: HERO_FIELDS,
  },
  {
    value: 'layout-25',
    name: 'Grid Showcase',
    description: 'Multi-item image and content grid showcase',
    badge: 'Showcase',
    family: 'gallery',
    summary: 'Best for dishes, amenities, features, or promotional collections.',
    supportsItems: true,
    defaultItemCount: 4,
    mediaSlots: [],
    layoutFields: GALLERY_FIELDS,
  },
  {
    value: 'layout-26',
    name: 'Minimal Center',
    description: 'Clean centered layout with restrained styling',
    badge: 'Minimal',
    family: 'banner',
    summary: 'Ideal for concise service announcements with minimal visual noise.',
    mediaSlots: [],
    layoutFields: ['contentAlignment', 'buttonStyle'],
  },
  {
    value: 'layout-27',
    name: 'Diagonal Split',
    description: 'Diagonal split between content and media',
    badge: 'Accent',
    family: 'split',
    summary: 'Adds movement with a more stylized diagonal division.',
    mediaSlots: ['image'],
    layoutFields: SPLIT_FIELDS,
  },
  {
    value: 'layout-28',
    name: 'Triple Section',
    description: 'Three balanced content panels',
    badge: 'Columns',
    family: 'cards',
    summary: 'Perfect for service highlights, features, or benefit summaries.',
    supportsItems: true,
    defaultItemCount: 3,
    mediaSlots: [],
    layoutFields: CARD_FIELDS,
  },
  {
    value: 'layout-29',
    name: 'Layered Content',
    description: 'Foreground content layered above media',
    badge: 'Layered',
    family: 'split',
    summary: 'Combines image atmosphere with a more anchored content surface.',
    mediaSlots: ['image'],
    layoutFields: ['contentAlignment', 'mediaRatio', 'overlayOpacity', 'buttonStyle'],
  },
  {
    value: 'layout-30',
    name: 'Full Width Banner',
    description: 'Wide banner layout with strong accent control',
    badge: 'Banner',
    family: 'banner',
    summary: 'Best for direct calls to action or promotional announcements.',
    mediaSlots: ['backgroundImage'],
    layoutFields: ['contentAlignment', 'buttonStyle', 'overlayOpacity'],
  },
  {
    value: 'layout-31',
    name: 'Image Carousel',
    description: 'Sliding image carousel with supportive content',
    badge: 'Carousel',
    family: 'carousel',
    summary: 'Great for rotating highlights, promotions, or menu collections.',
    supportsItems: true,
    defaultItemCount: 4,
    mediaSlots: [],
    layoutFields: CAROUSEL_FIELDS,
  },
  {
    value: 'layout-32',
    name: 'Interactive Hover',
    description: 'Interactive hover-based content reveal',
    badge: 'Interactive',
    family: 'carousel',
    summary: 'A premium card grid that rewards hover with richer detail.',
    supportsItems: true,
    defaultItemCount: 3,
    mediaSlots: [],
    layoutFields: ['mediaRatio', 'cardSpacing', 'hoverEffect', 'contentAlignment', 'cardColumns'],
  },
];

export function getCustomSectionLayoutDefinition(
  layout: CustomSectionLayout,
) {
  return (
    CUSTOM_SECTION_LAYOUT_DEFINITIONS.find((definition) => definition.value === layout) ||
    CUSTOM_SECTION_LAYOUT_DEFINITIONS[0]
  );
}

const SAMPLE_ITEM_COPY: Array<Pick<CustomSectionItem, 'badge' | 'title' | 'description' | 'statLabel' | 'statValue'>> = [
  {
    badge: 'Signature',
    title: 'Seasonal experience',
    description: 'Introduce a premium offering with supporting copy and optional media.',
    statLabel: 'Guests',
    statValue: '120+',
  },
  {
    badge: 'Popular',
    title: 'Flexible promotion block',
    description: 'Use cards for menu launches, private dining, or chef features.',
    statLabel: 'Sections',
    statValue: '32',
  },
  {
    badge: 'Responsive',
    title: 'Desktop and mobile tuned',
    description: 'Control layout structure independently for large and small screens.',
    statLabel: 'Preview',
    statValue: 'Live',
  },
  {
    badge: 'Media-ready',
    title: 'Visual storytelling',
    description: 'Pair curated imagery with clean typography and strong hierarchy.',
    statLabel: 'Style',
    statValue: 'Modern',
  },
];

export function createLayoutItems(
  layout: CustomSectionLayout,
  existingItems?: CustomSectionConfig['items'],
) {
  const definition = getCustomSectionLayoutDefinition(layout);

  if (!definition.supportsItems) {
    return existingItems;
  }

  const desiredCount = definition.defaultItemCount || 3;
  const seededItems = existingItems && existingItems.length > 0 ? [...existingItems] : [];

  while (seededItems.length < desiredCount) {
    const index = seededItems.length;
    const copy = SAMPLE_ITEM_COPY[index % SAMPLE_ITEM_COPY.length];
    seededItems.push({
      id: `${layout}-item-${index + 1}`,
      ...copy,
    });
  }

  return seededItems.slice(0, Math.max(seededItems.length, desiredCount));
}
