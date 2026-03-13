/**
 * Hero Settings Form
 *
 * Enhanced interface for configuring hero section settings:
 * - Layout selection (10 different layouts)
 * - Content configuration (headline, subheadline, description)
 * - Button configuration (primary and secondary)
 * - Media settings (image, video, background)
 * - Styling options (colors, spacing, alignment)
 * - Feature cards management
 * - Live preview on the right side
 */

'use client';

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Hero from '@/components/hero';
import Toast from '@/components/ui/toast';
import { ImageGalleryModal } from './image-gallery-modal';
import { useHeroConfig, useUpdateHeroConfig } from '@/hooks/use-hero-config';
import { useSectionStyleDefaults } from '@/hooks/use-section-style-defaults';
import type { HeroConfig, HeroButton, HeroFeature, HeroImage } from '@/types/hero.types';
import { DEFAULT_HERO_CONFIG } from '@/types/hero.types';
import { getHeroLayoutMediaCapabilities } from '@/lib/hero-layout-media';
import { getRenderableHeroButtons, mergeHeroConfig } from '@/lib/hero-config';
import { SectionTypographyControls } from '@/components/admin/section-typography-controls';
import { getAllHeroLayouts } from '@/utils/hero-layout-utils';

type MinimalImageSlotKey = keyof NonNullable<HeroConfig['minimalImages']>;
type SideBySideImageSlotKey = keyof NonNullable<HeroConfig['sideBySideImages']>;
type MediaFieldType =
  | 'hero_image'
  | 'background_video'
  | 'background_image'
  | 'minimal_image_primary'
  | 'minimal_image_secondary_top'
  | 'minimal_image_secondary_bottom'
  | 'side_by_side_image_left'
  | 'side_by_side_image_center'
  | 'side_by_side_image_right';
type PreviewViewport = 'desktop' | 'mobile';

interface HeroSettingsFormProps {
  pageId?: string;
  templateId?: string;
  isNewSection?: boolean;
}

// Dynamically load layout options from hero-layouts.json
const LAYOUT_OPTIONS = getAllHeroLayouts().map(layout => ({
  value: layout.id,
  name: layout.name,
  description: layout.description
}));

const HERO_ANIMATION_OPTIONS = [
  { value: 'none', name: 'No Animation', description: 'Keep hero content static.' },
  { value: 'fade', name: 'Fade', description: 'Soft fade in and out on scroll.' },
  { value: 'fade-up', name: 'Fade Up', description: 'Fade with a slight upward reveal.' },
  { value: 'zoom', name: 'Zoom', description: 'Subtle scale-in reveal on scroll.' },
  { value: 'cinematic', name: 'Cinematic', description: 'Blur-to-sharp reveal with staggered motion.' },
] as const;

const HERO_IMAGE_OBJECT_FIT_OPTIONS: Array<{
  value: NonNullable<HeroConfig['imageObjectFit']>;
  name: string;
  description: string;
}> = [
  { value: 'cover', name: 'Cover', description: 'Fill the frame and crop when needed.' },
  { value: 'contain', name: 'Contain', description: 'Show the full image without cropping.' },
  { value: 'fill', name: 'Fill', description: 'Stretch the image to match the frame.' },
  { value: 'none', name: 'None', description: 'Keep the original image size.' },
  { value: 'scale-down', name: 'Scale Down', description: 'Shrink only when the image is too large.' },
];

const DEFAULT_PRIMARY_BUTTON = DEFAULT_HERO_CONFIG.primaryButton
  ? { ...DEFAULT_HERO_CONFIG.primaryButton }
  : { label: 'View Menu', href: '#menu', variant: 'primary' as const };
const DEFAULT_SECONDARY_BUTTON = DEFAULT_HERO_CONFIG.secondaryButton
  ? { ...DEFAULT_HERO_CONFIG.secondaryButton }
  : { label: 'Book a Table', href: '#reservations', variant: 'outline' as const };

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const HERO_PREVIEW_BACKGROUND = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' fill='none'>
  <defs>
    <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#020617'/>
      <stop offset='48%' stop-color='#1d4ed8'/>
      <stop offset='100%' stop-color='#f97316'/>
    </linearGradient>
    <radialGradient id='glow' cx='0' cy='0' r='1' gradientTransform='translate(1200 180) rotate(128) scale(520 300)'>
      <stop stop-color='#ffffff' stop-opacity='0.4'/>
      <stop offset='1' stop-color='#ffffff' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='1600' height='900' rx='36' fill='url(#bg)'/>
  <rect x='0' y='0' width='1600' height='900' fill='url(#glow)'/>
  <g opacity='0.14' stroke='#ffffff'>
    <path d='M84 760C232 620 356 552 520 538C734 522 826 658 1068 634C1238 618 1364 552 1512 420' stroke-width='28' stroke-linecap='round'/>
    <path d='M120 254C270 196 414 182 536 216C660 250 762 336 894 360C1058 390 1226 326 1440 150' stroke-width='18' stroke-linecap='round'/>
  </g>
  <g opacity='0.9'>
    <rect x='170' y='170' width='360' height='220' rx='26' fill='#f8fafc' fill-opacity='0.13'/>
    <rect x='546' y='144' width='240' height='156' rx='22' fill='#f8fafc' fill-opacity='0.16'/>
    <rect x='1150' y='604' width='212' height='112' rx='22' fill='#f8fafc' fill-opacity='0.16'/>
  </g>
</svg>
`);

const HERO_PREVIEW_IMAGE = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 900' fill='none'>
  <defs>
    <linearGradient id='panel' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#0f172a'/>
      <stop offset='40%' stop-color='#4338ca'/>
      <stop offset='100%' stop-color='#f59e0b'/>
    </linearGradient>
    <radialGradient id='spot' cx='0' cy='0' r='1' gradientTransform='translate(930 160) rotate(142) scale(360 220)'>
      <stop stop-color='#ffffff' stop-opacity='0.35'/>
      <stop offset='1' stop-color='#ffffff' stop-opacity='0'/>
    </radialGradient>
  </defs>
  <rect width='1200' height='900' rx='44' fill='url(#panel)'/>
  <rect width='1200' height='900' rx='44' fill='url(#spot)'/>
  <g opacity='0.18'>
    <rect x='70' y='550' width='1060' height='240' rx='34' fill='#ffffff'/>
    <rect x='98' y='594' width='180' height='120' rx='22' fill='#0f172a'/>
    <rect x='320' y='598' width='296' height='28' rx='14' fill='#0f172a'/>
    <rect x='320' y='648' width='436' height='24' rx='12' fill='#0f172a'/>
  </g>
  <g opacity='0.82'>
    <rect x='124' y='128' width='280' height='146' rx='30' fill='#ffffff' fill-opacity='0.12'/>
    <rect x='440' y='178' width='198' height='16' rx='8' fill='#ffffff' fill-opacity='0.65'/>
    <rect x='440' y='214' width='288' height='16' rx='8' fill='#ffffff' fill-opacity='0.45'/>
    <rect x='760' y='132' width='250' height='250' rx='42' fill='#ffffff' fill-opacity='0.14'/>
  </g>
</svg>
`);

const HERO_CARD_SAMPLE_PHOTO = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' fill='none'>
  <defs>
    <linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#1a2540'/>
      <stop offset='52%' stop-color='#344b7a'/>
      <stop offset='100%' stop-color='#111827'/>
    </linearGradient>
    <linearGradient id='building' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#deb27a'/>
      <stop offset='100%' stop-color='#ad6f34'/>
    </linearGradient>
    <linearGradient id='street' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0%' stop-color='#111827'/>
      <stop offset='100%' stop-color='#020617'/>
    </linearGradient>
    <filter id='blur' x='-20%' y='-20%' width='140%' height='140%'>
      <feGaussianBlur stdDeviation='22'/>
    </filter>
  </defs>
  <rect width='1600' height='900' fill='url(#sky)'/>
  <rect y='612' width='1600' height='288' fill='url(#street)'/>
  <rect x='178' y='120' width='1244' height='520' rx='28' fill='url(#building)'/>
  <rect x='178' y='152' width='1244' height='90' fill='#f4ddbf' fill-opacity='0.68'/>
  <rect x='248' y='254' width='1104' height='306' rx='20' fill='#ecd7be'/>
  <rect x='254' y='254' width='1092' height='84' rx='16' fill='#1f2f5d'/>
  <path d='M322 330H1268L1216 394H376L322 330Z' fill='#203a73'/>
  <rect x='388' y='394' width='174' height='136' rx='14' fill='#f8d39a'/>
  <rect x='602' y='394' width='174' height='136' rx='14' fill='#f8d39a'/>
  <rect x='816' y='394' width='174' height='136' rx='14' fill='#f8d39a'/>
  <rect x='1030' y='394' width='174' height='136' rx='14' fill='#f8d39a'/>
  <rect x='1096' y='348' width='112' height='240' rx='14' fill='#1b1b24'/>
  <rect x='1118' y='378' width='68' height='180' rx='8' fill='#14161f'/>
  <rect x='430' y='426' width='90' height='70' rx='8' fill='#fff4dc'/>
  <rect x='644' y='426' width='90' height='70' rx='8' fill='#fff4dc'/>
  <rect x='858' y='426' width='90' height='70' rx='8' fill='#fff4dc'/>
  <rect x='1072' y='426' width='90' height='70' rx='8' fill='#fff4dc'/>
  <g opacity='0.65' filter='url(#blur)'>
    <circle cx='440' cy='446' r='54' fill='#fff2bf'/>
    <circle cx='654' cy='446' r='54' fill='#fff2bf'/>
    <circle cx='868' cy='446' r='54' fill='#fff2bf'/>
    <circle cx='1082' cy='446' r='54' fill='#fff2bf'/>
  </g>
  <rect x='290' y='170' width='850' height='36' rx='18' fill='#0f172a' fill-opacity='0.45'/>
  <rect x='350' y='178' width='400' height='18' rx='9' fill='#f8fafc' fill-opacity='0.72'/>
  <rect x='260' y='678' width='1080' height='56' rx='18' fill='#070b14' fill-opacity='0.82'/>
  <circle cx='338' cy='704' r='24' fill='#111827'/>
  <circle cx='1238' cy='704' r='24' fill='#111827'/>
