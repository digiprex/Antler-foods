import type {
  MenuConfig,
  MenuLayout,
  MenuLayoutSettings,
} from '@/types/menu.types';

export type MenuLayoutContentMode = 'direct' | 'categories';
export type MenuLayoutControlKind = 'slider' | 'select' | 'toggle';

export interface MenuLayoutControlOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface MenuLayoutControlDefinition {
  kind: MenuLayoutControlKind;
  field: string;
  mobileField?: string;
  label: string;
  description: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: MenuLayoutControlOption[];
}

export interface MenuLayoutControlGroup {
  title: string;
  description: string;
  controls: MenuLayoutControlDefinition[];
}

export interface MenuLayoutDefinition {
  value: MenuLayout;
  name: string;
  description: string;
  badge?: string;
  contentMode: MenuLayoutContentMode;
  itemSlots: number;
  usesImages: boolean;
  imageOptional?: boolean;
  usesButtons?: boolean;
  supportsCategories?: boolean;
  defaults: Record<string, boolean | number | string>;
  controlGroups: MenuLayoutControlGroup[];
}

export const MENU_LAYOUT_ORDER: MenuLayout[] = [
  'grid',
  'list',
  'masonry',
  'carousel',
  'tabs',
  'accordion',
  'two-column',
  'single-column',
  'featured-grid',
  'minimal',
];

