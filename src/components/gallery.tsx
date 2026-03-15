/**
 * Gallery Component
 *
 * Displays a responsive image gallery with multiple modern layout options.
 */

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GalleryConfig } from '@/types/gallery.types';
import { useGlobalStyleConfig } from '@/hooks/use-global-style-config';
import { useSectionReveal } from '@/hooks/use-section-reveal';
import {
  getSectionContainerStyles,
  getSectionTypographyStyles,
} from '@/lib/section-style';
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
  previewMode,
  ...sectionStyleConfig
}: GalleryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
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
  const sectionViewport =
    previewMode === 'mobile' || isClientMobileViewport ? 'mobile' : 'desktop';
  const scrollRevealEnabled =
    sectionStyleConfig.enableScrollReveal ?? enableScrollAnimation;
  const scrollRevealAnimation =
    sectionStyleConfig.scrollRevealAnimation || 'fade-up';
  const { titleStyle, subtitleStyle, bodyStyle } = getSectionTypographyStyles(
    sectionStyleConfig,
    globalStyles,
    sectionViewport,
  );
  const { sectionStyle: sharedSectionStyle } = getSectionContainerStyles(
    sectionStyleConfig,
    sectionViewport,
  );
  const reveal = useSectionReveal({
    enabled: scrollRevealEnabled,
    animation: scrollRevealAnimation,
    isPreview: Boolean(previewMode),
  });

  useEffect(() => {
    if (previewMode) {
      setIsClientMobileViewport(previewMode === 'mobile');
      return;
    }

    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
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

  const hasSharedPaddingOverrides =
    sectionStyleConfig.sectionPaddingY !== undefined ||
    sectionStyleConfig.mobileSectionPaddingY !== undefined ||
    sectionStyleConfig.sectionPaddingX !== undefined ||
    sectionStyleConfig.mobileSectionPaddingX !== undefined;
  const contentMaxWidth =
    sectionStyleConfig.sectionMaxWidth ||
    sectionStyleConfig.mobileSectionMaxWidth ||
    maxWidth;
  const sectionStyle = {
    backgroundColor: bgColor,
    margin,
    textAlign: sharedSectionStyle.textAlign,
    color: bodyStyle.color || textColor,
    ...(hasSharedPaddingOverrides
      ? {
          paddingBlock: sharedSectionStyle.paddingBlock,
          paddingInline: sharedSectionStyle.paddingInline,
        }
      : { padding }),
    '--gallery-accent': bodyStyle.color || textColor,
    '--gallery-showcase-base': bgColor,
  } as CSSProperties & Record<string, any>;

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
      data-gallery-motion="disabled"
      data-gallery-layout-viewport={layoutViewport}
      data-gallery-preview-mode={previewMode}
      style={{ ...sectionStyle, ...bodyStyle }}
    >
      <div ref={reveal.ref} style={reveal.style}>
        <div
          className={styles.galleryShell}
          style={{ maxWidth: contentMaxWidth, margin: '0 auto' }}
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
      </div>
    </section>
  );
}