</svg>
`);

const HERO_CARD_SAMPLE_DISH = svgToDataUri(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 900' fill='none'>
  <defs>
    <radialGradient id='plate' cx='0' cy='0' r='1' gradientTransform='translate(450 450) rotate(90) scale(310)'>
      <stop offset='0%' stop-color='#fff7ed'/>
      <stop offset='100%' stop-color='#e5e7eb'/>
    </radialGradient>
  </defs>
  <rect width='900' height='900' rx='46' fill='#d6d3d1'/>
  <circle cx='450' cy='450' r='310' fill='url(#plate)'/>
  <circle cx='450' cy='450' r='248' fill='#f5e7cb'/>
  <ellipse cx='390' cy='438' rx='126' ry='86' fill='#7c2d12'/>
  <ellipse cx='520' cy='470' rx='118' ry='90' fill='#a16207'/>
  <ellipse cx='432' cy='542' rx='104' ry='76' fill='#365314'/>
  <ellipse cx='506' cy='366' rx='92' ry='66' fill='#dc2626'/>
  <circle cx='330' cy='354' r='34' fill='#f59e0b'/>
  <circle cx='590' cy='552' r='32' fill='#f59e0b'/>
  <circle cx='458' cy='446' r='24' fill='#fafaf9'/>
</svg>
`);

const PREVIEW_FEATURES: HeroFeature[] = [
  { title: 'Fresh ingredients', description: 'Clear hierarchy and visual spacing for feature-heavy hero layouts.' },
  { title: 'Fast booking flow', description: 'Buttons stay balanced and easy to tap on smaller screens.' },
  { title: 'Stronger contrast', description: 'Preview backgrounds keep text readable before custom media is selected.' },
];

const HERO_PREVIEW_COPY = {
  headline: 'Fresh flavors, warm hospitality',
  subheadline: 'Authentic dishes prepared daily',
  description:
    'Explore signature dishes, reserve a table, and preview how each hero layout introduces your restaurant.',
  tag: 'Authentic dining',
  title: 'Fresh flavors, served daily',
  body: 'Seasonal dishes, warm service, and easy online ordering.',
  primaryCta: 'View menu',
  secondaryCta: 'Book table',
};

const MINIMAL_IMAGE_SLOTS: Array<{
  key: MinimalImageSlotKey;
  field: Extract<MediaFieldType, `minimal_image_${string}`>;
  label: string;
  description: string;
}> = [
  {
    key: 'primary',
    field: 'minimal_image_primary',
    label: 'Large Left Image',
    description: 'Main image shown in the large tile on the left.',
  },
  {
    key: 'secondaryTop',
    field: 'minimal_image_secondary_top',
    label: 'Top Right Image',
    description: 'Top stacked image on the right side.',
  },
  {
    key: 'secondaryBottom',
    field: 'minimal_image_secondary_bottom',
    label: 'Bottom Right Image',
    description: 'Bottom stacked image on the right side.',
  },
];

const MINIMAL_IMAGE_FIELD_TO_SLOT: Record<
  Extract<MediaFieldType, `minimal_image_${string}`>,
  MinimalImageSlotKey
> = {
  minimal_image_primary: 'primary',
  minimal_image_secondary_top: 'secondaryTop',
  minimal_image_secondary_bottom: 'secondaryBottom',
};

const SIDE_BY_SIDE_IMAGE_SLOTS: Array<{
  key: SideBySideImageSlotKey;
  field: Extract<MediaFieldType, `side_by_side_image_${string}`>;
  label: string;
  description: string;
}> = [
  {
    key: 'left',
    field: 'side_by_side_image_left',
    label: 'Left Image',
    description: 'First image shown in the left column.',
  },
  {
    key: 'center',
    field: 'side_by_side_image_center',
    label: 'Center Image',
    description: 'Middle image shown in the center column.',
  },
  {
    key: 'right',
    field: 'side_by_side_image_right',
    label: 'Right Image',
    description: 'Third image shown in the right column.',
  },
];

const SIDE_BY_SIDE_IMAGE_FIELD_TO_SLOT: Record<
  Extract<MediaFieldType, `side_by_side_image_${string}`>,
  SideBySideImageSlotKey
> = {
  side_by_side_image_left: 'left',
  side_by_side_image_center: 'center',
  side_by_side_image_right: 'right',
};

const hasMinimalImagesConfigured = (
  minimalImages: HeroConfig['minimalImages'] | undefined,
) =>
  Boolean(
    minimalImages?.primary ||
      minimalImages?.secondaryTop ||
      minimalImages?.secondaryBottom,
  );

const hasSideBySideImagesConfigured = (
  sideBySideImages: HeroConfig['sideBySideImages'] | undefined,
) =>
  Boolean(
    sideBySideImages?.left ||
      sideBySideImages?.center ||
      sideBySideImages?.right,
  );

const getHeroImageFieldMeta = (layout: HeroConfig['layout'] | undefined) => {
  switch (layout) {
    case 'split':
      return {
        label: 'Right-side Hero Image',
        description: 'Upload the image shown on the right side of this split layout.',
      };
    case 'split-reverse':
      return {
        label: 'Left-side Hero Image',
        description: 'Upload the image shown on the left side of this split layout.',
      };
    case 'side-by-side':
      return {
        label: 'Gallery Images',
        description: 'Set the left, center, and right gallery images independently for this layout.',
      };
    case 'offset':
      return {
        label: 'Top Hero Image',
        description: 'Upload the image shown at the top of this centered vertical layout.',
      };
    case 'with-features':
      return {
        label: 'Feature Hero Image',
        description: 'Upload the supporting image displayed with your content and feature cards.',
      };
    case 'minimal':
      return {
        label: 'Grid Images',
        description: 'Set the large image and the two stacked images independently for this layout.',
      };
    case 'image-collage':
      return {
        label: 'Collage Images',
        description: 'Upload image that will be shown in 2 overlapping positions for a collage effect.',
      };
    default:
      return {
        label: 'Hero Image',
        description: 'Upload the main image used by this layout.',
      };
  }
};

const getMediaSectionIntro = (
  layout: HeroConfig['layout'] | undefined,
  mediaFields: ReturnType<typeof getHeroLayoutMediaCapabilities>,
) => {
  if (mediaFields.showHeroImage) {
    return {
      title: 'Layout-specific Hero Image',
      description:
        'This layout uses its own hero image. Upload that image below, while your shared background image stays saved for background-based layouts.',
    };
  }

  if (layout === 'video-background') {
    return {
      title: 'Video Layout With Shared Fallback',
      description:
        'Upload a background video for the full effect. Until then, the shared background image is used as a fallback and stays saved across layout changes.',
    };
  }

  return {
    title: 'Shared Background Image',
    description:
      'Your background image is preserved while you switch layouts, so you can compare hero styles without re-uploading it.',
  };
};

const getSharedBackgroundMeta = (
  layout: HeroConfig['layout'] | undefined,
  mediaFields: ReturnType<typeof getHeroLayoutMediaCapabilities>,
) => {
  if (layout === 'video-background') {
    return {
      label: 'Shared Background Image',
      badge: 'Fallback across hero layouts',
      description:
        'Used as a fallback until you upload a background video. It also stays ready for your other hero layouts.',
    };
  }

  if (mediaFields.showHeroImage) {
    return {
      label: 'Shared Background Image',
      badge: 'Saved for background-based layouts',
      description:
        'This layout uses the hero image above. Keep a shared background image here for default, centered, minimal, and full-height layouts.',
    };
  }

  return {
    label: 'Shared Background Image',
    badge: 'Used in this layout',
    description: 'This layout uses the shared background image directly.',
  };
};

