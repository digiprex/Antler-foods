/**
 * Gallery Component
 *
 * Displays a responsive image gallery with multiple modern layout options.
 */

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GalleryConfig } from '@/types/gallery.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { getSectionTypographyStyles } from '@/lib/section-style';
import { normalizeGalleryLayout } from './gallery-layouts/gallery-layout-options';
import styles from './gallery-layouts/gallery-layouts.module.css';
import { GridGalleryLayout } from './gallery-layouts/grid-layout';
import { MasonryGalleryLayout } from './gallery-layouts/masonry-layout';
import { CarouselGalleryLayout } from './gallery-layouts/carousel-layout';
import { ShowcaseGalleryLayout } from './gallery-layouts/showcase-layout';
import { SpotlightGalleryLayout } from './gallery-layouts/spotlight-layout';
import { MosaicGalleryLayout } from './gallery-layouts/mosaic-layout';
import { EditorialGalleryLayout } from './gallery-layouts/editorial-layout';
import { FilmstripGalleryLayout } from './gallery-layouts/filmstrip-layout';
import {
  GalleryLightbox,
  type GalleryLayoutViewport,
  GallerySectionHeader,
  getResolvedColumns,
} from './gallery-layouts/shared';

interface GalleryProps extends Partial<GalleryConfig> {
  previewMode?: 'desktop' | 'mobile';
}

