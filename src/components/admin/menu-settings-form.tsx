/**
 * Menu Settings Form
 *
 * Enhanced interface for configuring menu section settings:
 * - Layout selection (10 different layouts)
 * - Content configuration (title, subtitle, description)
 * - Menu categories and items management
 * - Button configuration (CTA)
 * - Media settings (images, background)
 * - Styling options (colors, spacing, alignment)
 * - Display options (prices, images, descriptions)
 */

'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import { useMenuConfig, useUpdateMenuConfig } from '@/hooks/use-menu-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type {
  MenuConfig,
  MenuButton,
  MenuCategory,
  MenuItem,
} from '@/types/menu.types';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import Menu from '@/components/menu';
import { applyMenuSharedSpacingDefaults } from '@/lib/menu-spacing';
import { getMenuLayoutOptions } from '@/utils/menu-layout-utils';
import {
  CategoryDrivenLayoutEditor,
  type CategoryEditorCopy,
} from '@/components/admin/menu-settings/category-editor';
type MenuMediaField =
  | { type: 'header_image' }
  | { type: 'background_image' }
  | { type: 'item_image'; categoryIndex: number; itemIndex: number }
  | { type: 'layout_item_image'; itemIndex: number };

interface MenuSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

type MenuLayoutValue = NonNullable<MenuConfig['layout']>;
type PreviewSurface = 'card' | 'modal';
type PreviewViewport = 'desktop' | 'mobile';

// Get menu layout options from JSON
const MENU_LAYOUT_OPTIONS = getMenuLayoutOptions();

const IMAGE_FOCUSED_MENU_LAYOUTS = new Set<MenuLayoutValue>([
  'grid',
  'masonry',
  'carousel',
  'two-column',
  'single-column',
]);

const CATEGORY_DRIVEN_LAYOUTS = new Set<MenuLayoutValue>(['tabs', 'accordion']);

const FEATURE_PRIORITY_LAYOUTS = new Set<MenuLayoutValue>([
  'carousel',
  'featured-grid',
  'minimal',
]);
type DirectLayoutValue = Exclude<MenuLayoutValue, 'tabs' | 'accordion'>;

const DIRECT_LAYOUT_EDITOR_CONFIG: Record<
  DirectLayoutValue,
  {
    title: string;
    description: string;
    slotCount: number;
    usesImages: boolean;
    imageOptional?: boolean;
    usesImageLinks?: boolean;
    usesButtons?: boolean;
  }
> = {
  grid: {
    title: 'Layout Cards',
    description:
      'Add two cards with overlay text on top of images. Each card can have image links and buttons.',
    slotCount: 2,
    usesImages: true,
    usesImageLinks: true,
    usesButtons: true,
  },
  list: {
    title: 'Promo Cards',
    description:
      'Add bold promotional cards with centered text and buttons. Images are optional.',
    slotCount: 2,
    usesImages: false,
    usesButtons: true,
  },
  masonry: {
    title: 'Masonry Cards',
    description:
      'Add cards with image on top and details below. Staggered heights create visual interest.',
    slotCount: 2,
    usesImages: true,
    usesImageLinks: true,
    usesButtons: true,
  },
  carousel: {
    title: 'Carousel Slides',
    description:
      'Add scrollable slides with images and overlay text. Perfect for showcasing multiple offerings.',
    slotCount: 4,
    usesImages: true,
    usesImageLinks: true,
    usesButtons: true,
  },
  'two-column': {
    title: 'Two Column Cards',
    description:
      'Add two cards with image on top and details below, displayed side-by-side.',
    slotCount: 2,
    usesImages: true,
    usesImageLinks: true,
    usesButtons: true,
  },
  'single-column': {
    title: 'Centered Showcase Cards',
    description:
      'Add cards with image on top and details below, stacked vertically in center.',
    slotCount: 2,
    usesImages: true,
    usesImageLinks: true,
    usesButtons: true,
  },
  'featured-grid': {
    title: 'Feature Highlights',
    description:
      'Add icon-based feature cards displayed in a grid. Images optional.',
    slotCount: 2,
    usesImages: true,
    imageOptional: true,
    usesImageLinks: true,
    usesButtons: false,
  },
  minimal: {
    title: 'Minimal Highlights',
    description:
      'Add text-focused highlights with optional icons. Clean and simple.',
    slotCount: 2,
    usesImages: true,
    imageOptional: true,
    usesImageLinks: true,
    usesButtons: false,
  },
};

const LAYOUT_PRIMARY_CONTENT: Record<
  MenuLayoutValue,
  {
    title: string;
    summary: string;
    primarySource: string;
    supportingSource: string;
    checklist: string[];
  }
> = {
  grid: {
    title: 'Two image cards with overlay copy',
    summary:
      'Best for showing two strong visual menu promos with text directly on top of each image.',
    primarySource:
      'Each card uses its own image, text, image URL, and button URL.',
    supportingSource:
      'Section heading content stays separate from the two card slots.',
    checklist: [
      'Upload one image for each card slot.',
      'Keep the card copy short so it stays readable over the image.',
      'Use the image link when the whole image should open a separate page.',
    ],
  },
  list: {
    title: 'Bold promotional list',
    summary: 'Best for simple menu callouts and quick CTA-driven highlights.',
    primarySource:
      'Each promo card uses a title, short description, and button action.',
    supportingSource:
      'Images are optional for this layout and are not the main focus.',
    checklist: [
      'Write punchy item titles.',
      'Keep descriptions concise and benefit-driven.',
      'Set a CTA label if you want buttons inside the cards.',
    ],
  },
  masonry: {
    title: 'Editorial image tiles',
    summary:
      'Best for a more visual, premium presentation with varied card heights.',
    primarySource:
      'Each masonry tile uses its own image, text, and optional image URL.',
    supportingSource:
      'Buttons remain card-specific instead of using category content.',
    checklist: [
      'Use strong landscape or portrait food photos.',
      'Keep copy short because text sits over media.',
      'Featured dishes work especially well here.',
    ],
  },
  carousel: {
    title: 'Featured slider',
    summary:
      'Best for spotlighting bestselling or featured items in a horizontal showcase.',
    primarySource: 'Each slide uses its own image, text, and action content.',
    supportingSource: 'Slides appear in the same order you fill them in below.',
    checklist: [
      'Mark key items as Featured below.',
      'Upload item images for the strongest result.',
      'Use short item descriptions for clean overlays.',
    ],
  },
  tabs: {
    title: 'Category tabs with intro panel',
    summary:
      'Best when you want guests to explore menu groups one category at a time.',
    primarySource: 'Category names and descriptions power the tab selectors.',
    supportingSource:
      'Items from the active category appear in the content panel.',
    checklist: [
      'Add clear category titles.',
      'Give each category a short description.',
      'Upload item images to make the active tab panel richer.',
    ],
  },
  accordion: {
    title: 'Expandable category groups',
    summary:
      'Best for longer menus where guests need compact scanning before opening details.',
    primarySource: 'Categories create the accordion rows.',
    supportingSource:
      'Items inside each category appear when that row is expanded.',
    checklist: [
      'Use categories to break up long menus.',
      'Keep category descriptions informative but short.',
      'Item images are optional but useful for expanded rows.',
    ],
  },
  'two-column': {
    title: 'Balanced two-column cards',
    summary: 'Best for paired menu highlights and cleaner desktop symmetry.',
    primarySource: 'Each column is driven by its own card image and content.',
    supportingSource:
      'Separate image URLs let each card open a different destination.',
    checklist: [
      'Use high-quality item images.',
      'Keep pricing and descriptions consistent across cards.',
      'Works best with even item counts.',
    ],
  },
  'single-column': {
    title: 'Centered showcase cards',
    summary:
      'Best for a focused presentation with fewer, more intentional highlights.',
    primarySource:
      'Each centered card uses its own image, title, description, and CTA.',
    supportingSource:
      'Section media is optional here and acts only as a fallback.',
    checklist: [
      'Use 1-4 strong highlight items.',
      'Add images to avoid plain fallback blocks.',
      'Keep descriptions readable and concise.',
    ],
  },
  'featured-grid': {
    title: 'Feature summary cards',
    summary:
      'Best for concise item highlights with icons or small image thumbnails.',
    primarySource:
      'Each highlight card uses its own title and supporting copy.',
    supportingSource:
      'Small images are optional and can link to separate destinations.',
    checklist: [
      'Mark top items as Featured.',
      'Use category icons or item images for visual anchors.',
      'Keep copy short and benefit-focused.',
    ],
  },
  minimal: {
    title: 'Minimal icon-led highlights',
    summary: 'Best for short, curated menu callouts with clean typography.',
    primarySource:
      'Each minimal block uses direct layout content instead of categories.',
    supportingSource:
      'Small thumbnails are optional for stronger visual anchors.',
    checklist: [
      'Use short item names.',
      'Keep only a few highlight items.',
      'Add category icons if you want stronger visual markers.',
    ],
  },
};