const getPreviewHeroConfig = (config: HeroConfig): HeroConfig => {
  const resolvedConfig = mergeHeroConfig(config);
  const layout = resolvedConfig.layout || 'default';
  const mediaFields = getHeroLayoutMediaCapabilities(layout);
  const { primaryButton, secondaryButton } = getRenderableHeroButtons(resolvedConfig);
  const hasMinimalImages = hasMinimalImagesConfigured(resolvedConfig.minimalImages);
  const hasSideBySideImages = hasSideBySideImagesConfigured(resolvedConfig.sideBySideImages);
  const previewHeroImage =
    mediaFields.showHeroImage &&
    (resolvedConfig.image ||
      ((layout === 'minimal' && hasMinimalImages) ||
      (layout === 'side-by-side' && hasSideBySideImages)
        ? undefined
        : {
            url: HERO_PREVIEW_IMAGE,
            alt: 'Preview hero image',
          }));
  const previewMinimalImages =
    layout === 'minimal'
      ? {
          primary:
            resolvedConfig.minimalImages?.primary ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
          secondaryTop:
            resolvedConfig.minimalImages?.secondaryTop ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
          secondaryBottom:
            resolvedConfig.minimalImages?.secondaryBottom ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
        }
      : resolvedConfig.minimalImages;
  const previewSideBySideImages =
    layout === 'side-by-side'
      ? {
          left:
            resolvedConfig.sideBySideImages?.left ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
          center:
            resolvedConfig.sideBySideImages?.center ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
          right:
            resolvedConfig.sideBySideImages?.right ||
            previewHeroImage ||
            ({
              url: HERO_PREVIEW_IMAGE,
              alt: 'Preview hero image',
            } satisfies HeroImage),
        }
      : resolvedConfig.sideBySideImages;

  // Only show fallback content if user hasn't provided any content at all
  const hasUserContent =
    resolvedConfig.headline?.trim() ||
    resolvedConfig.subheadline?.trim() ||
    resolvedConfig.description?.trim();
  const hasUserButtons = Boolean(
    (resolvedConfig.primaryButtonEnabled !== false && config.primaryButton) ||
      (resolvedConfig.secondaryButtonEnabled !== false && config.secondaryButton),
  );

  return {
    ...resolvedConfig,
    headline:
      resolvedConfig.headline?.trim() || (hasUserContent ? '' : HERO_PREVIEW_COPY.headline),
    subheadline:
      resolvedConfig.subheadline?.trim() ||
      (hasUserContent ? '' : HERO_PREVIEW_COPY.subheadline),
    description:
      resolvedConfig.description?.trim() ||
      (hasUserContent ? '' : HERO_PREVIEW_COPY.description),
    primaryButton:
      primaryButton ||
      (hasUserContent || hasUserButtons || resolvedConfig.primaryButtonEnabled === false
        ? undefined
        : ({
            ...DEFAULT_PRIMARY_BUTTON,
            label: HERO_PREVIEW_COPY.primaryCta,
            href: '#menu',
            variant: 'primary',
          } satisfies HeroButton)),
    secondaryButton:
      secondaryButton ||
      (hasUserContent || hasUserButtons || resolvedConfig.secondaryButtonEnabled === false
        ? undefined
        : ({
            ...DEFAULT_SECONDARY_BUTTON,
            label: HERO_PREVIEW_COPY.secondaryCta,
            href: '#reservations',
            variant: 'outline',
          } satisfies HeroButton)),
    image: previewHeroImage || undefined,
    minimalImages: previewMinimalImages,
    sideBySideImages: previewSideBySideImages,
    backgroundImage:
      mediaFields.showBackgroundImage
        ? resolvedConfig.backgroundImage || HERO_PREVIEW_BACKGROUND
        : layout === 'video-background' && !resolvedConfig.videoUrl
          ? HERO_PREVIEW_BACKGROUND
          : undefined,
    videoUrl: mediaFields.showBackgroundVideo ? resolvedConfig.videoUrl : undefined,
    features:
      layout === 'with-features' && (!resolvedConfig.features || resolvedConfig.features.length === 0)
        ? PREVIEW_FEATURES
        : resolvedConfig.features,
    bgColor: resolvedConfig.bgColor || '#0f172a',
    textColor:
      resolvedConfig.textColor ||
      (mediaFields.showBackgroundImage || layout === 'video-background' || layout === 'full-height'
        ? '#ffffff'
        : '#0f172a'),
    overlayColor: resolvedConfig.overlayColor || '#020617',
    overlayOpacity:
      resolvedConfig.overlayOpacity ??
      (mediaFields.showBackgroundImage || layout === 'video-background' ? 0.48 : 0.18),
    minHeight:
      resolvedConfig.minHeight ||
      (layout === 'minimal' ? '420px' : layout === 'video-background' || layout === 'full-height' ? '680px' : '560px'),
  };
};

const previewUsesPlaceholderContent = (config: HeroConfig) => {
  const resolvedConfig = mergeHeroConfig(config);
  const layout = resolvedConfig.layout || 'default';
  const mediaFields = getHeroLayoutMediaCapabilities(layout);
  const hasMinimalImages = hasMinimalImagesConfigured(resolvedConfig.minimalImages);
  const hasSideBySideImages = hasSideBySideImagesConfigured(resolvedConfig.sideBySideImages);

  // Check if user has provided any content at all
  const hasUserContent =
    resolvedConfig.headline?.trim() ||
    resolvedConfig.subheadline?.trim() ||
    resolvedConfig.description?.trim();
  const hasUserButtons = Boolean(
    (resolvedConfig.primaryButtonEnabled !== false && config.primaryButton) ||
      (resolvedConfig.secondaryButtonEnabled !== false && config.secondaryButton),
  );

  return Boolean(
    (!hasUserContent && !hasUserButtons) ||
      (mediaFields.showHeroImage &&
        !(
          resolvedConfig.image ||
          (layout === 'minimal' && hasMinimalImages) ||
          (layout === 'side-by-side' && hasSideBySideImages)
        )) ||
      ((mediaFields.showBackgroundImage || layout === 'video-background') &&
        !resolvedConfig.backgroundImage &&
        !resolvedConfig.videoUrl) ||
      (layout === 'with-features' &&
        (!resolvedConfig.features || resolvedConfig.features.length === 0)),
  );
};