export const MENU_LAYOUT_DEFINITIONS: Record<MenuLayout, MenuLayoutDefinition> = {
  grid: {
    value: 'grid',
    name: 'Grid',
    description: 'Two visual cards with image-led storytelling and overlay copy.',
    badge: 'Most flexible',
    contentMode: 'direct',
    itemSlots: 2,
    usesImages: true,
    usesButtons: true,
    defaults: {
      columns: 2,
      mobileColumns: 1,
      gap: 24,
      mobileGap: 16,
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      overlayTextPosition: 'center',
      mobileOverlayTextPosition: 'center',
    },
    controlGroups: [
      {
        title: 'Structure',
        description: 'Tune the grid density and card spacing.',
        controls: [
          {
            kind: 'slider',
            field: 'columns',
            mobileField: 'mobileColumns',
            label: 'Columns',
            description: 'Number of cards shown in each row.',
            min: 1,
            max: 4,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'gap',
            mobileField: 'mobileGap',
            label: 'Card Gap',
            description: 'Space between cards.',
            min: 8,
            max: 40,
            step: 2,
            unit: 'px',
          },
        ],
      },
      {
        title: 'Media',
        description: 'Control how images and overlay copy sit inside the cards.',
        controls: [
          {
            kind: 'select',
            field: 'imageAspectRatio',
            mobileField: 'mobileImageAspectRatio',
            label: 'Image Ratio',
            description: 'Shape of each preview card.',
            options: [
              { value: 'square', label: 'Square' },
              { value: 'portrait', label: 'Portrait' },
              { value: 'landscape', label: 'Landscape' },
              { value: 'wide', label: 'Wide' },
            ],
          },
          {
            kind: 'select',
            field: 'overlayTextPosition',
            mobileField: 'mobileOverlayTextPosition',
            label: 'Overlay Position',
            description: 'Placement of the title and CTA inside the image.',
            options: [
              { value: 'top-left', label: 'Top Left' },
              { value: 'center', label: 'Center' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'bottom-center', label: 'Bottom Center' },
            ],
          },
        ],
      },
    ],
  },
  list: {
    value: 'list',
    name: 'List',
    description: 'Bold promotional cards for highlighted dishes, deals, or callouts.',
    contentMode: 'direct',
    itemSlots: 2,
    usesImages: false,
    usesButtons: true,
    defaults: {
      cardCount: 2,
      mobileCardCount: 1,
      cardStyle: 'soft',
      contentAlignment: 'center',
      cardGap: 20,
      mobileCardGap: 16,
    },
    controlGroups: [
      {
        title: 'Cards',
        description: 'Control how many promo cards sit in the row and how they align.',
        controls: [
          {
            kind: 'slider',
            field: 'cardCount',
            mobileField: 'mobileCardCount',
            label: 'Cards Per Row',
            description: 'Maximum promo cards shown side by side.',
            min: 1,
            max: 2,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'cardGap',
            mobileField: 'mobileCardGap',
            label: 'Card Gap',
            description: 'Space between promo cards.',
            min: 8,
            max: 36,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'select',
            field: 'contentAlignment',
            label: 'Content Alignment',
            description: 'Align promo content within each card.',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ],
          },
          {
            kind: 'select',
            field: 'cardStyle',
            label: 'Card Style',
            description: 'Surface treatment for list cards.',
            options: [
              { value: 'soft', label: 'Soft' },
              { value: 'outlined', label: 'Outlined' },
              { value: 'glass', label: 'Glass' },
              { value: 'minimal', label: 'Minimal' },
            ],
          },
        ],
      },
    ],
  },
  masonry: {
    value: 'masonry',
    name: 'Masonry',
    description: 'Editorial image cards with a staggered visual rhythm.',
    contentMode: 'direct',
    itemSlots: 4,
    usesImages: true,
    usesButtons: true,
    defaults: {
      columns: 2,
      mobileColumns: 1,
      gap: 22,
      mobileGap: 16,
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
    },
    controlGroups: [
      {
        title: 'Columns',
        description: 'Adjust the masonry density for desktop and mobile.',
        controls: [
          {
            kind: 'slider',
            field: 'columns',
            mobileField: 'mobileColumns',
            label: 'Columns',
            description: 'How many masonry stacks appear across the section.',
            min: 1,
            max: 3,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'gap',
            mobileField: 'mobileGap',
            label: 'Gap',
            description: 'Spacing between masonry tiles.',
            min: 8,
            max: 36,
            step: 2,
            unit: 'px',
          },
        ],
      },
    ],
  },
  carousel: {
    value: 'carousel',
    name: 'Carousel',
    description: 'Scrollable spotlight cards with strong visual hierarchy.',
    badge: 'Interactive',
    contentMode: 'direct',
    itemSlots: 6,
    usesImages: true,
    usesButtons: true,
    defaults: {
      cardCount: 3,
      mobileCardCount: 1,
      slideSpacing: 16,
      mobileSlideSpacing: 12,
      autoplay: false,
      snapBehavior: 'proximity',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      overlayTextPosition: 'bottom-left',
      mobileOverlayTextPosition: 'bottom-left',
      showArrows: true,
      showDots: true,
      cardAnimation: 'lift',
    },
    controlGroups: [
      {
        title: 'Carousel Flow',
        description: 'Configure the amount of cards and how the slider moves.',
        controls: [
          {
            kind: 'slider',
            field: 'cardCount',
            mobileField: 'mobileCardCount',
            label: 'Visible Cards',
            description: 'How many cards appear in the frame at once.',
            min: 1,
            max: 4,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'slideSpacing',
            mobileField: 'mobileSlideSpacing',
            label: 'Slide Spacing',
            description: 'Space between carousel cards.',
            min: 4,
            max: 36,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'toggle',
            field: 'autoplay',
            label: 'Autoplay',
            description: 'Automatically advance spotlight items in the live preview.',
          },
          {
            kind: 'select',
            field: 'snapBehavior',
            label: 'Snap Behavior',
            description: 'How firmly the track should snap between cards.',
            options: [
              { value: 'proximity', label: 'Proximity' },
              { value: 'mandatory', label: 'Mandatory' },
            ],
          },
        ],
      },
      {
        title: 'Card Presentation',
        description: 'Tune the visuals of each spotlight card.',
        controls: [
          {
            kind: 'select',
            field: 'overlayTextPosition',
            mobileField: 'mobileOverlayTextPosition',
            label: 'Overlay Position',
            description: 'Placement of the text inside the card.',
            options: [
              { value: 'top-left', label: 'Top Left' },
              { value: 'center', label: 'Center' },
              { value: 'bottom-left', label: 'Bottom Left' },
              { value: 'bottom-center', label: 'Bottom Center' },
            ],
          },
          {
            kind: 'toggle',
            field: 'showArrows',
            label: 'Arrow Controls',
            description: 'Display previous and next arrows.',
          },
          {
            kind: 'toggle',
            field: 'showDots',
            label: 'Dot Indicators',
            description: 'Show pagination dots below the slider.',
          },
          {
            kind: 'select',
            field: 'cardAnimation',
            label: 'Card Animation',
            description: 'Subtle motion applied to carousel cards.',
            options: [
              { value: 'none', label: 'None' },
              { value: 'lift', label: 'Lift' },
              { value: 'fade', label: 'Fade' },
            ],
          },
        ],
      },
    ],
  },
  tabs: {
    value: 'tabs',
    name: 'Tabs',
    description: 'Category-led layout with a premium intro panel and live tab switching.',
    contentMode: 'categories',
    itemSlots: 0,
    usesImages: true,
    usesButtons: true,
    supportsCategories: true,
    defaults: {
      tabAlignment: 'left',
      tabStyle: 'segmented',
      tabOrientation: 'side',
      tabSpacing: 14,
      mobileTabSpacing: 10,
      sideTabWidth: 360,
      panelTransition: 'fade',
    },
    controlGroups: [
      {
        title: 'Tab Navigation',
        description: 'Choose how the categories are presented and spaced.',
        controls: [
          {
            kind: 'select',
            field: 'tabOrientation',
            label: 'Orientation',
            description: 'Position category tabs beside the panel or above it.',
            options: [
              { value: 'side', label: 'Side Tabs' },
              { value: 'top', label: 'Top Tabs' },
            ],
          },
          {
            kind: 'select',
            field: 'tabAlignment',
            label: 'Tab Alignment',
            description: 'Alignment of the tab rail.',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
              { value: 'stretch', label: 'Stretch' },
            ],
          },
          {
            kind: 'select',
            field: 'tabStyle',
            label: 'Tab Style',
            description: 'Visual treatment for each tab selector.',
            options: [
              { value: 'pill', label: 'Pill' },
              { value: 'underline', label: 'Underline' },
              { value: 'segmented', label: 'Segmented' },
            ],
          },
          {
            kind: 'slider',
            field: 'tabSpacing',
            mobileField: 'mobileTabSpacing',
            label: 'Tab Spacing',
            description: 'Vertical or horizontal spacing between tabs.',
            min: 4,
            max: 28,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'slider',
            field: 'sideTabWidth',
            label: 'Side Rail Width',
            description: 'Width of the side tab column when using side tabs.',
            min: 240,
            max: 420,
            step: 10,
            unit: 'px',
          },
          {
            kind: 'select',
            field: 'panelTransition',
            label: 'Panel Transition',
            description: 'Animation applied when switching tabs.',
            options: [
              { value: 'none', label: 'None' },
              { value: 'fade', label: 'Fade' },
              { value: 'slide', label: 'Slide' },
            ],
          },
        ],
      },
    ],
  },
  accordion: {
    value: 'accordion',
    name: 'Accordion',
    description: 'Expandable menu groups for dense menus and mobile-first scanning.',
    contentMode: 'categories',
    itemSlots: 0,
    usesImages: true,
    usesButtons: true,
    supportsCategories: true,
    defaults: {
      itemSpacing: 16,
      mobileItemSpacing: 12,
      iconStyle: 'plus-minus',
      defaultExpandedItem: 0,
      dividerStyle: 'soft',
      surfaceMode: 'card',
      revealItems: true,
    },
    controlGroups: [
      {
        title: 'Accordion Behavior',
        description: 'Tune spacing, icon style, and reveal behavior for each row.',
        controls: [
          {
            kind: 'slider',
            field: 'itemSpacing',
            mobileField: 'mobileItemSpacing',
            label: 'Item Spacing',
            description: 'Spacing between expanded rows.',
            min: 8,
            max: 28,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'slider',
            field: 'defaultExpandedItem',
            label: 'Default Open Row',
            description: 'Which category is open by default.',
            min: 0,
            max: 6,
            step: 1,
          },
          {
            kind: 'select',
            field: 'iconStyle',
            label: 'Icon Style',
            description: 'Icon shown for open and closed rows.',
            options: [
              { value: 'plus-minus', label: 'Plus / Minus' },
              { value: 'chevron', label: 'Chevron' },
              { value: 'caret', label: 'Caret' },
            ],
          },
          {
            kind: 'select',
            field: 'dividerStyle',
            label: 'Divider Style',
            description: 'Separators inside the expanded panel.',
            options: [
              { value: 'line', label: 'Line' },
              { value: 'soft', label: 'Soft' },
              { value: 'none', label: 'None' },
            ],
          },
          {
            kind: 'select',
            field: 'surfaceMode',
            label: 'Surface Mode',
            description: 'Use elevated cards or flatter stacked rows.',
            options: [
              { value: 'card', label: 'Card' },
              { value: 'flat', label: 'Flat' },
            ],
          },
          {
            kind: 'toggle',
            field: 'revealItems',
            label: 'Reveal Animation',
            description: 'Apply a subtle reveal animation when rows open.',
          },
        ],
      },
    ],
  },
  'two-column': {
    value: 'two-column',
    name: 'Two Column',
    description: 'Side-by-side menu cards with richer media and copy balance.',
    contentMode: 'direct',
    itemSlots: 2,
    usesImages: true,
    usesButtons: true,
    defaults: {
      columnRatio: '1:1',
      imagePosition: 'top',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
      contentAlignment: 'left',
      cardGap: 22,
      mobileCardGap: 16,
      stackOnMobile: true,
    },
    controlGroups: [
      {
        title: 'Columns',
        description: 'Balance the content and media across both cards.',
        controls: [
          {
            kind: 'select',
            field: 'columnRatio',
            label: 'Column Ratio',
            description: 'Relative width between the two columns.',
            options: [
              { value: '1:1', label: 'Equal' },
              { value: '5:4', label: '5 : 4' },
              { value: '4:5', label: '4 : 5' },
              { value: '3:2', label: '3 : 2' },
            ],
          },
          {
            kind: 'select',
            field: 'imagePosition',
            label: 'Image Position',
            description: 'Placement of the media within each card.',
            options: [
              { value: 'top', label: 'Top' },
              { value: 'left', label: 'Left' },
              { value: 'right', label: 'Right' },
            ],
          },
          {
            kind: 'select',
            field: 'contentAlignment',
            label: 'Content Alignment',
            description: 'Align text inside the two-column cards.',
            options: [
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ],
          },
          {
            kind: 'slider',
            field: 'cardGap',
            mobileField: 'mobileCardGap',
            label: 'Card Gap',
            description: 'Spacing between the two cards.',
            min: 8,
            max: 36,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'toggle',
            field: 'stackOnMobile',
            label: 'Stack On Mobile',
            description: 'Collapse the two-column grid into a single stack on mobile.',
          },
        ],
      },
    ],
  },
  'single-column': {
    value: 'single-column',
    name: 'Single Column',
    description: 'Centered showcase cards with more editorial breathing room.',
    contentMode: 'direct',
    itemSlots: 3,
    usesImages: true,
    usesButtons: true,
    defaults: {
      contentWidth: 'medium',
      centered: true,
      cardSpacing: 20,
      mobileCardSpacing: 16,
      stackStyle: 'stacked',
      imageAspectRatio: 'landscape',
      mobileImageAspectRatio: 'landscape',
    },
    controlGroups: [
      {
        title: 'Column Flow',
        description: 'Control the width and spacing of the centered stack.',
        controls: [
          {
            kind: 'select',
            field: 'contentWidth',
            label: 'Content Width',
            description: 'Maximum width of the centered card stack.',
            options: [
              { value: 'narrow', label: 'Narrow' },
              { value: 'medium', label: 'Medium' },
              { value: 'wide', label: 'Wide' },
            ],
          },
          {
            kind: 'toggle',
            field: 'centered',
            label: 'Center Cards',
            description: 'Keep cards aligned in the center of the section.',
          },
          {
            kind: 'slider',
            field: 'cardSpacing',
            mobileField: 'mobileCardSpacing',
            label: 'Card Spacing',
            description: 'Spacing between stacked cards.',
            min: 8,
            max: 36,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'select',
            field: 'stackStyle',
            label: 'Stack Style',
            description: 'Choose between a clean stack or a slight offset.',
            options: [
              { value: 'stacked', label: 'Stacked' },
              { value: 'offset', label: 'Offset' },
            ],
          },
        ],
      },
    ],
  },
  'featured-grid': {
    value: 'featured-grid',
    name: 'Featured Grid',
    description: 'Three spotlight cards for highlights, collections, or promos.',
    contentMode: 'direct',
    itemSlots: 3,
    usesImages: true,
    imageOptional: true,
    defaults: {
      columns: 3,
      mobileColumns: 1,
      showIcons: true,
      cardStyle: 'soft',
      contentHierarchy: 'balanced',
      cardGap: 20,
      mobileCardGap: 14,
    },
    controlGroups: [
      {
        title: 'Grid',
        description: 'Shape the feature card layout and spacing.',
        controls: [
          {
            kind: 'slider',
            field: 'columns',
            mobileField: 'mobileColumns',
            label: 'Columns',
            description: 'Number of feature cards per row.',
            min: 1,
            max: 3,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'cardGap',
            mobileField: 'mobileCardGap',
            label: 'Card Gap',
            description: 'Space between feature cards.',
            min: 8,
            max: 32,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'toggle',
            field: 'showIcons',
            label: 'Show Icon Fallback',
            description: 'Display a clean icon tile when no image is selected.',
          },
          {
            kind: 'select',
            field: 'cardStyle',
            label: 'Card Style',
            description: 'Surface treatment for feature cards.',
            options: [
              { value: 'soft', label: 'Soft' },
              { value: 'outlined', label: 'Outlined' },
              { value: 'glass', label: 'Glass' },
              { value: 'minimal', label: 'Minimal' },
            ],
          },
          {
            kind: 'select',
            field: 'contentHierarchy',
            label: 'Content Hierarchy',
            description: 'Determine what content should stand out first.',
            options: [
              { value: 'balanced', label: 'Balanced' },
              { value: 'title-first', label: 'Title First' },
              { value: 'price-first', label: 'Price First' },
            ],
          },
        ],
      },
    ],
  },
  minimal: {
    value: 'minimal',
    name: 'Minimal',
    description: 'Text-focused highlights with restrained dividers and icon support.',
    badge: 'Clean',
    contentMode: 'direct',
    itemSlots: 3,
    usesImages: true,
    imageOptional: true,
    defaults: {
      columns: 3,
      mobileColumns: 1,
      showIcons: true,
      dividerVisible: true,
      contentHierarchy: 'balanced',
      cardGap: 20,
      mobileCardGap: 14,
    },
    controlGroups: [
      {
        title: 'Minimal Grid',
        description: 'Keep the layout spacious while still allowing emphasis.',
        controls: [
          {
            kind: 'slider',
            field: 'columns',
            mobileField: 'mobileColumns',
            label: 'Columns',
            description: 'Number of highlights per row.',
            min: 1,
            max: 3,
            step: 1,
          },
          {
            kind: 'slider',
            field: 'cardGap',
            mobileField: 'mobileCardGap',
            label: 'Gap',
            description: 'Space between each minimal highlight.',
            min: 8,
            max: 32,
            step: 2,
            unit: 'px',
          },
          {
            kind: 'toggle',
            field: 'showIcons',
            label: 'Show Icons',
            description: 'Display icon markers above the minimal cards.',
          },
          {
            kind: 'toggle',
            field: 'dividerVisible',
            label: 'Center Divider',
            description: 'Keep the clean divider between the cards.',
          },
          {
            kind: 'select',
            field: 'contentHierarchy',
            label: 'Content Hierarchy',
            description: 'Set which content receives the strongest emphasis.',
            options: [
              { value: 'balanced', label: 'Balanced' },
              { value: 'title-first', label: 'Title First' },
              { value: 'price-first', label: 'Price First' },
            ],
          },
        ],
      },
    ],
  },
};