const svgToDataUri = (svg: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const MENU_PREVIEW_INTERIOR = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' fill='none'>
  <rect width='1600' height='900' fill='#efe6da'/>
  <rect x='0' y='150' width='1600' height='750' fill='#8f5a2f'/>
  <rect x='50' y='70' width='640' height='520' rx='24' fill='#2f3c2d'/>
  <rect x='82' y='102' width='576' height='456' rx='18' fill='#d9e6d2'/>
  <path d='M132 436C238 358 324 324 424 336C510 346 574 402 640 512V560H132V436Z' fill='#ae843f'/>
  <path d='M170 372C280 304 372 278 466 292C540 304 594 350 638 428V560H170V372Z' fill='#d98f2f'/>
  <path d='M196 316C256 264 344 246 430 250C500 254 564 286 624 344V560H196V316Z' fill='#5f8c4f'/>
  <circle cx='250' cy='212' r='48' fill='#f7c955'/>
  <rect x='740' y='90' width='760' height='690' rx='18' fill='#6f4324'/>
  <rect x='792' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='868' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='944' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='1020' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='1096' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='1172' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='1248' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <rect x='1324' y='110' width='26' height='640' rx='10' fill='#a77746'/>
  <circle cx='1140' cy='372' r='168' fill='#ffffff' fill-opacity='0.18'/>
</svg>
`);

const MENU_PREVIEW_STOREFRONT = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' fill='none'>
  <defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#1d2745'/>
      <stop offset='55%' stop-color='#3b5b8f'/>
      <stop offset='100%' stop-color='#111827'/>
    </linearGradient>
    <linearGradient id='building' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#deb27a'/>
      <stop offset='100%' stop-color='#ad6f34'/>
    </linearGradient>
  </defs>
  <rect width='1600' height='900' fill='url(#sky)'/>
  <rect y='618' width='1600' height='282' fill='#0b1220'/>
  <rect x='170' y='110' width='1260' height='540' rx='28' fill='url(#building)'/>
  <rect x='170' y='148' width='1260' height='92' fill='#f4ddbf' fill-opacity='0.72'/>
  <rect x='246' y='250' width='1108' height='310' rx='22' fill='#ecd8c0'/>
  <rect x='252' y='252' width='1096' height='86' rx='18' fill='#20355f'/>
  <path d='M324 336H1276L1220 404H378L324 336Z' fill='#183166'/>
  <rect x='392' y='404' width='174' height='138' rx='14' fill='#f8d39a'/>
  <rect x='610' y='404' width='174' height='138' rx='14' fill='#f8d39a'/>
  <rect x='828' y='404' width='174' height='138' rx='14' fill='#f8d39a'/>
  <rect x='1046' y='404' width='174' height='138' rx='14' fill='#f8d39a'/>
  <rect x='1110' y='352' width='112' height='236' rx='14' fill='#1b1b24'/>
  <rect x='1132' y='380' width='68' height='178' rx='8' fill='#111827'/>
  <rect x='430' y='438' width='94' height='72' rx='10' fill='#fff5dc'/>
  <rect x='648' y='438' width='94' height='72' rx='10' fill='#fff5dc'/>
  <rect x='866' y='438' width='94' height='72' rx='10' fill='#fff5dc'/>
  <rect x='1084' y='438' width='94' height='72' rx='10' fill='#fff5dc'/>
  <rect x='290' y='174' width='840' height='36' rx='18' fill='#0f172a' fill-opacity='0.44'/>
  <rect x='344' y='182' width='414' height='18' rx='9' fill='#f8fafc' fill-opacity='0.72'/>
</svg>
`);

const MENU_PREVIEW_INGREDIENTS = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900' fill='none'>
  <rect width='1200' height='900' fill='#f2ede4'/>
  <rect x='64' y='82' width='514' height='514' rx='30' fill='#5f4530'/>
  <rect x='104' y='122' width='434' height='434' rx='24' fill='#0f172a'/>
  <circle cx='320' cy='344' r='128' fill='#fff8ee'/>
  <circle cx='320' cy='344' r='96' fill='#ece7df'/>
  <circle cx='154' cy='214' r='40' fill='#ef4444'/>
  <circle cx='172' cy='486' r='44' fill='#eab308'/>
  <circle cx='482' cy='180' r='34' fill='#ef4444'/>
  <circle cx='492' cy='486' r='34' fill='#f59e0b'/>
  <ellipse cx='430' cy='292' rx='56' ry='28' fill='#f8fafc'/>
  <ellipse cx='438' cy='408' rx='62' ry='30' fill='#84cc16'/>
  <rect x='630' y='136' width='466' height='274' rx='26' fill='#d8c1a7'/>
  <rect x='664' y='170' width='398' height='206' rx='18' fill='#f7f2ea'/>
  <rect x='648' y='490' width='420' height='250' rx='26' fill='#efe7da'/>
  <rect x='690' y='528' width='98' height='164' rx='18' fill='#f1d6a9'/>
  <rect x='812' y='528' width='98' height='164' rx='18' fill='#ddc2ab'/>
  <rect x='934' y='528' width='98' height='164' rx='18' fill='#d8e0d2'/>
</svg>
`);

const MENU_PREVIEW_DARK_PATTERN = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900' fill='none'>
  <rect width='1200' height='900' fill='#06070a'/>
  <g stroke='#f8fafc' stroke-opacity='0.24' stroke-width='10'>
    <circle cx='120' cy='120' r='74'/>
    <circle cx='332' cy='132' r='54'/>
    <circle cx='582' cy='238' r='94'/>
    <circle cx='1026' cy='146' r='78'/>
    <circle cx='200' cy='488' r='90'/>
    <circle cx='578' cy='612' r='116'/>
    <circle cx='946' cy='548' r='132'/>
    <path d='M44 252C132 214 222 220 316 266C406 312 490 386 600 396'/>
    <path d='M770 276C880 222 1000 228 1148 324'/>
    <path d='M44 700C164 598 302 566 464 604C604 636 708 740 864 744'/>
  </g>
</svg>
`);

const MENU_PREVIEW_COPY = {
  sectionTitle: 'Best menu selections in town',
  sectionSubtitle: 'Fresh dishes and seasonal favorites',
  sectionDescription:
    'Explore our bestselling plates, signature dishes, and quick ordering options.',
  itemOne: 'Menu 1',
  itemTwo: 'Menu 2',
  itemThree: 'Menu 3',
  itemFour: 'Menu 4',
  itemDescription: 'This is a description',
  ctaLabel: 'Menu',
};

interface MenuPreviewMeta {
  sectionTitle: string;
  sectionSubtitle: string;
  sectionDescription: string;
  ctaLabel: string;
}

const getMenuPreviewMeta = (config?: MenuConfig): MenuPreviewMeta => ({
  sectionTitle: config?.title?.trim() || MENU_PREVIEW_COPY.sectionTitle,
  sectionSubtitle:
    config?.subtitle?.trim() || MENU_PREVIEW_COPY.sectionSubtitle,
  sectionDescription:
    config?.description?.trim() || MENU_PREVIEW_COPY.sectionDescription,
  ctaLabel: config?.ctaButton?.label?.trim() || MENU_PREVIEW_COPY.ctaLabel,
});

const getMenuItemKey = (item: MenuItem) =>
  item.id ? `id:${item.id}` : `name:${item.name}`;

function hydrateFeaturedItems(config: MenuConfig): MenuConfig {
  const featuredKeys = new Set(
    (config.featuredItems || []).map(getMenuItemKey),
  );
  const categories = (config.categories || []).map((category) => ({
    ...category,
    items: (category.items || []).map((item) => ({
      ...item,
      featured: item.featured || featuredKeys.has(getMenuItemKey(item)),
    })),
  }));

  const derivedFeaturedItems = categories.flatMap((category) =>
    (category.items || [])
      .filter((item) => item.featured)
      .map((item) => ({
        ...item,
        category: category.name,
      })),
  );

  return {
    ...config,
    categories,
    featuredItems: derivedFeaturedItems,
  };
}

function isDirectMenuLayout(
  layout: MenuLayoutValue,
): layout is DirectLayoutValue {
  return !CATEGORY_DRIVEN_LAYOUTS.has(layout);
}

function createEmptyLayoutItem(index: number): MenuItem {
  return {
    name: '',
    description: '',
    price: '',
    ctaLabel: '',
    ctaLink: '',
    image: '',
    imageLink: '',
    category: `Slot ${index + 1}`,
  };
}

function ensureLayoutItems(config: MenuConfig): MenuConfig {
  const layout = (config.layout || 'grid') as MenuLayoutValue;

  if (!isDirectMenuLayout(layout)) {
    return config;
  }

  const slotCount = DIRECT_LAYOUT_EDITOR_CONFIG[layout].slotCount;
  const layoutItems = [...(config.layoutItems || [])];

  while (layoutItems.length < slotCount) {
    layoutItems.push(createEmptyLayoutItem(layoutItems.length));
  }

  return {
    ...config,
    layoutItems,
  };
}

function normalizeMenuConfig(config: MenuConfig): MenuConfig {
  return ensureLayoutItems(
    hydrateFeaturedItems(applyMenuSharedSpacingDefaults(config)),
  );
}