const renderHeroLayoutCardPreview = (layoutType: string) => {
  const outerShell: CSSProperties = {
    position: 'relative',
    height: '108px',
    borderRadius: '20px',
    overflow: 'hidden',
    padding: '12px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.88)',
  };

  const innerFrame = (background: string, children: ReactNode, dark = false) => (
    <div style={outerShell}>
      <div
        style={{
          position: 'relative',
          height: '100%',
          borderRadius: '18px',
          overflow: 'hidden',
          background,
          border: dark ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow: dark
            ? 'inset 0 1px 0 rgba(255, 255, 255, 0.16)'
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.78)',
        }}
      >
        {children}
      </div>
    </div>
  );

  const photoPanel = (style?: CSSProperties) => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 16px 28px rgba(15, 23, 42, 0.18)',
        ...style,
      }}
    />
  );

  const dishPanel = (style?: CSSProperties) => (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '14px',
        overflow: 'hidden',
        backgroundImage: `url(${HERO_CARD_SAMPLE_DISH})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        boxShadow: '0 14px 24px rgba(15, 23, 42, 0.14)',
        ...style,
      }}
    />
  );

  const previewTag = (dark = false) => (
    <div
      style={{
        marginBottom: '4px',
        fontSize: '5px',
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: dark ? 'rgba(255,255,255,0.82)' : '#6b7280',
      }}
    >
      {HERO_PREVIEW_COPY.tag}
    </div>
  );

  const previewTitle = (text: string, dark = false, centered = false) => (
    <div
      style={{
        maxWidth: centered ? '78%' : '100%',
        fontSize: centered ? '9px' : '8px',
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        textAlign: centered ? 'center' : 'left',
        color: dark ? '#ffffff' : '#111827',
      }}
    >
      {text}
    </div>
  );

  const previewBody = (dark = false, centered = false) => (
    <div
      style={{
        maxWidth: centered ? '64%' : '86%',
        fontSize: '5px',
        fontWeight: 600,
        lineHeight: 1.35,
        textAlign: centered ? 'center' : 'left',
        color: dark ? 'rgba(255,255,255,0.72)' : '#9ca3af',
      }}
    >
      {HERO_PREVIEW_COPY.body}
    </div>
  );

  const primaryButton = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '34px',
        height: '14px',
        padding: '0 6px',
        borderRadius: '3px',
        background: '#ef4444',
        color: '#ffffff',
        fontSize: '4.6px',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {HERO_PREVIEW_COPY.primaryCta}
    </div>
  );

  const secondaryButton = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '26px',
        height: '14px',
        padding: '0 5px',
        borderRadius: '3px',
        border: '1px solid rgba(255,255,255,0.74)',
        color: '#ffffff',
        fontSize: '4.4px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {HERO_PREVIEW_COPY.secondaryCta}
    </div>
  );

  const overlayHero = (title: string, centered = true, darkOverlay = 'linear-gradient(180deg, rgba(15,23,42,0.10) 0%, rgba(15,23,42,0.58) 100%)', showSecondary = true) =>
    innerFrame(`url(${HERO_CARD_SAMPLE_PHOTO}) center / cover no-repeat`, (
      <>
        <div style={{ position: 'absolute', inset: 0, background: darkOverlay }} />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            height: '100%',
            flexDirection: 'column',
            alignItems: centered ? 'center' : 'flex-start',
            justifyContent: 'center',
            gap: '4px',
            padding: centered ? '14px 16px' : '14px 12px',
          }}
        >
          {previewTag(true)}
          {previewTitle(title, true, centered)}
          {previewBody(true, centered)}
          <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
            {primaryButton}
            {showSecondary ? secondaryButton : null}
          </div>
        </div>
      </>
    ), true);

  const splitCanvas = (leftMedia = false, imageWidth = '42%', offset = false) =>
    innerFrame('linear-gradient(180deg, #eef2f7 0%, #e5eaf1 100%)', (
      <div style={{ position: 'relative', display: 'flex', height: '100%', padding: '12px' }}>
        {!leftMedia ? (
          <>
            <div
              style={{
                display: 'flex',
                width: offset ? '52%' : `calc(100% - ${imageWidth} - 12px)`,
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px',
                paddingLeft: '6px',
              }}
            >
              {previewTag(false)}
              {previewTitle(HERO_PREVIEW_COPY.title, false)}
              {previewBody(false)}
              <div style={{ marginTop: '2px' }}>{primaryButton}</div>
            </div>
            <div
              style={{
                position: offset ? 'absolute' : 'relative',
                right: offset ? '12px' : undefined,
                top: offset ? '15px' : undefined,
                bottom: offset ? '12px' : undefined,
                width: offset ? imageWidth : imageWidth,
                marginLeft: offset ? undefined : '12px',
              }}
            >
              {photoPanel({ borderTopLeftRadius: offset ? '8px' : '16px' })}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: imageWidth }}>{photoPanel()}</div>
            <div
              style={{
                display: 'flex',
                width: `calc(100% - ${imageWidth} - 12px)`,
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '4px',
                marginLeft: '12px',
                paddingRight: '4px',
              }}
            >
              {previewTag(false)}
              {previewTitle(HERO_PREVIEW_COPY.title, false)}
              {previewBody(false)}
              <div style={{ marginTop: '2px' }}>{primaryButton}</div>
            </div>
          </>
        )}
      </div>
    ));

  switch (layoutType) {
    case 'split':
      return splitCanvas(false, '40%');

    case 'split-reverse':
      return splitCanvas(true, '40%');

    case 'video-background':
      return innerFrame(`url(${HERO_CARD_SAMPLE_PHOTO}) center / cover no-repeat`, (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,23,42,0.86) 0%, rgba(15,23,42,0.54) 42%, rgba(15,23,42,0.18) 100%)' }} />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.16)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 7px',
              borderRadius: 999,
              background: 'rgba(2,6,23,0.58)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.88)',
              fontSize: '4.8px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: 999,
                background: '#ef4444',
                boxShadow: '0 0 10px rgba(239,68,68,0.55)',
              }}
            />
            Live Video
          </div>
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '4px',
              padding: '14px 12px',
            }}
          >
            {previewTag(true)}
            {previewTitle(HERO_PREVIEW_COPY.title, true, false)}
            {previewBody(true, false)}
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
              {primaryButton}
              {secondaryButton}
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              right: '14px',
              bottom: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.24)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              style={{
                marginLeft: '2px',
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '8px solid rgba(255,255,255,0.92)',
              }}
            />
          </div>
        </>
      ), true);

    case 'side-by-side':
      return innerFrame('linear-gradient(135deg, #e0e7ff 0%, #dbeafe 100%)', (
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', height: '100%', padding: '12px', gap: '8px' }}>
          <div
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.14)',
            }}
          />
          <div
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundImage: `url(${HERO_CARD_SAMPLE_DISH})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.14)',
            }}
          />
          <div
            style={{
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: '0 10px 20px rgba(15, 23, 42, 0.14)',
            }}
          />
        </div>
      ));

    case 'offset':
      return innerFrame('linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)', (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', padding: '10px', gap: '6px', alignItems: 'center' }}>
          <div style={{ width: '100%', flex: '1', minHeight: '60px' }}>
            {photoPanel({ borderRadius: '12px', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.16)' })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2px', textAlign: 'center' }}>
            {previewTitle(HERO_PREVIEW_COPY.title, false, true)}
            <div style={{ marginTop: '1px' }}>{primaryButton}</div>
          </div>
        </div>
      ));

    case 'with-features':
      return innerFrame('linear-gradient(180deg, #eef2f7 0%, #e5eaf1 100%)', (
        <div style={{ position: 'relative', display: 'flex', height: '100%', flexDirection: 'column', padding: '10px', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div style={{ display: 'flex', width: '50%', flexDirection: 'column', justifyContent: 'center', gap: '3px', paddingLeft: '4px' }}>
              {previewTag(false)}
              {previewTitle(HERO_PREVIEW_COPY.title, false)}
              {previewBody(false)}
              <div style={{ marginTop: '1px' }}>{primaryButton}</div>
            </div>
            <div style={{ width: '50%', height: '100%' }}>
              {photoPanel({ borderRadius: '12px' })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                style={{
                  height: '14px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid rgba(203, 213, 225, 0.72)',
                }}
              />
            ))}
          </div>
        </div>
      ));

    case 'minimal':
      return innerFrame('linear-gradient(180deg, #fefce8 0%, #fef3c7 100%)', (
        <div style={{ position: 'relative', display: 'flex', height: '100%', padding: '12px', gap: '10px' }}>
          <div style={{ display: 'flex', width: '46%', flexDirection: 'column', justifyContent: 'center', gap: '4px', paddingLeft: '4px' }}>
            {previewTag(false)}
            {previewTitle(HERO_PREVIEW_COPY.title, false)}
            {previewBody(false)}
            <div style={{ marginTop: '2px' }}>{primaryButton}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', width: '54%' }}>
            <div
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 10px 20px rgba(15, 23, 42, 0.14)',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundImage: `url(${HERO_CARD_SAMPLE_DISH})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
                }}
              />
              <div
                style={{
                  flex: 1,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
                }}
              />
            </div>
          </div>
        </div>
      ));

    case 'full-height':
      return innerFrame(`url(${HERO_CARD_SAMPLE_PHOTO}) center / cover no-repeat`, (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.14) 0%, rgba(15,23,42,0.5) 100%)' }} />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '14px 16px',
            }}
          >
            {previewTag(true)}
            {previewTitle(HERO_PREVIEW_COPY.title, true, true)}
            {previewBody(true, true)}
            <div style={{ marginTop: '2px' }}>{primaryButton}</div>
          </div>
          <div
            style={{
              position: 'absolute',
              right: '14px',
              bottom: '12px',
              width: '7px',
              height: '7px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
            }}
          />
        </>
      ), true);

    case 'centered-large':
      return innerFrame(`url(${HERO_CARD_SAMPLE_PHOTO}) center / cover no-repeat`, (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.48) 100%)' }} />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '16px',
            }}
          >
            {previewTitle('DISCOVER AUTHENTIC FLAVORS', true, true)}
            {previewBody(true, true)}
            <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
              {primaryButton}
              {secondaryButton}
            </div>
          </div>
        </>
      ), true);

    case 'image-collage':
      return innerFrame('linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%)', (
        <div style={{ position: 'relative', display: 'flex', height: '100%', padding: '12px', gap: '10px' }}>
          <div style={{ display: 'flex', width: '48%', flexDirection: 'column', justifyContent: 'center', gap: '4px', paddingLeft: '4px' }}>
            {previewTag(false)}
            {previewTitle('FAMILIENBETRIEBES PIZZA RESTAURANT', false)}
            <div style={{ marginTop: '2px' }}>{primaryButton}</div>
          </div>
          <div style={{ position: 'relative', display: 'flex', width: '52%' }}>
            <div
              style={{
                position: 'absolute',
                top: '0',
                right: '0',
                width: '58%',
                height: '52%',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundImage: `url(${HERO_CARD_SAMPLE_PHOTO})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 12px 20px rgba(15, 23, 42, 0.12)',
                zIndex: 2,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                left: '8%',
                width: '70%',
                height: '56%',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundImage: `url(${HERO_CARD_SAMPLE_DISH})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 14px 22px rgba(15, 23, 42, 0.14)',
                zIndex: 1,
              }}
            />
          </div>
        </div>
      ));

    case 'default':
    default:
      return innerFrame(`url(${HERO_CARD_SAMPLE_PHOTO}) center / cover no-repeat`, (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.5) 100%)' }} />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              height: '100%',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '44%',
                minWidth: '170px',
                maxWidth: '220px',
                minHeight: '74px',
                borderRadius: '22px',
                background: 'rgba(255,255,255,0.96)',
                border: '1px solid rgba(255,255,255,0.28)',
                boxShadow: '0 16px 30px rgba(15,23,42,0.22)',
                padding: '12px 16px 11px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  color: '#111827',
                  fontSize: '5.2px',
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                EXPERIENCE CUILIANARY EXPERIENCE
              </div>
              <div
                style={{
                  marginTop: '8px',
                  color: '#111827',
                  fontSize: '10px',
                  fontWeight: 800,
                  lineHeight: 1.02,
                  letterSpacing: '-0.04em',
                }}
              >
                Welcome to
                <br />
                Our restaurant
              </div>
              <div
                style={{
                  margin: '8px auto 0',
                  maxWidth: '86%',
                  color: '#4b5563',
                  fontSize: '4.8px',
                  fontWeight: 500,
                  lineHeight: 1.35,
                }}
              >
                Discover Exceoioptnal Experience Culinary Exp
              </div>
            </div>
          </div>
        </>
      ), true);
  }
};

