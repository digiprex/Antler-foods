/**
 * Gallery Component
 *
 * Displays a responsive image gallery with multiple modern layout options.
 */

'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GalleryConfig } from '@/types/gallery.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';
import { normalizeGalleryLayout } from './gallery-layouts/gallery-layout-options';
import styles from './gallery-layouts/gallery-layouts.module.css';
import { GridGalleryLayout } from './gallery-layouts/grid-layout';
import { MasonryGalleryLayout } from './gallery-layouts/masonry-layout';
import { CarouselGalleryLayout } from './gallery-layouts/carousel-layout';
import { SpotlightGalleryLayout } from './gallery-layouts/spotlight-layout';
import { MosaicGalleryLayout } from './gallery-layouts/mosaic-layout';
import { EditorialGalleryLayout } from './gallery-layouts/editorial-layout';
import { FilmstripGalleryLayout } from './gallery-layouts/filmstrip-layout';
import {
  GalleryLightbox,
  GallerySectionHeader,
  getResolvedColumns,
} from './gallery-layouts/shared';

interface GalleryProps extends Partial<GalleryConfig> {}

export default function Gallery({
  restaurant_id,
  title = 'Our Gallery',
  subtitle,
  description,
  images = [],
  layout = 'grid',
  columns = 3,
  gap = '1rem',
  aspectRatio = 'square',
  bgColor = '#ffffff',
  textColor = '#0f172a',
  padding = '4rem 2rem',
  maxWidth = '1200px',
  showCaptions = true,
  enableLightbox = true,
  autoplay = false,
  autoplaySpeed = 3000,
  is_custom,
  titleFontFamily,
  titleFontSize,
  titleFontWeight,
  titleColor,
  subtitleFontFamily,
  subtitleFontSize,
  subtitleFontWeight,
  subtitleColor,
  bodyFontFamily,
  bodyFontSize,
  bodyFontWeight,
  bodyColor,
}: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedLayout = normalizeGalleryLayout(layout);
  const resolvedColumns = getResolvedColumns(columns, 4);
  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    {
      is_custom,
      titleFontFamily,
      titleFontSize,
      titleFontWeight,
      titleColor,
      subtitleFontFamily,
      subtitleFontSize,
      subtitleFontWeight,
      subtitleColor,
      bodyFontFamily,
      bodyFontSize,
      bodyFontWeight,
      bodyColor,
    },
    globalStyles,
  );

  useEffect(() => {
    const maxSlide = Math.max(images.length - resolvedColumns, 0);
    setCurrentSlide((prev) => Math.min(prev, maxSlide));
    setActiveIndex((prev) => {
      if (images.length === 0) {
        return 0;
      }

      if (prev > images.length - 1) {
        return images.length - 1;
      }

      return prev;
    });
  }, [images.length, normalizedLayout, resolvedColumns]);

  useEffect(() => {
    if (!autoplay || images.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (normalizedLayout === 'carousel') {
        const maxSlide = Math.max(images.length - resolvedColumns, 0);
        setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
        return;
      }

      if (
        normalizedLayout === 'spotlight' ||
        normalizedLayout === 'filmstrip'
      ) {
        setActiveIndex((prev) => (prev + 1) % images.length);
      }
    }, autoplaySpeed);

    return () => window.clearInterval(intervalId);
  }, [
    autoplay,
    autoplaySpeed,
    images.length,
    normalizedLayout,
    resolvedColumns,
  ]);

  if (images.length === 0) {
    return null;
  }

  const openLightbox = (index: number) => {
    if (enableLightbox) {
      setLightboxIndex(index);
    }
  };

  const closeLightbox = () => setLightboxIndex(null);

  const nextLightboxImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  };

  const previousLightboxImage = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  };

  const nextActiveImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const previousActiveImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextCarouselSlide = () => {
    const maxSlide = Math.max(images.length - resolvedColumns, 0);
    setCurrentSlide((prev) => Math.min(prev + 1, maxSlide));
  };

  const previousCarouselSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const sectionStyle = {
    backgroundColor: bgColor,
    padding,
    color: textColor,
    '--gallery-accent': textColor,
  } as CSSProperties;

  const sharedLayoutProps = {
    images,
    columns,
    gap,
    aspectRatio,
    showCaptions,
    enableLightbox,
    onImageClick: openLightbox,
  };

  return (
    <section className={styles.gallerySection} style={{ ...sectionStyle, ...bodyStyle }}>
      <div className={styles.galleryShell} style={{ maxWidth, margin: '0 auto' }}>
        <GallerySectionHeader
          title={title}
          subtitle={subtitle}
          description={description}
          titleStyle={titleStyle}
          subtitleStyle={subtitleStyle}
          bodyStyle={bodyStyle}
        />

        {normalizedLayout === 'spotlight' ? (
          <SpotlightGalleryLayout
            {...sharedLayoutProps}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            onNext={nextActiveImage}
            onPrevious={previousActiveImage}
          />
        ) : normalizedLayout === 'mosaic' ? (
          <MosaicGalleryLayout {...sharedLayoutProps} />
        ) : normalizedLayout === 'editorial' ? (
          <EditorialGalleryLayout {...sharedLayoutProps} />
        ) : normalizedLayout === 'filmstrip' ? (
          <FilmstripGalleryLayout
            {...sharedLayoutProps}
            activeIndex={activeIndex}
            onActivate={setActiveIndex}
            onNext={nextActiveImage}
            onPrevious={previousActiveImage}
          />
        ) : normalizedLayout === 'masonry' ? (
          <MasonryGalleryLayout {...sharedLayoutProps} />
        ) : normalizedLayout === 'carousel' ? (
          <CarouselGalleryLayout
            {...sharedLayoutProps}
            currentSlide={currentSlide}
            onNext={nextCarouselSlide}
            onPrevious={previousCarouselSlide}
            onSelectSlide={setCurrentSlide}
          />
        ) : (
          <GridGalleryLayout {...sharedLayoutProps} />
        )}

        {enableLightbox && (
          <GalleryLightbox
            images={images}
            index={lightboxIndex}
            showCaptions={showCaptions}
            onClose={closeLightbox}
            onNext={nextLightboxImage}
            onPrevious={previousLightboxImage}
          />
        )}
      </div>
    </section>
  );
}