const getMenuItemCount = (categories?: MenuCategory[]) =>
  (categories || []).reduce(
    (total, category) => total + (category.items || []).length,
    0,
  );

const getMenuImageCount = (categories?: MenuCategory[]) =>
  (categories || []).reduce(
    (total, category) =>
      total +
      (category.items || []).filter((item) => Boolean(item.image)).length,
    0,
  );

function getGalleryModalCopy(field: MenuMediaField | null) {
  if (!field) {
    return {
      title: 'Select Image',
      description: 'Choose an image from your media library or upload new',
    };
  }

  switch (field.type) {
    case 'header_image':
      return {
        title: 'Select Header Image',
        description:
          'Choose a section-level image used as a visual fallback and intro accent.',
      };
    case 'background_image':
      return {
        title: 'Select Background Image',
        description:
          'Choose a background image for ambience and section fallback styling.',
      };
    case 'item_image':
      return {
        title: 'Select Item Image',
        description:
          'Choose the image that will appear on the selected menu item card.',
      };
    case 'layout_item_image':
      return {
        title: 'Select Layout Image',
        description: 'Choose the image used by this layout card or slide.',
      };
    default:
      return {
        title: 'Select Image',
        description: 'Choose an image from your media library or upload new',
      };
  }
}

function MenuPreviewButton({
  mode,
  label,
  variant = 'outline',
}: {
  mode: PreviewSurface;
  label: string;
  variant?: 'solid' | 'outline';
}) {
  const isCard = mode === 'card';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: isCard ? '22px' : '72px',
        height: isCard ? '12px' : '32px',
        padding: isCard ? '0 5px' : '0 14px',
        borderRadius: isCard ? '3px' : '8px',
        border:
          variant === 'outline'
            ? isCard
              ? '0.8px solid #ef4444'
              : '1.5px solid #ef4444'
            : '1px solid transparent',
        background: variant === 'solid' ? '#ef1d12' : '#ffffff',
        color: variant === 'solid' ? '#ffffff' : '#111827',
        fontSize: isCard ? '4.5px' : '11px',
        fontWeight: 800,
        letterSpacing: '0.02em',
        boxShadow:
          variant === 'solid' ? '0 10px 24px rgba(239, 29, 18, 0.18)' : 'none',
      }}
    >
      {label}
    </div>
  );
}

function MenuPreviewChrome({ mode }: { mode: PreviewSurface }) {
  const isCard = mode === 'card';

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: isCard ? '10px' : '20px',
          left: '50%',
          width: isCard ? '26px' : '52px',
          height: '3px',
          borderRadius: '999px',
          background: '#d6d9df',
          transform: 'translateX(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: isCard ? '8px' : '16px',
          right: isCard ? '10px' : '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isCard ? '22px' : '44px',
          height: isCard ? '22px' : '44px',
          borderRadius: isCard ? '7px' : '12px',
          border: '1px solid #d3d7dd',
          background: '#ffffff',
          color: '#111827',
          fontSize: isCard ? '12px' : '28px',
          fontWeight: 300,
          lineHeight: 1,
          boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
        }}
      >
        +
      </div>
    </>
  );
}

function MenuPreviewIcon({
  kind,
  mode,
}: {
  kind: 'burger' | 'cutlery' | 'open';
  mode: PreviewSurface;
}) {
  const size = mode === 'card' ? 18 : 40;
  const stroke = mode === 'card' ? 1.8 : 2.2;

  if (kind === 'burger') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <path
          d="M10 22C12.4 15 17.8 12 24 12C30.2 12 35.6 15 38 22H10Z"
          fill="#f59e0b"
          stroke="#a855f7"
          strokeWidth={stroke}
        />
        <path
          d="M10 26H38V30C38 32.8 35.8 35 33 35H15C12.2 35 10 32.8 10 30V26Z"
          fill="#f8c27a"
          stroke="#a855f7"
          strokeWidth={stroke}
        />
        <path
          d="M14 27H34"
          stroke="#ef4444"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <circle cx="17" cy="19" r="1.3" fill="#fff5d6" />
        <circle cx="24" cy="17" r="1.3" fill="#fff5d6" />
        <circle cx="31" cy="19" r="1.3" fill="#fff5d6" />
      </svg>
    );
  }

  if (kind === 'cutlery') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
        <rect
          x="10"
          y="8"
          width="28"
          height="32"
          rx="6"
          fill="#fde68a"
          stroke="#a855f7"
          strokeWidth={stroke}
        />
        <path
          d="M18 13V24"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d="M15 13V19"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d="M21 13V19"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d="M18 24V34"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d="M30 13C32.8 15.5 32.8 20.5 30 23V34"
          stroke="#7c3aed"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path
        d="M13 16L24 8L35 16V32C35 34.2 33.2 36 31 36H17C14.8 36 13 34.2 13 32V16Z"
        fill="#f3d4f8"
        stroke="#a855f7"
        strokeWidth={stroke}
      />
      <path
        d="M12 16H36"
        stroke="#a855f7"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M17 24H31"
        stroke="#a855f7"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d="M19 29H29"
        stroke="#a855f7"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}