export default function HeroSettingsForm({ pageId, templateId, isNewSection }: HeroSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantId = searchParams?.get('restaurant_id') || '';
  const restaurantName = searchParams?.get('restaurant_name') || '';
  const {
    config,
    loading,
    error: fetchError,
  } = useHeroConfig({
    fetchOnMount: !isNewSection,
    restaurantId,
    pageId,
    templateId,
  });
  const { updateHero, updating, error: updateError } = useUpdateHeroConfig();

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Local form state - initialize from config when loaded
  const [formConfig, setFormConfig] = useState<HeroConfig | null>(null);

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [responsiveEditorViewport, setResponsiveEditorViewport] =
    useState<PreviewViewport>('desktop');

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [currentMediaField, setCurrentMediaField] = useState<MediaFieldType | null>(null);

  // Get restaurant ID and other params from URL
  const sectionStyleDefaults = useSectionStyleDefaults(restaurantId);

  // Validate that restaurant ID is provided
  if (!restaurantId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>
        <h2>Error</h2>
        <p>Restaurant ID is required. Please provide it via URL parameter.</p>
      </div>
    );
  }

  // Initialize form config when config is loaded or for new sections
  useEffect(() => {
    if (isNewSection && !formConfig) {
      // For new sections, use default empty config
      setFormConfig({
        ...DEFAULT_HERO_CONFIG,
        ...sectionStyleDefaults,
        headline: '',
        subheadline: '',
        description: '',
        primaryButton: { ...DEFAULT_PRIMARY_BUTTON },
        secondaryButton: { ...DEFAULT_SECONDARY_BUTTON },
        primaryButtonEnabled: true,
        secondaryButtonEnabled: true,
        contentAnimation: DEFAULT_HERO_CONFIG.contentAnimation,
      });
    } else if (config && !formConfig) {
      setFormConfig(mergeHeroConfig({ ...sectionStyleDefaults, ...config }));
    }
  }, [config, formConfig, isNewSection, sectionStyleDefaults]);

  useEffect(() => {
    setFormConfig((prev) =>
      prev
        ? mergeHeroConfig({
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
      const payload: any = {
        ...formConfig,
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

      await updateHero(payload);

      setToastMessage('Hero settings saved successfully!');
      setToastType('success');
      setShowToast(true);

      // Navigate back to page settings after successful save
      setTimeout(() => {
        const params = new URLSearchParams();
        if (restaurantId) params.set('restaurant_id', restaurantId);
        if (restaurantName) params.set('restaurant_name', restaurantName);
        if (pageId) params.set('page_id', pageId);
        router.replace(`/admin/page-settings?${params.toString()}`);
      }, 1500);
    } catch (err) {
      console.error('Failed to save hero config:', err);
      setToastMessage('Failed to save settings. Please try again.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateConfig = (updates: Partial<HeroConfig>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleLayoutChange = (newLayout: string) => {
    if (!formConfig) return;

    setFormConfig((prev) =>
      prev
        ? {
            ...prev,
            layout: newLayout as HeroConfig['layout'],
          }
        : null,
    );
  };

  const updatePrimaryButton = (updates: Partial<HeroButton>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      primaryButtonEnabled: true,
      primaryButton: prev.primaryButton
        ? { ...prev.primaryButton, ...updates }
        : { ...DEFAULT_PRIMARY_BUTTON, ...updates }
    }) : null);
  };

  const updateSecondaryButton = (updates: Partial<HeroButton>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      secondaryButtonEnabled: true,
      secondaryButton: prev.secondaryButton
        ? { ...prev.secondaryButton, ...updates }
        : { ...DEFAULT_SECONDARY_BUTTON, ...updates }
    }) : null);
  };

  const addFeature = () => {
    if (!formConfig) return;
    const newFeature: HeroFeature = {
      icon: '*',
      title: 'New Feature',
      description: 'Feature description'
    };
    setFormConfig(prev => prev ? ({
      ...prev,
      features: [...(prev.features || []), newFeature]
    }) : null);
  };

  const updateFeature = (index: number, updates: Partial<HeroFeature>) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      features: prev.features?.map((feature, i) => 
        i === index ? { ...feature, ...updates } : feature
      ) || []
    }) : null);
  };

  const removeFeature = (index: number) => {
    if (!formConfig) return;
    setFormConfig(prev => prev ? ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index) || []
    }) : null);
  };

  const updateMinimalImage = (
    slot: MinimalImageSlotKey,
    imageValue: HeroImage | undefined,
  ) => {
    if (!formConfig) return;

    setFormConfig((prev) => {
      if (!prev) return prev;

      const nextMinimalImages = { ...(prev.minimalImages || {}) };

      if (imageValue) {
        nextMinimalImages[slot] = imageValue;
      } else {
        delete nextMinimalImages[slot];
      }

      return {
        ...prev,
        minimalImages:
          Object.keys(nextMinimalImages).length > 0 ? nextMinimalImages : undefined,
      };
    });
  };

  const getEffectiveMinimalImage = (slot: MinimalImageSlotKey) =>
    formConfig?.minimalImages?.[slot] || formConfig?.image;

  const updateSideBySideImage = (
    slot: SideBySideImageSlotKey,
    imageValue: HeroImage | undefined,
  ) => {
    if (!formConfig) return;

    setFormConfig((prev) => {
      if (!prev) return prev;

      const nextSideBySideImages = { ...(prev.sideBySideImages || {}) };

      if (imageValue) {
        nextSideBySideImages[slot] = imageValue;
      } else {
        delete nextSideBySideImages[slot];
      }

      return {
        ...prev,
        sideBySideImages:
          Object.keys(nextSideBySideImages).length > 0 ? nextSideBySideImages : undefined,
      };
    });
  };

  const getEffectiveSideBySideImage = (slot: SideBySideImageSlotKey) =>
    formConfig?.sideBySideImages?.[slot] || formConfig?.image;

  const openGalleryModal = (fieldType: MediaFieldType) => {
    setCurrentMediaField(fieldType);
    setShowGalleryModal(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (!formConfig || !currentMediaField) return;

    switch (currentMediaField) {
      case 'hero_image':
        updateConfig({
          image: {
            url: imageUrl,
            alt: formConfig.image?.alt || 'Hero image'
          }
        });
        break;
      case 'background_video':
        updateConfig({ videoUrl: imageUrl });
        break;
      case 'background_image':
        updateConfig({ backgroundImage: imageUrl });
        break;
      case 'minimal_image_primary':
      case 'minimal_image_secondary_top':
      case 'minimal_image_secondary_bottom': {
        const slot = MINIMAL_IMAGE_FIELD_TO_SLOT[currentMediaField];
        const fallbackImage = getEffectiveMinimalImage(slot);
        updateMinimalImage(slot, {
          url: imageUrl,
          alt: fallbackImage?.alt || 'Hero image',
        });
        break;
      }
      case 'side_by_side_image_left':
      case 'side_by_side_image_center':
      case 'side_by_side_image_right': {
        const slot = SIDE_BY_SIDE_IMAGE_FIELD_TO_SLOT[currentMediaField];
        const fallbackImage = getEffectiveSideBySideImage(slot);
        updateSideBySideImage(slot, {
          url: imageUrl,
          alt: fallbackImage?.alt || 'Hero image',
        });
        break;
      }
    }

    setShowGalleryModal(false);
    setCurrentMediaField(null);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Loading hero settings...</p>
        </div>
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-700">Initializing...</p>
        </div>
      </div>
    );
  }

  const error = fetchError || updateError;
  const previewConfig = getPreviewHeroConfig(formConfig);
  const previewHasPlaceholders = previewUsesPlaceholderContent(formConfig);
  const isPrimaryButtonEnabled = formConfig.primaryButtonEnabled !== false;
  const isSecondaryButtonEnabled = formConfig.secondaryButtonEnabled !== false;
  const editablePrimaryButton = formConfig.primaryButton || DEFAULT_PRIMARY_BUTTON;
  const editableSecondaryButton = formConfig.secondaryButton || DEFAULT_SECONDARY_BUTTON;
  const heroImagePreviewFrameStyle: CSSProperties | undefined = formConfig.imageBorderRadius?.trim()
    ? { borderRadius: formConfig.imageBorderRadius }
    : undefined;
  const heroImagePreviewStyle: CSSProperties = {
    objectFit: formConfig.imageObjectFit || 'cover',
  };
  const isMinimalLayout = (formConfig.layout || 'default') === 'minimal';
  const isSideBySideLayout = (formConfig.layout || 'default') === 'side-by-side';
  const isDefaultLayout = (formConfig.layout || 'default') === 'default';
  const isMobileEditorViewport = responsiveEditorViewport === 'mobile';
  const handleResponsiveEditorViewportChange = (viewport: PreviewViewport) => {
    setResponsiveEditorViewport(viewport);
    setPreviewViewport(viewport);
  };
  const renderResponsiveEditorTabs = (scope: string) => (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {(['desktop', 'mobile'] as PreviewViewport[]).map((viewport) => (
        <button
          key={`${scope}-viewport-${viewport}`}
          type="button"
          onClick={() => handleResponsiveEditorViewportChange(viewport)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            responsiveEditorViewport === viewport
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {viewport === 'desktop' ? 'Desktop' : 'Mobile'}
        </button>
      ))}
    </div>
  );

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
      <div className="mb-8 flex items-start">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hero Section Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Customize your website hero section</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <svg className="h-5 w-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900">Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 pb-40">
        {/* Layout Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Layout Configuration</h2>
              <p className="text-sm text-gray-600">Choose a hero layout style</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {LAYOUT_OPTIONS.map((option) => {
              const isSelected = formConfig.layout === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleLayoutChange(option.value)}
                  aria-pressed={isSelected}
                  className={`group w-full cursor-pointer rounded-xl border-2 p-3 text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="mb-3">
                    {renderHeroLayoutCardPreview(option.value)}
                  </div>
                  <div className={`text-sm font-medium ${
                    isSelected ? 'text-purple-700' : 'text-gray-900'
                  }`}>
                    {option.name}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content Configuration</h2>
              <p className="text-sm text-gray-600">Set headline, subheadline and description</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Headline</span>
                <span className="text-xs font-normal text-gray-500">Main hero headline</span>
              </label>
              <input
                type="text"
                value={formConfig.headline}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Welcome to Our Restaurant"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Subheadline</span>
                <span className="text-xs font-normal text-gray-500">Optional subheadline</span>
              </label>
              <input
                type="text"
                value={formConfig.subheadline || ''}
                onChange={(e) => updateConfig({ subheadline: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Experience culinary excellence"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Description</span>
                <span className="text-xs font-normal text-gray-500">Supporting description text</span>
              </label>
              <textarea
                value={formConfig.description || ''}
                onChange={(e) => updateConfig({ description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="Discover exceptional dining with fresh ingredients and innovative flavors"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Features Section */}
        {formConfig.layout === 'with-features' && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Feature Cards</h2>
                <p className="text-sm text-gray-600">Highlight key features of your service</p>
              </div>
            </div>

            <div className="space-y-3">
              {formConfig.features?.map((feature, index) => (
                <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={feature.icon || ''}
                      onChange={(e) => updateFeature(index, { icon: e.target.value })}
                      className="w-16 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Icon"
                    />
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, { title: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Feature Title"
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={feature.description || ''}
                    onChange={(e) => updateFeature(index, { description: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="Feature description"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={addFeature}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Feature
              </button>
            </div>
          </div>
        )}

        {/* Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call-to-Action Buttons</h2>
              <p className="text-sm text-gray-600">Configure primary and secondary action buttons</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Button */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Button</label>
                  <p className="text-xs text-gray-500">Main action button</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isPrimaryButtonEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig({
                          primaryButtonEnabled: true,
                          primaryButton: formConfig.primaryButton || { ...DEFAULT_PRIMARY_BUTTON },
                        });
                      } else {
                        updateConfig({ primaryButtonEnabled: false });
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>

              {isPrimaryButtonEnabled && (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Text</span>
                      <span className="text-xs font-normal text-gray-500">Button label</span>
                    </label>
                    <input
                      type="text"
                      value={editablePrimaryButton.label}
                      onChange={(e) => updatePrimaryButton({ label: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="View Menu"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Link</span>
                      <span className="text-xs font-normal text-gray-500">Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={editablePrimaryButton.href}
                      onChange={(e) => updatePrimaryButton({ href: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="#menu"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Style</span>
                      <span className="text-xs font-normal text-gray-500">Visual style</span>
                    </label>
                    <select
                      value={editablePrimaryButton.variant || 'primary'}
                      onChange={(e) => updatePrimaryButton({ variant: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Secondary Button */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Secondary Button</label>
                  <p className="text-xs text-gray-500">Optional second button</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isSecondaryButtonEnabled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig({
                          secondaryButtonEnabled: true,
                          secondaryButton: formConfig.secondaryButton || { ...DEFAULT_SECONDARY_BUTTON },
                        });
                      } else {
                        updateConfig({ secondaryButtonEnabled: false });
                      }
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                </label>
              </div>

              {isSecondaryButtonEnabled && (
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Text</span>
                      <span className="text-xs font-normal text-gray-500">Button label</span>
                    </label>
                    <input
                      type="text"
                      value={editableSecondaryButton.label}
                      onChange={(e) => updateSecondaryButton({ label: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="Book a Table"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Link</span>
                      <span className="text-xs font-normal text-gray-500">Where it navigates</span>
                    </label>
                    <input
                      type="text"
                      value={editableSecondaryButton.href}
                      onChange={(e) => updateSecondaryButton({ href: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder="#reservations"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Button Style</span>
                      <span className="text-xs font-normal text-gray-500">Visual style</span>
                    </label>
                    <select
                      value={editableSecondaryButton.variant || 'outline'}
                      onChange={(e) => updateSecondaryButton({ variant: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="outline">Outline</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Media Configuration</h2>
              <p className="text-sm text-gray-600">Use one shared background image, plus layout-specific hero media where needed</p>
            </div>
          </div>

          {(() => {
            const layout = formConfig.layout || 'default';
            const mediaFields = getHeroLayoutMediaCapabilities(layout);
            const heroImageMeta = getHeroImageFieldMeta(layout);
            const mediaIntro = getMediaSectionIntro(layout, mediaFields);
            const sharedBackgroundMeta = getSharedBackgroundMeta(layout, mediaFields);

            return (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900">{mediaIntro.title}</h3>
                      <p className="mt-1 text-sm text-blue-700">
                        {mediaIntro.description}
                      </p>
                    </div>
                  </div>
                </div>

                {mediaFields.showHeroImage && (
                  <div>
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>{heroImageMeta.label}</span>
                      <span className="text-xs font-normal text-gray-500">Used in this layout</span>
                    </label>
                    <p className="mb-3 text-xs text-gray-500">{heroImageMeta.description}</p>
                    {isMinimalLayout ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                          Minimal layout now supports three separate image slots. Each card below can use its own image.
                          Empty slots still fall back to the older shared hero image if one exists.
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                          {MINIMAL_IMAGE_SLOTS.map((slot) => {
                            const explicitImage = formConfig.minimalImages?.[slot.key];
                            const effectiveImage = getEffectiveMinimalImage(slot.key);
                            const isUsingSharedFallback = !explicitImage && Boolean(formConfig.image?.url);

                            return (
                              <div key={slot.field} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{slot.label}</h3>
                                    <p className="mt-1 text-xs text-gray-500">{slot.description}</p>
                                  </div>
                                  {explicitImage ? (
                                    <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-purple-700">
                                      Custom
                                    </span>
                                  ) : null}
                                </div>

                                {effectiveImage?.url ? (
                                  <div
                                    className={`overflow-hidden border border-gray-200 ${
                                      heroImagePreviewFrameStyle ? '' : 'rounded-lg'
                                    }`}
                                    style={heroImagePreviewFrameStyle}
                                  >
                                    <img
                                      src={effectiveImage?.url}
                                      alt={effectiveImage?.alt || slot.label}
                                      className="h-40 w-full object-cover"
                                      style={heroImagePreviewStyle}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                                    No image selected
                                  </div>
                                )}

                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openGalleryModal(slot.field)}
                                    disabled={!restaurantId}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                    </svg>
                                    {effectiveImage?.url ? 'Change Image' : 'Choose Image'}
                                  </button>
                                  {explicitImage ? (
                                    <button
                                      type="button"
                                      onClick={() => updateMinimalImage(slot.key, undefined)}
                                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
                                      Remove
                                    </button>
                                  ) : null}
                                </div>

                                {effectiveImage?.url ? (
                                  <div className="mt-3">
                                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                                      <span>Alt Text</span>
                                      <span className="text-xs font-normal text-gray-500">Per-image accessibility label</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={explicitImage?.alt || effectiveImage?.alt || ''}
                                      onChange={(e) =>
                                        updateMinimalImage(slot.key, {
                                          url: effectiveImage?.url || '',
                                          alt: e.target.value || slot.label,
                                        })
                                      }
                                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                      placeholder={`${slot.label} description`}
                                    />
                                  </div>
                                ) : null}

                                {isUsingSharedFallback ? (
                                  <p className="mt-2 text-xs text-blue-700">
                                    This slot is still inheriting the older shared hero image. Choosing a new image here overrides only this slot.
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : isSideBySideLayout ? (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                          Side by Side layout now supports three separate gallery slots. Set the left, center, and right images independently.
                          Empty slots still fall back to the older shared hero image if one exists.
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                          {SIDE_BY_SIDE_IMAGE_SLOTS.map((slot) => {
                            const explicitImage = formConfig.sideBySideImages?.[slot.key];
                            const effectiveImage = getEffectiveSideBySideImage(slot.key);
                            const isUsingSharedFallback = !explicitImage && Boolean(formConfig.image?.url);

                            return (
                              <div key={slot.field} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-900">{slot.label}</h3>
                                    <p className="mt-1 text-xs text-gray-500">{slot.description}</p>
                                  </div>
                                  {explicitImage ? (
                                    <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-purple-700">
                                      Custom
                                    </span>
                                  ) : null}
                                </div>

                                {effectiveImage?.url ? (
                                  <div
                                    className={`overflow-hidden border border-gray-200 ${
                                      heroImagePreviewFrameStyle ? '' : 'rounded-lg'
                                    }`}
                                    style={heroImagePreviewFrameStyle}
                                  >
                                    <img
                                      src={effectiveImage.url}
                                      alt={effectiveImage.alt || slot.label}
                                      className="h-40 w-full object-cover"
                                      style={heroImagePreviewStyle}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
                                    No image selected
                                  </div>
                                )}

                                <div className="mt-3 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openGalleryModal(slot.field)}
                                    disabled={!restaurantId}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                    </svg>
                                    {effectiveImage?.url ? 'Change Image' : 'Choose Image'}
                                  </button>
                                  {explicitImage ? (
                                    <button
                                      type="button"
                                      onClick={() => updateSideBySideImage(slot.key, undefined)}
                                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
                                      Remove
                                    </button>
                                  ) : null}
                                </div>

                                {effectiveImage?.url ? (
                                  <div className="mt-3">
                                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                                      <span>Alt Text</span>
                                      <span className="text-xs font-normal text-gray-500">Per-image accessibility label</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={explicitImage?.alt || effectiveImage?.alt || ''}
                                      onChange={(e) =>
                                        updateSideBySideImage(slot.key, {
                                          url: effectiveImage.url,
                                          alt: e.target.value || slot.label,
                                        })
                                      }
                                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                                      placeholder={`${slot.label} description`}
                                    />
                                  </div>
                                ) : null}

                                {isUsingSharedFallback ? (
                                  <p className="mt-2 text-xs text-blue-700">
                                    This slot is still inheriting the older shared hero image. Choosing a new image here overrides only this slot.
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {formConfig.image?.url ? (
                          <div
                            className={`overflow-hidden border border-gray-200 ${
                              heroImagePreviewFrameStyle ? '' : 'rounded-lg'
                            }`}
                            style={heroImagePreviewFrameStyle}
                          >
                            <img
                              src={formConfig.image.url}
                              alt={formConfig.image.alt || 'Hero image'}
                              className="h-48 w-full object-cover"
                              style={heroImagePreviewStyle}
                            />
                            <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                              <button
                                type="button"
                                onClick={() => openGalleryModal('hero_image')}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                Change Hero Image
                              </button>
                              <button
                                type="button"
                                onClick={() => updateConfig({ image: undefined })}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="mb-2 text-xs text-gray-500">Recommended: 1200x630px</p>
                            <button
                              type="button"
                              onClick={() => openGalleryModal('hero_image')}
                              disabled={!restaurantId}
                              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                              </svg>
                              Choose Hero Image from Gallery
                            </button>
                          </div>
                        )}

                        {formConfig.image && (
                          <div className="mt-3">
                            <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                              <span>Image Alt Text</span>
                              <span className="text-xs font-normal text-gray-500">Accessibility description</span>
                            </label>
                            <input
                              type="text"
                              value={formConfig.image.alt}
                              onChange={(e) => updateConfig({
                                image: formConfig.image ? { ...formConfig.image, alt: e.target.value } : undefined
                              })}
                              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                              placeholder="Hero image description"
                            />
                          </div>
                        )}
                      </>
                    )}

                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Hero Image Styling</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          These settings apply to the visible hero image in image-based layouts.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                            <span>Object Fit</span>
                            <span className="text-xs font-normal text-gray-500">How the image fills the frame</span>
                          </label>
                          <select
                            value={formConfig.imageObjectFit || 'cover'}
                            onChange={(e) =>
                              updateConfig({
                                imageObjectFit: e.target.value as NonNullable<HeroConfig['imageObjectFit']>,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          >
                            {HERO_IMAGE_OBJECT_FIT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.name}
                              </option>
                            ))}
                          </select>
                          <p className="mt-2 text-xs text-gray-500">
                            {HERO_IMAGE_OBJECT_FIT_OPTIONS.find(
                              (option) => option.value === (formConfig.imageObjectFit || 'cover'),
                            )?.description}
                          </p>
                        </div>

                        <div>
                          <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                            <span>Border Radius</span>
                            <span className="text-xs font-normal text-gray-500">Applies to the hero image only</span>
                          </label>
                          <input
                            type="text"
                            value={formConfig.imageBorderRadius || ''}
                            onChange={(e) =>
                              updateConfig({ imageBorderRadius: e.target.value || undefined })
                            }
                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                            placeholder="24px"
                          />
                          <p className="mt-2 text-xs text-gray-500">
                            Use values like <code>16px</code>, <code>1.5rem</code>, or <code>999px</code>. Leave blank for the default shape.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mediaFields.showBackgroundVideo && (
                  <div>
                    {!formConfig.videoUrl && (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008zm8.25-3.75a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0z" />
                          </svg>
                          <div>
                            <h3 className="text-sm font-semibold text-amber-900">Add a background video for the full effect</h3>
                            <p className="mt-1 text-sm text-amber-700">
                              <span className="font-medium">Video Background</span> is designed for a moving video backdrop. Until you upload a video, the shared background image is used as a fallback.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                      <span>Background Video</span>
                      <span className="text-xs font-normal text-gray-500">Used in this layout</span>
                    </label>
                    <p className="mb-3 text-xs text-gray-500">
                      Upload the video shown behind your hero content in this layout.
                    </p>
                    {formConfig.videoUrl ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <video
                          src={formConfig.videoUrl}
                          className="h-48 w-full object-cover"
                          muted
                          playsInline
                        />
                        <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                          <button
                            type="button"
                            onClick={() => openGalleryModal('background_video')}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                            </svg>
                            Change Background Video
                          </button>
                          <button
                            type="button"
                            onClick={() => updateConfig({ videoUrl: undefined })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Recommended: MP4 format, max 10MB</p>
                        <button
                          type="button"
                          onClick={() => openGalleryModal('background_video')}
                          disabled={!restaurantId}
                          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                          </svg>
                          Choose Background Video from Gallery
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>{sharedBackgroundMeta.label}</span>
                    <span className="text-xs font-normal text-gray-500">{sharedBackgroundMeta.badge}</span>
                  </label>
                  <p className="mb-3 text-xs text-gray-500">{sharedBackgroundMeta.description}</p>
                  {formConfig.backgroundImage ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={formConfig.backgroundImage}
                        alt="Background"
                        className="h-48 w-full object-cover"
                      />
                      <div className="flex gap-2 border-t border-gray-200 bg-gray-50 p-3">
                        <button
                          type="button"
                          onClick={() => openGalleryModal('background_image')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          Change Shared Background Image
                        </button>
                        <button
                          type="button"
                          onClick={() => updateConfig({ backgroundImage: undefined })}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-2 text-xs text-gray-500">Recommended: 1200x630px</p>
                      <button
                        type="button"
                        onClick={() => openGalleryModal('background_image')}
                        disabled={!restaurantId}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        Choose Shared Background Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Styling Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Colors & Styling</h2>
                <p className="text-sm text-gray-600">Customize colors, alignment and dimensions</p>
              </div>
            </div>
            {renderResponsiveEditorTabs('styling')}
          </div>

          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              isMobileEditorViewport
                ? 'border-purple-200 bg-purple-50 text-purple-800'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            {isMobileEditorViewport
              ? 'You are editing mobile-only overrides. Clear a mobile value to fall back to the desktop setting.'
              : 'You are editing the desktop base styles. These values remain the default until mobile overrides are added.'}
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">
                  {isMobileEditorViewport ? 'Mobile hero background color' : 'Hero background color'}
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={
                    isMobileEditorViewport
                      ? formConfig.mobileBgColor || formConfig.bgColor || '#ffffff'
                      : formConfig.bgColor || '#ffffff'
                  }
                  onChange={(e) =>
                    updateConfig(
                      isMobileEditorViewport
                        ? { mobileBgColor: e.target.value }
                        : { bgColor: e.target.value },
                    )
                  }
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={
                    isMobileEditorViewport
                      ? formConfig.mobileBgColor || formConfig.bgColor || '#ffffff'
                      : formConfig.bgColor || '#ffffff'
                  }
                  onChange={(e) =>
                    updateConfig(
                      isMobileEditorViewport
                        ? { mobileBgColor: e.target.value }
                        : { bgColor: e.target.value },
                    )
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#ffffff"
                />
                <button
                  type="button"
                  onClick={() =>
                    updateConfig(
                      isMobileEditorViewport ? { mobileBgColor: undefined } : { bgColor: '#ffffff' },
                    )
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title={isMobileEditorViewport ? 'Use desktop background color' : 'Reset to default'}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {isMobileEditorViewport
                  ? 'Leave mobile background color unset by resetting it to reuse the desktop color.'
                  : 'Used as the fallback surface when no background image is selected.'}
              </p>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Text Alignment</span>
                <span className="text-xs font-normal text-gray-500">
                  {isMobileEditorViewport ? 'Mobile content alignment' : 'Desktop content alignment'}
                </span>
              </label>
              <div className="flex gap-2">
                <select
                  value={
                    isMobileEditorViewport
                      ? formConfig.mobileTextAlign || formConfig.textAlign || 'center'
                      : formConfig.textAlign || 'center'
                  }
                  onChange={(e) =>
                    updateConfig(
                      isMobileEditorViewport
                        ? { mobileTextAlign: e.target.value as HeroConfig['mobileTextAlign'] }
                        : { textAlign: e.target.value as HeroConfig['textAlign'] },
                    )
                  }
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                {isMobileEditorViewport ? (
                  <button
                    type="button"
                    onClick={() => updateConfig({ mobileTextAlign: undefined })}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    title="Use desktop text alignment"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {isMobileEditorViewport
                  ? 'Reset the mobile alignment to reuse the desktop alignment.'
                  : 'Controls how the hero content aligns on regular screens.'}
              </p>
            </div>

            {isDefaultLayout ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Default Content Background</label>
                    <p className="text-xs text-gray-500">
                      Enable or remove the inner background box for the default layout.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={formConfig.defaultContentPanelEnabled || false}
                      onChange={(e) =>
                        updateConfig({ defaultContentPanelEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {isMobileEditorViewport
                    ? 'Use this tab for mobile-only panel overrides. Leave a mobile field blank to inherit the desktop value.'
                    : 'Use this tab to define the main desktop content card for the default hero layout.'}
                </p>

                {formConfig.defaultContentPanelEnabled ? (
                  <div className={`mt-4 rounded-lg border p-4 ${isMobileEditorViewport ? 'border-purple-200 bg-purple-50/60' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-4">
                      <h3 className={`text-sm font-semibold ${isMobileEditorViewport ? 'text-purple-900' : 'text-gray-900'}`}>
                        {isMobileEditorViewport ? 'Mobile Layout Controls' : 'Desktop Layout Controls'}
                      </h3>
                      <p className={`mt-1 text-xs ${isMobileEditorViewport ? 'text-purple-700' : 'text-gray-500'}`}>
                        {isMobileEditorViewport
                          ? 'Edit the mobile size, spacing, color, and radius for the content card.'
                          : 'Edit the desktop size, spacing, color, and radius for the content card.'}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Content Background Color</span>
                          <span className="text-xs font-normal text-gray-500">
                            {isMobileEditorViewport ? 'Mobile panel background' : 'Default layout content box'}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={
                              isMobileEditorViewport
                                ? formConfig.defaultContentPanelMobileBackgroundColor ||
                                  formConfig.defaultContentPanelBackgroundColor ||
                                  '#ffffff'
                                : formConfig.defaultContentPanelBackgroundColor || '#ffffff'
                            }
                            onChange={(e) =>
                              updateConfig(
                                isMobileEditorViewport
                                  ? {
                                      defaultContentPanelMobileBackgroundColor:
                                        e.target.value,
                                    }
                                  : {
                                      defaultContentPanelBackgroundColor:
                                        e.target.value,
                                    },
                              )
                            }
                            className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                          />
                          <input
                            type="text"
                            value={
                              isMobileEditorViewport
                                ? formConfig.defaultContentPanelMobileBackgroundColor ||
                                  formConfig.defaultContentPanelBackgroundColor ||
                                  '#ffffff'
                                : formConfig.defaultContentPanelBackgroundColor || '#ffffff'
                            }
                            onChange={(e) =>
                              updateConfig(
                                isMobileEditorViewport
                                  ? {
                                      defaultContentPanelMobileBackgroundColor:
                                        e.target.value,
                                    }
                                  : {
                                      defaultContentPanelBackgroundColor:
                                        e.target.value,
                                    },
                              )
                            }
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                            placeholder="#ffffff"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateConfig(
                                isMobileEditorViewport
                                  ? {
                                      defaultContentPanelMobileBackgroundColor:
                                        undefined,
                                    }
                                  : {
                                      defaultContentPanelBackgroundColor:
                                        '#ffffff',
                                    },
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            title={
                              isMobileEditorViewport
                                ? 'Use desktop content background color'
                                : 'Reset content background color'
                            }
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Border Radius</span>
                          <span className="text-xs font-normal text-gray-500">
                            {isMobileEditorViewport ? 'Mobile corner roundness' : 'Desktop corner roundness'}
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={
                              isMobileEditorViewport
                                ? formConfig.defaultContentPanelMobileBorderRadius || ''
                                : formConfig.defaultContentPanelBorderRadius || '2rem'
                            }
                            onChange={(e) =>
                              updateConfig(
                                isMobileEditorViewport
                                  ? {
                                      defaultContentPanelMobileBorderRadius:
                                        e.target.value || undefined,
                                    }
                                  : {
                                      defaultContentPanelBorderRadius:
                                        e.target.value || '2rem',
                                    },
                              )
                            }
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                            placeholder={
                              isMobileEditorViewport
                                ? formConfig.defaultContentPanelBorderRadius || '2rem'
                                : '2rem'
                            }
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateConfig(
                                isMobileEditorViewport
                                  ? {
                                      defaultContentPanelMobileBorderRadius:
                                        undefined,
                                    }
                                  : {
                                      defaultContentPanelBorderRadius: '2rem',
                                    },
                              )
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            title={isMobileEditorViewport ? 'Use desktop border radius' : 'Reset border radius'}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Section Width</span>
                          <span className="text-xs font-normal text-gray-500">Centered content area width</span>
                        </label>
                        <input
                          type="text"
                          value={
                            isMobileEditorViewport
                              ? formConfig.defaultContentPanelMobileMaxWidth || ''
                              : formConfig.defaultContentPanelMaxWidth || '960px'
                          }
                          onChange={(e) =>
                            updateConfig(
                              isMobileEditorViewport
                                ? {
                                    defaultContentPanelMobileMaxWidth:
                                      e.target.value || undefined,
                                  }
                                : {
                                    defaultContentPanelMaxWidth:
                                      e.target.value || '960px',
                                  },
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={isMobileEditorViewport ? formConfig.defaultContentPanelMaxWidth || '92%' : '960px'}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Panel Height</span>
                          <span className="text-xs font-normal text-gray-500">Minimum inner box height</span>
                        </label>
                        <input
                          type="text"
                          value={
                            isMobileEditorViewport
                              ? formConfig.defaultContentPanelMobileMinHeight || ''
                              : formConfig.defaultContentPanelMinHeight || ''
                          }
                          onChange={(e) =>
                            updateConfig(
                              isMobileEditorViewport
                                ? {
                                    defaultContentPanelMobileMinHeight:
                                      e.target.value || undefined,
                                  }
                                : {
                                    defaultContentPanelMinHeight:
                                      e.target.value || undefined,
                                  },
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={isMobileEditorViewport ? '360px' : '420px'}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Top Spacing</span>
                          <span className="text-xs font-normal text-gray-500">Move panel down from the top</span>
                        </label>
                        <input
                          type="text"
                          value={
                            isMobileEditorViewport
                              ? formConfig.defaultContentPanelMobileMarginTop || ''
                              : formConfig.defaultContentPanelMarginTop || ''
                          }
                          onChange={(e) =>
                            updateConfig(
                              isMobileEditorViewport
                                ? {
                                    defaultContentPanelMobileMarginTop:
                                      e.target.value || undefined,
                                  }
                                : {
                                    defaultContentPanelMarginTop:
                                      e.target.value || undefined,
                                  },
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={isMobileEditorViewport ? '24px' : '40px'}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                          <span>Bottom Spacing</span>
                          <span className="text-xs font-normal text-gray-500">Reserve space below the panel</span>
                        </label>
                        <input
                          type="text"
                          value={
                            isMobileEditorViewport
                              ? formConfig.defaultContentPanelMobileMarginBottom || ''
                              : formConfig.defaultContentPanelMarginBottom || ''
                          }
                          onChange={(e) =>
                            updateConfig(
                              isMobileEditorViewport
                                ? {
                                    defaultContentPanelMobileMarginBottom:
                                      e.target.value || undefined,
                                  }
                                : {
                                    defaultContentPanelMarginBottom:
                                      e.target.value || undefined,
                                  },
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                          placeholder={isMobileEditorViewport ? '24px' : '40px'}
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500">
                      {isMobileEditorViewport
                        ? 'Leave mobile size, spacing, and radius fields blank to inherit the desktop content-card settings.'
                        : 'Desktop values define the main content card. Use the mobile tab only when the card needs smaller-screen overrides.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-gray-500">
                    With this disabled, text sits directly on the hero background.
                  </p>
                )}
              </div>
            ) : null}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Section Padding</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Top and bottom spacing apply across the hero. Horizontal padding can be adjusted per viewport.
                  Minimal layout uses a cleaner `8rem` inline and `5rem` top/bottom composition by default until you override it here.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Top Padding</span>
                    <span className="text-xs font-normal text-gray-500">Shared across desktop and mobile</span>
                  </label>
                  <input
                    type="text"
                    value={formConfig.paddingTop || DEFAULT_HERO_CONFIG.paddingTop || '6rem'}
                    onChange={(e) => updateConfig({ paddingTop: e.target.value || DEFAULT_HERO_CONFIG.paddingTop || '6rem' })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="5rem"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Bottom Padding</span>
                    <span className="text-xs font-normal text-gray-500">Shared across desktop and mobile</span>
                  </label>
                  <input
                    type="text"
                    value={formConfig.paddingBottom || DEFAULT_HERO_CONFIG.paddingBottom || '6rem'}
                    onChange={(e) => updateConfig({ paddingBottom: e.target.value || DEFAULT_HERO_CONFIG.paddingBottom || '6rem' })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="5rem"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>{isMobileEditorViewport ? 'Mobile Horizontal Padding' : 'Desktop Horizontal Padding'}</span>
                    <span className="text-xs font-normal text-gray-500">
                      {isMobileEditorViewport ? 'Optional mobile override' : 'Left and right spacing'}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={
                        isMobileEditorViewport
                          ? formConfig.mobilePaddingInline || ''
                          : formConfig.paddingInline || ''
                      }
                      onChange={(e) =>
                        updateConfig(
                          isMobileEditorViewport
                            ? { mobilePaddingInline: e.target.value || undefined }
                            : { paddingInline: e.target.value || undefined },
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                      placeholder={isMobileEditorViewport ? '1.5rem' : '8rem'}
                    />
                    {isMobileEditorViewport ? (
                      <button
                        type="button"
                        onClick={() => updateConfig({ mobilePaddingInline: undefined })}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        title="Use desktop horizontal padding"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {isMobileEditorViewport
                      ? 'Leave this empty to inherit the desktop horizontal padding.'
                      : 'Controls the left and right section spacing. Minimal layout looks best around `8rem`.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Hero Height</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {isMobileEditorViewport
                    ? 'Use a mobile-only hero height when the section needs a different balance on phones.'
                    : 'Desktop height is the base hero height. Mobile keeps using it until you add a mobile override.'}
                </p>
              </div>
              <div>
                <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                  <span>
                    {isMobileEditorViewport ? 'Mobile Minimum Height' : 'Desktop Minimum Height'}
                  </span>
                  <span className="text-xs font-normal text-gray-500">
                    {isMobileEditorViewport ? 'Optional mobile override' : 'Hero section height'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      isMobileEditorViewport
                        ? formConfig.mobileMinHeight || ''
                        : formConfig.minHeight || '600px'
                    }
                    onChange={(e) =>
                      updateConfig(
                        isMobileEditorViewport
                          ? { mobileMinHeight: e.target.value || undefined }
                          : { minHeight: e.target.value || '600px' },
                      )
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder={isMobileEditorViewport ? formConfig.minHeight || '520px' : '600px'}
                  />
                  {isMobileEditorViewport ? (
                    <button
                      type="button"
                      onClick={() => updateConfig({ mobileMinHeight: undefined })}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      title="Use desktop minimum height"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Shared Desktop + Mobile Settings</h3>
                <p className="mt-1 text-xs text-gray-500">
                  These controls apply to both desktop and mobile.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Scroll Animation</span>
                    <span className="text-xs font-normal text-gray-500">Reveal effect when hero enters the viewport</span>
                  </label>
                  <select
                    value={formConfig.contentAnimation || 'none'}
                    onChange={(e) => updateConfig({ contentAnimation: e.target.value as HeroConfig['contentAnimation'] })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  >
                    {HERO_ANIMATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    {HERO_ANIMATION_OPTIONS.find((option) => option.value === (formConfig.contentAnimation || 'none'))?.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Show Scroll Indicator</label>
                      <p className="text-xs text-gray-500">Animated scroll arrow</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formConfig.showScrollIndicator || false}
                        onChange={(e) => updateConfig({ showScrollIndicator: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Buttons Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Typography & Buttons</h2>
                <p className="text-sm text-gray-600">Customize text styles and button appearance</p>
              </div>
            </div>
            {renderResponsiveEditorTabs('typography')}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Custom Typography & Styles</label>
                <p className="text-xs text-gray-500">Override global CSS with custom styling options</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={formConfig.is_custom || false}
                  onChange={(e) => updateConfig({ is_custom: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!formConfig.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Using Global Styles</h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles defined in your theme settings.
                      Enable custom typography above to override these styles with section-specific options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-800">
                  {isMobileEditorViewport
                    ? 'Mobile tab unlocks the full mobile typography set. Use "Use Desktop Settings" inside any group to clear mobile overrides.'
                    : 'Desktop tab defines the main typography system. Mobile keeps using these values until you override them in the mobile tab.'}
                </div>
                <SectionTypographyControls
                  value={formConfig}
                  onChange={(updates) => updateConfig(updates)}
                  showAdvancedControls
                  viewport={responsiveEditorViewport}
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
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
                Save Hero Settings
              </>
            )}
          </button>
        </div>
      </form>

      {!showPreview ? (
        <button
          type="button"
          onClick={() => {
            setPreviewViewport('desktop');
            setShowPreview(true);
          }}
          className="fixed bottom-24 right-6 z-40 inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/95 px-5 py-3 text-sm font-semibold text-purple-700 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white"
          aria-label="Open live preview"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span className="text-xs font-medium text-purple-500">
              {responsiveEditorViewport === 'mobile' ? 'Open mobile preview' : 'Open desktop preview'}
            </span>
          </span>
        </button>
      ) : null}

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowPreview(false)} />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Live Preview</h2>
                <p className="mt-1 text-sm text-slate-600">Switch between desktop and mobile to verify every hero layout.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(['desktop', 'mobile'] as PreviewViewport[]).map((viewport) => (
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
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                  <span>{previewViewport === 'mobile' ? 'Phone Preview' : 'Desktop Preview'}</span>
                  <span>{previewViewport === 'mobile' ? '390 x 780' : '1280 x 720'}</span>
                </div>
                <div className="bg-white">
                  <Hero
                    {...previewConfig}
                    restaurant_id={restaurantId}
                    previewMode={previewViewport}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {formConfig.layout === 'video-background' && !formConfig.videoUrl
                    ? 'Upload a background video to preview the final motion effect. Until then, the shared background image is shown as a fallback.'
                    : previewHasPlaceholders
                      ? 'Sample text or media is shown where this layout would otherwise preview blank.'
                      : 'Live preview reflects your current hero content and styling changes.'}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === 'mobile' ? 'Mobile responsiveness check' : 'Desktop composition check'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showGalleryModal}
        onClose={() => {
          setShowGalleryModal(false);
          setCurrentMediaField(null);
        }}
        onSelect={handleSelectImage}
        restaurantId={restaurantId}
        title={
          currentMediaField === 'hero_image'
            ? 'Select Hero Image'
            : currentMediaField === 'background_video'
            ? 'Select Background Video'
            : currentMediaField === 'minimal_image_primary'
            ? 'Select Large Left Image'
            : currentMediaField === 'minimal_image_secondary_top'
            ? 'Select Top Right Image'
            : currentMediaField === 'minimal_image_secondary_bottom'
            ? 'Select Bottom Right Image'
            : currentMediaField === 'side_by_side_image_left'
            ? 'Select Left Image'
            : currentMediaField === 'side_by_side_image_center'
            ? 'Select Center Image'
            : currentMediaField === 'side_by_side_image_right'
            ? 'Select Right Image'
            : 'Select Shared Background Image'
        }
        description={
          currentMediaField === 'background_video'
            ? 'Choose a playable video file from your media library or upload a new one'
            : 'Choose from your media library or upload new'
        }
        mediaKind={currentMediaField === 'background_video' ? 'video' : 'image'}
      />
    </>
  );
}