function buildResponsiveTypographyStyle(
  isMobileViewport: boolean,
  desktop: CSSProperties,
  mobile: CSSProperties,
) {
  if (!isMobileViewport) {
    return desktop;
  }

  const mergedStyle: CSSProperties = { ...desktop };

  Object.entries(mobile).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      mergedStyle[key as keyof CSSProperties] = value as never;
    }
  });

  return mergedStyle;
}

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
  margin = '0',
  maxWidth = '1200px',
  showCaptions = true,
  enableLightbox = true,
  enableScrollAnimation = false,
  autoplay = false,
  autoplaySpeed = 3000,
  is_custom,
  titleFontFamily,
  titleFontSize,
  titleMobileFontSize,
  titleMobileFontFamily,
  titleFontWeight,
  titleMobileFontWeight,
  titleFontStyle,
  titleMobileFontStyle,
  titleColor,
  titleMobileColor,
  titleTextTransform,
  titleMobileTextTransform,
  titleLineHeight,
  titleMobileLineHeight,
  titleLetterSpacing,
  titleMobileLetterSpacing,
  subtitleFontFamily,
  subtitleFontSize,
  subtitleMobileFontSize,
  subtitleMobileFontFamily,
  subtitleFontWeight,
  subtitleMobileFontWeight,
  subtitleFontStyle,
  subtitleMobileFontStyle,
  subtitleColor,
  subtitleMobileColor,
  subtitleTextTransform,
  subtitleMobileTextTransform,
  subtitleLineHeight,
  subtitleMobileLineHeight,
  subtitleLetterSpacing,
  subtitleMobileLetterSpacing,
  bodyFontFamily,
  bodyFontSize,
  bodyMobileFontSize,
  bodyMobileFontFamily,
  bodyFontWeight,
  bodyMobileFontWeight,
  bodyFontStyle,
  bodyMobileFontStyle,
  bodyColor,
  bodyMobileColor,
  bodyTextTransform,
  bodyMobileTextTransform,
  bodyLineHeight,
  bodyMobileLineHeight,
  bodyLetterSpacing,
  bodyMobileLetterSpacing,
  previewMode,
}: GalleryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInView, setIsInView] = useState(!enableScrollAnimation);
  const [isClientMobileViewport, setIsClientMobileViewport] = useState(
    previewMode === 'mobile',
  );
  const [layoutViewport, setLayoutViewport] = useState<GalleryLayoutViewport>(
    previewMode === 'mobile' ? 'mobile' : 'desktop',
  );

  const normalizedLayout = normalizeGalleryLayout(layout);
  const resolvedColumns = getResolvedColumns(columns, 4);
  const carouselVisibleCards =
    layoutViewport === 'mobile'
      ? 1
      : layoutViewport === 'tablet'
        ? Math.min(resolvedColumns, 2)
        : resolvedColumns;
  const globalStyleEndpoint = restaurant_id
    ? `/api/global-style-config?restaurant_id=${encodeURIComponent(restaurant_id)}`
    : '/api/global-style-config';
  const { config: globalStyles } = useGlobalStyleConfig({
    apiEndpoint: globalStyleEndpoint,
    fetchOnMount: Boolean(restaurant_id),
  });
  const { resolved } = getSectionTypographyStyles(
    {
      is_custom,
      titleFontFamily,
      titleFontSize,
      titleMobileFontSize,
      titleMobileFontFamily,
      titleFontWeight,
      titleMobileFontWeight,
      titleFontStyle,
      titleMobileFontStyle,
      titleColor,
      titleMobileColor,
      titleTextTransform,
      titleMobileTextTransform,
      titleLineHeight,
      titleMobileLineHeight,
      titleLetterSpacing,
      titleMobileLetterSpacing,
      subtitleFontFamily,
      subtitleFontSize,
      subtitleMobileFontSize,
      subtitleMobileFontFamily,
      subtitleFontWeight,
      subtitleMobileFontWeight,
      subtitleFontStyle,
      subtitleMobileFontStyle,
      subtitleColor,
      subtitleMobileColor,
      subtitleTextTransform,
      subtitleMobileTextTransform,
      subtitleLineHeight,
      subtitleMobileLineHeight,
      subtitleLetterSpacing,
      subtitleMobileLetterSpacing,
      bodyFontFamily,
      bodyFontSize,
      bodyMobileFontSize,
      bodyMobileFontFamily,
      bodyFontWeight,
      bodyMobileFontWeight,
      bodyFontStyle,
      bodyMobileFontStyle,
      bodyColor,
      bodyMobileColor,
      bodyTextTransform,
      bodyMobileTextTransform,
      bodyLineHeight,
      bodyMobileLineHeight,
      bodyLetterSpacing,
      bodyMobileLetterSpacing,
    },
    globalStyles,
  );

  useEffect(() => {
    if (previewMode) {
      setIsClientMobileViewport(previewMode === 'mobile');
      return;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateViewport = () => {
      setIsClientMobileViewport(mediaQuery.matches);
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateViewport);
      return () => mediaQuery.removeEventListener('change', updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, [previewMode]);

  useEffect(() => {
    const node = sectionRef.current;

    if (previewMode === 'mobile') {
      setLayoutViewport('mobile');
      return;
    }

    if (!node || typeof ResizeObserver === 'undefined') {
      setLayoutViewport(isClientMobileViewport ? 'mobile' : 'desktop');
      return;
    }

    const updateLayoutViewport = (width: number) => {
      if (width <= 640) {
        setLayoutViewport('mobile');
        return;
      }

      if (width <= 1024) {
        setLayoutViewport('tablet');
        return;
      }

      setLayoutViewport('desktop');
    };

    updateLayoutViewport(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateLayoutViewport(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [isClientMobileViewport, previewMode]);

  useEffect(() => {
    if (previewMode) {
      if (!enableScrollAnimation) {
        setIsInView(true);
        return;
      }

      setIsInView(false);
      let frameOne = 0;
      let frameTwo = 0;
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(() => {
          setIsInView(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(frameOne);
        window.cancelAnimationFrame(frameTwo);
      };
    }

    if (!enableScrollAnimation) {
      setIsInView(true);
      return;
    }

    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting && entry.intersectionRatio > 0.16);
      },
      {
        threshold: [0, 0.16, 0.32, 0.56],
        rootMargin: '0px 0px -12% 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enableScrollAnimation, previewMode]);

  useEffect(() => {
    const maxSlide = Math.max(images.length - carouselVisibleCards, 0);
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
  }, [carouselVisibleCards, images.length, normalizedLayout]);

  useEffect(() => {
    if (!autoplay || images.length < 2) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (normalizedLayout === 'carousel') {
        const maxSlide = Math.max(images.length - carouselVisibleCards, 0);
        setCurrentSlide((prev) => (prev >= maxSlide ? 0 : prev + 1));
        return;
      }

      if (
        normalizedLayout === 'showcase' ||
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
    carouselVisibleCards,
    images.length,
    normalizedLayout,
  ]);

  if (images.length === 0) {
    return null;
  }

  const titleStyle = buildResponsiveTypographyStyle(
    isClientMobileViewport,
    {
      fontFamily: resolved.titleFontFamily,
      fontSize: resolved.titleFontSize,
      fontWeight: resolved.titleFontWeight,
      fontStyle: resolved.titleFontStyle,
      color: resolved.titleColor,
      textTransform: resolved.titleTextTransform,
      lineHeight: resolved.titleLineHeight,
      letterSpacing: resolved.titleLetterSpacing,
    },
    {
      fontFamily: resolved.titleMobileFontFamily,
      fontSize: resolved.titleMobileFontSize,
      fontWeight: resolved.titleMobileFontWeight,
      fontStyle: resolved.titleMobileFontStyle,
      color: resolved.titleMobileColor,
      textTransform: resolved.titleMobileTextTransform,
      lineHeight: resolved.titleMobileLineHeight,
      letterSpacing: resolved.titleMobileLetterSpacing,
    },
  );
  const subtitleStyle = buildResponsiveTypographyStyle(
    isClientMobileViewport,
    {
      fontFamily: resolved.subtitleFontFamily,
      fontSize: resolved.subtitleFontSize,
      fontWeight: resolved.subtitleFontWeight,
      fontStyle: resolved.subtitleFontStyle,
      color: resolved.subtitleColor,
      textTransform: resolved.subtitleTextTransform,
      lineHeight: resolved.subtitleLineHeight,
      letterSpacing: resolved.subtitleLetterSpacing,
    },
    {
      fontFamily: resolved.subtitleMobileFontFamily,
      fontSize: resolved.subtitleMobileFontSize,
      fontWeight: resolved.subtitleMobileFontWeight,
      fontStyle: resolved.subtitleMobileFontStyle,
      color: resolved.subtitleMobileColor,
      textTransform: resolved.subtitleMobileTextTransform,
      lineHeight: resolved.subtitleMobileLineHeight,
      letterSpacing: resolved.subtitleMobileLetterSpacing,
    },
  );
  const bodyStyle = buildResponsiveTypographyStyle(
    isClientMobileViewport,
    {
      fontFamily: resolved.bodyFontFamily,
      fontSize: resolved.bodyFontSize,
      fontWeight: resolved.bodyFontWeight,
      fontStyle: resolved.bodyFontStyle,
      color: resolved.bodyColor,
      textTransform: resolved.bodyTextTransform,
      lineHeight: resolved.bodyLineHeight,
      letterSpacing: resolved.bodyLetterSpacing,
    },
    {
      fontFamily: resolved.bodyMobileFontFamily,
      fontSize: resolved.bodyMobileFontSize,
      fontWeight: resolved.bodyMobileFontWeight,
      fontStyle: resolved.bodyMobileFontStyle,
      color: resolved.bodyMobileColor,
      textTransform: resolved.bodyMobileTextTransform,
      lineHeight: resolved.bodyMobileLineHeight,
      letterSpacing: resolved.bodyMobileLetterSpacing,
    },
  );

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
    const maxSlide = Math.max(images.length - carouselVisibleCards, 0);
    setCurrentSlide((prev) => Math.min(prev + 1, maxSlide));
  };

  const previousCarouselSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const sectionStyle = {
    backgroundColor: bgColor,
    padding,
    margin,
    color: textColor,
    '--gallery-accent': bodyStyle.color || textColor,
    '--gallery-showcase-base': bgColor,
  } as CSSProperties;

  const sharedLayoutProps = {
    images,
    columns,
    gap,
    aspectRatio,
    showCaptions,
    enableLightbox,
    layoutViewport,
    onImageClick: openLightbox,
  };

  return (
    <section
      ref={sectionRef}
      className={styles.gallerySection}
      data-gallery-motion={enableScrollAnimation ? 'enabled' : 'disabled'}
      data-gallery-in-view={isInView ? 'true' : 'false'}
      data-gallery-layout-viewport={layoutViewport}
      data-gallery-preview-mode={previewMode}
      style={{ ...sectionStyle, ...bodyStyle }}
    >
      <div
        className={styles.galleryShell}
        style={{ maxWidth, margin: '0 auto' }}
      >
        <GallerySectionHeader
          className={styles.sectionReveal}
          title={title}
          subtitle={subtitle}
          description={description}
          titleStyle={titleStyle}
          subtitleStyle={subtitleStyle}
          bodyStyle={bodyStyle}
        />

        <div className={`${styles.galleryContent} ${styles.sectionReveal}`}>
          {normalizedLayout === 'showcase' ? (
            <ShowcaseGalleryLayout
              {...sharedLayoutProps}
              activeIndex={activeIndex}
              onActivate={setActiveIndex}
              onNext={nextActiveImage}
              onPrevious={previousActiveImage}
            />
          ) : normalizedLayout === 'spotlight' ? (
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
        </div>

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