export const CATEGORY_DRIVEN_MENU_LAYOUTS = new Set<MenuLayout>([
  'tabs',
  'accordion',
]);

export const IMAGE_FOCUSED_MENU_LAYOUTS = new Set<MenuLayout>([
  'grid',
  'masonry',
  'carousel',
  'two-column',
  'single-column',
]);

export function getMenuLayoutDefinition(layout?: MenuLayout | null) {
  return MENU_LAYOUT_DEFINITIONS[(layout || 'grid') as MenuLayout];
}

export function isCategoryMenuLayout(layout?: MenuLayout | null) {
  return CATEGORY_DRIVEN_MENU_LAYOUTS.has((layout || 'grid') as MenuLayout);
}

export function isDirectMenuLayout(layout?: MenuLayout | null) {
  return !isCategoryMenuLayout(layout);
}

export function getMenuLayoutSlotCount(layout?: MenuLayout | null) {
  return getMenuLayoutDefinition(layout).itemSlots;
}

export function mergeMenuLayoutSettings(
  settings?: MenuLayoutSettings | null,
): MenuLayoutSettings {
  const merged: MenuLayoutSettings = {};

  for (const layout of MENU_LAYOUT_ORDER) {
    merged[layout] = {
      ...MENU_LAYOUT_DEFINITIONS[layout].defaults,
      ...(settings?.[layout] || {}),
    } as MenuLayoutSettings[typeof layout];

    if (layout === 'grid') {
      const gridSettings = merged.grid as Record<string, unknown>;
      if (
        gridSettings.overlayTextPosition === undefined ||
        gridSettings.overlayTextPosition === 'bottom-left' ||
        gridSettings.overlayTextPosition === 'bottom-center'
      ) {
        gridSettings.overlayTextPosition = 'center';
      }

      if (
        gridSettings.mobileOverlayTextPosition === undefined ||
        gridSettings.mobileOverlayTextPosition === 'bottom-left' ||
        gridSettings.mobileOverlayTextPosition === 'bottom-center'
      ) {
        gridSettings.mobileOverlayTextPosition = 'center';
      }
    }
  }

  return merged;
}

export function withMenuLayoutDefaults<T extends Partial<MenuConfig>>(config: T): T {
  return {
    ...config,
    layoutSettings: mergeMenuLayoutSettings(config.layoutSettings),
  };
}