function PreviewImageCard({
  mode,
  image,
  title,
  description,
  ctaLabel,
  overlay = false,
  style,
}: {
  mode: PreviewSurface;
  image: string;
  title: string;
  description: string;
  ctaLabel: string;
  overlay?: boolean;
  style?: CSSProperties;
}) {
  const isCard = mode === 'card';

  if (overlay) {
    return (
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: isCard ? '10px' : '18px',
          border: '1px solid #d7dee6',
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: '0 14px 34px rgba(15, 23, 42, 0.1)',
          ...style,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.72) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 'auto 0 0 0',
            display: 'grid',
            gap: isCard ? '3px' : '8px',
            padding: isCard ? '10px 8px 12px' : '20px 18px 22px',
          }}
        >
          <div
            style={{
              fontSize: isCard ? '4.5px' : '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: isCard ? '0.5px' : '1.5px',
              textTransform: 'uppercase',
            }}
          >
            {/* Placeholder tag removed to avoid hardcoded text */}
          </div>
          <div
            style={{
              fontSize: isCard ? '9px' : '24px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.15,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: isCard ? '5px' : '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.7,
            }}
          >
            {description}
          </div>
          <MenuPreviewButton mode={mode} label={ctaLabel} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        overflow: 'hidden',
        borderRadius: isCard ? '10px' : '16px',
        border: '1px solid #d7dee6',
        background: '#ffffff',
        boxShadow: '0 14px 34px rgba(15, 23, 42, 0.08)',
        ...style,
      }}
    >
      <div
        style={{
          width: '100%',
          height: isCard ? '46px' : '170px',
          backgroundImage: `url("${image}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isCard ? '4px' : '10px',
          padding: isCard ? '8px 8px 10px' : '18px 18px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: isCard ? '6px' : '18px',
            fontWeight: 800,
            color: '#111827',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: isCard ? '4.8px' : '12px', color: '#6b7280' }}>
          {description}
        </div>
        <MenuPreviewButton mode={mode} label={ctaLabel} />
      </div>
    </div>
  );
}

function PreviewListRow({
  mode,
  title,
  description,
  ctaLabel,
}: {
  mode: PreviewSurface;
  title: string;
  description: string;
  ctaLabel: string;
}) {
  const isCard = mode === 'card';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCard ? '4px' : '10px',
        minHeight: isCard ? '44px' : '110px',
        padding: isCard ? '8px 6px' : '18px',
        borderRadius: isCard ? '8px' : '14px',
        background: '#ef1d12',
        color: '#ffffff',
        boxShadow: '0 18px 36px rgba(239, 29, 18, 0.18)',
      }}
    >
      <div
        style={{
          fontSize: isCard ? '7px' : '24px',
          fontWeight: 800,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: isCard ? '4.8px' : '12px',
          color: 'rgba(255,255,255,0.88)',
        }}
      >
        {description}
      </div>
      <MenuPreviewButton mode={mode} label={ctaLabel} variant="solid" />
    </div>
  );
}

function PreviewStackRow({
  mode,
  title,
  description,
  expanded = false,
}: {
  mode: PreviewSurface;
  title: string;
  description: string;
  expanded?: boolean;
}) {
  const isCard = mode === 'card';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: expanded ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: isCard ? '6px' : '14px',
        padding: isCard ? '7px 8px' : expanded ? '18px 20px' : '16px 20px',
        borderRadius: isCard ? '8px' : '14px',
        border: '1px solid #d8dfe7',
        background: '#ffffff',
        boxShadow: '0 12px 26px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{ display: 'grid', gap: isCard ? '2px' : '6px', minWidth: 0 }}
      >
        <div
          style={{
            fontSize: isCard ? '5.4px' : '18px',
            fontWeight: 700,
            color: '#1f2937',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: isCard ? '4.2px' : '12px',
            color: '#6b7280',
            lineHeight: 1.45,
          }}
        >
          {description}
        </div>
        {expanded ? (
          <div
            style={{
              display: 'grid',
              gap: isCard ? '2px' : '6px',
              marginTop: isCard ? '2px' : '8px',
            }}
          >
            <div
              style={{
                height: isCard ? '3px' : '8px',
                borderRadius: '999px',
                background: '#e5e7eb',
                width: '92%',
              }}
            />
            <div
              style={{
                height: isCard ? '3px' : '8px',
                borderRadius: '999px',
                background: '#edf2f7',
                width: '78%',
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: isCard ? '8px' : '18px',
          color: '#111827',
          lineHeight: 1,
        }}
      >
        {'->'}
      </div>
    </div>
  );
}

function PreviewFeatureCard({
  mode,
  icon,
  title,
  description,
}: {
  mode: PreviewSurface;
  icon: 'burger' | 'cutlery' | 'open';
  title: string;
  description: string;
}) {
  const isCard = mode === 'card';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isCard ? '4px' : '10px',
        padding: isCard ? '10px 6px' : '20px 16px',
        borderRadius: isCard ? '8px' : '14px',
        border: '1px solid #d8dfe7',
        background: '#ffffff',
      }}
    >
      <MenuPreviewIcon kind={icon} mode={mode} />
      <div
        style={{
          fontSize: isCard ? '5.2px' : '13px',
          fontWeight: 700,
          color: '#1f2937',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: isCard ? '4.2px' : '11px',
          color: '#6b7280',
          textAlign: 'center',
        }}
      >
        {description}
      </div>
    </div>
  );
}

const MENU_PREVIEW_IMAGES = [
  MENU_PREVIEW_INTERIOR,
  MENU_PREVIEW_STOREFRONT,
  MENU_PREVIEW_INGREDIENTS,
  MENU_PREVIEW_DARK_PATTERN,
];

function getPreviewLayoutItems(config?: MenuConfig, count = 4) {
  const configuredItems = (config?.layoutItems || [])
    .filter((item) =>
      Boolean(item.name?.trim() || item.description?.trim() || item.image),
    )
    .slice(0, count);

  return Array.from({ length: count }, (_, index) => ({
    image:
      configuredItems[index]?.image ||
      MENU_PREVIEW_IMAGES[index % MENU_PREVIEW_IMAGES.length],
    title: configuredItems[index]?.name?.trim() || `Menu ${index + 1}`,
    description:
      configuredItems[index]?.description?.trim() ||
      MENU_PREVIEW_COPY.itemDescription,
  }));
}

function getPreviewCategories(config?: MenuConfig, count = 3) {
  const configuredCategories = (config?.categories || [])
    .filter((category) =>
      Boolean(category.name?.trim() || category.description?.trim()),
    )
    .slice(0, count);

  return Array.from({ length: count }, (_, index) => ({
    title:
      configuredCategories[index]?.name?.trim() ||
      ['Lunch specials', 'Dinner selections', 'Beverages'][index] ||
      `Section ${index + 1}`,
    description:
      configuredCategories[index]?.description?.trim() ||
      [
        'Collapsed rows keep long menus easier to scan for mobile and desktop.',
        'Guests can expand each menu group only when they need it.',
        'A compact way to organize longer category lists.',
      ][index] ||
      MENU_PREVIEW_COPY.itemDescription,
  }));
}

function renderMenuLayoutArtwork(
  layout: MenuLayoutValue,
  mode: PreviewSurface,
  meta: MenuPreviewMeta = MENU_PREVIEW_COPY,
  config?: MenuConfig,
) {
  const isCard = mode === 'card';
  const previewTwoItems = getPreviewLayoutItems(config, 2);
  const previewThreeItems = getPreviewLayoutItems(config, 3);
  const previewFourItems = getPreviewLayoutItems(config, 4);
  const previewCategories = getPreviewCategories(config, 3);
  const frameStyle: CSSProperties = {
    position: 'relative',
    height: isCard ? '130px' : '500px',
    borderRadius: isCard ? '18px' : '28px',
    overflow: 'hidden',
    border: '1px solid #dbe3ec',
    background: 'linear-gradient(180deg, #fdfefe 0%, #f7f9fc 100%)',
    boxShadow: isCard
      ? '0 12px 26px rgba(15, 23, 42, 0.07)'
      : '0 30px 90px rgba(15, 23, 42, 0.18)',
  };
  const boardStyle: CSSProperties = {
    position: 'absolute',
    inset: isCard ? '44px 10px 10px' : '74px 24px 24px',
    overflow: 'hidden',
    borderRadius: isCard ? '12px' : '22px',
    background: '#f3f6f8',
    border: '1px solid #edf2f6',
    padding: isCard ? '8px' : '24px',
  };
  const heading = (
    <div style={{ marginBottom: isCard ? '8px' : '18px', textAlign: 'center' }}>
      <div
        style={{
          fontSize: isCard ? '7px' : '14px',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: isCard ? '3px' : '8px',
        }}
      >
        {meta.sectionSubtitle}
      </div>
      <div
        style={{
          fontSize: isCard ? '10px' : '28px',
          fontWeight: 700,
          color: '#1f2937',
          lineHeight: 1.18,
        }}
      >
        {meta.sectionTitle}
      </div>
      {!isCard ? (
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
          {meta.sectionDescription}
        </div>
      ) : null}
    </div>
  );

  switch (layout) {
    case 'grid':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div
            style={{
              ...boardStyle,
              display: 'grid',
              gridTemplateRows: isCard ? '1fr' : 'auto 1fr',
              gap: isCard ? '8px' : '18px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: isCard ? '8px' : '18px',
                alignItems: 'stretch',
                height: isCard ? '100%' : 'auto',
              }}
            >
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[0].image}
                title={previewTwoItems[0].title}
                description={previewTwoItems[0].description}
                ctaLabel={meta.ctaLabel}
                overlay
                style={{ height: isCard ? '100%' : '290px' }}
              />
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[1].image}
                title={previewTwoItems[1].title}
                description={previewTwoItems[1].description}
                ctaLabel={meta.ctaLabel}
                overlay
                style={{ height: isCard ? '100%' : '290px' }}
              />
            </div>
          </div>
        </div>
      );

    case 'list':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isCard
                  ? 'repeat(2, minmax(0, 1fr))'
                  : '1fr',
                gap: isCard ? '8px' : '14px',
                height: '100%',
                alignContent: 'center',
              }}
            >
              <PreviewListRow
                mode={mode}
                title={previewFourItems[0].title}
                description={previewFourItems[0].description}
                ctaLabel={meta.ctaLabel}
              />
              <PreviewListRow
                mode={mode}
                title={previewFourItems[1].title}
                description={previewFourItems[1].description}
                ctaLabel={meta.ctaLabel}
              />
              {!isCard ? (
                <PreviewListRow
                  mode={mode}
                  title={previewFourItems[2].title}
                  description={previewFourItems[2].description}
                  ctaLabel={meta.ctaLabel}
                />
              ) : null}
            </div>
          </div>
        </div>
      );
    case 'masonry':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: isCard ? '8px' : '18px',
                height: '100%',
              }}
            >
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[0].image}
                title={previewTwoItems[0].title}
                description={previewTwoItems[0].description}
                ctaLabel={meta.ctaLabel}
                style={{
                  minHeight: isCard ? '100%' : '250px',
                  alignSelf: 'end',
                }}
              />
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[1].image}
                title={previewTwoItems[1].title}
                description={previewTwoItems[1].description}
                ctaLabel={meta.ctaLabel}
                style={{
                  minHeight: isCard ? '100%' : '290px',
                  alignSelf: 'start',
                }}
              />
            </div>
          </div>
        </div>
      );

    case 'carousel':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            {!isCard ? heading : null}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: isCard ? '6px' : '12px',
                height: isCard ? '100%' : 'calc(100% - 64px)',
              }}
            >
              {!isCard ? (
                <div
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    width: '34px',
                    height: '34px',
                    borderRadius: '999px',
                    background: '#ffffff',
                    border: '1px solid #dbe3ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-50%)',
                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  {'<'}
                </div>
              ) : null}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: isCard ? '6px' : '14px',
                  width: '100%',
                  paddingInline: isCard ? '0' : '34px',
                }}
              >
                {previewFourItems.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    style={{
                      overflow: 'hidden',
                      borderRadius: isCard ? '8px' : '16px',
                      border: '1px solid #d7dee6',
                      background: '#111827',
                      boxShadow: '0 16px 34px rgba(15, 23, 42, 0.12)',
                    }}
                  >
                    <div
                      style={{
                        height: isCard ? '52px' : '164px',
                        backgroundImage: `url(${item.image || MENU_PREVIEW_DARK_PATTERN})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div
                      style={{
                        padding: isCard ? '5px 5px 7px' : '14px 14px 16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: isCard ? '5px' : '14px',
                          fontWeight: 700,
                          color: '#ffffff',
                          marginBottom: isCard ? '2px' : '4px',
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontSize: isCard ? '4px' : '11px',
                          color: 'rgba(255,255,255,0.72)',
                        }}
                      >
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!isCard ? (
                <div
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    width: '34px',
                    height: '34px',
                    borderRadius: '999px',
                    background: '#ffffff',
                    border: '1px solid #dbe3ec',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'translateY(-50%)',
                    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  {'>'}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );

    case 'tabs':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div
            style={{
              ...boardStyle,
              display: 'grid',
              gridTemplateColumns: isCard ? '1.05fr 1fr' : '1.1fr 0.95fr',
              gap: isCard ? '10px' : '34px',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'grid', gap: isCard ? '4px' : '12px' }}>
              <div
                style={{
                  fontSize: isCard ? '8px' : '34px',
                  fontWeight: 700,
                  color: '#27272a',
                  lineHeight: 1.14,
                  maxWidth: isCard ? '14ch' : '12ch',
                }}
              >
                Order directly from our website
              </div>
              <div
                style={{
                  fontSize: isCard ? '4.6px' : '13px',
                  color: '#52525b',
                  lineHeight: 1.55,
                  maxWidth: isCard ? '20ch' : '32ch',
                }}
              >
                Save on fees, keep service direct, and support local business
                with a faster ordering flow.
              </div>
            </div>
            <div style={{ display: 'grid', gap: isCard ? '6px' : '12px' }}>
              {previewCategories.map((item, index) => (
                <PreviewStackRow
                  key={`${item.title}-${index}`}
                  mode={mode}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case 'accordion':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div
            style={{
              ...boardStyle,
              display: 'grid',
              alignContent: 'center',
              gap: isCard ? '6px' : '12px',
            }}
          >
            {previewCategories.map((item, index) => (
              <PreviewStackRow
                key={`${item.title}-${index}`}
                mode={mode}
                title={item.title}
                description={item.description}
                expanded={index === 0}
              />
            ))}
          </div>
        </div>
      );

    case 'two-column':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: isCard ? '8px' : '18px',
                height: '100%',
              }}
            >
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[0].image}
                title={previewTwoItems[0].title}
                description={previewTwoItems[0].description}
                ctaLabel={meta.ctaLabel}
              />
              <PreviewImageCard
                mode={mode}
                image={previewTwoItems[1].image}
                title={previewTwoItems[1].title}
                description={previewTwoItems[1].description}
                ctaLabel={meta.ctaLabel}
              />
            </div>
          </div>
        </div>
      );

    case 'single-column':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: isCard ? '8px' : '18px',
                height: '100%',
              }}
            >
              <div style={{ width: isCard ? '36%' : '190px' }}>
                <PreviewImageCard
                  mode={mode}
                  image={previewTwoItems[0].image}
                  title={previewTwoItems[0].title}
                  description={previewTwoItems[0].description}
                  ctaLabel={meta.ctaLabel}
                />
              </div>
              <div
                style={{
                  width: isCard ? '36%' : '190px',
                  marginTop: isCard ? '4px' : '26px',
                }}
              >
                <PreviewImageCard
                  mode={mode}
                  image={previewTwoItems[1].image}
                  title={previewTwoItems[1].title}
                  description={previewTwoItems[1].description}
                  ctaLabel={meta.ctaLabel}
                />
              </div>
            </div>
          </div>
        </div>
      );

    case 'featured-grid':
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            {!isCard ? heading : null}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: isCard ? '8px' : '18px',
                alignItems: 'stretch',
                height: isCard ? '100%' : 'calc(100% - 68px)',
              }}
            >
              <PreviewFeatureCard
                mode={mode}
                icon="burger"
                title={previewTwoItems[0].title}
                description={previewTwoItems[0].description}
              />
              <PreviewFeatureCard
                mode={mode}
                icon="cutlery"
                title={previewTwoItems[1].title}
                description={previewTwoItems[1].description}
              />
            </div>
          </div>
        </div>
      );

    case 'minimal':
    default:
      return (
        <div style={frameStyle}>
          <MenuPreviewChrome mode={mode} />
          <div style={boardStyle}>
            {!isCard ? heading : null}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: isCard ? '8px' : '18px',
                alignItems: 'start',
                paddingTop: isCard ? '8px' : '12px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <MenuPreviewIcon kind="burger" mode={mode} />
                <div
                  style={{
                    marginTop: isCard ? '4px' : '10px',
                    fontSize: isCard ? '5.2px' : '14px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {previewThreeItems[0].title}
                </div>
                <div
                  style={{
                    marginTop: isCard ? '2px' : '6px',
                    fontSize: isCard ? '4.2px' : '11px',
                    color: '#6b7280',
                  }}
                >
                  {previewThreeItems[0].description}
                </div>
              </div>
              <div
                style={{
                  textAlign: 'center',
                  borderLeft: '1px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb',
                }}
              >
                <MenuPreviewIcon kind="open" mode={mode} />
                <div
                  style={{
                    marginTop: isCard ? '4px' : '10px',
                    fontSize: isCard ? '5.2px' : '14px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {previewThreeItems[1].title}
                </div>
                <div
                  style={{
                    marginTop: isCard ? '2px' : '6px',
                    fontSize: isCard ? '4.2px' : '11px',
                    color: '#6b7280',
                  }}
                >
                  {previewThreeItems[1].description}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <MenuPreviewIcon kind="cutlery" mode={mode} />
                <div
                  style={{
                    marginTop: isCard ? '4px' : '10px',
                    fontSize: isCard ? '5.2px' : '14px',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}
                >
                  {previewThreeItems[2].title}
                </div>
                <div
                  style={{
                    marginTop: isCard ? '2px' : '6px',
                    fontSize: isCard ? '4.2px' : '11px',
                    color: '#6b7280',
                  }}
                >
                  {previewThreeItems[2].description}
                </div>
              </div>
            </div>
            {!isCard ? (
              <div
                style={{
                  height: '1px',
                  background: '#d8dfe7',
                  marginTop: '28px',
                }}
              />
            ) : null}
          </div>
        </div>
      );
  }
}

export default function MenuSettingsForm({
  pageId,
  templateId,
  isNewSection,
}: MenuSettingsFormProps) {
  const router = useRouter();
  const searchParams = new URLSearchParams(window.location.search);
  const restaurantId = searchParams.get('restaurant_id') || '';
  const restaurantName = searchParams.get('restaurant_name') || '';
  const pageName = searchParams.get('page_name') || '';
  const {
    config,
    loading,
    error: fetchError,
    refetch,
  } = useMenuConfig({
    fetchOnMount: !isNewSection,
    restaurantId,
    pageId,
    templateId,
  });
  const { updateMenu, updating, error: updateError } = useUpdateMenuConfig();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state
  const [formConfig, setFormConfig] = useState<MenuConfig | null>(null);

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>('desktop');

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] =
    useState<MenuMediaField | null>(null);
  const contentSectionRef = useRef<HTMLDivElement | null>(null);
  const mediaSectionRef = useRef<HTMLDivElement | null>(null);
  const categoriesSectionRef = useRef<HTMLDivElement | null>(null);

  // Get restaurant ID and other params from URL
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">
              Restaurant ID is required. Please provide it via URL parameter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Initialize form config when config is loaded or for new sections
  useEffect(() => {
    if (isNewSection && !formConfig) {
      // For new sections, use default empty config
      setFormConfig(
        normalizeMenuConfig({
          ...sectionStyleDefaults,
          title: '',
          subtitle: '',
          description: '',
          layout: 'grid',
          bgColor: '#ffffff',
          textColor: '#000000',
          accentColor: '#3b82f6',
          cardBgColor: '#f9fafb',
          textAlign: 'center',
          paddingTop: '4rem',
          paddingBottom: '4rem',
          columns: 3,
          showPrices: true,
          showImages: true,
          showDescriptions: true,
          showDietaryInfo: true,
          showCategoryIcons: false,
          categoryLayout: 'tabs',
          contentMaxWidth: '1200px',
          enableSearch: false,
          enableFilters: false,
          categories: [],
          featuredItems: [],
        }),
      );
    } else if (config && !formConfig) {
      setFormConfig(
        normalizeMenuConfig({ ...sectionStyleDefaults, ...config }),
      );
    }
  }, [config, formConfig, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setFormConfig((prev) =>
      prev
        ? normalizeMenuConfig({
            ...sectionStyleDefaults,
            ...prev,
          })
        : prev,
    );
  }, [sectionStyleDefaults]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formConfig) return;

    try {
      const normalizedConfig = normalizeMenuConfig(formConfig);
      const payload: any = {
        ...normalizedConfig,
        restaurant_id: restaurantId,
      };

      // Add page_id if available
      if (pageId) {
        payload.page_id = pageId;
      }

      // Add new_section flag to indicate this should be inserted, not replaced
      if (isNewSection) {
        payload.new_section = true;
      } else if (templateId) {
        payload.template_id = templateId;
      }

      await updateMenu(payload);

      setToastMessage('Menu settings saved successfully!');
      setToastType('success');
      setShowToast(true);

      // Navigate back to page settings after successful save
      setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        if (pageName) params.set('page_name', pageName);
        router.push(`/admin/page-settings?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to save menu config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<MenuConfig>) => {
    if (!formConfig) return;
    setFormConfig((prev) =>
      prev ? normalizeMenuConfig({ ...prev, ...updates }) : null,
    );
  };

  const handleLayoutChange = (newLayout: MenuLayoutValue) => {
    if (!formConfig) return;

    setFormConfig((prev) =>
      prev ? normalizeMenuConfig({ ...prev, layout: newLayout }) : null,
    );
  };

  const updateCtaButton = (updates: Partial<MenuButton>) => {
    if (!formConfig) return;
    setFormConfig((prev) =>
      prev
        ? normalizeMenuConfig({
            ...prev,
            ctaButton: prev.ctaButton
              ? { ...prev.ctaButton, ...updates }
              : { label: '', href: '', ...updates },
          })
        : null,
    );
  };

  const addCategory = () => {
    if (!formConfig) return;
    const newCategory: MenuCategory = {
      name: 'New Category',
      description: '',
      items: [],
      icon: '🍽️',
    };
    newCategory.icon = '';
    setFormConfig((prev) =>
      prev
        ? normalizeMenuConfig({
            ...prev,
            categories: [...(prev.categories || []), newCategory],
          })
        : null,
    );
  };

  const updateCategory = (index: number, updates: Partial<MenuCategory>) => {
    if (!formConfig) return;
    setFormConfig((prev) =>
      prev
        ? normalizeMenuConfig({
            ...prev,
            categories: prev.categories?.map((cat, i) =>
              i === index ? { ...cat, ...updates } : cat,
            ),
          })
        : null,
    );
  };

  const removeCategory = (index: number) => {
    if (!formConfig) return;
    setFormConfig((prev) =>
      prev
        ? normalizeMenuConfig({
            ...prev,
            categories: prev.categories?.filter((_, i) => i !== index),
          })
        : null,
    );
  };

  const addItemToCategory = (categoryIndex: number) => {
    if (!formConfig) return;
    const newItem: MenuItem = {
      name: 'New Item',
      description: '',
      price: '0.00',
    };
    setFormConfig((prev) => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]) {
        categories[categoryIndex] = {
          ...categories[categoryIndex],
          items: [...(categories[categoryIndex].items || []), newItem],
        };
      }
      return normalizeMenuConfig({ ...prev, categories });
    });
  };

  const updateItem = (
    categoryIndex: number,
    itemIndex: number,
    updates: Partial<MenuItem>,
  ) => {
    if (!formConfig) return;
    setFormConfig((prev) => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]?.items) {
        const items = [...categories[categoryIndex].items!];
        items[itemIndex] = { ...items[itemIndex], ...updates };
        categories[categoryIndex] = { ...categories[categoryIndex], items };
      }
      return normalizeMenuConfig({ ...prev, categories });
    });
  };

  const removeItem = (categoryIndex: number, itemIndex: number) => {
    if (!formConfig) return;
    setFormConfig((prev) => {
      if (!prev) return null;
      const categories = [...(prev.categories || [])];
      if (categories[categoryIndex]?.items) {
        categories[categoryIndex] = {
          ...categories[categoryIndex],
          items: categories[categoryIndex].items!.filter(
            (_, i) => i !== itemIndex,
          ),
        };
      }
      return normalizeMenuConfig({ ...prev, categories });
    });
  };

  const updateLayoutItem = (itemIndex: number, updates: Partial<MenuItem>) => {
    if (!formConfig) return;
    setFormConfig((prev) => {
      if (!prev) return null;
      const layoutItems = [...(prev.layoutItems || [])];
      layoutItems[itemIndex] = {
        ...(layoutItems[itemIndex] || createEmptyLayoutItem(itemIndex)),
        ...updates,
      };

      return normalizeMenuConfig({ ...prev, layoutItems });
    });
  };

  const handleMediaSelect = (imageUrl: string) => {
    if (!currentMediaField || !formConfig) return;

    switch (currentMediaField.type) {
      case 'header_image':
        updateConfig({ headerImage: imageUrl });
        break;
      case 'background_image':
        updateConfig({ backgroundImage: imageUrl });
        break;
      case 'item_image':
        updateItem(
          currentMediaField.categoryIndex,
          currentMediaField.itemIndex,
          {
            image: imageUrl,
          },
        );
        break;
      case 'layout_item_image':
        updateLayoutItem(currentMediaField.itemIndex, {
          image: imageUrl,
        });
        break;
    }

    setShowGalleryModal(false);
    setCurrentMediaField(null);
  };

  const openMediaGallery = (field: MenuMediaField) => {
    setCurrentMediaField(field);
    setShowGalleryModal(true);
  };

  const scrollToSection = (ref: { current: HTMLDivElement | null }) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const renderLayoutPreview = () => {
    if (!formConfig) return null;

    const usesDirectLayoutItems = isDirectMenuLayout(currentLayout);
    const directLayoutConfig = usesDirectLayoutItems
      ? DIRECT_LAYOUT_EDITOR_CONFIG[currentLayout]
      : null;

    // Get placeholder layout items for direct layouts
    const previewLayoutItems = usesDirectLayoutItems
      ? getPreviewLayoutItems(formConfig, directLayoutConfig?.slotCount || 2)
      : [];

    // Create preview config with placeholder data for empty fields
    const previewConfig = {
      ...formConfig,
      title: formConfig.title || '',
      subtitle: formConfig.subtitle || 'This is a description',
      description: formConfig.description || 'Lorem ipsum dolor sit amet',
      // For direct layouts, use layoutItems with placeholders
      layoutItems: usesDirectLayoutItems
        ? previewLayoutItems.map((item, index) => ({
            id: `layout-item-${index}`,
            name: formConfig.layoutItems?.[index]?.name || item.title,
            description:
              formConfig.layoutItems?.[index]?.description || item.description,
            price: formConfig.layoutItems?.[index]?.price || '',
            image: formConfig.layoutItems?.[index]?.image || item.image,
            ctaLabel: formConfig.layoutItems?.[index]?.ctaLabel || 'Menu',
            ctaLink: formConfig.layoutItems?.[index]?.ctaLink || '/menu',
            imageLink: formConfig.layoutItems?.[index]?.imageLink,
          }))
        : [],
      // For category-driven layouts, only use categories
      categories:
        !usesDirectLayoutItems &&
        formConfig.categories &&
        formConfig.categories.length > 0
          ? formConfig.categories
          : !usesDirectLayoutItems
            ? [
                {
                  id: 'placeholder-1',
                  name: 'Menu Item One',
                  description:
                    'This is a description and this is a description',
                  items: [
                    {
                      id: 'item-1',
                      name: 'Menu Item One',
                      description: 'Lorem ipsum dolor sit amet',
                      price: '$12.99',
                      image:
                        'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Menu+Item',
                    },
                  ],
                },
                {
                  id: 'placeholder-2',
                  name: 'Menu Item Two',
                  description: 'This is a description',
                  items: [
                    {
                      id: 'item-2',
                      name: 'Menu Item Two',
                      description: 'Lorem ipsum dolor sit amet',
                      price: '$15.99',
                      image:
                        'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Menu+Item',
                    },
                  ],
                },
              ]
            : [],
    };

    return (
      <Menu
        {...previewConfig}
        restaurant_id={restaurantId}
        layout={currentLayout}
        previewMode={previewViewport}
      />
    );
  };

  if (loading && !isNewSection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">
            Loading menu settings...
          </p>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5">
          <svg
            className="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">
              Failed to load menu configuration
            </p>
          </div>
        </div>
      </div>
    );
  }

  const error = fetchError || updateError;
  const activeLayoutOption =
    MENU_LAYOUT_OPTIONS.find(
      (option) => option.value === (formConfig.layout || 'grid'),
    ) || MENU_LAYOUT_OPTIONS[0];
  const activeLayoutGuide =
    LAYOUT_PRIMARY_CONTENT[(formConfig.layout || 'grid') as MenuLayoutValue];
  const currentLayout = (formConfig.layout || 'grid') as MenuLayoutValue;
  const usesDirectLayoutItems = isDirectMenuLayout(currentLayout);
  const directLayoutConfig = usesDirectLayoutItems
    ? DIRECT_LAYOUT_EDITOR_CONFIG[currentLayout]
    : DIRECT_LAYOUT_EDITOR_CONFIG.grid;
  const visibleLayoutItems = usesDirectLayoutItems
    ? (formConfig.layoutItems || []).slice(0, directLayoutConfig.slotCount)
    : [];
  const totalItems = getMenuItemCount(formConfig.categories);
  const totalItemImages = getMenuImageCount(formConfig.categories);
  const directLayoutImageCount = visibleLayoutItems.filter((item) =>
    Boolean(item.image),
  ).length;
  const directButtonCount = visibleLayoutItems.filter((item) =>
    Boolean(item.ctaLabel || item.ctaLink),
  ).length;
  const featuredCount = (formConfig.featuredItems || []).length;
  const usesItemImages = IMAGE_FOCUSED_MENU_LAYOUTS.has(currentLayout);
  const prioritizesFeatured = FEATURE_PRIORITY_LAYOUTS.has(currentLayout);
  const itemCountForCurrentLayout = usesDirectLayoutItems
    ? visibleLayoutItems.length
    : totalItems;
  const imageCountForCurrentLayout = usesDirectLayoutItems
    ? directLayoutImageCount
    : totalItemImages;
  const directSlotLabel =
    currentLayout === 'carousel'
      ? 'Slide'
      : currentLayout === 'featured-grid' || currentLayout === 'minimal'
        ? 'Highlight'
        : 'Card';
  const categoryEditorCopy: CategoryEditorCopy =
    currentLayout === 'accordion'
      ? {
          sectionTitle: 'Accordion Sections & Items',
          sectionDescription:
            'Add the accordion rows and the menu items inside each expanded section.',
          addCategoryLabel: 'Add Accordion Section',
          categoryLabel: 'Accordion Section',
          removeCategoryLabel: 'Remove Section',
          categoryNameLabel: 'Section Title',
          categoryNamePlaceholder: 'Lunch specials',
          categoryIconLabel: 'Section Badge',
          categoryIconPlaceholder: 'Optional icon or short badge',
          categoryDescriptionLabel: 'Section Summary',
          categoryDescriptionPlaceholder:
            'Short summary shown on the collapsed row',
          emptyTitle: 'No accordion sections added yet',
          emptyDescription:
            'Add a section first, then add the menu items shown inside that accordion row.',
          addFirstItemLabel: 'Add First Menu Item',
        }
      : currentLayout === 'tabs'
        ? {
            sectionTitle: 'Tab Groups & Items',
            sectionDescription:
              'Add the tab labels and the menu items shown inside each tab panel.',
            addCategoryLabel: 'Add Tab Group',
            categoryLabel: 'Tab Group',
            removeCategoryLabel: 'Remove Tab',
            categoryNameLabel: 'Tab Title',
            categoryNamePlaceholder: 'Popular plates',
            categoryIconLabel: 'Tab Badge',
            categoryIconPlaceholder: 'Optional icon or short badge',
            categoryDescriptionLabel: 'Tab Summary',
            categoryDescriptionPlaceholder:
              'Short summary shown inside the active tab area',
            emptyTitle: 'No tab groups added yet',
            emptyDescription:
              'Add a tab group first, then add the menu items shown inside that tab.',
            addFirstItemLabel: 'Add First Menu Item',
          }
        : {
            sectionTitle: 'Menu Categories & Items',
            sectionDescription:
              'Add the real content and images that power the selected layout.',
            addCategoryLabel: 'Add Category',
            categoryLabel: 'Category',
            removeCategoryLabel: 'Remove Category',
            categoryNameLabel: 'Category Name',
            categoryNamePlaceholder: 'Starters',
            categoryIconLabel: 'Category Icon',
            categoryIconPlaceholder: 'Optional icon or short label',
            categoryDescriptionLabel: 'Category Description',
            categoryDescriptionPlaceholder:
              'Short introduction for this category',
            emptyTitle: 'No categories added yet',
            emptyDescription:
              'Start by adding a category, then add menu items and upload item images for the selected layout.',
            addFirstItemLabel: 'Add First Item',
          };
  const galleryModalCopy = getGalleryModalCopy(currentMediaField);

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Menu Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your menu section layout and content
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? 'Hide Preview' : 'Show Layout Preview'}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch between desktop and mobile to verify every menu layout.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(['desktop', 'mobile'] as PreviewViewport[]).map(
                    (viewport) => (
                      <button
                        key={viewport}
                        type="button"
                        onClick={() => setPreviewViewport(viewport)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          previewViewport === viewport
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div
                className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${
                  previewViewport === 'mobile'
                    ? 'max-w-[430px] rounded-[32px]'
                    : 'max-w-[1240px] rounded-[32px]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>
                    {previewViewport === 'mobile'
                      ? 'Phone Preview'
                      : 'Desktop Preview'}
                  </span>
                  <span>
                    {previewViewport === 'mobile' ? '390 x 780' : '1280 x 720'}
                  </span>
                </div>
                <div className="bg-white">{renderLayoutPreview()}</div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Live preview reflects your current menu content and styling
                  changes.
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === 'mobile'
                    ? 'Mobile responsiveness check'
                    : 'Desktop composition check'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg
            className="h-5 w-5 shrink-0 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Layout Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Layout Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Choose a menu layout style
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {MENU_LAYOUT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => handleLayoutChange(option.value)}
                className={`group w-full cursor-pointer rounded-xl border-2 p-3 text-left transition-all ${
                  formConfig.layout === option.value
                    ? 'border-purple-500 bg-purple-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                }`}
                aria-pressed={formConfig.layout === option.value}
              >
                <div className="mb-3">
                  {renderMenuLayoutArtwork(
                    option.value,
                    'card',
                    MENU_PREVIEW_COPY,
                    formConfig,
                  )}
                </div>
                <div
                  className={`text-sm font-medium ${
                    formConfig.layout === option.value
                      ? 'text-purple-700'
                      : 'text-gray-900'
                  }`}
                >
                  {option.name}
                </div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        <div
          ref={contentSectionRef}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Content Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Set title, subtitle and description
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Title</span>
                <span className="text-xs font-normal text-gray-500">
                  Main menu section title
                </span>
              </label>
              <input
                type="text"
                value={formConfig.title || ''}
                onChange={(e) => updateConfig({ title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Optional section title"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subtitle</span>
                <span className="text-xs font-normal text-gray-500">
                  Optional subtitle
                </span>
              </label>
              <input
                type="text"
                value={formConfig.subtitle || ''}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Discover our delicious offerings"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">
                  Supporting description text
                </span>
              </label>
              <textarea
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Explore our carefully curated selection of dishes"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Layout Content Guide */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6l4 2.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Layout Content Guide
              </h2>
              <p className="text-sm text-gray-600">
                Understand which fields and media this layout uses.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <h3 className="text-base font-semibold text-gray-900">
                  {activeLayoutGuide.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {activeLayoutGuide.summary}
                </p>
              </div>
              <span className="inline-flex rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                {activeLayoutOption.name}
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Primary content source
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {activeLayoutGuide.primarySource}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Supporting content
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {activeLayoutGuide.supportingSource}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-900">
                Best results checklist
              </h4>
              <div className="mt-3 grid gap-2">
                {activeLayoutGuide.checklist.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 text-sm text-amber-900"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-700">
                    1
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {usesDirectLayoutItems
                        ? directLayoutConfig.title
                        : categoryEditorCopy.sectionTitle}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      {usesDirectLayoutItems
                        ? 'Only the card slots used by this layout are shown below.'
                        : 'This is where the real layout content is created.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection(categoriesSectionRef)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
                >
                  {usesDirectLayoutItems
                    ? 'Go to Layout Content'
                    : 'Go to Categories & Items'}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    2
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      {usesDirectLayoutItems
                        ? 'Upload layout images'
                        : 'Upload item images'}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      {usesDirectLayoutItems
                        ? directLayoutConfig.usesImages
                          ? 'Images are added inside each layout card slot, not on the layout selector.'
                          : 'This layout is mostly text-driven, so image upload is optional.'
                        : 'Images are added inside each item card, not on the layout selector.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToSection(categoriesSectionRef)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {usesDirectLayoutItems
                    ? 'Go to Card Images'
                    : 'Go to Item Images'}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    3
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">
                      Fill heading and media
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Section title, subtitle, description, and background are
                      configured below.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection(contentSectionRef)}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    Go to Heading Content
                  </button>
                  {usesDirectLayoutItems ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection(mediaSectionRef)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Go to Optional Media
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => scrollToSection(mediaSectionRef)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Go to Section Media
                    </button>
                  )}
                </div>
              </div>
            </div>

            {usesItemImages && imageCountForCurrentLayout === 0 ? (
              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                {usesDirectLayoutItems
                  ? 'This layout relies on the card images below. Add them inside the layout content section so the live menu does not look blank.'
                  : 'This layout relies on menu item images. Add images inside the item editor below so the real menu section does not look blank.'}
              </div>
            ) : null}

            {prioritizesFeatured && !usesDirectLayoutItems ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Featured count:{' '}
                <span className="font-semibold">{featuredCount}</span>. Layouts
                like {activeLayoutOption.name} use featured items first when
                they are available.
              </div>
            ) : null}
          </div>
        </div>

        {/* Media Configuration */}
        <div
          ref={mediaSectionRef}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.375 19.5h17.25M4.5 16.5l4.773-4.773a1.125 1.125 0 011.591 0L14.25 15.114l1.386-1.386a1.125 1.125 0 011.591 0L19.5 16.5M6 7.5h.008v.008H6V7.5z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {usesDirectLayoutItems
                  ? 'Optional Section Media'
                  : 'Section Media'}
              </h2>
              <p className="text-sm text-gray-600">
                {usesDirectLayoutItems
                  ? 'Only use this if you want extra section ambience or fallback artwork behind the layout cards.'
                  : 'Header and background images support the section and act as layout fallbacks.'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {usesDirectLayoutItems
              ? 'The layout cards below are the main content source. These section images are optional and only act as supporting media.'
              : 'Menu item images drive most visual cards. The section media below helps with ambience, hero-style intros, and fallbacks when some items do not have images yet.'}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Header Image
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Used as supporting section media and card fallback artwork.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  Optional
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {formConfig.headerImage ? (
                  <img
                    src={formConfig.headerImage}
                    alt="Header preview"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                    No header image selected yet.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openMediaGallery({ type: 'header_image' })}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                  {formConfig.headerImage
                    ? 'Change Header Image'
                    : 'Choose Header Image'}
                </button>
                {formConfig.headerImage ? (
                  <button
                    type="button"
                    onClick={() => updateConfig({ headerImage: undefined })}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Background Image
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Used for section ambience and global media fallback.
                  </p>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  Optional
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                {formConfig.backgroundImage ? (
                  <img
                    src={formConfig.backgroundImage}
                    alt="Background preview"
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center px-6 text-center text-sm text-gray-500">
                    No background image selected yet.
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => openMediaGallery({ type: 'background_image' })}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                >
                  {formConfig.backgroundImage
                    ? 'Change Background Image'
                    : 'Choose Background Image'}
                </button>
                {formConfig.backgroundImage ? (
                  <button
                    type="button"
                    onClick={() => updateConfig({ backgroundImage: undefined })}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {usesDirectLayoutItems ? (
          <div
            ref={categoriesSectionRef}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {directLayoutConfig.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {directLayoutConfig.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {directSlotLabel}s
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {visibleLayoutItems.length}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {directLayoutConfig.usesImages
                    ? `${directSlotLabel}s With Images`
                    : 'Cards Ready'}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {directLayoutConfig.usesImages
                    ? directLayoutImageCount
                    : itemCountForCurrentLayout}
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {directLayoutConfig.usesButtons
                    ? 'Buttons Configured'
                    : 'Image Links'}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900">
                  {directLayoutConfig.usesButtons
                    ? directButtonCount
                    : visibleLayoutItems.filter((item) =>
                        Boolean(item.imageLink),
                      ).length}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5">
              {visibleLayoutItems.map((item, itemIndex) => (
                <div
                  key={`layout-item-${itemIndex}`}
                  className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                        {directSlotLabel} {itemIndex + 1}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Fill only the content used by this{' '}
                        {activeLayoutOption.name.toLowerCase()} layout.
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm ring-1 ring-gray-200">
                      {directLayoutConfig.usesImages
                        ? 'Image-led slot'
                        : 'Text-led slot'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {directSlotLabel} Title
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) =>
                          updateLayoutItem(itemIndex, { name: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                        placeholder={`${directSlotLabel} ${itemIndex + 1} title`}
                      />
                    </div>

                    {directLayoutConfig.usesButtons ? (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Button Label
                        </label>
                        <input
                          type="text"
                          value={item.ctaLabel || ''}
                          onChange={(e) =>
                            updateLayoutItem(itemIndex, {
                              ctaLabel: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder="Menu"
                        />
                      </div>
                    ) : null}

                    <div className="xl:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        {directSlotLabel} Description
                      </label>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) =>
                          updateLayoutItem(itemIndex, {
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                        placeholder="Short supporting copy for this slot"
                        rows={3}
                      />
                    </div>

                    {directLayoutConfig.usesButtons ? (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Button Link
                        </label>
                        <input
                          type="text"
                          value={item.ctaLink || ''}
                          onChange={(e) =>
                            updateLayoutItem(itemIndex, {
                              ctaLink: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder="/menu"
                        />
                      </div>
                    ) : null}

                    {directLayoutConfig.usesImageLinks ? (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Image Click URL
                        </label>
                        <input
                          type="text"
                          value={item.imageLink || ''}
                          onChange={(e) =>
                            updateLayoutItem(itemIndex, {
                              imageLink: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder="https://example.com/special-offer"
                        />
                      </div>
                    ) : null}
                  </div>

                  {directLayoutConfig.usesImages ? (
                    <div className="mt-4 rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {directSlotLabel} Image
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {directLayoutConfig.imageOptional
                              ? 'Optional image for this slot.'
                              : 'This image is shown directly inside the selected layout.'}
                          </p>
                        </div>
                        {item.imageLink ? (
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                            Image URL set
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={`${directSlotLabel} ${itemIndex + 1} preview`}
                            className="h-52 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-52 items-center justify-center px-6 text-center text-sm text-gray-500">
                            {directLayoutConfig.imageOptional
                              ? 'No image selected yet. This slot can still work without one.'
                              : 'No image selected yet.'}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            openMediaGallery({
                              type: 'layout_item_image',
                              itemIndex,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
                        >
                          {item.image
                            ? `Change ${directSlotLabel} Image`
                            : `Choose ${directSlotLabel} Image`}
                        </button>
                        {item.image ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateLayoutItem(itemIndex, { image: '' })
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Categories And Items */}
        {!usesDirectLayoutItems ? (
          <div ref={categoriesSectionRef}>
            <CategoryDrivenLayoutEditor
              currentLayout={currentLayout}
              activeLayoutName={activeLayoutOption.name}
              categories={formConfig.categories || []}
              totalItems={totalItems}
              totalItemImages={totalItemImages}
              copy={categoryEditorCopy}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onRemoveCategory={removeCategory}
              onAddItem={addItemToCategory}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onOpenItemImage={(categoryIndex, itemIndex) =>
                openMediaGallery({
                  type: 'item_image',
                  categoryIndex,
                  itemIndex,
                })
              }
            />
          </div>
        ) : null}

        {/* Display Options */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12h15m-15 6h15m-15-12h15"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Display Options
              </h2>
              <p className="text-sm text-gray-600">
                Control which parts of each menu item are visible in the live
                section.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                key: 'showImages',
                label: usesDirectLayoutItems
                  ? 'Show Layout Images'
                  : 'Show Item Images',
                description: usesDirectLayoutItems
                  ? 'Display uploaded card images in the selected layout.'
                  : 'Display uploaded item images in visual layouts.',
                checked: formConfig.showImages || false,
                visible: usesDirectLayoutItems
                  ? directLayoutConfig.usesImages
                  : usesItemImages,
              },
              {
                key: 'showDescriptions',
                label: 'Show Descriptions',
                description: 'Display the item description text.',
                checked: formConfig.showDescriptions || false,
                visible: true,
              },
              {
                key: 'showPrices',
                label: 'Show Prices',
                description: 'Display item prices inside the layout.',
                checked: formConfig.showPrices || false,
                visible: !usesDirectLayoutItems,
              },
              {
                key: 'showDietaryInfo',
                label: 'Show Dietary Info',
                description:
                  'Display dietary badges when they exist on an item.',
                checked: formConfig.showDietaryInfo || false,
                visible: !usesDirectLayoutItems,
              },
              {
                key: 'showCategoryIcons',
                label: 'Show Category Icons',
                description: 'Use category icons in layouts that support them.',
                checked: formConfig.showCategoryIcons || false,
                visible: !usesDirectLayoutItems,
              },
            ]
              .filter((option) => option.visible)
              .map((option) => (
                <label
                  key={option.key}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) =>
                      updateConfig({
                        [option.key]: e.target.checked,
                      } as Partial<MenuConfig>)
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {option.label}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
          </div>
        </div>

        {/* CTA Button */}
        {!usesDirectLayoutItems ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Call-to-Action Button
                </h2>
                <p className="text-sm text-gray-600">
                  Configure action button settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>Button Label</span>
                  <span className="text-xs font-normal text-gray-500">
                    Button text
                  </span>
                </label>
                <input
                  type="text"
                  value={formConfig.ctaButton?.label || ''}
                  onChange={(e) => updateCtaButton({ label: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900
placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="View Full Menu"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>Button Link</span>
                  <span className="text-xs font-normal text-gray-500">
                    Button URL or anchor
                  </span>
                </label>
                <input
                  type="text"
                  value={formConfig.ctaButton?.href || ''}
                  onChange={(e) => updateCtaButton({ href: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="/menu"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Background Color</span>
                  </label>
                  <input
                    type="color"
                    value={formConfig.ctaButton?.bgColor || '#3b82f6'}
                    onChange={(e) =>
                      updateCtaButton({ bgColor: e.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Text Color</span>
                  </label>
                  <input
                    type="color"
                    value={formConfig.ctaButton?.textColor || '#ffffff'}
                    onChange={(e) =>
                      updateCtaButton({ textColor: e.target.value })
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Typography & Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Typography & Buttons
              </h2>
              <p className="text-sm text-gray-600">
                Customize text styles and button appearance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Custom Typography & Styles
                </label>
                <p className="text-xs text-gray-500">
                  Override global CSS with custom styling options
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formConfig.is_custom || false}
                  onChange={(e) =>
                    updateConfig({ is_custom: e.target.checked })
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!formConfig.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Using Global Styles
                    </h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles
                      defined in your theme settings. Enable custom typography
                      above to override these styles with section-specific
                      options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={formConfig}
                  onChange={(updates) => updateConfig(updates)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updating}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                Save Menu Settings
              </>
            )}
          </button>
        </div>
      </form>

      {/* Image Gallery Modal */}
      {showGalleryModal && (
        <ImageGalleryModal
          isOpen={showGalleryModal}
          restaurantId={restaurantId}
          title={galleryModalCopy.title}
          description={galleryModalCopy.description}
          onSelect={handleMediaSelect}
          onClose={() => {
            setShowGalleryModal(false);
            setCurrentMediaField(null);
          }}
        />
      )}
    </>
  );
}
